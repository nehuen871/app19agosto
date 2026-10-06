CREATE TABLE "PushSubscription" (
 "id" TEXT NOT NULL PRIMARY KEY, "endpointHash" TEXT NOT NULL, "subscription" JSONB NOT NULL,
 "revokeHash" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "PushSubscription_endpointHash_key" ON "PushSubscription"("endpointHash");
CREATE INDEX "PushSubscription_enabled_idx" ON "PushSubscription"("enabled");
CREATE TABLE "PushDelivery" (
 "id" TEXT NOT NULL PRIMARY KEY, "notificationId" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'QUEUED', "claimedAt" TIMESTAMP(3), "errorCode" TEXT,
 CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "PushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PushDelivery_notificationId_subscriptionId_key" ON "PushDelivery"("notificationId", "subscriptionId");
CREATE INDEX "PushDelivery_status_idx" ON "PushDelivery"("status");
