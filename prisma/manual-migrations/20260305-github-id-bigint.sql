-- One-time migration for GitHub ID overflow.
-- Converts githubId columns to BIGINT for PRs and reviews.
-- Run manually if you already have data in these tables.

ALTER TABLE "PullRequestEvent"
  ALTER COLUMN "githubId" TYPE BIGINT;

ALTER TABLE "ReviewEvent"
  ALTER COLUMN "githubId" TYPE BIGINT;
