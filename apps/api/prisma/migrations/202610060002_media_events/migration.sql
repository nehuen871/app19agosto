CREATE TABLE "MediaImage" (
  "id" TEXT NOT NULL PRIMARY KEY, "mimeType" TEXT NOT NULL, "data" BYTEA NOT NULL,
  "byteSize" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "News" ADD COLUMN "coverImageId" TEXT;
ALTER TABLE "News" ADD CONSTRAINT "News_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "News_coverImageId_idx" ON "News"("coverImageId");
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE "EventColor" AS ENUM ('BLUE', 'YELLOW', 'LIGHT_BLUE', 'CYAN_GRAY');
CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" VARCHAR(160) NOT NULL, "description" TEXT NOT NULL,
  "location" VARCHAR(300) NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "color" "EventColor" NOT NULL DEFAULT 'BLUE', "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarEvent_valid_dates" CHECK ("endsAt" > "startsAt")
);
CREATE INDEX "CalendarEvent_status_startsAt_idx" ON "CalendarEvent"("status", "startsAt");
CREATE INDEX "CalendarEvent_endsAt_idx" ON "CalendarEvent"("endsAt");
