-- Campos de identificacao, planejamento e encerramento da ordem de manutencao.
-- Todos opcionais: nenhuma OS existente precisa ser preenchida de novo.
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "costCenterId" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "plannedStart" TIMESTAMP(3);
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "plannedEnd" TIMESTAMP(3);
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "executionNotes" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "closureNotes" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "closedById" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "maintenance_work_orders_costCenterId_idx" ON "maintenance_work_orders"("costCenterId");

DO $$ BEGIN
  ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_costCenterId_fkey"
    FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_closedById_fkey"
    FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Instrucoes gerais do plano, herdadas por toda OS gerada a partir dele.
ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
