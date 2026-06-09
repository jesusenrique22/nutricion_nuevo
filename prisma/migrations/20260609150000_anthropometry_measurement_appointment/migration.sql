-- AlterTable
ALTER TABLE "AnthropometryMeasurement" ADD COLUMN "appointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AnthropometryMeasurement_appointmentId_key" ON "AnthropometryMeasurement"("appointmentId");

-- AddForeignKey
ALTER TABLE "AnthropometryMeasurement" ADD CONSTRAINT "AnthropometryMeasurement_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
