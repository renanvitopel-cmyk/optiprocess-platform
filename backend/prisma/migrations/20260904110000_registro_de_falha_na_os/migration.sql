-- Registro de falha preenchido pelo tecnico na OS corretiva.
DO $$ BEGIN
  CREATE TYPE "FailureSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureStartedAt" TIMESTAMP(3);
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureEndedAt" TIMESTAMP(3);
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureSeverity" "FailureSeverity";
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "failureRootCause" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "productionLoss" DOUBLE PRECISION;
