-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileId" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'site',
    "provider" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_folder_createdAt_idx" ON "MediaAsset"("folder", "createdAt" DESC);
