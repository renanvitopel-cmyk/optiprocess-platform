-- Os perfis da equipe do cliente deixam de ser um so.
--
-- Ate aqui a empresa tinha "CLIENT" (que faz tudo) e "REQUESTER" (que so abre solicitacao).
-- Entre os dois faltavam duas funcoes que existem em qualquer manutencao: o planejador,
-- que planeja e programa mas nao mexe no contrato, e o tecnico, que executa a OS e nao
-- deveria alcancar cadastro nem custo.
--
-- Ninguem muda de perfil nesta migracao: quem e' CLIENT hoje continua CLIENT, que passa a
-- se chamar "Administrador da empresa" na tela. Os dois perfis novos so existem para serem
-- atribuidos daqui para frente.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT_PLANNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT_TECHNICIAN';
