-- CreateEnum
CREATE TYPE "ChecklistResponseType" AS ENUM ('YES_NO_NA', 'TEXT', 'NUMBER', 'PHOTO', 'SIGNATURE');

-- AlterTable: item do checklist do plano ganha secao, obrigatoriedade, tipo de resposta,
-- faixa de medicao e referencia a procedimento/desenho.
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "section" TEXT;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "responseType" "ChecklistResponseType" NOT NULL DEFAULT 'YES_NO_NA';
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "unit" TEXT;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "minValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "maxValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "targetValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "requiresPhoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_plan_checklist_items" ADD COLUMN "reference" TEXT;

-- AlterTable: o item da OS guarda a propria regra (copiada na geracao, para o historico
-- nao mudar se o plano for editado depois) e o que o executante preencheu.
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "section" TEXT;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "responseType" "ChecklistResponseType" NOT NULL DEFAULT 'YES_NO_NA';
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "unit" TEXT;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "minValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "maxValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "targetValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "requiresPhoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "reference" TEXT;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "numericValue" DOUBLE PRECISION;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "textValue" TEXT;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "signedBy" TEXT;
ALTER TABLE "maintenance_work_order_checklist_items" ADD COLUMN "signedAt" TIMESTAMP(3);
