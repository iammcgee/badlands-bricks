-- AlterTable
ALTER TABLE "Product" ADD COLUMN "mocSubmissionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_mocSubmissionId_key" ON "Product"("mocSubmissionId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_mocSubmissionId_fkey" FOREIGN KEY ("mocSubmissionId") REFERENCES "MocSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
