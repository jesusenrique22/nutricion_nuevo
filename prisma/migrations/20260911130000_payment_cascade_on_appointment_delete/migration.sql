-- Payment should be removed when its appointment is deleted (e.g. patient hard delete).
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_appointmentId_fkey";
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
