import { api } from "./client";
import type { Meter, MeterReading } from "./types";

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

export async function addMeterReading(id: string, value: number): Promise<MeterReading> {
  const { data } = await api.post<MeterReading>(`/meters/${id}/readings`, { value });
  return data;
}
