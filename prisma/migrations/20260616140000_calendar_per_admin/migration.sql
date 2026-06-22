-- AlterTable
ALTER TABLE "User" ADD COLUMN "isDefaultCalendarAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "calendarAdminId" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_calendarAdminId_idx" ON "Appointment"("calendarAdminId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_calendarAdminId_fkey" FOREIGN KEY ("calendarAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
