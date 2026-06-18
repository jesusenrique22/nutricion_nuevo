-- ResourcePurchase: columnas de pago del paciente (faltaban vs schema.prisma)
ALTER TABLE "ResourcePurchase" ADD COLUMN IF NOT EXISTS "patientPaymentMethod" TEXT;
ALTER TABLE "ResourcePurchase" ADD COLUMN IF NOT EXISTS "patientPaymentNote" TEXT;
