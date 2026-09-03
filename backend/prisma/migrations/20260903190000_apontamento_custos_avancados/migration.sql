-- CreateEnum
CREATE TYPE "LaborHourType" AS ENUM ('NORMAL', 'OVERTIME', 'NIGHT');
CREATE TYPE "SparePartReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

-- AlterTable: apontamento de mao de obra ganha inicio/fim/tipo de hora/observacao (tudo
-- opcional - lancamentos antigos continuam validos sem preencher nada disso)
ALTER TABLE "work_order_labor" ADD COLUMN "hourType" "LaborHourType";
ALTER TABLE "work_order_labor" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "work_order_labor" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "work_order_labor" ADD COLUMN "notes" TEXT;

-- AlterTable: almoxarifado ganha saldo reservado (comprometido com alguma OS)
ALTER TABLE "spare_parts" ADD COLUMN "reservedQty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "work_order_third_party_services" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_third_party_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part_reservations" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "SparePartReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "spare_part_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stoppage_reasons" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stoppage_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_stoppages" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "reasonId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_stoppages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_order_third_party_services_workOrderId_idx" ON "work_order_third_party_services"("workOrderId");
CREATE INDEX "spare_part_reservations_sparePartId_idx" ON "spare_part_reservations"("sparePartId");
CREATE INDEX "spare_part_reservations_workOrderId_idx" ON "spare_part_reservations"("workOrderId");
CREATE INDEX "stoppage_reasons_clientId_idx" ON "stoppage_reasons"("clientId");
CREATE UNIQUE INDEX "stoppage_reasons_clientId_name_key" ON "stoppage_reasons"("clientId", "name");
CREATE INDEX "work_order_stoppages_workOrderId_idx" ON "work_order_stoppages"("workOrderId");

-- AddForeignKey
ALTER TABLE "work_order_third_party_services" ADD CONSTRAINT "work_order_third_party_services_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spare_part_reservations" ADD CONSTRAINT "spare_part_reservations_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "spare_part_reservations" ADD CONSTRAINT "spare_part_reservations_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stoppage_reasons" ADD CONSTRAINT "stoppage_reasons_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_stoppages" ADD CONSTRAINT "work_order_stoppages_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_stoppages" ADD CONSTRAINT "work_order_stoppages_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "stoppage_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
