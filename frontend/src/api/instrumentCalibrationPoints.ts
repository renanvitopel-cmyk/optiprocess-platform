import { api } from "./client";
import type { InstrumentCalibrationPoint } from "./types";

export async function listInstrumentCalibrationPoints(instrumentId: string): Promise<InstrumentCalibrationPoint[]> {
  const { data } = await api.get<InstrumentCalibrationPoint[]>(`/instruments/${instrumentId}/calibration-points`);
  return data;
}

export interface InstrumentCalibrationPointInput {
  label: string;
  measurementTypeId?: string | null;
  sensorTypeId?: string | null;
  measurementRange?: string | null;
  unit?: string | null;
  targetTemperature?: number | null;
  tolerancePercent?: number | null;
  zeroValue?: number | null;
  spanValue?: number | null;
  calibrationFrequencyMonths?: number | null;
}

export async function createInstrumentCalibrationPoint(
  instrumentId: string,
  input: InstrumentCalibrationPointInput,
): Promise<InstrumentCalibrationPoint> {
  const { data } = await api.post<InstrumentCalibrationPoint>(`/instruments/${instrumentId}/calibration-points`, input);
  return data;
}

export async function updateInstrumentCalibrationPoint(
  instrumentId: string,
  pointId: string,
  input: Partial<InstrumentCalibrationPointInput & { active: boolean }>,
): Promise<InstrumentCalibrationPoint> {
  const { data } = await api.patch<InstrumentCalibrationPoint>(
    `/instruments/${instrumentId}/calibration-points/${pointId}`,
    input,
  );
  return data;
}

export async function deleteInstrumentCalibrationPoint(instrumentId: string, pointId: string): Promise<void> {
  await api.delete(`/instruments/${instrumentId}/calibration-points/${pointId}`);
}
