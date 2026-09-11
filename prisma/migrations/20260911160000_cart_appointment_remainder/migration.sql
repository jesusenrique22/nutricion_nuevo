-- Saldo de cita pagable desde el carrito
ALTER TYPE "CartItemType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_REMAINDER';

ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_appointmentId_key"
  ON "CartItem"("userId", "appointmentId");
