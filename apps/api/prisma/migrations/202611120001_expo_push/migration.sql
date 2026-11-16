ALTER TABLE "PushDelivery" ADD COLUMN "expoTicketId" TEXT;
ALTER TABLE "PushDelivery" ADD COLUMN "receiptCheckAt" TIMESTAMP(3);
CREATE INDEX "PushDelivery_status_receiptCheckAt_idx" ON "PushDelivery"("status", "receiptCheckAt");
ALTER TABLE "PushSubscription" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'web';
