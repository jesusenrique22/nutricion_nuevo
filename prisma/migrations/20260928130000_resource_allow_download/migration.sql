-- AlterTable
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "allowDownload" BOOLEAN NOT NULL DEFAULT false;
