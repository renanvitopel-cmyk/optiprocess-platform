-- AlterEnum: OS ganha os estados intermediarios de planejamento/programacao/liberacao e
-- os 3 bloqueios de espera - aditivo, nao remove nem renomeia os 4 valores ja usados
-- (OPEN/IN_PROGRESS/COMPLETED/CANCELED continuam validos em qualquer OS ja cadastrada).
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'IN_TRIAGE';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'PLANNED';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'PROGRAMMED';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'RELEASED';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'AWAITING_MATERIAL';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'AWAITING_RELEASE';
ALTER TYPE "MaintenanceOrderStatus" ADD VALUE 'AWAITING_STOPPAGE';
