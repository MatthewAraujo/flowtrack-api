import { CacheModule } from '@/infra/cache/cache.module'
import { Module } from '@nestjs/common'
import { GitHubService } from './github.service'

@Module({
	imports: [CacheModule],
	providers: [GitHubService],
	exports: [GitHubService],
})
export class GitHubModule {}
