import { api } from "./client";
import type { Meter, MeterReading, MaintenanceWorkOrder, PredictivePanelData, PredictiveTechnique, MeasurementDirection, ConditionSeverity } from "./types";

export async function listMeters(params: { instrumentId?: string } = {}): Promise<Meter[]> {
  const { data } = await api.get<Meter[]>("/meters", { params });
  return data;
}

export async function getMeter(id: string): Promise<Meter> {
  const { data } = await api.get<Meter>(`/meters/${id}`);
  return data;
}

export interface MeterInput {
  instrumentId: string;
  name: string;
  unit: string;
  currentValue?: number;
  technique?: PredictiveTechnique;
  direction?: MeasurementDirection;
  minThreshold?: number | null;
  maxThreshold?: number | null;
  warningLimit?: number | null;
  criticalLimit?: number | null;
  criterion?: string | null;
  frequencyDays?: number | null;
}

export async function createMeter(input: MeterInput): Promise<Meter> {
  const { data } = await api.post<Meter>("/meters", input);
  return data;
}

export async function updateMeter(id: string, input: Partial<MeterInput>): Promise<Meter> {
  const { data } = await api.patch<Meter>(`/meters/${id}`, input);
  return data;
}

export async function deleteMeter(id: string): Promise<void> {
  await api.delete(`/meters/${id}`);
}

export interface ReadingResult extends MeterReading {
  severity: ConditionSeverity;
  severityLabel: string;
  recommendedAction: string;
  triggeredWorkOrder: MaintenanceWorkOrder | null;
}

export async function addMeterReading(id: string, value: number, notes?: string): Promise<ReadingResult> {
  const { data } = await api.post<ReadingResult>(`/meters/${id}/readings`, { value, notes });
  return data;
}

export async function getPredictivePanel(params: { clientId?: string } = {}): Promise<PredictivePanelData> {
  const { data } = await api.get<PredictivePanelData>("/meters/predictive-panel", { params });
  return data;
}
