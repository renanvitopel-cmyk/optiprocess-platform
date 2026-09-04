-- Foto principal do ativo (aditivo, ambas as colunas opcionais).
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "photoKey" TEXT;
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "photoFileName" TEXT;
