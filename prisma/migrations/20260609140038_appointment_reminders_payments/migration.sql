-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ALTER COLUMN "provider" SET DEFAULT 'manual';
