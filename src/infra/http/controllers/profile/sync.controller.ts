import { SyncProfileDataUseCase } from '@/domain/flowtrack/application/use-cases/profile/sync-profile-data'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { Controller, Post } from '@nestjs/common'

@Controller('/profile/sync')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileSyncController {
	constructor(private syncProfileData: SyncProfileDataUseCase) {}

	@Post()
	async handle(@CurrentUser() user: { sub: string }) {
		const result = await this.syncProfileData.execute(user.sub)
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
