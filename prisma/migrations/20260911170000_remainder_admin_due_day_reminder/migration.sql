-- Recordatorio admin: saldo pendiente el día de la cita
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "remainderAdminDueDaySentAt" TIMESTAMP(3);
