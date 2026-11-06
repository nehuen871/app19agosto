CREATE TABLE "CalendarAuthorizationTicket" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "purpose" "SessionPurpose" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarAuthorizationTicket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CalendarAuthorizationTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CalendarAuthorizationTicket_accountId_idx" ON "CalendarAuthorizationTicket"("accountId");
CREATE INDEX "CalendarAuthorizationTicket_expiresAt_idx" ON "CalendarAuthorizationTicket"("expiresAt");
