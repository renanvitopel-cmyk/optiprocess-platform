-- AlterTable: quadro de programacao do PCM - a OS passa a poder ser atribuida a uma
-- pessoa do catalogo de mao de obra do proprio cliente (LaborResource), que e' o eixo
-- do calendario semanal. technicianId (usuario interno OptiProcess) continua existindo.
ALTER TABLE "maintenance_work_orders" ADD COLUMN "assignedResourceId" TEXT;

CREATE INDEX "maintenance_work_orders_assignedResourceId_idx" ON "maintenance_work_orders"("assignedResourceId");
CREATE INDEX "maintenance_work_orders_scheduledDate_idx" ON "maintenance_work_orders"("scheduledDate");

ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_assignedResourceId_fkey" FOREIGN KEY ("assignedResourceId") REFERENCES "labor_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
