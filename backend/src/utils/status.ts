import { addMonths, differenceInCalendarDays } from "../lib/dateMath";

export type DerivedDueStatus = "VALID" | "DUE_SOON" | "EXPIRED";

const DUE_SOON_WINDOW_DAYS = 30;

/** Deriva o status de vencimento a partir da data de validade, comparando com hoje.
 * Nao confia em um valor gravado que poderia ficar desatualizado com o calendario. */
export function deriveDueStatus(validUntil: Date | null, referenceDate: Date = new Date()): DerivedDueStatus {
  if (!validUntil) return "VALID";
  const daysLeft = differenceInCalendarDays(validUntil, referenceDate);
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= DUE_SOON_WINDOW_DAYS) return "DUE_SOON";
  return "VALID";
}

export function computeNextDueDate(lastDate: Date, frequencyMonths: number): Date {
  return addMonths(lastDate, frequencyMonths);
}
