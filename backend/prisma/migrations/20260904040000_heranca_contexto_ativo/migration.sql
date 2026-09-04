-- AlterTable: cada area passa a ter um centro de custo padrao, herdado por todos os
-- ativos dentro dela.
ALTER TABLE "areas" ADD COLUMN "costCenterId" TEXT;
CREATE INDEX "areas_costCenterId_idx" ON "areas"("costCenterId");
ALTER TABLE "areas" ADD CONSTRAINT "areas_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: marca de excecao. Com override, a heranca para de sobrescrever o centro de
-- custo deste ativo. Ativos que ja tinham centro de custo escolhido a mao viram excecao,
-- para a heranca nao apagar silenciosamente o que foi definido antes desta regra existir.
ALTER TABLE "instruments" ADD COLUMN "costCenterOverride" BOOLEAN NOT NULL DEFAULT false;
UPDATE "instruments" SET "costCenterOverride" = true WHERE "costCenterId" IS NOT NULL;
