ALTER TABLE "GitHubAccount"
ADD COLUMN "lastDailySyncAt" TIMESTAMP(3),
ADD COLUMN "lastManualSyncAt" TIMESTAMP(3);
