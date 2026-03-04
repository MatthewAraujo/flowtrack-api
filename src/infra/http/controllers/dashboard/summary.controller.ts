import {
	BadRequestException,
	Controller,
	ForbiddenException,
	Get,
	Query,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { Roles } from '@/infra/authorization/roles'
import { GetDashboardSummaryUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-dashboard-summary'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'

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
		const repoIds = query.repoIds.split(',').map((id) => id.trim()).filter(Boolean)

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
			const error = result.value
			switch (error.constructor) {
				case NotAllowedError:
					throw new ForbiddenException('Forbidden')
				default:
					throw new BadRequestException(error.message)
			}
		}

		const metrics = result.value

		return {
			repository_ids: metrics.repositoryIds,
			window: metrics.window,
			from: metrics.from,
			to: metrics.to,
			mean_commits_per_week: metrics.meanCommitsPerWeek,
			mean_pr_cycle_time_hours: metrics.meanPrCycleTimeHours,
			pr_rejection_rate: metrics.prRejectionRate,
			lines_added: metrics.linesAdded,
			lines_deleted: metrics.linesDeleted,
			net_lines: metrics.netLines,
			productivity_score: metrics.productivityScore,
			counts: metrics.counts,
		}
	}
}
