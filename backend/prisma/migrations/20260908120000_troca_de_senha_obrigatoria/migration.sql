-- Senha definida por outra pessoa (no cadastro do acesso ou numa redefinicao) e' provisoria
-- por natureza: ela passa por e-mail, WhatsApp ou papel ate chegar em quem vai usar. Esta
-- marca obriga a troca no primeiro acesso, e so entao o resto do sistema abre.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Ninguem que ja usa o sistema e' obrigado a trocar agora: a marca vale daqui para frente.
