-- CreateTable
CREATE TABLE "SiteVisitor" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisitor_sessionKey_key" ON "SiteVisitor"("sessionKey");

-- CreateIndex
CREATE INDEX "SiteVisitor_firstSeenAt_idx" ON "SiteVisitor"("firstSeenAt");

-- CreateIndex
CREATE INDEX "SiteVisitor_lastSeenAt_idx" ON "SiteVisitor"("lastSeenAt");
