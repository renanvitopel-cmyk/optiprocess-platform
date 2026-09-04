/**
 * Marca do RLP Maintenance CMMS.
 *
 * O CMMS e' um produto vendido a parte, com identidade propria - por isso ele tem marca
 * separada da OptiProcess. A regra: OptiProcess continua sendo a marca principal do site,
 * do login e do sistema de gestao; a marca do CMMS aparece onde o assunto e' o produto
 * (paineis do CMMS, portal de quem assinou o CMMS e a pagina do servico no site).
 *
 * Desenhada em SVG, nao em imagem: escala em qualquer tamanho sem borrar, funciona em
 * fundo claro e escuro sem precisar de dois arquivos, e nao carrega o retangulo branco
 * que o PNG original tem. As barras ficam entre "RL" e "P" com posicao fixa (cada bloco
 * de texto tem textLength), entao o desenho nao se desmonta se a fonte demorar a carregar.
 */

interface CmmsLogoProps {
  /** "light" = para fundo escuro (sidebar, hero); "dark" = para fundo claro. */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const HEIGHTS: Record<NonNullable<CmmsLogoProps["size"]>, number> = {
  sm: 28,
  md: 40,
  lg: 58,
};

const VERDE = "#A9CE3A";
const NAVY = "#14507D";
const CINZA = "#3F3F46";

export function CmmsLogo({ variant = "dark", size = "md", className = "" }: CmmsLogoProps) {
  const alturaMarca = variant === "light" ? "#FFFFFF" : NAVY;
  const alturaPalavra = variant === "light" ? "#C9D3DD" : CINZA;
  const h = HEIGHTS[size];
  // viewBox 234x112 -> largura acompanha a altura pedida, mantendo a proporcao.
  const w = Math.round((234 / 112) * h);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 234 112"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RLP Maintenance"
      className={className}
    >
      <text
        x="0"
        y="74"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        letterSpacing="-3"
        fill={alturaMarca}
        textLength="118"
        lengthAdjust="spacingAndGlyphs"
      >
        RL
      </text>

      {/* As tres barras crescentes: o "grafico" que da nome a marca, no vao entre L e P. */}
      <g fill={VERDE}>
        <rect x="120" y="40" width="13" height="34" rx="6.5" />
        <rect x="139" y="26" width="13" height="48" rx="6.5" />
        <rect x="158" y="10" width="13" height="64" rx="6.5" />
      </g>

      <text
        x="176"
        y="74"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        letterSpacing="-3"
        fill={alturaMarca}
        textLength="58"
        lengthAdjust="spacingAndGlyphs"
      >
        P
      </text>

      <text
        x="0"
        y="106"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="29"
        fontWeight="700"
        fill={alturaPalavra}
        textLength="234"
        lengthAdjust="spacingAndGlyphs"
      >
        Maintenance
      </text>
    </svg>
  );
}
