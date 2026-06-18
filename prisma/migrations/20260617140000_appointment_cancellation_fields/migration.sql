-- CreateEnum
CREATE TYPE "AppointmentCancelledBy" AS ENUM ('PATIENT', 'ADMIN');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "cancelledBy" "AppointmentCancelledBy",
ADD COLUMN "cancelledAt" TIMESTAMP(3);
