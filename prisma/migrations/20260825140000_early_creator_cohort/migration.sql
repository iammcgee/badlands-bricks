-- AlterTable
ALTER TABLE "User" ADD COLUMN "earlyCreatorNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_earlyCreatorNumber_key" ON "User"("earlyCreatorNumber");

-- Backfill the first 30 accounts by signup time as Founding Creators.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "User"
)
UPDATE "User" AS u
SET "earlyCreatorNumber" = ranked.rn
FROM ranked
WHERE u.id = ranked.id
  AND ranked.rn <= 30
  AND u."earlyCreatorNumber" IS NULL;
