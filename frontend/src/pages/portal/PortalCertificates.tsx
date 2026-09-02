import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Eye, X } from "lucide-react";
import { getCalibrationPdfUrl, listCalibrations } from "../../api/calibrations";
import { listInstruments } from "../../api/instruments";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/Toast";
import { getApiErrorMessage } from "../../api/client";

export default function PortalCertificates() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [search, setSearch] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Lista de ativos do proprio cliente, para o filtro "por ativo cadastrado".
  const { data: instruments } = useQuery({
    queryKey: ["portal-instruments-filter"],
    queryFn: () => listInstruments({ pageSize: 200 }),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["portal-certificates", search, instrumentId, dateFrom, dateTo, page],
    queryFn: () =>
      listCalibrations({
        search: search || undefined,
        instrumentId: instrumentId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: 15,
      }),
  });

  const hasFilters = !!(search || instrumentId || dateFrom || dateTo);

  function clearFilters() {
    setSearch("");
    setInstrumentId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  async function handleDownload(id: string) {
    try {
      const url = await getCalibrationPdfUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify("error", getApiErrorMessage(error));
    }
  }

  return (
    <div>
      <PageHeader
        title="Meus certificados"
        description="Certificados de calibracao emitidos para sua empresa"
      />

      <div className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <label className="field-label">Buscar</label>
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-graphite-400" />
            <input
              className="input pl-9"
              placeholder="Numero do certificado..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="filtro-ativo">
              Ativo / instrumento
            </label>
            <select
              id="filtro-ativo"
              className="input"
              value={instrumentId}
              onChange={(e) => {
                setInstrumentId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os ativos</option>
              {instruments?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {[i.tag, `${i.type} - ${i.model}`].filter(Boolean).join(" | ")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label" htmlFor="filtro-de">
                De
              </label>
              <input
                id="filtro-de"
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="filtro-ate">
                Ate
              </label>
              <input
                id="filtro-ate"
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {hasFilters && (
          <button type="button" className="btn-ghost btn-sm mt-3" onClick={clearFilters}>
            <X className="h-4 w-4" /> Limpar filtros
          </button>
        )}
      </div>

      <DataTable
        loading={isLoading}
        rows={data?.items ?? []}
        keyField={(c) => c.id}
        pagination={data}
        onPageChange={setPage}
        emptyTitle={hasFilters ? "Nenhum certificado para esses filtros" : "Nenhum certificado disponivel"}
        emptyDescription={
          hasFilters
            ? "Ajuste o periodo ou o ativo selecionado."
            : "Certificados liberados pela nossa equipe tecnica aparecerao aqui."
        }
        columns={[
          { header: "Certificado", accessor: (c) => <span className="font-medium text-navy-900">{c.certificateNumber}</span> },
          { header: "Instrumento", accessor: (c) => `${c.instrument?.type} - ${c.instrument?.model}` },
          { header: "Tag", accessor: (c) => c.instrument?.tag || "-" },
          { header: "N. de serie", accessor: (c) => c.instrument?.serialNumber ?? "-" },
          { header: "Data", accessor: (c) => formatDate(c.calibrationDate) },
          { header: "Validade", accessor: (c) => formatDate(c.validUntil) },
          { header: "Resultado", accessor: (c) => <StatusBadge status={c.result} /> },
          {
            header: "Acoes",
            accessor: (c) => (
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/portal/certificados/${c.id}`);
                  }}
                  className="text-navy-600 hover:text-navy-800"
                  aria-label={`Visualizar ${c.certificateNumber}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(c.id);
                  }}
                  className="text-navy-600 hover:text-navy-800"
                  aria-label={`Baixar PDF de ${c.certificateNumber}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
