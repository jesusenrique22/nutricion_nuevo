-- CreateTable
CREATE TABLE IF NOT EXISTS "InternalEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MEETING',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "modality" "ConsultationModality" NOT NULL DEFAULT 'ONLINE',
    "location" TEXT,
    "patientId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "chargeAmount" DECIMAL(10,2),
    "chargeCurrency" TEXT NOT NULL DEFAULT 'ARS',
    "chargePaid" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "calendarAdminId" TEXT,
    "createdById" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InternalEvent_startTime_endTime_idx" ON "InternalEvent"("startTime", "endTime");
CREATE INDEX IF NOT EXISTS "InternalEvent_patientId_idx" ON "InternalEvent"("patientId");

-- AddForeignKey
ALTER TABLE "InternalEvent" DROP CONSTRAINT IF EXISTS "InternalEvent_patientId_fkey";
ALTER TABLE "InternalEvent" ADD CONSTRAINT "InternalEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalEvent" DROP CONSTRAINT IF EXISTS "InternalEvent_calendarAdminId_fkey";
ALTER TABLE "InternalEvent" ADD CONSTRAINT "InternalEvent_calendarAdminId_fkey" FOREIGN KEY ("calendarAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
