-- Marca o ativo como ponto de lubrificacao, do mesmo jeito que "calibratable" ja o marca
-- como sujeito a calibracao. Serve para cobrar o que falta: marcado e sem ponto cadastrado
-- vira pendencia visivel na ficha, em vez de o ativo simplesmente nunca ser lubrificado
-- porque ninguem lembrou de criar o ponto numa tela separada.
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "lubricatable" BOOLEAN NOT NULL DEFAULT false;

-- Ativo que ja tem ponto de lubrificacao cadastrado ja e' lubrificavel na pratica.
UPDATE "instruments" i
SET "lubricatable" = true
WHERE EXISTS (
  SELECT 1 FROM "lubrication_points" p
  WHERE p."instrumentId" = i."id" AND p."deletedAt" IS NULL
);
