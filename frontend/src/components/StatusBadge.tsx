type Tone = "green" | "yellow" | "red" | "graphite" | "navy";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-green-50 text-safety-green-dark border-green-200",
  yellow: "bg-amber-50 text-safety-yellow-dark border-amber-200",
  red: "bg-red-50 text-safety-red border-red-200",
  graphite: "bg-graphite-100 text-graphite-600 border-graphite-200",
  navy: "bg-navy-50 text-navy-700 border-navy-200",
};

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  // genericos
  ACTIVE: { label: "Ativo", tone: "green" },
  INACTIVE: { label: "Inativo", tone: "graphite" },
  PROSPECT: { label: "Prospecto", tone: "navy" },
  CANCELED: { label: "Cancelado", tone: "red" },
  // instrumentos / calibracao / contratos (status derivado por vencimento)
  VALID: { label: "Valido", tone: "green" },
  DUE_SOON: { label: "Proximo do vencimento", tone: "yellow" },
  EXPIRED: { label: "Vencido", tone: "red" },
  EXPIRING_SOON: { label: "Vencendo em breve", tone: "yellow" },
  IN_MAINTENANCE: { label: "Em manutencao", tone: "navy" },
  // ordem de servico
  BUDGET: { label: "Orcamento", tone: "graphite" },
  APPROVED: { label: "Aprovada", tone: "navy" },
  SCHEDULED: { label: "Agendada", tone: "navy" },
  IN_PROGRESS: { label: "Em andamento", tone: "yellow" },
  COMPLETED: { label: "Concluida", tone: "green" },
  // laudos / certificados
  DRAFT: { label: "Rascunho", tone: "graphite" },
  ISSUED: { label: "Emitido", tone: "green" },
  APPROVED_WITH_RESTRICTION: { label: "Aprovado com ressalva", tone: "yellow" },
  REJECTED: { label: "Reprovado", tone: "red" },
  // produtos
  UNAVAILABLE: { label: "Indisponivel", tone: "graphite" },
  // orcamentos / pedidos
  NEW: { label: "Novo", tone: "navy" },
  IN_ANALYSIS: { label: "Em analise", tone: "yellow" },
  QUOTE_SENT: { label: "Orcamento enviado", tone: "navy" },
  SEPARATED: { label: "Separado", tone: "yellow" },
  DELIVERED: { label: "Entregue", tone: "green" },
  PENDING: { label: "Pendente", tone: "graphite" },
  PAID: { label: "Pago", tone: "green" },
  // pontos de calibracao
  PASS: { label: "Aprovado", tone: "green" },
  FAIL: { label: "Reprovado", tone: "red" },
  // criticidade do ativo / prioridade da OS (mesma escala nos dois)
  LOW: { label: "Baixa", tone: "graphite" },
  MEDIUM: { label: "Media", tone: "navy" },
  HIGH: { label: "Alta", tone: "yellow" },
  CRITICAL: { label: "Critica", tone: "red" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const meta = STATUS_MAP[status] ?? { label: label ?? status, tone: "graphite" as Tone };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[meta.tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? meta.label}
    </span>
  );
}
