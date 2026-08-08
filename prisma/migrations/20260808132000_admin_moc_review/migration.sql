-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "MocSubmission" ADD COLUMN "builderName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MocSubmission" ADD COLUMN "builderEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MocSubmission" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "MocSubmission" ADD COLUMN "reviewedByUserId" TEXT;

-- CreateTable
CREATE TABLE "MocReviewNote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorLabel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "decision" TEXT,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MocReviewNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MocSubmission" ADD CONSTRAINT "MocSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MocReviewNote" ADD CONSTRAINT "MocReviewNote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MocSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MocReviewNote" ADD CONSTRAINT "MocReviewNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
