-- AlterTable: rastreabilidade preventiva -> corretiva (anomalia encontrada no checklist
-- abre automaticamente uma OS corretiva vinculada a OS de origem e ao item especifico).
ALTER TABLE "maintenance_work_orders" ADD COLUMN "originWorkOrderId" TEXT;
ALTER TABLE "maintenance_work_orders" ADD COLUMN "originChecklistItemId" TEXT;

CREATE INDEX "maintenance_work_orders_originWorkOrderId_idx" ON "maintenance_work_orders"("originWorkOrderId");
CREATE UNIQUE INDEX "maintenance_work_orders_originChecklistItemId_key" ON "maintenance_work_orders"("originChecklistItemId");

ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_originWorkOrderId_fkey" FOREIGN KEY ("originWorkOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_originChecklistItemId_fkey" FOREIGN KEY ("originChecklistItemId") REFERENCES "maintenance_work_order_checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
