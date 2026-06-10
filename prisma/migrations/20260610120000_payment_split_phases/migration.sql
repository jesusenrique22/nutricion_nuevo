-- PaymentStatus: allow partial payments (adelanto + saldo)
DO $$ BEGIN
  ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment: split into advance + remainder phases
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "advanceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "remainderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "advancePercent" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "advanceStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "remainderStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "advanceNote" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "remainderNote" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "advancePaidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "remainderPaidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'ARS';
