-- CreateTable: planos comerciais (independente de Client, entra antes por causa da FK)
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION,
    "maxUsers" INTEGER,
    "maxInstruments" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- AlterTable: cliente ganha plano de assinatura opcional (null = sem limite, compativel
-- com todo cliente ja cadastrado antes da Fase 7).
ALTER TABLE "clients" ADD COLUMN "planId" TEXT;
ALTER TABLE "clients" ADD COLUMN "planStartedAt" TIMESTAMP(3);

CREATE INDEX "clients_planId_idx" ON "clients"("planId");
ALTER TABLE "clients" ADD CONSTRAINT "clients_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
