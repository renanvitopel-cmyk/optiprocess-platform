-- Distingue corretiva em operacao de corretiva de quebra.
-- Coluna opcional: as OS corretivas ja existentes ficam sem classificacao (nao ha como
-- saber, hoje, se pararam a maquina ou nao) e serao classificadas ao serem concluidas.
DO $$ BEGIN
  CREATE TYPE "CorrectiveType" AS ENUM ('IN_OPERATION', 'BREAKDOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "correctiveType" "CorrectiveType";
