-- CreateEnum
CREATE TYPE "ResourceAccessStatus" AS ENUM ('PENDING', 'GRANTED');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('RESOURCE', 'APPOINTMENT');

-- AlterTable
ALTER TABLE "ResourcePurchase" ADD COLUMN     "status" "ResourceAccessStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "grantedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ResourcePurchase_status_idx" ON "ResourcePurchase"("status");

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CartItemType" NOT NULL,
    "resourceId" TEXT,
    "consultationTypeId" TEXT,
    "appointmentStart" TIMESTAMP(3),
    "modality" "ConsultationModality",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_resourceId_key" ON "CartItem"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "ConsultationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
