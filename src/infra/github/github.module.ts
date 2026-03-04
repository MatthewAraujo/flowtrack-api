import { Module } from '@nestjs/common'
import { GitHubService } from './github.service'

@Module({
\tproviders: [GitHubService],
\texports: [GitHubService],
})
export class GitHubModule {}
