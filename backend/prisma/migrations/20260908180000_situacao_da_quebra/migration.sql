-- Uma quebra chega ao sistema em tres momentos diferentes, e o que se pede em cada um nao
-- e' o mesmo:
--
--   ja aconteceu      - a maquina voltou. Da para fechar a janela da falha agora.
--   esta acontecendo  - a maquina esta parada NESTE momento. So o inicio existe; o
--                       termino so vai existir quando ela voltar.
--   vou planejar      - a quebra e' conhecida mas sera tratada depois; a janela nao
--                       existe ainda e cobra-la agora so faria alguem inventar horario.
--
-- Ate aqui o formulario cobrava inicio E termino em toda quebra, o que obrigava a chutar
-- um termino em maquina ainda parada - e o MTTR passava a medir um numero inventado.
CREATE TYPE "BreakdownSituation" AS ENUM ('ALREADY_HAPPENED', 'HAPPENING_NOW', 'TO_PLAN');

ALTER TABLE "maintenance_work_orders"
  ADD COLUMN IF NOT EXISTS "breakdownSituation" "BreakdownSituation";
