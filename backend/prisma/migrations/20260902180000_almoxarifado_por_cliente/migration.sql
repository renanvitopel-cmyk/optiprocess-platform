-- DropIndex
DROP INDEX "spare_parts_code_key";

-- Limpa registros de teste orfaos (nenhum dado real de cliente existia no almoxarifado
-- ainda - a tabela e' nova desta mesma leva de mudancas) para a coluna NOT NULL abaixo
-- nao falhar em linhas sem clientId.
DELETE FROM "spare_part_movements";
DELETE FROM "asset_parts";
DELETE FROM "spare_parts";

-- AlterTable
ALTER TABLE "spare_parts" ADD COLUMN "clientId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "spare_parts_clientId_idx" ON "spare_parts"("clientId");

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
