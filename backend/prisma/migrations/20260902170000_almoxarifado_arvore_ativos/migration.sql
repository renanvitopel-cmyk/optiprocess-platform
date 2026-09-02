-- DropForeignKey
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_maintenanceWorkOrderId_fkey";

-- DropIndex
DROP INDEX "inventory_movements_maintenanceWorkOrderId_idx";

-- AlterTable
ALTER TABLE "instruments" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "inventory_movements" DROP COLUMN "maintenanceWorkOrderId";

-- CreateTable
CREATE TABLE "spare_parts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part_movements" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "maintenanceWorkOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spare_part_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_parts" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spare_parts_code_key" ON "spare_parts"("code");

-- CreateIndex
CREATE INDEX "spare_parts_active_idx" ON "spare_parts"("active");

-- CreateIndex
CREATE INDEX "spare_part_movements_sparePartId_idx" ON "spare_part_movements"("sparePartId");

-- CreateIndex
CREATE INDEX "spare_part_movements_maintenanceWorkOrderId_idx" ON "spare_part_movements"("maintenanceWorkOrderId");

-- CreateIndex
CREATE INDEX "asset_parts_instrumentId_idx" ON "asset_parts"("instrumentId");

-- CreateIndex
CREATE INDEX "asset_parts_sparePartId_idx" ON "asset_parts"("sparePartId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_parts_instrumentId_sparePartId_key" ON "asset_parts"("instrumentId", "sparePartId");

-- CreateIndex
CREATE INDEX "instruments_parentId_idx" ON "instruments"("parentId");

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_movements" ADD CONSTRAINT "spare_part_movements_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spare_part_movements" ADD CONSTRAINT "spare_part_movements_maintenanceWorkOrderId_fkey" FOREIGN KEY ("maintenanceWorkOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_parts" ADD CONSTRAINT "asset_parts_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_parts" ADD CONSTRAINT "asset_parts_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

