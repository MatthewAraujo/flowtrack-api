import { GetDashboardSummaryUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-dashboard-summary'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { DashboardSummaryPresenter } from '@/infra/http/presenters/dashboard-summary.presenter'
import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'

const querySchema = z.object({
	repoIds: z.string().min(1),
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

@Controller('/dashboard/summary')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class DashboardSummaryController {
	constructor(private getDashboardSummary: GetDashboardSummaryUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { repoIds: string; window: '7d' | '30d' | '90d'; refresh?: string },
	) {
		const repoIds = query.repoIds
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean)

		if (repoIds.length === 0) {
			throw new BadRequestException('repoIds is required')
		}

		const result = await this.getDashboardSummary.execute({
			userId: user.sub,
			repositoryIds: repoIds,
			window: query.window,
			refresh: query.refresh === 'true',
		})

		if (result.isLeft()) {
			return result
		}

		return DashboardSummaryPresenter.toHTTP(result.value)
	}
}
