import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { homeForRole } from "../../auth/ProtectedRoute";
import { TextInput } from "../../components/form/Field";
import { getApiErrorMessage } from "../../api/client";
import { LogoFull } from "../../components/Logo";

const schema = z.object({
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(1, "Informe a senha."),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

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
      setServerError(getApiErrorMessage(error, "Nao foi possivel entrar. Verifique suas credenciais."));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoFull variant="dark" className="h-32" />
          <p className="mt-3 text-sm text-graphite-500">Acesse a gestao interna ou o portal do cliente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput
            label="E-mail"
            type="email"
            autoComplete="username"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register("password")}
          />

          {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-safety-red">{serverError}</p>}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-graphite-500">
          <Link to="/" className="hover:text-navy-700">
            Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
