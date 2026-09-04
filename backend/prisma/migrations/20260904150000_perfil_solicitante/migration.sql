-- Perfil Solicitante: so abre e acompanha as proprias solicitacoes de servico.
-- Ilimitado em qualquer plano (nao conta como acesso contratado).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REQUESTER';
