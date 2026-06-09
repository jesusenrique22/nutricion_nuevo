-- CreateTable
CREATE TABLE "AnthropometryFormSubmission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT,
    "consultationReason" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "previousAnthropometry" BOOLEAN,
    "dominantHand" TEXT,
    "dominantFoot" TEXT,
    "activityLevel" TEXT,
    "activityFrequency" TEXT,
    "sportsPracticed" TEXT,
    "reportAnalysisTypes" JSONB NOT NULL,
    "mainObjective" TEXT,
    "evaluationFrequency" TEXT,
    "reservedSlotNote" TEXT,
    "procedureQuestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnthropometryFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnthropometryFormSubmission_appointmentId_key" ON "AnthropometryFormSubmission"("appointmentId");

-- AddForeignKey
ALTER TABLE "AnthropometryFormSubmission" ADD CONSTRAINT "AnthropometryFormSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
