-- O nivel na arvore (Planta > Area > Maquina > Subconjunto > Parte) morava no catalogo
-- "Tipo de ativo", e o ativo so guardava o nome do tipo em texto. Quem cadastrava via
-- dois campos com a mesma funcao e nao tinha como saber que a escolha do tipo era o que
-- decidia as regras da arvore. O nivel passa a ser do proprio ativo.
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "level" "AssetHierarchyLevel";

-- Backfill: cada ativo herda o nivel do tipo que ele ja tinha escolhido. Nada se perde -
-- ativo cujo tipo nao tinha nivel (ou tipo fora do catalogo) simplesmente fica sem nivel,
-- exatamente como se comportava ate agora.
UPDATE "instruments" i
SET "level" = t."level"
FROM "asset_types" t
WHERE i."level" IS NULL
  AND t."level" IS NOT NULL
  AND lower(t."name") = lower(i."type");
