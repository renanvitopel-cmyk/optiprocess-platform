-- CreateEnum
CREATE TYPE "MaintenanceFrequencyUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');
CREATE TYPE "OperationalCalendar" AS ENUM ('ALL_DAYS', 'BUSINESS_DAYS');
CREATE TYPE "MeterResetRule" AS ENUM ('CONTINUE', 'RESET_BASE');
CREATE TYPE "MaintenanceTriggerMode" AS ENUM ('FIRST_DUE', 'ALL_DUE');

-- Ciclo de producao e contador de partidas nao viram tipos proprios: sao METER com a
-- unidade do medidor. CONDITION e' o unico gatilho novo de verdade.
ALTER TYPE "MaintenanceTriggerType" ADD VALUE 'CONDITION';

-- AlterTable: agendamento do plano.
ALTER TABLE "maintenance_plans" ADD COLUMN "frequencyUnit" "MaintenanceFrequencyUnit" NOT NULL DEFAULT 'DAY';
ALTER TABLE "maintenance_plans" ADD COLUMN "frequencyEvery" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "baseDate" TIMESTAMP(3);
ALTER TABLE "maintenance_plans" ADD COLUMN "lastExecutionAt" TIMESTAMP(3);
ALTER TABLE "maintenance_plans" ADD COLUMN "dayOfWeek" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "dayOfMonth" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "monthOfYear" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "operationalCalendar" "OperationalCalendar" NOT NULL DEFAULT 'ALL_DAYS';
ALTER TABLE "maintenance_plans" ADD COLUMN "blockedDates" TIMESTAMP(3)[];
ALTER TABLE "maintenance_plans" ADD COLUMN "generateAdvanceDays" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "meterBaseReading" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "generateAdvanceMeterUnits" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "toleranceMeterBefore" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "toleranceMeterAfter" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "meterResetRule" "MeterResetRule" NOT NULL DEFAULT 'CONTINUE';
ALTER TABLE "maintenance_plans" ADD COLUMN "triggerMode" "MaintenanceTriggerMode" NOT NULL DEFAULT 'FIRST_DUE';
ALTER TABLE "maintenance_plans" ADD COLUMN "conditionMeterId" TEXT;

CREATE INDEX "maintenance_plans_conditionMeterId_idx" ON "maintenance_plans"("conditionMeterId");
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_conditionMeterId_fkey" FOREIGN KEY ("conditionMeterId") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Planos existentes: a periodicidade em dias vira "a cada N dias" e a data-base recebe a
-- ultima geracao (ou a criacao), para o proximo vencimento continuar caindo onde caia.
UPDATE "maintenance_plans"
SET "frequencyEvery" = "frequencyDays",
    "baseDate" = COALESCE("lastGeneratedAt", "createdAt")
WHERE "frequencyDays" IS NOT NULL;
