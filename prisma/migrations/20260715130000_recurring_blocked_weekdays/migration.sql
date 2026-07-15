-- CreateTable
CREATE TABLE "RecurringBlockedWeekday" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBlockedWeekday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBlockedWeekday_weekday_key" ON "RecurringBlockedWeekday"("weekday");
