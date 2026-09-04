-- CreateEnum
CREATE TYPE "MaterialPolicy" AS ENUM ('RESERVE_AUTO', 'BLOCK_AWAITING_MATERIAL', 'ALERT_ONLY', 'DO_NOT_GENERATE');

-- AlterTable: separa o mundo da calibracao (OptiProcess) do mundo do CMMS (cliente).
-- A lista de Ativos da OptiProcess passa a mostrar so os calibraveis; a arvore do CMMS
-- do cliente continua completa.
ALTER TABLE "instruments" ADD COLUMN "calibratable" BOOLEAN NOT NULL DEFAULT false;

-- Ativos que ja tem periodicidade de calibracao ou certificado emitido sao, por definicao,
-- calibraveis - nenhum deles some da lista da OptiProcess por causa desta mudanca.
UPDATE "instruments" SET "calibratable" = true WHERE "calibrationFrequencyMonths" IS NOT NULL;
UPDATE "instruments" i SET "calibratable" = true
WHERE EXISTS (SELECT 1 FROM "calibrations" c WHERE c."instrumentId" = i."id" AND c."deletedAt" IS NULL);

-- AlterTable: como a OS gerada pelo plano nasce.
ALTER TABLE "maintenance_plans" ADD COLUMN "initialWorkOrderStatus" "MaintenanceOrderStatus" NOT NULL DEFAULT 'PROGRAMMED';
ALTER TABLE "maintenance_plans" ADD COLUMN "requiresShutdown" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plans" ADD COLUMN "estimatedShutdownHours" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "requiresOperationalRelease" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plans" ADD COLUMN "requiresLoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plans" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plans" ADD COLUMN "groupWorkOrder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plans" ADD COLUMN "materialPolicy" "MaterialPolicy" NOT NULL DEFAULT 'RESERVE_AUTO';

-- AlterTable: material previsto ganha obrigatoriedade, substituto e fornecedor sugerido.
ALTER TABLE "maintenance_plan_parts" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "maintenance_plan_parts" ADD COLUMN "alternativeSparePartId" TEXT;
ALTER TABLE "maintenance_plan_parts" ADD COLUMN "suggestedSupplier" TEXT;
ALTER TABLE "maintenance_plan_parts" ADD COLUMN "notes" TEXT;
ALTER TABLE "maintenance_plan_parts" ADD CONSTRAINT "maintenance_plan_parts_alternativeSparePartId_fkey" FOREIGN KEY ("alternativeSparePartId") REFERENCES "spare_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: por que cada material previsto foi ou nao reservado na geracao da OS.
CREATE TABLE "work_order_material_logs" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantityNeeded" INTEGER NOT NULL,
    "reserved" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_material_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "work_order_material_logs_workOrderId_idx" ON "work_order_material_logs"("workOrderId");
ALTER TABLE "work_order_material_logs" ADD CONSTRAINT "work_order_material_logs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_order_material_logs" ADD CONSTRAINT "work_order_material_logs_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
