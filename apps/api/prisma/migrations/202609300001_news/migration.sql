CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TABLE "Category" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, CONSTRAINT "Category_pkey" PRIMARY KEY ("id"));
CREATE TABLE "News" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "summary" TEXT NOT NULL, "content" TEXT NOT NULL, "coverImageUrl" TEXT,
  "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT', "featured" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3), "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");
CREATE INDEX "News_categoryId_idx" ON "News"("categoryId");
ALTER TABLE "News" ADD CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
