import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { Controller, Post, HttpException, HttpStatus } from '@nestjs/common'
import { CacheRepository } from '@/infra/cache/cache-repository'

@Controller('/profile/sync')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileSyncController {
	constructor(
		private syncProfileData: SyncProfileDataUseCase,
		private cacheRepository: CacheRepository,
	) {}

	@Post()
	async handle(@CurrentUser() user: { sub: string }) {
		const lastSync = await this.cacheRepository.get<string>(`profile:last_sync:${user.sub}`)
		if (lastSync) {
			const lastSyncTime = new Date(lastSync).getTime()
			if (Number.isFinite(lastSyncTime)) {
				const nextAllowed = lastSyncTime + 24 * 60 * 60 * 1000
				if (Date.now() < nextAllowed) {
					throw new HttpException('Sync is available once per day', HttpStatus.TOO_MANY_REQUESTS)
				}
			}
		}

		const result = await this.syncProfileData.execute(user.sub, { force: true })
		return {
			repositories: result.repositories,
			commits_upserted: result.commitsUpserted,
			pulls_upserted: result.pullsUpserted,
			reviews_upserted: result.reviewsUpserted,
			synced_at: result.syncedAt,
			days: result.days,
		}
	}
}
