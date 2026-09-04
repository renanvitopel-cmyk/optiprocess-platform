-- CreateEnum: tecnicas preditivas, direcao do limite e zonas de condicao.
CREATE TYPE "PredictiveTechnique" AS ENUM ('COUNTER', 'VIBRATION', 'THERMOGRAPHY', 'OIL_ANALYSIS', 'ULTRASOUND', 'MOTOR_CURRENT', 'VISUAL', 'OTHER');
CREATE TYPE "MeasurementDirection" AS ENUM ('UPPER', 'LOWER', 'RANGE');
CREATE TYPE "ConditionSeverity" AS ENUM ('NORMAL', 'WARNING', 'ALARM', 'CRITICAL');

-- AlterTable: o medidor vira ponto de medicao preditivo. Os medidores ja cadastrados
-- continuam funcionando igual: COUNTER + RANGE reproduzem exatamente o comportamento
-- anterior (fora de min/max = alarme).
ALTER TABLE "meters" ADD COLUMN "technique" "PredictiveTechnique" NOT NULL DEFAULT 'COUNTER';
ALTER TABLE "meters" ADD COLUMN "direction" "MeasurementDirection" NOT NULL DEFAULT 'RANGE';
ALTER TABLE "meters" ADD COLUMN "warningLimit" DOUBLE PRECISION;
ALTER TABLE "meters" ADD COLUMN "criticalLimit" DOUBLE PRECISION;
ALTER TABLE "meters" ADD COLUMN "criterion" TEXT;
ALTER TABLE "meters" ADD COLUMN "frequencyDays" INTEGER;
ALTER TABLE "meters" ADD COLUMN "lastReadingAt" TIMESTAMP(3);

-- AlterTable: a leitura guarda em que zona caiu (congelada no momento do registro).
ALTER TABLE "meter_readings" ADD COLUMN "severity" "ConditionSeverity" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "meter_readings" ADD COLUMN "notes" TEXT;

-- Leituras antigas que ja tinham disparado alerta viram ALARME, para o historico de
-- tendencia nao aparecer todo verde.
UPDATE "meter_readings" SET "severity" = 'ALARM' WHERE "alertTriggered" = true;

-- Preenche a ultima coleta de cada ponto a partir do historico existente.
UPDATE "meters" m
SET "lastReadingAt" = sub.max_read
FROM (SELECT "meterId", MAX("readAt") AS max_read FROM "meter_readings" GROUP BY "meterId") sub
WHERE m."id" = sub."meterId";
