-- A raiz da arvore costuma ser a planta inteira, que tem varias linhas. Exigir a area so
-- no topo obrigava a fabrica toda a ficar numa area unica - e o resultado real foi uma
-- arvore inteira sem area nenhuma, e portanto sem centro de custo. Agora um ativo do meio
-- da arvore (a linha, tipicamente) pode definir a propria area, e o galho abaixo dele
-- passa a herdar dali. Esta coluna marca quem definiu, para a propagacao vinda de cima
-- nao apagar a escolha.
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "areaOverride" BOOLEAN NOT NULL DEFAULT false;

-- Quem ja tem area diferente da do pai definiu-a de proposito: preserva.
UPDATE "instruments" f
SET "areaOverride" = true
FROM "instruments" p
WHERE f."parentId" = p."id"
  AND f."areaId" IS NOT NULL
  AND f."areaId" IS DISTINCT FROM p."areaId";
