-- Anexo opcional no plano de manutencao (procedimento, ficha tecnica, foto de referencia) -
-- reaproveita a mesma tabela generica de anexos ja usada pelo ativo e pela OS.
ALTER TYPE "AttachmentEntityType" ADD VALUE IF NOT EXISTS 'MAINTENANCE_PLAN';
