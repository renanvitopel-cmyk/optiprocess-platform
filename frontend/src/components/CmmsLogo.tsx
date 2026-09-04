import { useState } from "react";

/**
 * Marca do RLP Maintenance CMMS.
 *
 * O CMMS e' um produto vendido a parte, com identidade propria - por isso ele tem marca
 * separada da OptiProcess. A regra: OptiProcess continua sendo a marca principal do site
 * e do sistema de gestao; a marca do CMMS aparece so onde o assunto e' o produto CMMS
 * (paineis e telas do CMMS, e a pagina do servico no site).
 *
 * Arquivos esperados em /public/brand:
 *   rlp-maintenance.png        - versao para fundo claro (azul/verde sobre branco)
 *   rlp-maintenance-light.png  - versao para fundo escuro (texto em branco)
 *
 * Enquanto a imagem nao existir (ou falhar ao carregar), cai para um lockup em texto -
 * melhor uma marca simples e legivel do que um icone de imagem quebrada.
 */

interface CmmsLogoProps {
  /** "light" = para fundo escuro (sidebar, hero); "dark" = para fundo claro. */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const IMG_SIZES: Record<NonNullable<CmmsLogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-10",
  lg: "h-14",
};

const TEXT_SIZES: Record<NonNullable<CmmsLogoProps["size"]>, { rlp: string; word: string }> = {
  sm: { rlp: "text-base", word: "text-base" },
  md: { rlp: "text-xl", word: "text-xl" },
  lg: { rlp: "text-3xl", word: "text-3xl" },
};

export function CmmsLogo({ variant = "dark", size = "md", className = "" }: CmmsLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const suffix = variant === "light" ? "-light" : "";

  if (imageFailed) {
    const t = TEXT_SIZES[size];
    return (
      <span className={`inline-flex items-baseline gap-1.5 font-bold tracking-tight ${className}`}>
        <span className={`${t.rlp} ${variant === "light" ? "text-white" : "text-navy-800"}`}>RLP</span>
        <span className={`${t.word} font-semibold ${variant === "light" ? "text-navy-200" : "text-graphite-600"}`}>
          Maintenance
        </span>
      </span>
    );
  }

  return (
    <img
      src={`/brand/rlp-maintenance${suffix}.png`}
      alt="RLP Maintenance"
      onError={() => setImageFailed(true)}
      className={`${IMG_SIZES[size]} w-auto ${className}`}
    />
  );
}
