-- AlterTable
ALTER TABLE "spare_parts" ADD COLUMN "unitCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "spare_part_movements" ADD COLUMN "unitCost" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "labor_types" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labor_types_clientId_idx" ON "labor_types"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "labor_types_clientId_name_key" ON "labor_types"("clientId", "name");

-- AddForeignKey
ALTER TABLE "labor_types" ADD CONSTRAINT "labor_types_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "labor_resources" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "labor_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labor_resources_clientId_idx" ON "labor_resources"("clientId");

-- AddForeignKey
ALTER TABLE "labor_resources" ADD CONSTRAINT "labor_resources_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "work_order_labor" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "laborResourceId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "hourlyRateSnapshot" DOUBLE PRECISION,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_order_labor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_order_labor_workOrderId_idx" ON "work_order_labor"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_labor_laborResourceId_idx" ON "work_order_labor"("laborResourceId");

-- AddForeignKey
ALTER TABLE "work_order_labor" ADD CONSTRAINT "work_order_labor_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_labor" ADD CONSTRAINT "work_order_labor_laborResourceId_fkey" FOREIGN KEY ("laborResourceId") REFERENCES "labor_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
