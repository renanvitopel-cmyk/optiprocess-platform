-- CreateTable: templates primeiro (maintenance_plans referencia templateId depois)
CREATE TABLE "maintenance_plan_templates" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "applicableAssetFamily" TEXT,
    "triggerType" "MaintenanceTriggerType" NOT NULL,
    "frequencyDays" INTEGER,
    "meterInterval" DOUBLE PRECISION,
    "toleranceDaysBefore" INTEGER,
    "toleranceDaysAfter" INTEGER,
    "procedure" TEXT,
    "estimatedLaborHours" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_plan_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_plan_template_checklist_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "maintenance_plan_template_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_plan_templates_clientId_idx" ON "maintenance_plan_templates"("clientId");
CREATE UNIQUE INDEX "maintenance_plan_templates_clientId_name_key" ON "maintenance_plan_templates"("clientId", "name");
CREATE INDEX "maintenance_plan_template_checklist_items_templateId_idx" ON "maintenance_plan_template_checklist_items"("templateId");

ALTER TABLE "maintenance_plan_templates" ADD CONSTRAINT "maintenance_plan_templates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_plan_template_checklist_items" ADD CONSTRAINT "maintenance_plan_template_checklist_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "maintenance_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: plano ganha tolerancia, procedimento, HH prevista e vinculo com template
-- (tudo opcional - plano ja cadastrado continua valido sem preencher nada disso)
ALTER TABLE "maintenance_plans" ADD COLUMN "toleranceDaysBefore" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "toleranceDaysAfter" INTEGER;
ALTER TABLE "maintenance_plans" ADD COLUMN "procedure" TEXT;
ALTER TABLE "maintenance_plans" ADD COLUMN "estimatedLaborHours" DOUBLE PRECISION;
ALTER TABLE "maintenance_plans" ADD COLUMN "templateId" TEXT;

CREATE INDEX "maintenance_plans_templateId_idx" ON "maintenance_plans"("templateId");
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "maintenance_plan_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: materiais previstos do plano
CREATE TABLE "maintenance_plan_parts" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "maintenance_plan_parts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_plan_parts_planId_idx" ON "maintenance_plan_parts"("planId");
CREATE INDEX "maintenance_plan_parts_sparePartId_idx" ON "maintenance_plan_parts"("sparePartId");

ALTER TABLE "maintenance_plan_parts" ADD CONSTRAINT "maintenance_plan_parts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_plan_parts" ADD CONSTRAINT "maintenance_plan_parts_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
