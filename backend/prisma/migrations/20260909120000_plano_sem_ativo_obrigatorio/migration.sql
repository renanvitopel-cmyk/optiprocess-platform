-- Plano de manutencao pode nascer sem ativo (uma inspecao geral, por exemplo) e ganhar um
-- depois, na edicao. A OS gerada continua exigindo um ativo - isso e' checado na aplicacao,
-- na hora de gerar.
ALTER TABLE "maintenance_plans" ALTER COLUMN "instrumentId" DROP NOT NULL;
