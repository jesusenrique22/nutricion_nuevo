-- ConsultationType.code: enum -> texto libre + campos de publicación en lobby
ALTER TABLE "ConsultationType" ALTER COLUMN "code" TYPE TEXT USING "code"::TEXT;

ALTER TABLE "ConsultationType" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ConsultationType" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ConsultationType" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

DROP TYPE IF EXISTS "ConsultationCode";

UPDATE "ConsultationType" SET "sortOrder" = 1 WHERE "code" = 'NUT_01';
UPDATE "ConsultationType" SET "sortOrder" = 2 WHERE "code" = 'ENT_02';
UPDATE "ConsultationType" SET "sortOrder" = 3 WHERE "code" = 'ANT_03';
