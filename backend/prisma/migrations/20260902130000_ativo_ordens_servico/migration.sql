-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "instrumentId" TEXT;

-- CreateIndex
CREATE INDEX "service_orders_instrumentId_idx" ON "service_orders"("instrumentId");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
