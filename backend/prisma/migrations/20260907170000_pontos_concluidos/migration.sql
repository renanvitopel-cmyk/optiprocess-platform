-- Um motor tem mancal LA, mancal LOA e acoplamento. Ate aqui, cadastrar UM ponto ja tirava
-- o ativo da fila de pendentes: os outros dois ficavam para tras e nada mais avisava, porque
-- o sistema nao tem como saber quantos pontos aquele motor deveria ter. Quem diz que acabou
-- e' quem cadastrou.
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "lubricationPointsComplete" BOOLEAN NOT NULL DEFAULT false;
