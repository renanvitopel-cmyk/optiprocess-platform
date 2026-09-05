-- Catalogo padrao de tipos de mao de obra (clientId NULL = catalogo da OptiProcess).
-- Ate aqui esse catalogo nascia vazio e o campo "Tipo" era texto livre: cada pessoa
-- digitava a funcao do seu jeito ("Tec. mecanico", "tecnico mecanico", "Mecanico") e o
-- mesmo cargo virava tres linhas diferentes nos relatorios de HH e custo. Com o catalogo
-- preenchido a escolha passa a ser numa lista fechada.
-- So insere o que ainda nao existe no catalogo global - nao mexe no que ja foi cadastrado.

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222201', NULL, 'Ajudante de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Ajudante de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222202', NULL, 'Analista de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Analista de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222203', NULL, 'Caldeireiro', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Caldeireiro'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222204', NULL, 'Eletricista de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Eletricista de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222205', NULL, 'Encarregado de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Encarregado de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222206', NULL, 'Engenheiro de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Engenheiro de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222207', NULL, 'Instrumentista', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Instrumentista'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222208', NULL, 'Lubrificador', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Lubrificador'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222209', NULL, 'Mecanico de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Mecanico de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222210', NULL, 'Planejador de manutencao (PCM)', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Planejador de manutencao (PCM)'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222211', NULL, 'Prestador de servico (terceiro)', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Prestador de servico (terceiro)'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222212', NULL, 'Soldador', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Soldador'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222213', NULL, 'Supervisor de manutencao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Supervisor de manutencao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222214', NULL, 'Tecnico de refrigeracao', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Tecnico de refrigeracao'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222215', NULL, 'Tecnico eletrico', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Tecnico eletrico'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222216', NULL, 'Tecnico mecanico', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Tecnico mecanico'));

INSERT INTO "labor_types" ("id", "clientId", "name", "active", "createdAt")
SELECT '22222222-2222-4222-8222-222222222217', NULL, 'Torneiro mecanico', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "labor_types" WHERE "clientId" IS NULL AND lower("name") = lower('Torneiro mecanico'));
