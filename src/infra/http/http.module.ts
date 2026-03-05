import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { AuthenticateUserUseCase } from '@/domain/flowtrack/application/use-cases//auth/authenticate-user'
import { RegisterUserUseCase } from '@/domain/flowtrack/application/use-cases/auth/register-user'
import { IngestRepositoryActivityUseCase } from '@/domain/flowtrack/application/use-cases/github/ingest-repository-activity'
import { GetDashboardSummaryUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-dashboard-summary'
import { GetMetricsForReposUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-metrics-for-repos'
import { GetRepoMetricsUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-repo-metrics'
import { GithubCallbackUseCase } from '@/domain/flowtrack/application/use-cases/oauth/github-callback'
import { GetProfileSummaryUseCase } from '@/domain/flowtrack/application/use-cases/profile/get-profile-summary'
import { GetProfileTrendsUseCase } from '@/domain/flowtrack/application/use-cases/profile/get-profile-trends'
import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'
import { GetRepoCommitsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-commits'
import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { GithubOAuthService } from '@/infra/oauth/github-oauth.service'
import { CacheModule } from '../cache/cache.module'
import { CryptographyModule } from '../cryptography/cryptography.module'
import { DatabaseModule } from '../database/database.module'
import { EnvModule } from '../env/env.module'
import { GitHubModule } from '../github/github.module'
import { StorageModule } from '../storage/storage.module'
import { AuthenticateController } from './controllers/auth/authenticate.controller'
import { CreateAccountController } from './controllers/auth/create-account.controller'
import { GithubCallbackController } from './controllers/auth/github-callback.controller'
import { GithubLoginController } from './controllers/auth/github-login.controller'
import { DashboardSummaryController } from './controllers/dashboard/summary.controller'
import { HealthController } from './controllers/health.controller'
import { RepoCommitsController } from './controllers/metrics/repo-commits.controller'
import { RepoMetricsController } from './controllers/metrics/repo-metrics.controller'
import { RepoPullsController } from './controllers/metrics/repo-pulls.controller'
import { ProfileSummaryController } from './controllers/profile/summary.controller'
import { ProfileSyncStatusController } from './controllers/profile/sync-status.controller'
import { ProfileTrendsController } from './controllers/profile/trends.controller'
import { ListReposController } from './controllers/repos/list-repos.controller'
import { UseCaseResultInterceptor } from './interceptors/use-case-result.interceptor'

@Module({
	imports: [
		DatabaseModule,
		CryptographyModule,
		StorageModule,
		EnvModule,
		CacheModule,
		GitHubModule,
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
		ProfileSummaryController,
		ProfileTrendsController,
		ProfileSyncStatusController,
		HealthController,
	],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: UseCaseResultInterceptor,
		},
		RegisterUserUseCase,
		AuthenticateUserUseCase,
		ListReposUseCase,
		GithubCallbackUseCase,
		IngestRepositoryActivityUseCase,
		GetRepoCommitsUseCase,
		GetRepoPullsUseCase,
		GetRepoMetricsUseCase,
		GetMetricsForReposUseCase,
		GetDashboardSummaryUseCase,
		GetProfileSummaryUseCase,
		GetProfileTrendsUseCase,
		SyncProfileDataUseCase,
		RepositoryAccessService,
		GithubOAuthService,
	],
})
export class HttpModule {}
