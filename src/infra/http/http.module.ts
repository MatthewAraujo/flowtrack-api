import { Module } from '@nestjs/common'

import { DatabaseModule } from '../database/database.module'
import { EnvModule } from '../env/env.module'
import { StorageModule } from '../storage/storage.module'
import { AuthenticateController } from './controllers/auth/authenticate.controller'
import { CreateAccountController } from './controllers/auth/create-account.controller'
import { HealthController } from './controllers/health.controller'
import { GithubLoginController } from './controllers/auth/github-login.controller'
import { GithubCallbackController } from './controllers/auth/github-callback.controller'
import { ListReposController } from './controllers/repos/list-repos.controller'
import { RepoCommitsController } from './controllers/metrics/repo-commits.controller'
import { RepoPullsController } from './controllers/metrics/repo-pulls.controller'
import { RepoMetricsController } from './controllers/metrics/repo-metrics.controller'
import { DashboardSummaryController } from './controllers/dashboard/summary.controller'
import { RegisterUserUseCase } from '@/domain/assistent/application/use-cases/auth/register-user'
import { AuthenticateUserUseCase } from '@/domain/assistent/application/use-cases//auth/authenticate-user'
import { CacheModule } from '../cache/cache.module'
import { GithubOAuthService } from '@/infra/oauth/github-oauth.service'
import { CryptographyModule } from '../cryptography/cryptography.module'
import { GitHubModule } from '../github/github.module'
import { MetricsModule } from '../metrics/metrics.module'

@Module({
	imports: [
		DatabaseModule,
		CryptographyModule,
		StorageModule,
		EnvModule,
		CacheModule,
		GitHubModule,
		MetricsModule,
	],
	controllers: [
		CreateAccountController,
		AuthenticateController,
		GithubLoginController,
		GithubCallbackController,
		ListReposController,
		RepoCommitsController,
		RepoPullsController,
		RepoMetricsController,
		DashboardSummaryController,
		HealthController,
	],
	providers: [
		RegisterUserUseCase,
		AuthenticateUserUseCase,
		GithubOAuthService,
	],
})
export class HttpModule { }
