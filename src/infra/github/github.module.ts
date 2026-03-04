import { Module } from '@nestjs/common'
import { CacheModule } from '@/infra/cache/cache.module'
import { GitHubService } from './github.service'
import { GitHubIngestionService } from './github-ingestion.service'

@Module({
	imports: [CacheModule],
	providers: [GitHubService, GitHubIngestionService],
	exports: [GitHubService, GitHubIngestionService],
})
export class GitHubModule {}
