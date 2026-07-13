-- Allow deleting a User: cascade related appointments and purchases.
-- Without this, Neon rejects DELETE FROM "User" because of RESTRICT FKs.

-- Appointment → User (patient)
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_patientId_fkey";
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ResourcePurchase → User
ALTER TABLE "ResourcePurchase" DROP CONSTRAINT IF EXISTS "ResourcePurchase_userId_fkey";
ALTER TABLE "ResourcePurchase"
  ADD CONSTRAINT "ResourcePurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ProductPurchase → User
ALTER TABLE "ProductPurchase" DROP CONSTRAINT IF EXISTS "ProductPurchase_userId_fkey";
ALTER TABLE "ProductPurchase"
  ADD CONSTRAINT "ProductPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
