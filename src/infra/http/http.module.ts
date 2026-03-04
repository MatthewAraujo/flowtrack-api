import { Module } from '@nestjs/common'

import { CryptographyModule } from '../cryptography/cryptography.module'
import { DatabaseModule } from '../database/database.module'
import { EnvModule } from '../env/env.module'
import { StorageModule } from '../storage/storage.module'
import { AuthenticateController } from './controllers/auth/authenticate.controller'
import { CreateAccountController } from './controllers/auth/create-account.controller'
import { HealthController } from './controllers/health.controller'
import { RegisterUserUseCase } from '@/domain/assistent/application/use-cases/auth/register-user'
import { AuthenticateUserUseCase } from '@/domain/assistent/application/use-cases//auth/authenticate-user'
import { CacheModule } from '../cache/cache.module'

@Module({
	imports: [DatabaseModule, CryptographyModule, StorageModule, EnvModule, CacheModule],
	controllers: [
		CreateAccountController,
		AuthenticateController,
		HealthController,
	],
	providers: [
		RegisterUserUseCase,
		AuthenticateUserUseCase,
	],
})
export class HttpModule { }
