-- Add per-repo sync cursors and lightweight lock
ALTER TABLE "Repository"
  ADD COLUMN "lastCommitSyncedAt" TIMESTAMP(3),
  ADD COLUMN "lastPrUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "lastReviewSyncedAt" TIMESTAMP(3),
  ADD COLUMN "fullBackfillCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "syncLockUntil" TIMESTAMP(3);

-- Add sync job tracking (manual sync is synchronous for now)
CREATE TABLE "SyncJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "SyncJob_userId_status_idx" ON "SyncJob"("userId", "status");
CREATE INDEX "SyncJob_createdAt_idx" ON "SyncJob"("createdAt");

-- Foreign key
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
