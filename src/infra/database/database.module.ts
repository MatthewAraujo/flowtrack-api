import { RepositoriesRepository } from '@/domain/flowtrack/application/repositories/repositories-repository'
import { UsersRepository } from '@/domain/flowtrack/application/repositories/users-repository'
import { Module } from '@nestjs/common'
import { CacheModule } from '../cache/cache.module'
import { PrismaService } from './prisma/prisma.service'
import { PrismaRepositoriesRepository } from './prisma/repositories/prisma-repositories-repository'
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
	],
	exports: [PrismaService, UsersRepository, RepositoriesRepository],
})
export class DatabaseModule {}
