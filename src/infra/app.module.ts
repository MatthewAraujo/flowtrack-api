import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { AuthorizationModule } from './authorization/authorization.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { envSchema } from './env/env'
import { EnvModule } from './env/env.module'
import { GitHubModule } from './github/github.module'
import { HttpModule } from './http/http.module'
import { ScheduleModule } from '@nestjs/schedule'
import { CronJobsModule } from './jobs/cron-jobs.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			validate: (env) => envSchema.parse(env),
			isGlobal: true,
		}),
		ScheduleModule.forRoot(),
		AuthModule,
		AuthorizationModule,
		DashboardModule,
		HttpModule,
		EnvModule,
		GitHubModule,
		CronJobsModule,
	],
})
export class AppModule {}
