import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

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
			const jobId = new UniqueEntityID().toString()
			const startedAt = new Date()
			await this.prisma.syncJob.create({
				data: {
					id: jobId,
					userId: user.id,
					kind: 'DAILY',
					status: 'RUNNING',
					startedAt,
				},
			})

			try {
				const result = await this.syncProfileData.execute(user.id, { kind: 'DAILY' })
				if (result.status === 'skipped') {
					await this.prisma.syncJob.update({
						where: { id: jobId },
						data: { status: 'SKIPPED', finishedAt: new Date() },
					})
					this.logger.log(`Skipped daily profile sync for user ${user.id}: next=${result.nextAllowedAt}`)
					continue
				}

				await this.prisma.syncJob.update({
					where: { id: jobId },
					data: { status: 'SUCCESS', finishedAt: new Date() },
				})
				this.logger.log(
					`Synced daily profile data for user ${user.id}: window=1d repos=${result.repositories}, commits=${result.commitsUpserted}, pulls=${result.pullsUpserted}, reviews=${result.reviewsUpserted}`,
				)
			} catch (error) {
				await this.prisma.syncJob.update({
					where: { id: jobId },
					data: {
						status: 'FAILED',
						finishedAt: new Date(),
						error: error instanceof Error ? error.message : String(error),
					},
				})
				this.logger.warn(
					`Profile sync failed for user ${user.id}: ${error instanceof Error ? error.message : error}`,
				)
			}
		}
	}
}
