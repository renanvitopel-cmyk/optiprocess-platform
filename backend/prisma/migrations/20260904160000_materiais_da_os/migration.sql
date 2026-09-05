-- Consumo parcial: quanto da reserva foi de fato usado (o resto volta ao estoque).
ALTER TABLE "spare_part_reservations" ADD COLUMN IF NOT EXISTS "consumedQuantity" INTEGER;

-- Material previsto da OS deixa de ser so um registro do que a geracao tentou reservar e
-- passa a ser a lista de materiais da ordem, com obrigatoriedade, substituto e fornecedor.
ALTER TABLE "work_order_material_logs" ADD COLUMN IF NOT EXISTS "required" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "work_order_material_logs" ADD COLUMN IF NOT EXISTS "alternativeSparePartId" TEXT;
ALTER TABLE "work_order_material_logs" ADD COLUMN IF NOT EXISTS "suggestedSupplier" TEXT;
ALTER TABLE "work_order_material_logs" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$ BEGIN
  ALTER TABLE "work_order_material_logs" ADD CONSTRAINT "work_order_material_logs_alternativeSparePartId_fkey"
    FOREIGN KEY ("alternativeSparePartId") REFERENCES "spare_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
