-- DropIndex
DROP INDEX "maintenance_work_orders_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_work_orders_clientId_number_key" ON "maintenance_work_orders"("clientId", "number");

