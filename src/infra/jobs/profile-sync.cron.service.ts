import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'
import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class ProfileSyncJob {
	private readonly logger = new Logger(ProfileSyncJob.name)

	constructor(
		private prisma: PrismaService,
		private syncProfileData: SyncProfileDataUseCase,
		private envService: EnvService,
	) { }

	@Cron('0 3 * * *')
	async handleDailySync() {
		const users = await this.prisma.user.findMany({
			select: { id: true },
		})
		const days = Number(this.envService.get('PROFILE_SYNC_DAYS'))

		for (const user of users) {
			try {
				const result = await this.syncProfileData.execute(user.id, { days })
				this.logger.log(
					`Synced profile data for user ${user.id}: window=${days}d repos=${result.repositories}, commits=${result.commitsUpserted}, pulls=${result.pullsUpserted}, reviews=${result.reviewsUpserted}`,
				)
			} catch (error) {
				this.logger.warn(
					`Profile sync failed for user ${user.id}: ${error instanceof Error ? error.message : error}`,
				)
			}
		}
	}
}
