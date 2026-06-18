-- Papelera de pagos en bandeja admin
ALTER TABLE "Payment" ADD COLUMN "advanceInboxTrashedAt" TIMESTAMP(3),
ADD COLUMN "remainderInboxTrashedAt" TIMESTAMP(3),
ADD COLUMN "advanceInboxDismissedAt" TIMESTAMP(3),
ADD COLUMN "remainderInboxDismissedAt" TIMESTAMP(3);

ALTER TABLE "ResourcePurchase" ADD COLUMN "inboxTrashedAt" TIMESTAMP(3),
ADD COLUMN "inboxDismissedAt" TIMESTAMP(3);
