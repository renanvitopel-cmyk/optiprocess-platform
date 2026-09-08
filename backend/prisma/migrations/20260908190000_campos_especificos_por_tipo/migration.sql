-- Campos tecnicos que dependem do tipo do ativo (ex.: potencia num Motor, relacao de
-- reducao num Redutor). Coluna aditiva, sem impacto no que ja existe - ativos sem esses
-- dados continuam com o campo nulo normalmente.
ALTER TABLE "instruments" ADD COLUMN "specificAttributes" JSONB;
