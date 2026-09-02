-- CreateEnum
CREATE TYPE "MaintenanceTriggerType" AS ENUM ('TIME', 'METER');

-- CreateEnum
CREATE TYPE "MaintenanceOrderType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ChecklistItemResult" AS ENUM ('PENDING', 'OK', 'NOT_OK', 'NA');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'MAINTENANCE_WORK_ORDER';

-- AlterEnum
ALTER TYPE "ServiceCategory" ADD VALUE 'CMMS_MAINTENANCE';

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "maintenanceWorkOrderId" TEXT;

-- CreateTable
CREATE TABLE "meters" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failure_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "MaintenanceTriggerType" NOT NULL,
    "frequencyDays" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "meterId" TEXT,
    "meterInterval" DOUBLE PRECISION,
    "lastGeneratedAt" TIMESTAMP(3),
    "lastMeterAtGeneration" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "responsibleId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plan_checklist_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "maintenance_plan_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_work_orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "planId" TEXT,
    "type" "MaintenanceOrderType" NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceOrderStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "technicianId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCodeId" TEXT,
    "meterReadingAtExecution" DOUBLE PRECISION,
    "laborHours" DOUBLE PRECISION,
    "observations" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_work_order_checklist_items" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "result" "ChecklistItemResult" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "maintenance_work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meters_instrumentId_idx" ON "meters"("instrumentId");

-- CreateIndex
CREATE INDEX "meter_readings_meterId_idx" ON "meter_readings"("meterId");

-- CreateIndex
CREATE INDEX "meter_readings_readAt_idx" ON "meter_readings"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "failure_codes_code_key" ON "failure_codes"("code");

-- CreateIndex
CREATE INDEX "maintenance_plans_clientId_idx" ON "maintenance_plans"("clientId");

-- CreateIndex
CREATE INDEX "maintenance_plans_instrumentId_idx" ON "maintenance_plans"("instrumentId");

-- CreateIndex
CREATE INDEX "maintenance_plans_nextDueDate_idx" ON "maintenance_plans"("nextDueDate");

-- CreateIndex
CREATE INDEX "maintenance_plan_checklist_items_planId_idx" ON "maintenance_plan_checklist_items"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_work_orders_number_key" ON "maintenance_work_orders"("number");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_clientId_idx" ON "maintenance_work_orders"("clientId");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_instrumentId_idx" ON "maintenance_work_orders"("instrumentId");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_planId_idx" ON "maintenance_work_orders"("planId");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_status_idx" ON "maintenance_work_orders"("status");

-- CreateIndex
CREATE INDEX "maintenance_work_order_checklist_items_workOrderId_idx" ON "maintenance_work_order_checklist_items"("workOrderId");

-- CreateIndex
CREATE INDEX "inventory_movements_maintenanceWorkOrderId_idx" ON "inventory_movements"("maintenanceWorkOrderId");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_maintenanceWorkOrderId_fkey" FOREIGN KEY ("maintenanceWorkOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meters" ADD CONSTRAINT "meters_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "meters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plan_checklist_items" ADD CONSTRAINT "maintenance_plan_checklist_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_planId_fkey" FOREIGN KEY ("planId") REFERENCES "maintenance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_orders" ADD CONSTRAINT "maintenance_work_orders_failureCodeId_fkey" FOREIGN KEY ("failureCodeId") REFERENCES "failure_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_order_checklist_items" ADD CONSTRAINT "maintenance_work_order_checklist_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

