-- CreateEnum
CREATE TYPE "ApplicationEventType" AS ENUM (
  'SUBMITTED',
  'RESUBMITTED',
  'FORWARDED',
  'DISCARDED',
  'ADJUSTMENT_REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'INTERVIEW_PROPOSED',
  'INTERVIEW_ACCEPTED',
  'INTERVIEW_DECLINED'
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "ApplicationEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_at_idx" ON "ApplicationEvent"("applicationId", "at");

-- CreateIndex
CREATE INDEX "ApplicationEvent_at_idx" ON "ApplicationEvent"("at");

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
