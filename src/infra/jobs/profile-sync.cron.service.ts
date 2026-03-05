import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'

@Injectable()
export class ProfileSyncJob {
	private readonly logger = new Logger(ProfileSyncJob.name)

	constructor(
		private prisma: PrismaService,
		private syncProfileData: SyncProfileDataUseCase,
	) { }

	@Cron('0 3 * * *')
	async handleDailySync() {
		const users = await this.prisma.user.findMany({
			select: { id: true },
		})

		for (const user of users) {
			try {
				const result = await this.syncProfileData.execute(user.id, { kind: 'DAILY' })
				if (result.status === 'skipped') {
					this.logger.log(`Skipped daily profile sync for user ${user.id}: next=${result.nextAllowedAt}`)
					continue
				}

				this.logger.log(
					`Synced daily profile data for user ${user.id}: window=1d repos=${result.repositories}, commits=${result.commitsUpserted}, pulls=${result.pullsUpserted}, reviews=${result.reviewsUpserted}`,
				)
			} catch (error) {
				this.logger.warn(
					`Profile sync failed for user ${user.id}: ${error instanceof Error ? error.message : error}`,
				)
			}
		}
	}
}
