import { api } from "./client";
import type { MeasurementFieldProfile, MeasurementType } from "./types";

export async function listMeasurementTypes(params: { active?: boolean } = {}): Promise<MeasurementType[]> {
  const { data } = await api.get<MeasurementType[]>("/measurement-types", { params });
  return data;
}

export interface MeasurementTypeInput {
  name: string;
  defaultUnit?: string | null;
  fieldProfile?: MeasurementFieldProfile;
}

export async function createMeasurementType(input: MeasurementTypeInput): Promise<MeasurementType> {
  const { data } = await api.post<MeasurementType>("/measurement-types", input);
  return data;
}

export async function updateMeasurementType(
  id: string,
  input: Partial<MeasurementTypeInput & { active: boolean }>,
): Promise<MeasurementType> {
  const { data } = await api.patch<MeasurementType>(`/measurement-types/${id}`, input);
  return data;
}

export async function deleteMeasurementType(id: string): Promise<void> {
  await api.delete(`/measurement-types/${id}`);
}
