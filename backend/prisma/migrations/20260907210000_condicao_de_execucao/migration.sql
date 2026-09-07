-- A conversao de solicitacao em OS era um clique: a OS nascia corretiva, com a descricao
-- escrita pelo operador e nada mais. Faltava o passo do planejador - reescrever o que sera
-- feito e dizer COMO sera feito. Estas colunas guardam essa decisao.
CREATE TYPE "WorkOrderExecutionCondition" AS ENUM ('MACHINE_RUNNING', 'OPPORTUNITY_STOP', 'PLANNED_SHUTDOWN');

ALTER TABLE "maintenance_work_orders"
  ADD COLUMN IF NOT EXISTS "executionCondition" "WorkOrderExecutionCondition",
  ADD COLUMN IF NOT EXISTS "needsPurchase" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "purchaseNotes" TEXT;
