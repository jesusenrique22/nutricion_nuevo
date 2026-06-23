-- CreateTable
CREATE TABLE "BlockedDay" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDay_date_key" ON "BlockedDay"("date");

-- CreateIndex
CREATE INDEX "BlockedDay_date_idx" ON "BlockedDay"("date");
