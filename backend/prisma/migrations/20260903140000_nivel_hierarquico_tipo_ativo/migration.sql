-- CreateEnum
CREATE TYPE "AssetHierarchyLevel" AS ENUM ('PLANT', 'AREA', 'MACHINE', 'SUBASSEMBLY', 'PART');

-- AlterTable
ALTER TABLE "asset_types" ADD COLUMN "level" "AssetHierarchyLevel";

-- Catalogo padrao de niveis hierarquicos (Planta > Area > Maquina > Subconjunto > Parte),
-- pra "Tipo de ativo" passar a representar onde o ativo fica na arvore, nao o tipo de
-- equipamento. So insere quem ainda nao existe no catalogo global (case-insensitive) -
-- nao mexe em nenhum tipo que a OptiProcess ou os clientes ja cadastraram.
INSERT INTO "asset_types" ("id", "clientId", "name", "level", "active", "createdAt")
SELECT '11111111-1111-4111-8111-111111111101', NULL, 'Planta', 'PLANT', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "asset_types" WHERE "clientId" IS NULL AND lower("name") = lower('Planta'));

INSERT INTO "asset_types" ("id", "clientId", "name", "level", "active", "createdAt")
SELECT '11111111-1111-4111-8111-111111111102', NULL, 'Área', 'AREA', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "asset_types" WHERE "clientId" IS NULL AND lower("name") = lower('Área'));

INSERT INTO "asset_types" ("id", "clientId", "name", "level", "active", "createdAt")
SELECT '11111111-1111-4111-8111-111111111103', NULL, 'Máquina', 'MACHINE', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "asset_types" WHERE "clientId" IS NULL AND lower("name") = lower('Máquina'));

INSERT INTO "asset_types" ("id", "clientId", "name", "level", "active", "createdAt")
SELECT '11111111-1111-4111-8111-111111111104', NULL, 'Subconjunto', 'SUBASSEMBLY', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "asset_types" WHERE "clientId" IS NULL AND lower("name") = lower('Subconjunto'));

INSERT INTO "asset_types" ("id", "clientId", "name", "level", "active", "createdAt")
SELECT '11111111-1111-4111-8111-111111111105', NULL, 'Parte', 'PART', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "asset_types" WHERE "clientId" IS NULL AND lower("name") = lower('Parte'));
