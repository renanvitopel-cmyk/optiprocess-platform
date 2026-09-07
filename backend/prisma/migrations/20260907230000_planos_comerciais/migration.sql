-- Estrutura comercial do RLP Maintenance CMMS: os tres planos de assinatura, mais o
-- status do contrato de cada empresa.
--
-- Nada e' apagado. Os quatro planos que existiam eram lixo dos scripts de teste
-- ("Plano Solic 1788563423882"): ficam INATIVOS, nao removidos - se algum cliente
-- tiver sido apontado para um deles, o vinculo continua valido e visivel.

-- 1. Status do contrato -----------------------------------------------------------
-- Separado de ClientStatus (que diz se a EMPRESA e' cliente, prospect ou inativa):
-- uma empresa ativa pode estar em teste, e uma empresa com contrato cancelado nao
-- deixa de ser um registro valido no cadastro.
-- Nome proprio: "ContractStatus" ja existe para os contratos de servico da OptiProcess
-- (ACTIVE/EXPIRING_SOON/EXPIRED/CANCELED), que sao outra coisa. Reaproveitar o nome fazia
-- a migracao falhar inteira - e foi o que derrubou o primeiro deploy desta etapa.
DO $$ BEGIN
  CREATE TYPE "CmmsContractStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contractStatus" "CmmsContractStatus" NOT NULL DEFAULT 'TRIAL';

-- Empresa que ja estava ativa no cadastro tem contrato ativo: marcar todas como
-- "em teste" seria mentir sobre quem ja e' cliente.
UPDATE "clients" SET "contractStatus" = 'ACTIVE' WHERE "status" = 'ACTIVE';

-- 2. Os tres planos ---------------------------------------------------------------
INSERT INTO "plans" ("id", "name", "description", "priceMonthly", "maxUsers", "maxInstruments", "features", "active", "createdAt")
SELECT '33333333-3333-4333-8333-333333333001', 'Plus', 'Para quem esta organizando a manutencao: cadastro do parque, solicitacoes, OS e preventivas por tempo.', 497.0, 10, 300, ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS']::text[], true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "plans" WHERE lower("name") = lower('Plus'));
-- Se ja existir (reexecucao da migracao), mantem em dia sem duplicar.
UPDATE "plans"
SET "description" = 'Para quem esta organizando a manutencao: cadastro do parque, solicitacoes, OS e preventivas por tempo.', "priceMonthly" = 497.0, "maxUsers" = 10,
    "maxInstruments" = 300, "features" = ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS']::text[], "active" = true
WHERE lower("name") = lower('Plus');

INSERT INTO "plans" ("id", "name", "description", "priceMonthly", "maxUsers", "maxInstruments", "features", "active", "createdAt")
SELECT '33333333-3333-4333-8333-333333333002', 'Pro', 'Para quem ja planeja e programa: preventiva por medidor, materiais, custos, falhas e indicadores.', 1297.0, 50, 2000, ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS', 'Planos preventivos por medidor', 'Programacao semanal e Kanban', 'HH planejada x realizada', 'Reserva e consumo de materiais', 'Custos por ativo, OS e area', 'Codigos de falha, Pareto e RCA', 'Backlog e aderencia a programacao', 'Importacao de dados', 'Relatorios gerenciais']::text[], true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "plans" WHERE lower("name") = lower('Pro'));
-- Se ja existir (reexecucao da migracao), mantem em dia sem duplicar.
UPDATE "plans"
SET "description" = 'Para quem ja planeja e programa: preventiva por medidor, materiais, custos, falhas e indicadores.', "priceMonthly" = 1297.0, "maxUsers" = 50,
    "maxInstruments" = 2000, "features" = ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS', 'Planos preventivos por medidor', 'Programacao semanal e Kanban', 'HH planejada x realizada', 'Reserva e consumo de materiais', 'Custos por ativo, OS e area', 'Codigos de falha, Pareto e RCA', 'Backlog e aderencia a programacao', 'Importacao de dados', 'Relatorios gerenciais']::text[], "active" = true
WHERE lower("name") = lower('Pro');

INSERT INTO "plans" ("id", "name", "description", "priceMonthly", "maxUsers", "maxInstruments", "features", "active", "createdAt")
SELECT '33333333-3333-4333-8333-333333333003', 'Advanced', 'Para operacao completa: preditiva, lubrificacao, visao por planta/area/centro de custo e paineis avancados.', 2997.0, 100, 10000, ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS', 'Planos preventivos por medidor', 'Programacao semanal e Kanban', 'HH planejada x realizada', 'Reserva e consumo de materiais', 'Custos por ativo, OS e area', 'Codigos de falha, Pareto e RCA', 'Backlog e aderencia a programacao', 'Importacao de dados', 'Relatorios gerenciais', 'Preditiva por pontos de medicao e limites configuraveis', 'Lubrificacao: lubrificantes, pontos, rotas, historico e previsao de consumo', 'Visao por planta, area e centro de custo', 'Paineis e indicadores avancados', 'Suporte prioritario', 'Integracoes futuras conforme disponibilidade tecnica']::text[], true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "plans" WHERE lower("name") = lower('Advanced'));
-- Se ja existir (reexecucao da migracao), mantem em dia sem duplicar.
UPDATE "plans"
SET "description" = 'Para operacao completa: preditiva, lubrificacao, visao por planta/area/centro de custo e paineis avancados.', "priceMonthly" = 2997.0, "maxUsers" = 100,
    "maxInstruments" = 10000, "features" = ARRAY['Cadastro e arvore de ativos', 'Solicitacoes de servico', 'OS corretivas e preventivas', 'Planos preventivos por tempo', 'Checklists e procedimentos', 'Historico do ativo', 'Dashboard operacional basico', 'Almoxarifado simples', 'Mao de obra e custo basico por OS', 'Planos preventivos por medidor', 'Programacao semanal e Kanban', 'HH planejada x realizada', 'Reserva e consumo de materiais', 'Custos por ativo, OS e area', 'Codigos de falha, Pareto e RCA', 'Backlog e aderencia a programacao', 'Importacao de dados', 'Relatorios gerenciais', 'Preditiva por pontos de medicao e limites configuraveis', 'Lubrificacao: lubrificantes, pontos, rotas, historico e previsao de consumo', 'Visao por planta, area e centro de custo', 'Paineis e indicadores avancados', 'Suporte prioritario', 'Integracoes futuras conforme disponibilidade tecnica']::text[], "active" = true
WHERE lower("name") = lower('Advanced');

-- 3. Planos de teste saem de circulacao (sem serem removidos) ----------------------
UPDATE "plans" SET "active" = false WHERE "name" ~ '[0-9]{10,}';
