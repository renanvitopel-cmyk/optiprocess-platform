-- A geracao automatica passa a ser um interruptor por cliente, nao um global: e' o
-- cliente quem decide se quer a propria rodada ligada, nao a OptiProcess. A tabela
-- anterior (linha unica "singleton") nao tinha dado real - so' um registro de teste -
-- entao e' seguro recriar em vez de migrar coluna por coluna.
DROP TABLE IF EXISTS "automation_settings";

CREATE TABLE "automation_settings" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "planGenerationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "lastRunGeneratedCount" INTEGER,
  "lastRunIgnoredCount" INTEGER,
  "lastRunErrorCount" INTEGER,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_settings_clientId_key" ON "automation_settings"("clientId");

ALTER TABLE "automation_settings"
  ADD CONSTRAINT "automation_settings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
