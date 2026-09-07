import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { changeOwnPassword } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "./AuthContext";
import { Logo } from "../components/Logo";

/**
 * Primeiro acesso com senha provisoria: troca antes de qualquer outra coisa.
 *
 * A senha do primeiro acesso foi escolhida por outra pessoa e passou por e-mail, WhatsApp
 * ou papel ate chegar aqui - deixa-la valendo indefinidamente e' o que a torna insegura. A
 * API tambem recusa o resto do sistema enquanto a marca existir, entao esta tela nao e'
 * uma sugestao que se fecha no X: ela e' o unico caminho para frente.
 */
export function TrocaDeSenhaObrigatoria() {
  const { user, logout, refresh } = useAuth();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const curta = nova.length > 0 && nova.length < 8;
  const naoConfere = confirmacao.length > 0 && nova !== confirmacao;
  const pronto = atual.length > 0 && nova.length >= 8 && nova === confirmacao;

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await changeOwnPassword(atual, nova);
      // O token e' reemitido pelo servidor sem a marca; recarregar a sessao libera o resto.
      await refresh();
    } catch (error) {
      setErro(getApiErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <form onSubmit={trocar} className="card space-y-4 p-6" noValidate>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-navy-50 p-2 text-navy-700">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-semibold text-navy-900">Crie a sua senha</h1>
              <p className="mt-0.5 text-sm text-graphite-600">
                A senha que voce recebeu e' provisoria e vale so para este primeiro acesso.
                Escolha uma sua para continuar.
              </p>
            </div>
          </div>

          {user && <p className="text-xs text-graphite-500">Entrando como {user.email}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700">Senha provisoria</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700">Nova senha</label>
            <input
              className={`input ${curta ? "input-error" : ""}`}
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
            />
            <p className={`mt-1 text-xs ${curta ? "text-safety-red" : "text-graphite-500"}`}>
              Pelo menos 8 caracteres.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-graphite-700">Repita a nova senha</label>
            <input
              className={`input ${naoConfere ? "input-error" : ""}`}
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
            {naoConfere && <p className="mt-1 text-xs text-safety-red">As duas senhas nao sao iguais.</p>}
          </div>

          {erro && <p className="rounded-lg border border-safety-red/30 bg-red-50/50 px-3 py-2 text-sm text-safety-red">{erro}</p>}

          <button type="submit" className="btn-primary w-full justify-center" disabled={!pronto || salvando}>
            {salvando ? "Salvando..." : "Salvar e entrar"}
          </button>

          <button type="button" className="btn-ghost w-full justify-center text-sm" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );
}
