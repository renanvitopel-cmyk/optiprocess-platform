import { api } from "./client";
import type { SensorType } from "./types";

export async function listSensorTypes(params: { measurementTypeId?: string; active?: boolean } = {}): Promise<SensorType[]> {
  const { data } = await api.get<SensorType[]>("/sensor-types", { params });
  return data;
}

export interface SensorTypeInput {
  measurementTypeId: string;
  name: string;
}

export async function createSensorType(input: SensorTypeInput): Promise<SensorType> {
  const { data } = await api.post<SensorType>("/sensor-types", input);
  return data;
}

export async function updateSensorType(id: string, input: Partial<{ name: string; active: boolean }>): Promise<SensorType> {
  const { data } = await api.patch<SensorType>(`/sensor-types/${id}`, input);
  return data;
}

export async function deleteSensorType(id: string): Promise<void> {
  await api.delete(`/sensor-types/${id}`);
}
