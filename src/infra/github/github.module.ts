import { Module } from '@nestjs/common'
import { CacheModule } from '@/infra/cache/cache.module'
import { GitHubService } from './github.service'

@Module({
	imports: [CacheModule],
	providers: [GitHubService],
	exports: [GitHubService],
})
export class GitHubModule {}
