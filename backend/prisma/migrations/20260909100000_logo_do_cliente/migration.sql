-- Logo do cliente: substitui a marca do RLP Maintenance no painel do CMMS dele. Aditivo.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logoKey" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "logoFileName" TEXT;
