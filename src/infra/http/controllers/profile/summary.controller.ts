import { GetProfileSummaryUseCase } from '@/domain/flowtrack/application/use-cases/profile/get-profile-summary'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ProfileSummaryPresenter } from '@/infra/http/presenters/profile-summary.presenter'
import { Controller, Get, Query } from '@nestjs/common'

@Controller('/profile/summary')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileSummaryController {
	constructor(private getProfileSummary: GetProfileSummaryUseCase) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }, @Query('refresh') refresh?: string) {
		const summary = await this.getProfileSummary.execute(user.sub, { refresh: refresh === 'true' })
		return ProfileSummaryPresenter.toHTTP(summary)
	}
}
