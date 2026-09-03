-- CreateTable
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_systems" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "asset_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plants_clientId_idx" ON "plants"("clientId");
CREATE UNIQUE INDEX "plants_clientId_name_key" ON "plants"("clientId", "name");

-- CreateIndex
CREATE INDEX "areas_clientId_idx" ON "areas"("clientId");
CREATE INDEX "areas_plantId_idx" ON "areas"("plantId");
CREATE UNIQUE INDEX "areas_plantId_name_key" ON "areas"("plantId", "name");

-- CreateIndex
CREATE INDEX "asset_systems_clientId_idx" ON "asset_systems"("clientId");
CREATE INDEX "asset_systems_areaId_idx" ON "asset_systems"("areaId");
CREATE UNIQUE INDEX "asset_systems_areaId_name_key" ON "asset_systems"("areaId", "name");

-- CreateIndex
CREATE INDEX "cost_centers_clientId_idx" ON "cost_centers"("clientId");
CREATE UNIQUE INDEX "cost_centers_clientId_name_key" ON "cost_centers"("clientId", "name");

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "areas" ADD CONSTRAINT "areas_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_systems" ADD CONSTRAINT "asset_systems_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_systems" ADD CONSTRAINT "asset_systems_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: liga o ativo a planta/area/sistema/centro de custo (tudo opcional - nao
-- quebra nenhum ativo ja cadastrado)
ALTER TABLE "instruments" ADD COLUMN "plantId" TEXT;
ALTER TABLE "instruments" ADD COLUMN "areaId" TEXT;
ALTER TABLE "instruments" ADD COLUMN "systemId" TEXT;
ALTER TABLE "instruments" ADD COLUMN "costCenterId" TEXT;

CREATE INDEX "instruments_plantId_idx" ON "instruments"("plantId");
CREATE INDEX "instruments_areaId_idx" ON "instruments"("areaId");
CREATE INDEX "instruments_systemId_idx" ON "instruments"("systemId");
CREATE INDEX "instruments_costCenterId_idx" ON "instruments"("costCenterId");

ALTER TABLE "instruments" ADD CONSTRAINT "instruments_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "asset_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
