-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('IN_OPERATION', 'STOPPED', 'STANDBY', 'DEACTIVATED', 'IN_MAINTENANCE');

-- AlterTable: todo ativo ja cadastrado passa a valer "Em operacao" por padrao (nao ha
-- como inferir a condicao real retroativamente, mas e' o estado mais comum).
ALTER TABLE "instruments" ADD COLUMN "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'IN_OPERATION';
