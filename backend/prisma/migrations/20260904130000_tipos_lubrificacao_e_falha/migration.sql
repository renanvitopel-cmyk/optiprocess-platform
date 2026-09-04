-- Tipos de OS e de plano alinhados ao que a manutencao industrial usa de fato.
ALTER TYPE "MaintenanceOrderType" ADD VALUE IF NOT EXISTS 'LUBRICATION';
ALTER TYPE "MaintenanceOrderType" ADD VALUE IF NOT EXISTS 'INSPECTION';
ALTER TYPE "MaintenanceOrderType" ADD VALUE IF NOT EXISTS 'PROJECT';

ALTER TYPE "MaintenancePlanType" ADD VALUE IF NOT EXISTS 'PREDICTIVE';
ALTER TYPE "MaintenancePlanType" ADD VALUE IF NOT EXISTS 'ELECTRICAL';
ALTER TYPE "MaintenancePlanType" ADD VALUE IF NOT EXISTS 'MECHANICAL';

-- Registro de falha: laudo e acao corretiva especifica da falha.
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureDescription" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureCorrectiveAction" TEXT;

-- Tempo estimado por item de checklist.
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER;

-- Plano de lubrificacao: lubrificante, pontos, quantidade e metodo.
DO $$ BEGIN
  CREATE TYPE "LubricationMethod" AS ENUM ('MANUAL_GUN', 'AUTOMATIC_CENTRAL', 'OIL_BATH', 'IMMERSION', 'BRUSH', 'SPRAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "lubricantSparePartId" TEXT;
ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "lubricationPoints" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "lubricantQtyPerPoint" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "lubricationMethod" "LubricationMethod";

DO $$ BEGIN
  ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_lubricantSparePartId_fkey"
    FOREIGN KEY ("lubricantSparePartId") REFERENCES "spare_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
