-- CreateTable
CREATE TABLE "WorkspaceRepositorySelection" (
    "workspaceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRepositorySelection_pkey" PRIMARY KEY ("workspaceId", "repositoryId")
);

-- Indexes
CREATE INDEX "WorkspaceRepositorySelection_repositoryId_idx" ON "WorkspaceRepositorySelection"("repositoryId");

-- Foreign keys
ALTER TABLE "WorkspaceRepositorySelection" ADD CONSTRAINT "WorkspaceRepositorySelection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkspaceRepositorySelection" ADD CONSTRAINT "WorkspaceRepositorySelection_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
