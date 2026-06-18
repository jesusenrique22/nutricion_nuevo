-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'DENIED');

-- AlterEnum
ALTER TYPE "ResourceAccessStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundPatientNote" TEXT,
ADD COLUMN "refundAdminNote" TEXT,
ADD COLUMN "refundResolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ResourcePurchase"
ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundPatientNote" TEXT,
ADD COLUMN "refundAdminNote" TEXT,
ADD COLUMN "refundResolvedAt" TIMESTAMP(3);
