-- CreateEnum
CREATE TYPE "RcaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'ROOT_CAUSE_ANALYSIS';

-- AlterTable: taxonomia de falha (tudo opcional - codigo+descricao continuam bastando)
ALTER TABLE "failure_codes" ADD COLUMN "symptom" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "mode" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "mechanism" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "cause" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "correctiveAction" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "applicableAssetFamily" TEXT;
ALTER TABLE "failure_codes" ADD COLUMN "severity" "MaintenancePriority";

-- CreateTable
CREATE TABLE "root_cause_analyses" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "instrumentId" TEXT,
    "workOrderId" TEXT,
    "problem" TEXT NOT NULL,
    "participants" TEXT,
    "why1" TEXT,
    "why2" TEXT,
    "why3" TEXT,
    "why4" TEXT,
    "why5" TEXT,
    "rootCause" TEXT,
    "correctiveActions" TEXT,
    "preventiveActions" TEXT,
    "responsibleId" TEXT,
    "dueDate" TIMESTAMP(3),
    "effectivenessVerifiedAt" TIMESTAMP(3),
    "effectivenessNotes" TEXT,
    "status" "RcaStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "root_cause_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "root_cause_analyses_clientId_idx" ON "root_cause_analyses"("clientId");
CREATE INDEX "root_cause_analyses_instrumentId_idx" ON "root_cause_analyses"("instrumentId");
CREATE INDEX "root_cause_analyses_status_idx" ON "root_cause_analyses"("status");

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
