ALTER TABLE "AuthSession" ADD COLUMN "familyId" TEXT;
CREATE INDEX "AuthSession_familyId_idx" ON "AuthSession"("familyId");
CREATE TABLE "AuthRefreshToken" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "familyId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthRefreshToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthRefreshToken_familyId_idx" ON "AuthRefreshToken"("familyId");
CREATE INDEX "AuthRefreshToken_accountId_idx" ON "AuthRefreshToken"("accountId");
CREATE INDEX "AuthRefreshToken_expiresAt_idx" ON "AuthRefreshToken"("expiresAt");
-- Retire previous long-lived APP access tokens. Accounts and content remain intact.
UPDATE "AuthSession" SET "expiresAt" = CURRENT_TIMESTAMP WHERE "purpose" = 'APP';
