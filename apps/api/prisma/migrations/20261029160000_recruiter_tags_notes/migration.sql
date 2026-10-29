-- CreateEnum
CREATE TYPE "RecruiterNoteAction" AS ENUM ('NOTE', 'FORWARD', 'DISCARD');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN "recruiterTags" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "RecruiterNoteEntry" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "action" "RecruiterNoteAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterNoteEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruiterNoteEntry_applicationId_createdAt_idx" ON "RecruiterNoteEntry"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "RecruiterNoteEntry" ADD CONSTRAINT "RecruiterNoteEntry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
