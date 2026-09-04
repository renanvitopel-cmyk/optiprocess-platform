import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays, HardHat, Inbox, AlertTriangle } from "lucide-react";
import { getMaintenanceSchedule, scheduleMaintenanceWorkOrder } from "../../../api/maintenanceWorkOrders";
import { listClients } from "../../../api/clients";
import type { MaintenanceScheduleData, ScheduleCard } from "../../../api/types";
import { PageHeader } from "../../../components/PageHeader";
import { FullPageSpinner } from "../../../components/Spinner";
import { EmptyState } from "../../../components/EmptyState";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { clientDisplayName } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";

const TYPE_STYLE: Record<string, { border: string; label: string }> = {
  PREVENTIVE: { border: "border-l-navy-500", label: "Preventiva" },
  CORRECTIVE: { border: "border-l-safety-red", label: "Corretiva" },
  PREDICTIVE: { border: "border-l-safety-yellow", label: "Preditiva" },
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-graphite-300",
  MEDIUM: "bg-navy-400",
  HIGH: "bg-safety-yellow",
  CRITICAL: "bg-safety-red",
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

/** Segunda-feira da semana da data informada. */
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

/** Meio-dia local: evita que o fuso jogue a OS para o dia anterior/seguinte. */
function dayToIso(d: Date) {
  const date = new Date(d);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function isSameLocalDay(iso: string | null, day: Date) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

const isToday = (day: Date) => isSameLocalDay(new Date().toISOString(), day);

/**
 * Quadro de programacao do PCM: a fila de OS a programar de um lado e a semana x mao de
 * obra do outro. Arrastar um cartao para uma celula define dia + responsavel; arrastar de
 * volta para a fila desprograma. O total de horas por celula mostra a carga do dia.
 */
export default function SchedulingBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { isClient, base, laborBase } = useCmms();

  const [clientId, setClientId] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [dragging, setDragging] = useState<ScheduleCard | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = dayToIso(weekStart);
  const to = dayToIso(addDays(weekStart, 6));

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });

  const queryKey = ["maintenance-schedule", clientId, from];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getMaintenanceSchedule({ clientId: clientId || undefined, from, to }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; scheduledDate: string | null; assignedResourceId: string | null }) =>
      scheduleMaintenanceWorkOrder(vars.id, { scheduledDate: vars.scheduledDate, assignedResourceId: vars.assignedResourceId }),
    // Move o cartao na hora e desfaz se o servidor recusar - arrastar precisa responder na hora.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<MaintenanceScheduleData>(queryKey);
      if (prev) {
        const card = [...prev.scheduled, ...prev.unscheduled].find((c) => c.id === vars.id);
        if (card) {
          const moved: ScheduleCard = { ...card, scheduledDate: vars.scheduledDate, assignedResourceId: vars.assignedResourceId };
          queryClient.setQueryData<MaintenanceScheduleData>(queryKey, {
            ...prev,
            scheduled: vars.scheduledDate
              ? [...prev.scheduled.filter((c) => c.id !== vars.id), moved]
              : prev.scheduled.filter((c) => c.id !== vars.id),
            unscheduled: vars.scheduledDate
              ? prev.unscheduled.filter((c) => c.id !== vars.id)
              : [...prev.unscheduled.filter((c) => c.id !== vars.id), moved],
          });
        }
      }
      return { prev };
    },
    onError: (error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
      notify("error", getApiErrorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  function drop(day: Date | null, resourceId: string | null) {
    setHoverKey(null);
    const card = dragging;
    setDragging(null);
    if (!card) return;
    const scheduledDate = day ? dayToIso(day) : null;
    // Nada mudou: nao gasta requisicao.
    if (card.scheduledDate === scheduledDate && card.assignedResourceId === resourceId) return;
    if (day && isSameLocalDay(card.scheduledDate, day) && card.assignedResourceId === resourceId) return;
    mutation.mutate({ id: card.id, scheduledDate, assignedResourceId: day ? resourceId : null });
  }

  const cardsFor = (day: Date, resourceId: string | null) =>
    (data?.scheduled ?? []).filter((c) => isSameLocalDay(c.scheduledDate, day) && (c.assignedResourceId ?? null) === resourceId);

  const needsClient = !isClient && !clientId;

  return (
    <div>
      <PageHeader
        title="Programacao da manutencao"
        description="Arraste as OS da fila para o dia e a pessoa que vai executar"
        breadcrumbs={[{ label: "RLP Maintenance CMMS", to: base }, { label: "Programacao" }]}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-outline" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semana anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              <CalendarDays className="h-4 w-4" /> Hoje
            </button>
            <button className="btn-outline" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Proxima semana">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {!isClient && (
        <div className="mb-4">
          <select className="input sm:w-80" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione a empresa...</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        </div>
      )}

      {needsClient ? (
        <EmptyState title="Selecione a empresa" description="A programacao e' por empresa - escolha acima para montar o quadro." />
      ) : isLoading || !data ? (
        <FullPageSpinner />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Fila de OS a programar */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setHoverKey("backlog");
            }}
            onDragLeave={() => setHoverKey(null)}
            onDrop={() => drop(null, null)}
            className={`card shrink-0 p-4 lg:w-72 ${hoverKey === "backlog" ? "ring-2 ring-navy-400" : ""}`}
          >
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-navy-900">
              <Inbox className="h-4 w-4" /> A programar
              <span className="ml-auto rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700">{data.unscheduled.length}</span>
            </h2>
            <p className="mb-3 text-xs text-graphite-500">Arraste para um dia no quadro. Solte aqui para desprogramar.</p>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {data.unscheduled.length === 0 ? (
                <p className="py-6 text-center text-sm text-graphite-400">Nada na fila.</p>
              ) : (
                data.unscheduled.map((card) => (
                  <Card key={card.id} card={card} onDragStart={() => setDragging(card)} onOpen={() => navigate(`${base}/ordens/${card.id}`)} />
                ))
              )}
            </div>
          </div>

          {/* Semana x mao de obra */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            {data.resources.length === 0 ? (
              <EmptyState
                title="Nenhuma mao de obra cadastrada"
                description="Cadastre a equipe de manutencao para distribuir as OS por pessoa."
                action={
                  <button className="btn-primary" onClick={() => navigate(laborBase)}>
                    <HardHat className="h-4 w-4" /> Cadastrar mao de obra
                  </button>
                }
              />
            ) : (
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] gap-1">
                  <div />
                  {days.map((day, i) => (
                    <div
                      key={day.toISOString()}
                      className={`rounded-t-lg px-2 py-1.5 text-center text-xs font-semibold ${
                        isToday(day) ? "bg-navy-700 text-white" : "bg-gray-100 text-graphite-600"
                      }`}
                    >
                      {WEEKDAYS[i]} {day.getDate().toString().padStart(2, "0")}/{(day.getMonth() + 1).toString().padStart(2, "0")}
                    </div>
                  ))}

                  {[...data.resources.map((r) => ({ id: r.id, name: r.name, type: r.type })), { id: null, name: "Sem responsavel", type: "definir depois" }].map(
                    (resource) => (
                      <Row
                        key={resource.id ?? "unassigned"}
                        resource={resource}
                        days={days}
                        cardsFor={cardsFor}
                        hoverKey={hoverKey}
                        setHoverKey={setHoverKey}
                        onDragStartCard={setDragging}
                        onDrop={drop}
                        onOpenCard={(id) => navigate(`${base}/ordens/${id}`)}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  resource,
  days,
  cardsFor,
  hoverKey,
  setHoverKey,
  onDragStartCard,
  onDrop,
  onOpenCard,
}: {
  resource: { id: string | null; name: string; type: string };
  days: Date[];
  cardsFor: (day: Date, resourceId: string | null) => ScheduleCard[];
  hoverKey: string | null;
  setHoverKey: (k: string | null) => void;
  onDragStartCard: (c: ScheduleCard) => void;
  onDrop: (day: Date | null, resourceId: string | null) => void;
  onOpenCard: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-center border-t border-gray-100 px-2 py-3">
        <p className="truncate text-sm font-medium text-navy-900">{resource.name}</p>
        <p className="truncate text-xs text-graphite-400">{resource.type}</p>
      </div>
      {days.map((day) => {
        const cards = cardsFor(day, resource.id);
        const key = `${resource.id ?? "unassigned"}|${day.toISOString()}`;
        const hours = cards.reduce((sum, c) => sum + (c.laborHours ?? 0), 0);
        const withoutEstimate = cards.filter((c) => c.laborHours == null).length;
        const overloaded = hours > 8;
        return (
          <div
            key={key}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverKey(key);
            }}
            onDragLeave={() => setHoverKey(null)}
            onDrop={() => onDrop(day, resource.id)}
            className={`min-h-[92px] space-y-1.5 border-t border-gray-100 p-1.5 transition-colors ${
              hoverKey === key ? "bg-navy-50 ring-2 ring-inset ring-navy-400" : isToday(day) ? "bg-navy-50/30" : ""
            }`}
          >
            {cards.map((card) => (
              <Card key={card.id} card={card} compact onDragStart={() => onDragStartCard(card)} onOpen={() => onOpenCard(card.id)} />
            ))}
            {cards.length > 0 && (
              <p className={`px-1 text-[10px] font-medium ${overloaded ? "text-safety-red" : "text-graphite-400"}`}>
                {hours > 0 ? `${hours}h` : "sem HH prevista"}
                {hours > 0 && withoutEstimate > 0 ? ` (+${withoutEstimate} sem HH)` : ""}
                {overloaded && (
                  <span className="ml-1 inline-flex items-center gap-0.5">
                    <AlertTriangle className="h-3 w-3" /> acima de 8h
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

function Card({
  card,
  compact,
  onDragStart,
  onOpen,
}: {
  card: ScheduleCard;
  compact?: boolean;
  onDragStart: () => void;
  onOpen: () => void;
}) {
  const style = TYPE_STYLE[card.type] ?? TYPE_STYLE.PREVENTIVE;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      title={`${card.number} - ${card.description}`}
      className={`cursor-grab rounded-md border border-gray-200 border-l-4 bg-white p-1.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${style.border}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[card.priority]}`} title={`Prioridade: ${card.priority}`} />
        <span className="truncate text-xs font-semibold text-navy-900">{card.number}</span>
        {card.laborHours != null && <span className="ml-auto shrink-0 text-[10px] text-graphite-400">{card.laborHours}h</span>}
      </div>
      <p className={`mt-0.5 text-[11px] leading-tight text-graphite-600 ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{card.description}</p>
      {card.instrument?.tag && <p className="mt-0.5 truncate text-[10px] text-graphite-400">{card.instrument.tag}</p>}
      {!compact && <p className="mt-1 text-[10px] font-medium text-graphite-400">{style.label}</p>}
    </div>
  );
}
