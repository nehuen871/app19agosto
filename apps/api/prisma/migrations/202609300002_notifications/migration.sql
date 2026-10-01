CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'SENT', 'PARTIAL', 'FAILED');
CREATE TABLE "Notification" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "title" VARCHAR(100) NOT NULL,
 "body" VARCHAR(500) NOT NULL,
 "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
 "newsId" TEXT,
 "requestedRecipients" INTEGER NOT NULL DEFAULT 0,
 "sentCount" INTEGER NOT NULL DEFAULT 0,
 "failedCount" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sentAt" TIMESTAMP(3),
 CONSTRAINT "Notification_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_newsId_idx" ON "Notification"("newsId");
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "actor" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "entityId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");
