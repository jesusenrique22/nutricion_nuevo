/*
  Warnings:

  - You are about to drop the column `continuationPreference` on the `TrainingFormSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `currentRoutine` on the `TrainingFormSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `injuriesLimitations` on the `TrainingFormSubmission` table. All the data in the column will be lost.
  - Added the required column `reportAnalysisTypes` to the `TrainingFormSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TrainingFormSubmission" DROP COLUMN "continuationPreference",
DROP COLUMN "currentRoutine",
DROP COLUMN "injuriesLimitations",
ADD COLUMN     "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dominantFoot" TEXT,
ADD COLUMN     "dominantHand" TEXT,
ADD COLUMN     "evaluationFrequency" TEXT,
ADD COLUMN     "mainObjective" TEXT,
ADD COLUMN     "previousAnthropometry" BOOLEAN,
ADD COLUMN     "procedureQuestions" TEXT,
ADD COLUMN     "reportAnalysisTypes" JSONB NOT NULL;
