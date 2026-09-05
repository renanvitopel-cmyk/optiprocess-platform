-- Foto da pessoa da equipe (aditivo, ambas opcionais).
ALTER TABLE "labor_resources" ADD COLUMN IF NOT EXISTS "photoKey" TEXT;
ALTER TABLE "labor_resources" ADD COLUMN IF NOT EXISTS "photoFileName" TEXT;
