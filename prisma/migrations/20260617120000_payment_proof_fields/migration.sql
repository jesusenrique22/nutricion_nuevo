-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "patientPaymentMethod" TEXT,
ADD COLUMN "patientPaymentReference" TEXT,
ADD COLUMN "patientPaymentNote" TEXT,
ADD COLUMN "patientPaymentProofUrls" JSONB;

-- AlterTable
ALTER TABLE "ResourcePurchase" ADD COLUMN "patientPaymentReference" TEXT,
ADD COLUMN "patientPaymentProofUrls" JSONB;
