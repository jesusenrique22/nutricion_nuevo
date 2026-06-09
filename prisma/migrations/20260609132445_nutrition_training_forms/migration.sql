-- CreateTable
CREATE TABLE "NutritionFormSubmission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "consultationReason" TEXT,
    "dietDescription" TEXT,
    "dietaryRestrictions" TEXT,
    "activityLevel" TEXT,
    "activityFrequency" TEXT,
    "sportsPracticed" TEXT,
    "reservedSlotNote" TEXT,
    "continuationPreference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFormSubmission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "consultationReason" TEXT,
    "currentRoutine" TEXT,
    "injuriesLimitations" TEXT,
    "activityLevel" TEXT,
    "activityFrequency" TEXT,
    "sportsPracticed" TEXT,
    "reservedSlotNote" TEXT,
    "continuationPreference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionFormSubmission_appointmentId_key" ON "NutritionFormSubmission"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingFormSubmission_appointmentId_key" ON "TrainingFormSubmission"("appointmentId");

-- AddForeignKey
ALTER TABLE "NutritionFormSubmission" ADD CONSTRAINT "NutritionFormSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFormSubmission" ADD CONSTRAINT "TrainingFormSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
