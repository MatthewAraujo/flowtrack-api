import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { GetMetricsForReposUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-metrics-for-repos'
import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { CacheMetricsService } from '@/infra/cache/cache-metrics.service'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { getCachedJson, setCachedJson } from '@/infra/cache/cache-json'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { DashboardSummaryPresenter } from '@/infra/http/presenters/dashboard-summary.presenter'
import { Controller, Get, Param, Query } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

const querySchema = z.object({
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

const WORKSPACE_DASHBOARD_TTL_SECONDS = 300

@Controller('/workspaces/:id/dashboard')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class WorkspaceDashboardController {
	constructor(
		private members: WorkspaceMembersService,
		private repositoryAccess: RepositoryAccessService,
		private metrics: GetMetricsForReposUseCase,
		private cacheRepository: CacheRepository,
		private cacheMetrics: CacheMetricsService,
	) {}

	@Get()
	async handle(
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { window: '7d' | '30d' | '90d'; refresh?: string },
	) {
		const cacheKey = `workspace:dashboard:${params.id}:${query.window}`
		if (query.refresh !== 'true') {
			const cached = await getCachedJson<ReturnType<typeof DashboardSummaryPresenter.toHTTP>>(
				this.cacheRepository,
				cacheKey,
			)
			if (cached) {
				await this.cacheMetrics.recordHit('workspace_dashboard')
				return cached
			}
		}

		const members = await this.members.listMembers(params.id)
		const memberIds = members.map((member) => member.userId)
		const repositoryIds = await this.repositoryAccess.listRepositoryIdsForUsers(memberIds)

		const metrics = await this.metrics.execute(repositoryIds, query.window, {
			refresh: query.refresh === 'true',
		})

		const summary = DashboardSummary.create({
			repositoryIds,
			metrics,
		})

		const response = DashboardSummaryPresenter.toHTTP(summary)
		await setCachedJson(this.cacheRepository, cacheKey, response, WORKSPACE_DASHBOARD_TTL_SECONDS)
		await this.cacheMetrics.recordMiss('workspace_dashboard')

		return response
	}
}
