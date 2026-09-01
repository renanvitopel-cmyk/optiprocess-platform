import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { getPublicConfig } from "../api/publicApi";

export function buildWhatsAppLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppButton({ message = "Ola! Gostaria de solicitar um orcamento com a OptiProcess." }: { message?: string }) {
  const { data } = useQuery({ queryKey: ["public-config"], queryFn: getPublicConfig, staleTime: Infinity });

  if (!data?.whatsappNumber) return null;

  return (
    <a
      href={buildWhatsAppLink(data.whatsappNumber, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-safety-green px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-safety-green-dark"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
