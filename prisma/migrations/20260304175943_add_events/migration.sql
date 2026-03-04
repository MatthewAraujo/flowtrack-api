-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "githubAccessToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRepoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL,
    "ownerLogin" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRepositoryAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRepositoryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "authorLogin" TEXT,
    "authorEmail" TEXT,
    "message" TEXT,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "githubId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isMerged" BOOLEAN NOT NULL,
    "authorLogin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "additions" INTEGER,
    "deletions" INTEGER,
    "changedFiles" INTEGER,

    CONSTRAINT "PullRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "pullNumber" INTEGER NOT NULL,
    "githubId" INTEGER NOT NULL,
    "reviewerLogin" TEXT,
    "state" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "meanCommitsPerWeek" DOUBLE PRECISION,
    "meanPrCycleTimeHours" DOUBLE PRECISION,
    "prRejectionRate" DOUBLE PRECISION,
    "linesAdded" INTEGER,
    "linesDeleted" INTEGER,
    "netLines" INTEGER,
    "productivityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "GitHubAccount_userId_idx" ON "GitHubAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubAccount_provider_login_key" ON "GitHubAccount"("provider", "login");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_provider_providerRepoId_key" ON "Repository"("provider", "providerRepoId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRepositoryAccess_userId_repositoryId_key" ON "UserRepositoryAccess"("userId", "repositoryId");

-- CreateIndex
CREATE INDEX "CommitEvent_repositoryId_committedAt_idx" ON "CommitEvent"("repositoryId", "committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommitEvent_repositoryId_sha_key" ON "CommitEvent"("repositoryId", "sha");

-- CreateIndex
CREATE INDEX "PullRequestEvent_repositoryId_createdAt_idx" ON "PullRequestEvent"("repositoryId", "createdAt");

-- CreateIndex
CREATE INDEX "PullRequestEvent_repositoryId_closedAt_idx" ON "PullRequestEvent"("repositoryId", "closedAt");

-- CreateIndex
CREATE INDEX "PullRequestEvent_repositoryId_mergedAt_idx" ON "PullRequestEvent"("repositoryId", "mergedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequestEvent_repositoryId_number_key" ON "PullRequestEvent"("repositoryId", "number");

-- CreateIndex
CREATE INDEX "ReviewEvent_repositoryId_submittedAt_idx" ON "ReviewEvent"("repositoryId", "submittedAt");

-- CreateIndex
CREATE INDEX "ReviewEvent_repositoryId_pullNumber_idx" ON "ReviewEvent"("repositoryId", "pullNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewEvent_repositoryId_githubId_key" ON "ReviewEvent"("repositoryId", "githubId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_repositoryId_window_from_to_idx" ON "MetricSnapshot"("repositoryId", "window", "from", "to");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubAccount" ADD CONSTRAINT "GitHubAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRepositoryAccess" ADD CONSTRAINT "UserRepositoryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRepositoryAccess" ADD CONSTRAINT "UserRepositoryAccess_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitEvent" ADD CONSTRAINT "CommitEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestEvent" ADD CONSTRAINT "PullRequestEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
