-- AlterEnum
-- Cancelar una cita tiene que anular también la solicitud de pago: sin este
-- estado el cobro quedaba en PENDING y el paciente lo seguía viendo pendiente.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
