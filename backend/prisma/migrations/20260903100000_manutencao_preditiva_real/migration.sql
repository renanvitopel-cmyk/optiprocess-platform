-- AlterTable
ALTER TABLE "meters" ADD COLUMN "minThreshold" DOUBLE PRECISION,
ADD COLUMN "maxThreshold" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "meter_readings" ADD COLUMN "alertTriggered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "maintenance_work_orders" ADD COLUMN "triggeredByMeterId" TEXT;

-- CreateIndex
CREATE INDEX "maintenance_work_orders_triggeredByMeterId_idx" ON "maintenance_work_orders"("triggeredByMeterId");

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_triggeredByMeterId_fkey" FOREIGN KEY ("triggeredByMeterId") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
