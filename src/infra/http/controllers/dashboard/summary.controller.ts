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
import { MetricsService } from '@/infra/metrics/metrics.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Roles } from '@/infra/authorization/roles'

const querySchema = z.object({
	repoIds: z.string().min(1),
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

@Controller('/dashboard/summary')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class DashboardSummaryController {
	constructor(
		private prisma: PrismaService,
		private metricsService: MetricsService,
	) {}

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

		await this.ensureAccess(user.sub, repoIds)

		const metrics = await this.metricsService.getMetricsForRepos(
			repoIds,
			query.window,
			{ refresh: query.refresh === 'true' },
		)

		return {
			repository_ids: repoIds,
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

	private async ensureAccess(userId: string, repositoryIds: string[]) {
		const access = await this.prisma.userRepositoryAccess.findMany({
			where: {
				userId,
				repositoryId: { in: repositoryIds },
			},
			select: { repositoryId: true },
		})

		const accessIds = new Set(access.map((entry) => entry.repositoryId))
		const missing = repositoryIds.filter((id) => !accessIds.has(id))

		if (missing.length > 0) {
			throw new ForbiddenException('Forbidden')
		}
	}
}
