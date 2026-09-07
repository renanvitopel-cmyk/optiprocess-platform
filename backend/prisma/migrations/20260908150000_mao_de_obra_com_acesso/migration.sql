-- Liga a pessoa do cadastro de mao de obra ao acesso dela no sistema.
--
-- Eram duas coisas separadas: "Joao Silva" na mao de obra (que aparece na programacao e
-- carrega o valor/hora) e "joao@empresa" no login. Sem a ligacao, o proprio Joao nao tinha
-- como assumir uma OS - o sistema nao sabia que aquele login e' aquela pessoa da equipe.
ALTER TABLE "labor_resources" ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$ BEGIN
  ALTER TABLE "labor_resources"
    ADD CONSTRAINT "labor_resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Um acesso corresponde a uma pessoa so na equipe.
CREATE UNIQUE INDEX IF NOT EXISTS "labor_resources_userId_key" ON "labor_resources"("userId");
