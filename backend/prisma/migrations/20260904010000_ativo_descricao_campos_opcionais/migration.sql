-- AlterTable: o ativo ganha nome/descricao em linguagem de gente ("Compressor de ar -
-- Linha 4"), que junto do TAG e' o que identifica o equipamento nas telas.
ALTER TABLE "instruments" ADD COLUMN "description" TEXT;

-- Ficha do fabricante deixa de ser obrigatoria: um ativo de manutencao (uma linha, um
-- tanque, uma area) muitas vezes nao tem fabricante/modelo/numero de serie, e exigir isso
-- so fazia o usuario digitar "-" para escapar do campo. Nenhum dado existente e' perdido.
ALTER TABLE "instruments" ALTER COLUMN "manufacturer" DROP NOT NULL;
ALTER TABLE "instruments" ALTER COLUMN "model" DROP NOT NULL;
ALTER TABLE "instruments" ALTER COLUMN "serialNumber" DROP NOT NULL;
