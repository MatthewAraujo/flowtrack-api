import { Module } from '@nestjs/common'
import { CacheModule } from '@/infra/cache/cache.module'
import { CryptographyModule } from '@/infra/cryptography/cryptography.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { EnvModule } from '@/infra/env/env.module'
import { GitHubModule } from '@/infra/github/github.module'
import { ProfileSyncJob } from '@/infra/profile/profile-sync.job'
import { IngestRepositoryActivityUseCase } from '@/domain/flowtrack/application/use-cases/github/ingest-repository-activity'
import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'

@Module({
	imports: [DatabaseModule, CacheModule, CryptographyModule, EnvModule, GitHubModule],
	providers: [IngestRepositoryActivityUseCase, SyncProfileDataUseCase, ProfileSyncJob],
})
export class CronJobsModule {}
