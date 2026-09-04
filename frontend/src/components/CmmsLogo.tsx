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
 * Enquanto o arquivo nao existir, o alt garante que o nome continue legivel.
 */

interface CmmsLogoProps {
  /** "light" = para fundo escuro (sidebar, hero); "dark" = para fundo claro. */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES: Record<NonNullable<CmmsLogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-10",
  lg: "h-14",
};

export function CmmsLogo({ variant = "dark", size = "md", className = "" }: CmmsLogoProps) {
  const suffix = variant === "light" ? "-light" : "";
  return (
    <img
      src={`/brand/rlp-maintenance${suffix}.png`}
      alt="RLP Maintenance"
      className={`${SIZES[size]} w-auto ${className}`}
    />
  );
}
