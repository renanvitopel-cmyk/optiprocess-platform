import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Gauge,
  Lock,
  Mail,
  ShieldCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { homeForRole } from "../../auth/ProtectedRoute";
import { getApiErrorMessage } from "../../api/client";
import { getPublicConfig } from "../../api/publicApi";
import { buildWhatsAppLink } from "../../components/WhatsAppButton";
import { Logo } from "../../components/Logo";
import { company } from "../../lib/companyInfo";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});
type FormValues = z.infer<typeof schema>;

interface Slide {
  tab: string;
  icon: LucideIcon;
  badge: string;
  title: string;
  text: string;
  chips: string[];
  /** Foto de fundo opcional (em /public). Sem ela, o painel fica so com as cores da marca. */
  image?: string;
}

// Um slide por frente de servico da OptiProcess. Para usar foto propria, coloque o arquivo
// em frontend/public/brand/login/ e preencha "image" - nunca foto de banco de imagem.
const SLIDES: Slide[] = [
  {
    tab: "Calibração",
    icon: Gauge,
    badge: "Metrologia rastreável",
    title: "Certificados de calibração com rastreabilidade",
    text: "Padrões com certificado vigente, incerteza expandida declarada e validação pública por QR Code em cada certificado emitido.",
    chips: ["Padrões rastreáveis", "Incerteza k = 2", "Validação por QR Code"],
  },
  {
    tab: "Instrumentação",
    icon: ClipboardCheck,
    badge: "Instrumentação industrial",
    title: "Instrumentos de campo sob controle",
    text: "Cada ativo identificado pelo TAG, com histórico de calibrações, ordens de serviço e vencimentos acompanhados num só lugar.",
    chips: ["Ficha por TAG", "Histórico completo", "Alerta de vencimento"],
  },
  {
    tab: "Elétrica",
    icon: Zap,
    badge: "Manutenção elétrica",
    title: "Manutenção elétrica preventiva e corretiva",
    text: "Atendimento predial e industrial com laudos técnicos e registro de cada serviço executado na sua planta.",
    chips: ["Predial e industrial", "Laudos técnicos", "Ordens de serviço"],
  },
  {
    tab: "Manutenção",
    icon: Wrench,
    badge: "RLP Maintenance CMMS",
    title: "Gestão da manutenção da sua fábrica",
    text: "Planos preventivos, ordens de serviço, almoxarifado e indicadores de MTTR, MTBF e disponibilidade.",
    chips: ["Planos preventivos", "Almoxarifado", "Indicadores"],
  },
];

const ROTATE_MS = 7000;

function ShowcasePanel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return;
    const timer = window.setTimeout(() => setCurrent((c) => (c + 1) % SLIDES.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [current, paused]);

  const go = (delta: number) => setCurrent((c) => (c + delta + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[current];
  const Icon = slide.icon;

  return (
    <aside
      // overflow-clip (e nao hidden): a marca-d'agua passa da borda e, com hidden, focar um
      // botao do carrossel rolava o painel de lado, cortando o logo.
      className="relative hidden overflow-clip bg-navy-950 text-white lg:flex lg:flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slide.image && (
        <img src={slide.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(0,96,192,0.35),transparent_50%),radial-gradient(circle_at_10%_90%,rgba(245,180,0,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <img
        src="/brand/logo-mark-light.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 h-[26rem] w-auto -translate-y-1/2 opacity-[0.06]"
      />

      <div className="relative flex items-center gap-4 px-12 pt-10">
        <span className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
          <Logo variant="light" size="md" />
        </span>
        <div className="text-xs leading-relaxed">
          <span className="rounded bg-[#0060C0]/30 px-2 py-0.5 font-semibold uppercase tracking-wide text-navy-100">
            Plataforma OptiProcess
          </span>
          <p className="mt-1 text-navy-300">Calibração • Instrumentação • Elétrica • Manutenção</p>
        </div>
      </div>

      <div className="relative mt-auto px-12 pb-8" aria-live="polite">
        <div key={current} className="animate-fade-in motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-navy-100">
            <Icon className="h-3.5 w-3.5 text-safety-yellow" /> {slide.badge}
          </span>
          <h2 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight text-white">{slide.title}</h2>
          <p className="mt-4 max-w-xl text-base text-navy-200">{slide.text}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {slide.chips.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-navy-100"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-safety-green" /> {chip}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Áreas de atuação">
            {SLIDES.map((s, i) => (
              <button
                key={s.tab}
                type="button"
                role="tab"
                aria-selected={i === current}
                onClick={() => setCurrent(i)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  i === current ? "bg-[#0060C0] text-white" : "text-navy-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {String(i + 1).padStart(2, "0")} {s.tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="rounded-lg border border-white/15 p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo"
              className="rounded-lg border border-white/15 p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: publicConfig } = useQuery({ queryKey: ["public-config"], queryFn: getPublicConfig, staleTime: Infinity });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? homeForRole(user.role), { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Não foi possível entrar. Verifique suas credenciais."));
    }
  }

  // Ainda nao ha recuperacao de senha por e-mail: quem esqueceu fala com a OptiProcess, que
  // gera uma senha provisoria pela gestao de usuarios.
  const forgotHref = publicConfig?.whatsappNumber
    ? buildWhatsAppLink(publicConfig.whatsappNumber, "Olá! Esqueci minha senha de acesso à plataforma OptiProcess.")
    : `mailto:${company.email}?subject=${encodeURIComponent("Esqueci minha senha - plataforma OptiProcess")}`;

  const fieldBox = (hasError: boolean) =>
    `flex items-center gap-2.5 rounded-xl border bg-graphite-50 px-3.5 transition focus-within:bg-white focus-within:ring-2 ${
      hasError
        ? "border-safety-red focus-within:ring-safety-red/20"
        : "border-graphite-100 focus-within:border-navy-500 focus-within:ring-navy-500/20"
    }`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <ShowcasePanel />

      <main className="flex flex-col items-center justify-center bg-gradient-to-b from-navy-50 via-white to-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-graphite-100 bg-white px-4 py-1.5 text-xs font-medium text-graphite-600 shadow-card hover:text-navy-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a página inicial
            </Link>
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-graphite-100">
              <img src="/brand/logo-mark.png" alt="" aria-hidden="true" className="h-9 w-auto" />
            </span>
            <h1 className="mt-4 text-3xl font-extrabold text-navy-900">Acesso ao Sistema</h1>
            <p className="mt-1 text-sm font-medium text-graphite-500">
              {company.name} • Gestão interna e portal do cliente
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-8 space-y-5 rounded-2xl border border-graphite-100 bg-white p-6 shadow-[0_10px_40px_-12px_rgba(11,23,41,0.18)] sm:p-8"
          >
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-900">
                E-mail
              </label>
              <div className={fieldBox(!!errors.email)}>
                <Mail className="h-4 w-4 shrink-0 text-graphite-400" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="seu.email@empresa.com.br"
                  aria-invalid={!!errors.email}
                  className="w-full bg-transparent py-3 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-safety-red">{errors.email.message}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wide text-navy-900">
                  Senha
                </label>
                <a
                  href={forgotHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-[#0060C0] hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>
              <div className={fieldBox(!!errors.password)}>
                <Lock className="h-4 w-4 shrink-0 text-graphite-400" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  className="w-full bg-transparent py-3 text-sm text-graphite-900 placeholder:text-graphite-400 focus:outline-none"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="shrink-0 rounded p-1 text-graphite-400 hover:text-navy-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-safety-red">{errors.password.message}</p>}
            </div>

            {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-safety-red">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-navy-800/25 transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Entrando..." : "Entrar no Sistema"}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-graphite-400">
              <ShieldCheck className="h-3.5 w-3.5 text-safety-green" /> Conexão segura e criptografada
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
