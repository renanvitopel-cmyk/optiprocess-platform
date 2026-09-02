export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sob consulta";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL_MAINTENANCE: "Manutencao eletrica",
  PANEL_MAINTENANCE: "Manutencao de paineis",
  MOTOR_MAINTENANCE: "Manutencao de motores",
  TECHNICAL_REPORT: "Laudo tecnico",
  CALIBRATION: "Calibracao",
  TECHNICAL_ASSISTANCE: "Assistencia tecnica",
  EV_CHARGER: "Carregador veicular",
  CMMS_MAINTENANCE: "RLP Maintenance CMMS",
  OTHER: "Outros",
};

export function formatServiceCategory(value: string): string {
  return SERVICE_CATEGORY_LABELS[value] ?? value;
}

/** Opcoes de area de servico, usadas na ficha do cliente e nos filtros. */
export const SERVICE_CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TECHNICAL_REPORT_CATEGORY_LABELS: Record<string, string> = {
  ELECTRICAL_INSTALLATION: "Instalacoes eletricas",
  THERMOGRAPHY: "Termografia infravermelha",
  GROUNDING: "Aterramento eletrico",
  SPDA: "SPDA (para-raios)",
  OTHER: "Outros relatorios",
};

export function formatReportCategory(value: string): string {
  return TECHNICAL_REPORT_CATEGORY_LABELS[value] ?? value;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  TECHNICIAN: "Tecnico",
  COMMERCIAL: "Comercial",
  CLIENT: "Cliente",
};

export function formatRole(value: string): string {
  return ROLE_LABELS[value] ?? value;
}

export function clientDisplayName(client: { companyName: string; tradeName?: string | null } | null | undefined): string {
  if (!client) return "-";
  return client.tradeName || client.companyName;
}
