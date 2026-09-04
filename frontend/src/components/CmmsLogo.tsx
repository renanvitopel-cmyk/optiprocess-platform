/**
 * Marca do RLP Maintenance CMMS - o arquivo oficial da marca, nao uma recriacao.
 *
 * O CMMS e' um produto vendido a parte, com identidade propria - por isso tem marca
 * separada da OptiProcess. A regra: OptiProcess continua sendo a marca principal do site,
 * do login e do sistema de gestao; a marca do CMMS aparece onde o assunto e' o produto
 * (paineis do CMMS, portal de quem assinou o CMMS e a pagina do servico no site).
 *
 * Dois arquivos em /public/brand, gerados a partir do PNG original da marca:
 *   rlp-maintenance.png        cores originais, fundo transparente (para fundo claro)
 *   rlp-maintenance-light.png  letras em branco, barras verdes (para fundo escuro)
 * O fundo branco do arquivo original foi removido - sem isso a marca aparecia dentro de
 * um retangulo branco em cima do menu azul.
 */

interface CmmsLogoProps {
  /** "light" = para fundo escuro (sidebar, hero); "dark" = para fundo claro. */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES: Record<NonNullable<CmmsLogoProps["size"]>, string> = {
  sm: "h-8",
  md: "h-11",
  lg: "h-16",
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
