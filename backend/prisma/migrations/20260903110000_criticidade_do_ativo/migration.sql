-- AlterTable
ALTER TABLE "instruments" ADD COLUMN "criticality" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM';
