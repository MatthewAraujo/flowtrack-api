import { RepositoriesRepository } from '@/domain/flowtrack/application/repositories/repositories-repository'
import { UsersRepository } from '@/domain/flowtrack/application/repositories/users-repository'
import { MetricsReadRepository } from '@/domain/flowtrack/application/repositories/metrics-read-repository'
import { RepoEventsRepository } from '@/domain/flowtrack/application/repositories/repo-events-repository'
import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'
import { Module } from '@nestjs/common'
import { CacheModule } from '../cache/cache.module'
import { PrismaService } from './prisma/prisma.service'
import { PrismaMetricsReadRepository } from './prisma/repositories/prisma-metrics-read-repository'
import { PrismaRepoEventsRepository } from './prisma/repositories/prisma-repo-events-repository'
import { PrismaRepositoriesRepository } from './prisma/repositories/prisma-repositories-repository'
import { PrismaRepositoryLookupRepository } from './prisma/repositories/prisma-repository-lookup-repository'
import { PrismaUsersRepository } from './prisma/repositories/prisma-users-repository'

@Module({
	imports: [CacheModule],
	providers: [
		PrismaService,
		{
			provide: UsersRepository,
			useClass: PrismaUsersRepository,
		},
		{
			provide: RepositoriesRepository,
			useClass: PrismaRepositoriesRepository,
		},
		{
			provide: RepositoryLookupRepository,
			useClass: PrismaRepositoryLookupRepository,
		},
		{
			provide: RepoEventsRepository,
			useClass: PrismaRepoEventsRepository,
		},
		{
			provide: MetricsReadRepository,
			useClass: PrismaMetricsReadRepository,
		},
	],
	exports: [
		PrismaService,
		UsersRepository,
		RepositoriesRepository,
		RepositoryLookupRepository,
		RepoEventsRepository,
		MetricsReadRepository,
	],
})
export class DatabaseModule {}
