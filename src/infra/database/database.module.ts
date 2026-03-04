import { UsersRepository } from '@/domain/assistent/application/repositories/users-repository'
import { Module } from '@nestjs/common'
import { CacheModule } from '../cache/cache.module'
import { PrismaService } from './prisma/prisma.service'
import { PrismaUsersRepository } from './prisma/repositories/prisma-users-repository'

@Module({
	imports: [CacheModule],
	providers: [
		PrismaService,
		{
			provide: UsersRepository,
			useClass: PrismaUsersRepository,
		},
	],
	exports: [
		PrismaService,
		UsersRepository,
	],
})
export class DatabaseModule { }
