-- OS gerada diretamente de uma rota de lubrificacao (fora do mecanismo de Plano, que so
-- sabe gerar para um ativo por vez - uma rota cobre varios). Coluna aditiva.
ALTER TABLE "maintenance_work_orders" ADD COLUMN IF NOT EXISTS "lubricationRouteId" TEXT;

CREATE INDEX IF NOT EXISTS "maintenance_work_orders_lubricationRouteId_idx" ON "maintenance_work_orders"("lubricationRouteId");

DO $$ BEGIN
  ALTER TABLE "maintenance_work_orders"
    ADD CONSTRAINT "maintenance_work_orders_lubricationRouteId_fkey" FOREIGN KEY ("lubricationRouteId") REFERENCES "lubrication_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
