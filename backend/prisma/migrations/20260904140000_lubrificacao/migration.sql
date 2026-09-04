-- Modulo de lubrificacao: ficha do lubrificante, pontos, rotas e registro de aplicacao.

DO $$ BEGIN CREATE TYPE "LubricantType" AS ENUM ('GREASE', 'OIL', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LubricantBase" AS ENUM ('MINERAL', 'SYNTHETIC', 'SEMI_SYNTHETIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MachineStateForLubrication" AS ENUM ('STOPPED', 'RUNNING', 'ANY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LubricationCondition" AS ENUM ('NORMAL', 'LOW', 'DRY', 'CONTAMINATED', 'EXCESS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "lubricants" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sparePartId" TEXT NOT NULL,
  "type" "LubricantType" NOT NULL DEFAULT 'GREASE',
  "specification" TEXT,
  "base" "LubricantBase",
  "manufacturer" TEXT,
  "application" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "lubricants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lubricants_sparePartId_key" ON "lubricants"("sparePartId");
CREATE INDEX IF NOT EXISTS "lubricants_clientId_idx" ON "lubricants"("clientId");

CREATE TABLE IF NOT EXISTS "lubrication_points" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "component" TEXT,
  "lubricantId" TEXT NOT NULL,
  "quantityPerApplication" DOUBLE PRECISION NOT NULL,
  "method" "LubricationMethod" NOT NULL,
  "frequencyDays" INTEGER NOT NULL,
  "machineState" "MachineStateForLubrication" NOT NULL DEFAULT 'ANY',
  "accessNotes" TEXT,
  "safetyNotes" TEXT,
  "lastLubricatedAt" TIMESTAMP(3),
  "nextDueAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "lubrication_points_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lubrication_points_clientId_code_key" ON "lubrication_points"("clientId", "code");
CREATE INDEX IF NOT EXISTS "lubrication_points_clientId_idx" ON "lubrication_points"("clientId");
CREATE INDEX IF NOT EXISTS "lubrication_points_instrumentId_idx" ON "lubrication_points"("instrumentId");
CREATE INDEX IF NOT EXISTS "lubrication_points_lubricantId_idx" ON "lubrication_points"("lubricantId");
CREATE INDEX IF NOT EXISTS "lubrication_points_nextDueAt_idx" ON "lubrication_points"("nextDueAt");

CREATE TABLE IF NOT EXISTS "lubrication_routes" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "plantId" TEXT,
  "areaId" TEXT,
  "responsibleId" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "lubrication_routes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lubrication_routes_clientId_idx" ON "lubrication_routes"("clientId");

CREATE TABLE IF NOT EXISTS "lubrication_route_items" (
  "id" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "pointId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "lubrication_route_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lubrication_route_items_routeId_pointId_key" ON "lubrication_route_items"("routeId", "pointId");
CREATE INDEX IF NOT EXISTS "lubrication_route_items_routeId_idx" ON "lubrication_route_items"("routeId");

CREATE TABLE IF NOT EXISTS "lubrication_records" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "pointId" TEXT NOT NULL,
  "lubricantId" TEXT NOT NULL,
  "workOrderId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "laborResourceId" TEXT,
  "conditionBefore" "LubricationCondition",
  "conditionAfter" "LubricationCondition",
  "notes" TEXT,
  "movementId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lubrication_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lubrication_records_movementId_key" ON "lubrication_records"("movementId");
CREATE INDEX IF NOT EXISTS "lubrication_records_clientId_idx" ON "lubrication_records"("clientId");
CREATE INDEX IF NOT EXISTS "lubrication_records_pointId_idx" ON "lubrication_records"("pointId");
CREATE INDEX IF NOT EXISTS "lubrication_records_executedAt_idx" ON "lubrication_records"("executedAt");

-- Plano de lubrificacao passa a agendar uma ROTA. Os campos soltos de lubrificante que o
-- plano tinha viraram especificacao do ponto; o conteudo que houver e' preservado nas
-- instrucoes do plano antes de as colunas sairem, para nada se perder em silencio.
ALTER TABLE "maintenance_plans" ADD COLUMN IF NOT EXISTS "lubricationRouteId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_plans' AND column_name = 'lubricationPoints') THEN
    UPDATE "maintenance_plans"
       SET "instructions" = COALESCE("instructions", '') ||
           ' | Lubrificacao (cadastro anterior): ' ||
           COALESCE("lubricationPoints"::text, '?') || ' ponto(s), ' ||
           COALESCE("lubricantQtyPerPoint"::text, '?') || ' por ponto, metodo ' ||
           COALESCE("lubricationMethod"::text, 'nao informado') ||
           '. Recadastre como pontos de lubrificacao.'
     WHERE "lubricationPoints" IS NOT NULL
        OR "lubricantQtyPerPoint" IS NOT NULL
        OR "lubricationMethod" IS NOT NULL
        OR "lubricantSparePartId" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE "maintenance_plans" DROP COLUMN IF EXISTS "lubricantSparePartId";
ALTER TABLE "maintenance_plans" DROP COLUMN IF EXISTS "lubricationPoints";
ALTER TABLE "maintenance_plans" DROP COLUMN IF EXISTS "lubricantQtyPerPoint";
ALTER TABLE "maintenance_plans" DROP COLUMN IF EXISTS "lubricationMethod";

ALTER TABLE "lubricants" ADD CONSTRAINT "lubricants_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubricants" ADD CONSTRAINT "lubricants_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_points" ADD CONSTRAINT "lubrication_points_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_points" ADD CONSTRAINT "lubrication_points_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_points" ADD CONSTRAINT "lubrication_points_lubricantId_fkey" FOREIGN KEY ("lubricantId") REFERENCES "lubricants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_routes" ADD CONSTRAINT "lubrication_routes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_routes" ADD CONSTRAINT "lubrication_routes_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lubrication_routes" ADD CONSTRAINT "lubrication_routes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lubrication_routes" ADD CONSTRAINT "lubrication_routes_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "labor_resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lubrication_route_items" ADD CONSTRAINT "lubrication_route_items_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "lubrication_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lubrication_route_items" ADD CONSTRAINT "lubrication_route_items_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "lubrication_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lubrication_records" ADD CONSTRAINT "lubrication_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_records" ADD CONSTRAINT "lubrication_records_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "lubrication_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_records" ADD CONSTRAINT "lubrication_records_lubricantId_fkey" FOREIGN KEY ("lubricantId") REFERENCES "lubricants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lubrication_records" ADD CONSTRAINT "lubrication_records_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "maintenance_work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lubrication_records" ADD CONSTRAINT "lubrication_records_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "spare_part_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_lubricationRouteId_fkey" FOREIGN KEY ("lubricationRouteId") REFERENCES "lubrication_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
