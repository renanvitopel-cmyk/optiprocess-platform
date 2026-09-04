import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { EmptyState } from "../../../components/EmptyState";
import { Modal } from "../../../components/Modal";
import { TextInput, TextareaInput, SelectInput } from "../../../components/form/Field";
import { useToast } from "../../../components/Toast";
import { getApiErrorMessage } from "../../../api/client";
import { listClients } from "../../../api/clients";
import { listLaborResources } from "../../../api/laborResources";
import {
  listLubricationRoutes,
  createLubricationRoute,
  updateLubricationRoute,
  deleteLubricationRoute,
  listLubricationPoints,
} from "../../../api/lubrication";
import type { LubricationRoute } from "../../../api/types";
import { clientDisplayName } from "../../../lib/format";
import { useCmms } from "../../../lib/cmms";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da rota."),
  code: z.string().optional(),
  responsibleId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Rota = a ordem em que o lubrificador percorre os pontos. Ela nao redefine periodicidade
 * nem quantidade: isso e' especificacao de cada ponto. Agrupar aqui e' o que transforma
 * "40 pontos vencidos" em uma volta pela fabrica. */
export default function LubricationRoutesList() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { isClient, ownClientId, base } = useCmms();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = isClient ? ownClientId ?? "" : searchParams.get("clientId") ?? "";
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<LubricationRoute | null>(null);
  const [pontosDaRota, setPontosDaRota] = useState<string[]>([]);

  const { data: clients } = useQuery({
    queryKey: ["clients-picker-cmms"],
    queryFn: () => listClients({ pageSize: 200, service: "CMMS_MAINTENANCE" }),
    enabled: !isClient,
  });
  const { data: routes, isLoading } = useQuery({
    queryKey: ["rotas-lubrificacao", clientId],
    queryFn: () => listLubricationRoutes({ clientId }),
    enabled: !!clientId,
  });
  const { data: pontos } = useQuery({
    queryKey: ["pontos-lubrificacao-todos", clientId],
    queryFn: () => listLubricationPoints({ clientId, pageSize: 500 }),
    enabled: !!clientId && formOpen,
  });
  const { data: equipe } = useQuery({
    queryKey: ["labor-resources-picker", clientId],
    queryFn: () => listLaborResources({ clientId, active: true, pageSize: 200 }),
    enabled: !!clientId && formOpen,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const todosOsPontos = pontos?.items ?? [];
  const porId = new Map(todosOsPontos.map((p) => [p.id, p]));
  const disponiveis = todosOsPontos.filter((p) => !pontosDaRota.includes(p.id));

  function abrirNova() {
    setEditando(null);
    setPontosDaRota([]);
    reset({ name: "", code: "", responsibleId: "", notes: "" });
    setFormOpen(true);
  }

  function abrirEdicao(r: LubricationRoute) {
    setEditando(r);
    setPontosDaRota((r.items ?? []).map((i) => i.point.id));
    reset({ name: r.name, code: r.code ?? "", responsibleId: r.responsibleId ?? "", notes: r.notes ?? "" });
    setFormOpen(true);
  }

  function mover(index: number, delta: number) {
    const destino = index + delta;
    if (destino < 0 || destino >= pontosDaRota.length) return;
    const copia = [...pontosDaRota];
    [copia[index], copia[destino]] = [copia[destino], copia[index]];
    setPontosDaRota(copia);
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        clientId,
        code: values.code || null,
        responsibleId: values.responsibleId || null,
        notes: values.notes || null,
        pointIds: pontosDaRota,
      };
      if (editando) await updateLubricationRoute(editando.id, payload);
      else await createLubricationRoute(payload);
      notify("success", editando ? "Rota atualizada." : "Rota criada.");
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rotas-lubrificacao"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  async function remover(r: LubricationRoute) {
    try {
      await deleteLubricationRoute(r.id);
      notify("success", "Rota removida.");
      queryClient.invalidateQueries({ queryKey: ["rotas-lubrificacao"] });
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Rotas de lubrificacao"
        description="A ordem em que o lubrificador percorre os pontos"
        breadcrumbs={[
          { label: "RLP Maintenance CMMS", to: base },
          { label: "Lubrificacao", to: `${base}/lubrificacao` },
          { label: "Rotas" },
        ]}
        actions={
          <button className="btn-primary" onClick={abrirNova} disabled={!clientId}>
            <Plus className="h-4 w-4" /> Nova rota
          </button>
        }
      />

      {!isClient && (
        <div className="mb-6">
          <select
            className="input sm:w-72"
            value={clientId}
            onChange={(e) => setSearchParams(e.target.value ? { clientId: e.target.value } : {})}
          >
            <option value="">Selecione o cliente</option>
            {(clients?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
            ))}
          </select>
        </div>
      )}

      {!clientId ? (
        <EmptyState title="Selecione o cliente" description="As rotas sao da fabrica de cada empresa." />
      ) : isLoading ? (
        <p className="text-sm text-graphite-500">Carregando...</p>
      ) : (routes ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma rota criada"
          description="Uma rota agrupa os pontos numa sequencia de campo - e' o que o plano de lubrificacao agenda para virar OS."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(routes ?? []).map((r) => {
            const consumoPorVolta = (r.items ?? []).reduce<Record<string, { qtd: number; unidade: string }>>((acc, item) => {
              const lub = item.point.lubricant;
              if (!lub) return acc;
              const atual = acc[lub.sparePart.name] ?? { qtd: 0, unidade: lub.sparePart.unit };
              atual.qtd += item.point.quantityPerApplication;
              acc[lub.sparePart.name] = atual;
              return acc;
            }, {});

            return (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-navy-900">{r.name}</h2>
                    <p className="text-xs text-graphite-500">
                      {[r.code, r.responsible?.name].filter(Boolean).join(" - ") || "sem responsavel definido"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost btn-sm" onClick={() => abrirEdicao(r)}>Editar</button>
                    <button className="btn-ghost btn-sm text-safety-red" onClick={() => remover(r)}>Remover</button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-graphite-700">{(r.items ?? []).length} ponto(s)</p>
                {Object.keys(consumoPorVolta).length > 0 && (
                  <div className="mt-1 text-xs text-graphite-500">
                    Consumo por volta:{" "}
                    {Object.entries(consumoPorVolta)
                      .map(([nome, v]) => `${Number(v.qtd.toFixed(3))} ${v.unidade} de ${nome}`)
                      .join("; ")}
                  </div>
                )}

                {(r.items ?? []).length > 0 && (
                  <ol className="mt-3 space-y-1 text-sm text-graphite-700">
                    {(r.items ?? []).map((item, i) => (
                      <li key={item.id} className="flex gap-2">
                        <span className="text-graphite-400">{i + 1}.</span>
                        <span className="min-w-0">
                          {item.point.code} - {item.point.name}
                          <span className="text-graphite-400"> ({item.point.instrument?.tag ?? "sem TAG"})</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editando ? `Editar rota ${editando.name}` : "Nova rota de lubrificacao"}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>Cancelar</button>
            <button type="submit" form="rota-form" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="rota-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Nome da rota" required placeholder="Ex.: Rota semanal - Linha 4" error={errors.name?.message} {...register("name")} />
            <TextInput label="Codigo" placeholder="Ex.: ROT-L4-SEM" {...register("code")} />
          </div>
          <SelectInput
            label="Responsavel"
            placeholder="A definir"
            options={(equipe?.items ?? []).map((r) => ({ value: r.id, label: `${r.name} (${r.type})` }))}
            {...register("responsibleId")}
          />
          <TextareaInput label="Observacoes" rows={2} {...register("notes")} />

          <div>
            <p className="mb-1 text-sm font-medium text-graphite-700">Pontos da rota, na ordem de execucao</p>
            <p className="mb-2 text-xs text-graphite-500">
              A ordem e' a sequencia de caminhada na fabrica - e' ela que economiza o tempo do lubrificador.
            </p>

            {pontosDaRota.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-graphite-500">Nenhum ponto na rota ainda.</p>
            ) : (
              <ol className="space-y-1">
                {pontosDaRota.map((id, index) => {
                  const p = porId.get(id);
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <span className="w-5 shrink-0 text-graphite-400">{index + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-graphite-800">
                        {p ? `${p.code} - ${p.name}` : id}
                        {p?.instrument?.tag ? <span className="text-graphite-400"> ({p.instrument.tag})</span> : null}
                      </span>
                      <button type="button" className="text-graphite-400 hover:text-navy-700" onClick={() => mover(index, -1)} aria-label="Subir">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" className="text-graphite-400 hover:text-navy-700" onClick={() => mover(index, 1)} aria-label="Descer">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-graphite-400 hover:text-safety-red"
                        onClick={() => setPontosDaRota((atual) => atual.filter((x) => x !== id))}
                        aria-label="Remover da rota"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            <select
              className="input mt-2"
              value=""
              onChange={(e) => {
                if (e.target.value) setPontosDaRota((atual) => [...atual, e.target.value]);
              }}
            >
              <option value="">{disponiveis.length ? "Adicionar ponto..." : "Todos os pontos ja estao na rota"}</option>
              {disponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.instrument?.tag ?? "sem TAG"})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
