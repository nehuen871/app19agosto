CREATE TABLE "UsefulLink" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "url" TEXT NOT NULL, "imageId" TEXT NOT NULL REFERENCES "MediaImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "priority" INTEGER NOT NULL DEFAULT 100 CHECK ("priority" BETWEEN 1 AND 9999),
  "featured" BOOLEAN NOT NULL DEFAULT false, "published" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "UsefulLink_deletedAt_published_priority_id_idx" ON "UsefulLink"("deletedAt","published","priority","id");
