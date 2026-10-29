export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sob consulta";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Datas sem hora (calibracao, validade, vencimento) vem de um <input type="date"> e
 * ficam gravadas a meia-noite UTC. Formatadas no fuso de Brasilia (UTC-3) elas caiam no
 * dia anterior - um certificado de 20/10 aparecia como 19/10. Meia-noite UTC exata e'
 * tratada como data pura e formatada em UTC; um horario real nunca cai nesse instante. */
export function isDateOnly(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", isDateOnly(date) ? { timeZone: "UTC" } : undefined);
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

/** Opcoes de area de servico, usadas na ficha do cliente e nos filtros. RLP Maintenance
 * CMMS virou produto proprio (separado da OptiProcess) - fica fora da lista de opcoes
 * para nao ser mais marcavel em clientes novos, mas o label continua em
 * SERVICE_CATEGORY_LABELS para nao quebrar a exibicao de clientes antigos que ja tinham
 * esse servico contratado. */
export const SERVICE_CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY_LABELS)
  .filter(([value]) => value !== "CMMS_MAINTENANCE")
  .map(([value, label]) => ({ value, label }));

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

/** Indicador que pode nao ter base de calculo. Zero e' um numero com significado (MTBF 0h
 * = quebra o tempo todo); ausencia de dado precisa parecer ausencia de dado. */
export function formatKpi(valor: number | null | undefined, sufixo = ""): string {
  if (valor == null) return "sem dados";
  return `${valor}${sufixo}`;
}
