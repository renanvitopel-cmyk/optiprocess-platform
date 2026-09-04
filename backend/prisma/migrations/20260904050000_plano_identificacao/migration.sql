-- CreateEnum
CREATE TYPE "MaintenancePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "MaintenancePlanType" AS ENUM ('PREVENTIVE', 'INSPECTION', 'LUBRICATION', 'CALIBRATION', 'REGULATORY', 'OTHER');
CREATE TYPE "MaintenancePlanScope" AS ENUM ('SINGLE_ASSET', 'ASSET_FAMILY');

-- AlterTable: identificacao do plano.
ALTER TABLE "maintenance_plans" ADD COLUMN "code" TEXT;
ALTER TABLE "maintenance_plans" ADD COLUMN "status" "MaintenancePlanStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "maintenance_plans" ADD COLUMN "planType" "MaintenancePlanType" NOT NULL DEFAULT 'PREVENTIVE';
ALTER TABLE "maintenance_plans" ADD COLUMN "scope" "MaintenancePlanScope" NOT NULL DEFAULT 'SINGLE_ASSET';
ALTER TABLE "maintenance_plans" ADD COLUMN "defaultPriority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "maintenance_plans" ADD COLUMN "specialtyId" TEXT;

CREATE INDEX "maintenance_plans_status_idx" ON "maintenance_plans"("status");
CREATE INDEX "maintenance_plans_specialtyId_idx" ON "maintenance_plans"("specialtyId");
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "labor_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Planos que ja existiam: o boolean "active" vira o status equivalente, sem perder nada.
UPDATE "maintenance_plans" SET "status" = 'SUSPENDED' WHERE "active" = false;

-- Codigo PM-0001 para os planos ja cadastrados, numerando por cliente na ordem de criacao,
-- e o contador de cada cliente segue de onde parou (mesma tabela usada por OS e SS).
WITH numerados AS (
  SELECT "id", "clientId",
         ROW_NUMBER() OVER (PARTITION BY "clientId" ORDER BY "createdAt", "id") AS seq
  FROM "maintenance_plans"
)
UPDATE "maintenance_plans" p
SET "code" = 'PM-' || LPAD(n.seq::text, 4, '0')
FROM numerados n
WHERE p."id" = n."id";

INSERT INTO "counters" ("key", "value")
SELECT 'maintenancePlan:' || "clientId", COUNT(*)
FROM "maintenance_plans"
GROUP BY "clientId"
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
