import { api } from "./client";

export interface GlobalSearchResult {
  clients: { id: string; companyName: string; tradeName: string | null }[];
  instruments: { id: string; type: string; model: string; serialNumber: string }[];
  calibrations: { id: string; certificateNumber: string }[];
  products: { id: string; name: string; sku: string }[];
}

export async function globalSearch(term: string): Promise<GlobalSearchResult> {
  const { data } = await api.get<GlobalSearchResult>("/search", { params: { q: term } });
  return data;
}
