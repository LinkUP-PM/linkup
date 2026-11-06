-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "JobSeniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "JobContractType" AS ENUM ('CLT', 'PJ', 'INTERNSHIP', 'TEMPORARY', 'APPRENTICE', 'FREELANCER');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "status" "JobStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Job" ADD COLUMN "seniority" "JobSeniority";
ALTER TABLE "Job" ADD COLUMN "contractType" "JobContractType";
ALTER TABLE "Job" ADD COLUMN "openings" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Job" ADD COLUMN "pcdExclusive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "workModel" "WorkModel";
ALTER TABLE "Job" ADD COLUMN "city" TEXT;
ALTER TABLE "Job" ADD COLUMN "state" TEXT;
ALTER TABLE "Job" ADD COLUMN "responsibilities" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "requirementsJson" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN "niceToHaveJson" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN "benefitsJson" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN "salaryMin" INTEGER;
ALTER TABLE "Job" ADD COLUMN "salaryMax" INTEGER;
ALTER TABLE "Job" ADD COLUMN "additionalInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Job" ADD COLUMN "stagesJson" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Existing jobs become published (legacy title/description/lookingFor stay valid).
UPDATE "Job"
SET
  "status" = 'PUBLISHED',
  "publishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "status" = 'DRAFT';

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
