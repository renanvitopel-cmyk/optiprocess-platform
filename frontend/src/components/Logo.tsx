import { company } from "../lib/companyInfo";

/**
 * Logotipo oficial da OptiProcess (extraido do material de apresentacao da empresa).
 *
 * Duas variantes: "light" para fundos escuros (header, sidebar, rodape), onde o
 * grafite da marca vira branco, e "dark" para fundos claros. O lockup horizontal
 * usa o simbolo + a palavra em imagem, preservando a tipografia original da marca.
 */

interface LogoProps {
  variant?: "light" | "dark";
  /** Altura do simbolo em px; a palavra acompanha proporcionalmente. */
  size?: "sm" | "md" | "lg";
  /** Mostra so o simbolo, sem a palavra. */
  markOnly?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<LogoProps["size"]>, { mark: string; word: string }> = {
  sm: { mark: "h-7", word: "h-3.5" },
  md: { mark: "h-9", word: "h-[18px]" },
  lg: { mark: "h-12", word: "h-6" },
};

export function Logo({ variant = "light", size = "md", markOnly = false, className = "" }: LogoProps) {
  const suffix = variant === "light" ? "-light" : "";
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={`/brand/logo-mark${suffix}.png`}
        alt=""
        aria-hidden="true"
        className={`${s.mark} w-auto`}
      />
      {!markOnly && (
        <img src={`/brand/logo-wordmark${suffix}.png`} alt={company.name} className={`${s.word} w-auto`} />
      )}
      {markOnly && <span className="sr-only">{company.name}</span>}
    </span>
  );
}

/** Logotipo completo, com simbolo, palavra e assinatura da empresa (uso em destaque). */
export function LogoFull({ variant = "dark", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const suffix = variant === "light" ? "-light" : "";
  return (
    <img
      src={`/brand/logo-full${suffix}.png`}
      alt={company.fullName}
      className={`w-auto ${className}`}
    />
  );
}
