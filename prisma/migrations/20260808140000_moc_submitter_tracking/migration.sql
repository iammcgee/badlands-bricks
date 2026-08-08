-- AlterTable
ALTER TABLE "MocSubmission" ADD COLUMN "submitterUserId" TEXT;

-- AddForeignKey
ALTER TABLE "MocSubmission" ADD CONSTRAINT "MocSubmission_submitterUserId_fkey" FOREIGN KEY ("submitterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill by matching builder email to existing users
UPDATE "MocSubmission" AS m
SET "submitterUserId" = u.id
FROM "User" AS u
WHERE lower(m."builderEmail") = lower(u.email)
  AND m."submitterUserId" IS NULL
  AND m."builderEmail" <> '';
