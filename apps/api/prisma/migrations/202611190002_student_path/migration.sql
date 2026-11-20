CREATE TYPE "StudyStatus" AS ENUM ('PENDING','TAKING','REGULAR','APPROVED');
CREATE TABLE "StudyPlan" ("id" TEXT PRIMARY KEY, "specialty" "Specialty" NOT NULL, "version" TEXT NOT NULL, "name" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL, "verifiedAt" TIMESTAMP(3) NOT NULL, "notes" TEXT NOT NULL);
CREATE UNIQUE INDEX "StudyPlan_specialty_version_key" ON "StudyPlan"("specialty","version");
CREATE TABLE "StudyCourse" ("id" TEXT PRIMARY KEY, "planId" TEXT NOT NULL REFERENCES "StudyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "year" INTEGER NOT NULL, "kind" TEXT NOT NULL DEFAULT 'SUBJECT', "requirements" JSONB NOT NULL, "notes" TEXT NOT NULL);
CREATE UNIQUE INDEX "StudyCourse_planId_code_key" ON "StudyCourse"("planId","code");
CREATE TABLE "StudentProgress" ("accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE, "courseId" TEXT NOT NULL REFERENCES "StudyCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "status" "StudyStatus" NOT NULL DEFAULT 'PENDING', "updatedAt" TIMESTAMP(3) NOT NULL, PRIMARY KEY ("accountId","courseId"));
CREATE INDEX "StudentProgress_courseId_idx" ON "StudentProgress"("courseId");
ALTER TABLE "Account" ADD COLUMN "studyPlanId" TEXT REFERENCES "StudyPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Account_studyPlanId_idx" ON "Account"("studyPlanId");

