import { CacheRepository } from '@/infra/cache/cache-repository'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { Controller, Get } from '@nestjs/common'
import { EnvService } from '@/infra/env/env.service'

@Controller('/profile/sync/status')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileSyncStatusController {
	constructor(
		private cacheRepository: CacheRepository,
		private envService: EnvService,
	) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }) {
		const lastSync = await this.cacheRepository.get<string>(`profile:last_sync:${user.sub}`)
		const days = Number(this.envService.get('PROFILE_SYNC_DAYS'))
		const lastSyncTime = lastSync ? new Date(lastSync).getTime() : null
		const nextAllowed =
			lastSyncTime && Number.isFinite(lastSyncTime)
				? new Date(lastSyncTime + 24 * 60 * 60 * 1000).toISOString()
				: null

		return {
			last_synced_at: lastSync,
			window_days: days,
			next_sync_at: nextAllowed,
		}
	}
}
