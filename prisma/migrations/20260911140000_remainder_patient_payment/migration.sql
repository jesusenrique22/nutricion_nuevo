-- Comprobante de saldo (2.ª cuota) + recordatorios tipo Cashea
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE_REMINDER';

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "remainderReminder7dSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "remainderReminder3dSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "remainderReminder1dSentAt" TIMESTAMP(3);

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "remainderPatientPaymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "remainderPatientPaymentReference" TEXT,
  ADD COLUMN IF NOT EXISTS "remainderPatientPaymentNote" TEXT,
  ADD COLUMN IF NOT EXISTS "remainderPatientPaymentProofUrls" JSONB,
  ADD COLUMN IF NOT EXISTS "remainderSubmittedAt" TIMESTAMP(3);
