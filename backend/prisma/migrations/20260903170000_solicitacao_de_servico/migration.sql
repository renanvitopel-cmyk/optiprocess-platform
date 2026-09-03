-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('OPEN', 'IN_TRIAGE', 'AWAITING_INFO', 'PLANNED', 'CONVERTED', 'REJECTED', 'CLOSED');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'SERVICE_REQUEST';

-- CreateTable
CREATE TABLE "service_request_categories" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedById" TEXT,
    "areaId" TEXT,
    "instrumentId" TEXT,
    "location" TEXT,
    "categoryId" TEXT,
    "description" TEXT NOT NULL,
    "safetyImpact" BOOLEAN NOT NULL DEFAULT false,
    "qualityImpact" BOOLEAN NOT NULL DEFAULT false,
    "productionImpact" BOOLEAN NOT NULL DEFAULT false,
    "suggestedPriority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'OPEN',
    "triageById" TEXT,
    "triageNotes" TEXT,
    "rejectionReason" TEXT,
    "workOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_categories_clientId_idx" ON "service_request_categories"("clientId");
CREATE UNIQUE INDEX "service_request_categories_clientId_name_key" ON "service_request_categories"("clientId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_workOrderId_key" ON "service_requests"("workOrderId");
CREATE INDEX "service_requests_clientId_idx" ON "service_requests"("clientId");
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");
CREATE INDEX "service_requests_instrumentId_idx" ON "service_requests"("instrumentId");
CREATE INDEX "service_requests_areaId_idx" ON "service_requests"("areaId");
CREATE UNIQUE INDEX "service_requests_clientId_number_key" ON "service_requests"("clientId", "number");

-- AddForeignKey
ALTER TABLE "service_request_categories" ADD CONSTRAINT "service_request_categories_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_request_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_triageById_fkey" FOREIGN KEY ("triageById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
