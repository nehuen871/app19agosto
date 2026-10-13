CREATE TYPE "AccountRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "SessionPurpose" AS ENUM ('APP', 'ADMIN');
CREATE TABLE "Account" (
 "id" TEXT PRIMARY KEY, "googleSubject" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT NOT NULL,
 "role" "AccountRole" NOT NULL DEFAULT 'USER', "blocked" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Account_googleSubject_key" ON "Account"("googleSubject");
CREATE TABLE "AuthSession" (
 "tokenHash" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "purpose" "SessionPurpose" NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_accountId_idx" ON "AuthSession"("accountId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "OAuthAttempt" (
 "stateHash" TEXT PRIMARY KEY, "browserHash" TEXT NOT NULL, "verifier" TEXT NOT NULL,
 "purpose" "SessionPurpose" NOT NULL, "nativeChallenge" TEXT, "nativeState" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "OAuthAttempt_expiresAt_idx" ON "OAuthAttempt"("expiresAt");
CREATE TABLE "NativeLoginTicket" (
 "tokenHash" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "challenge" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "NativeLoginTicket" ADD CONSTRAINT "NativeLoginTicket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "NativeLoginTicket_expiresAt_idx" ON "NativeLoginTicket"("expiresAt");
