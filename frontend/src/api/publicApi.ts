import { api } from "./client";
import type { QuoteSource, ServiceCategory } from "./types";

export async function getPublicConfig(): Promise<{ whatsappNumber: string }> {
  const { data } = await api.get<{ whatsappNumber: string }>("/public/config");
  return data;
}

export interface CertificateValidationResult {
  valid: boolean;
  message?: string;
  certificateNumber?: string;
  revisionNumber?: number;
  client?: string;
  instrument?: { type: string; manufacturer: string; model: string; serialNumber: string; tag: string | null };
  calibrationDate?: string;
  validUntil?: string;
  result?: string;
  status?: "VALID" | "DUE_SOON" | "EXPIRED";
  pdfAvailable?: boolean;
}

export async function validateCertificate(code: string): Promise<CertificateValidationResult> {
  try {
    const { data } = await api.get<CertificateValidationResult>(`/public/certificates/${encodeURIComponent(code)}`);
    return data;
  } catch (error) {
    if (typeof error === "object" && error && "response" in error) {
      const response = (error as { response?: { data?: CertificateValidationResult } }).response;
      if (response?.data) return response.data;
    }
    return { valid: false, message: "Nao foi possivel validar o certificado. Tente novamente." };
  }
}

export async function getPublicCertificatePdfUrl(code: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/public/certificates/${encodeURIComponent(code)}/pdf`);
  return data.url;
}

export interface PublicQuoteInput {
  source: QuoteSource;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  serviceCategory?: ServiceCategory;
  message?: string;
  items?: { productId: string; quantity: number; unitPriceRequested?: number | null }[];
}

export async function submitPublicQuote(input: PublicQuoteInput): Promise<{ number: string }> {
  const { data } = await api.post<{ number: string }>("/public/quotes", input);
  return data;
}
