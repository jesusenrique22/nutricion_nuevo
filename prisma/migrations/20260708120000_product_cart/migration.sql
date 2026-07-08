-- Carrito y compras de productos del catálogo CMS
ALTER TYPE "CartItemType" ADD VALUE IF NOT EXISTS 'PRODUCT';

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "productId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_userId_productId_key"
  ON "CartItem"("userId", "productId");

CREATE TABLE IF NOT EXISTS "ProductPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "pricePaid" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "status" "ResourceAccessStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "patientPaymentMethod" TEXT,
  "patientPaymentReference" TEXT,
  "patientPaymentNote" TEXT,
  "patientPaymentProofUrls" JSONB,
  "grantedAt" TIMESTAMP(3),
  "inboxTrashedAt" TIMESTAMP(3),
  "inboxDismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductPurchase_userId_productId_key"
  ON "ProductPurchase"("userId", "productId");

CREATE INDEX IF NOT EXISTS "ProductPurchase_status_idx"
  ON "ProductPurchase"("status");

ALTER TABLE "ProductPurchase"
  ADD CONSTRAINT "ProductPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
