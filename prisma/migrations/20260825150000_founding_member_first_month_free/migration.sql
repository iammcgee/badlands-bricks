-- Founding membership slots (first month free) replace account-signup creator grants.

DROP INDEX IF EXISTS "User_earlyCreatorNumber_key";

ALTER TABLE "User" RENAME COLUMN "earlyCreatorNumber" TO "foundingMemberNumber";

CREATE UNIQUE INDEX "User_foundingMemberNumber_key" ON "User"("foundingMemberNumber");

-- Clear slots claimed from free account signup; they will be reassigned when
-- people join Badlands Plan (first N memberships get a free first month).
UPDATE "User" SET "foundingMemberNumber" = NULL;
