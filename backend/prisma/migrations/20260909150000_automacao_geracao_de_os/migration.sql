-- Interruptor geral da geracao automatica de OS a partir dos planos preventivos, mais o
-- que aconteceu na ultima rodada. Linha unica (id fixo "singleton").
CREATE TABLE IF NOT EXISTS "automation_settings" (
  "id" TEXT NOT NULL,
  "planGenerationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "lastRunGeneratedCount" INTEGER,
  "lastRunIgnoredCount" INTEGER,
  "lastRunErrorCount" INTEGER,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "automation_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "automation_settings" ("id", "planGenerationEnabled", "updatedAt")
VALUES ('singleton', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
