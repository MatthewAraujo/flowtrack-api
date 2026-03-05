import { GetProfileTrendsUseCase } from '@/domain/flowtrack/application/use-cases/profile/get-profile-trends'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ProfileTrendsPresenter } from '@/infra/http/presenters/profile-trends.presenter'
import { Controller, Get, Query } from '@nestjs/common'

@Controller('/profile/trends')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileTrendsController {
	constructor(private getProfileTrends: GetProfileTrendsUseCase) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }, @Query('refresh') refresh?: string) {
		const trends = await this.getProfileTrends.execute(user.sub, { refresh: refresh === 'true' })
		return ProfileTrendsPresenter.toHTTP(trends)
	}
}
