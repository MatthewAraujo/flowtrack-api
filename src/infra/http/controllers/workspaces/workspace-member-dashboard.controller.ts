import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { WorkspaceRepositoriesService } from '@/domain/flowtrack/application/services/workspace-repositories.service'
import { GetMetricsForReposUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-metrics-for-repos'
import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { CacheMetricsService } from '@/infra/cache/cache-metrics.service'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { getCachedJson, setCachedJson } from '@/infra/cache/cache-json'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { DashboardSummaryPresenter } from '@/infra/http/presenters/dashboard-summary.presenter'
import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
})

const querySchema = z.object({
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

const WORKSPACE_MEMBER_DASHBOARD_TTL_SECONDS = 300

@Controller('/workspaces/:id/members/:userId/dashboard')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class WorkspaceMemberDashboardController {
	constructor(
		private members: WorkspaceMembersService,
		private repositoryAccess: RepositoryAccessService,
		private workspaceRepositories: WorkspaceRepositoriesService,
		private metrics: GetMetricsForReposUseCase,
		private cacheRepository: CacheRepository,
		private cacheMetrics: CacheMetricsService,
	) {}

	@Get()
	async handle(
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string; userId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { window: '7d' | '30d' | '90d'; refresh?: string },
	) {
		const selectedRepositoryIds = await this.workspaceRepositories.listSelectedRepositoryIds(params.id)
		const selectionKey = selectedRepositoryIds.slice().sort().join(',')
		const cacheKey = `workspace:member-dashboard:${params.id}:${params.userId}:${query.window}:${selectionKey}`
		if (query.refresh !== 'true') {
			const cached = await getCachedJson<ReturnType<typeof DashboardSummaryPresenter.toHTTP>>(
				this.cacheRepository,
				cacheKey,
			)
			if (cached) {
				await this.cacheMetrics.recordHit('workspace_member_dashboard')
				return cached
			}
		}

		const memberRole = await this.members.getRole(params.userId, params.id)
		if (!memberRole) {
			throw new NotFoundException('Workspace member not found')
		}

		let repositoryIds: string[] = []
		if (selectedRepositoryIds.length) {
			const selectedSet = new Set(selectedRepositoryIds)
			const memberRepositoryIds = await this.repositoryAccess.listRepositoryIds(params.userId)
			repositoryIds = memberRepositoryIds.filter((repositoryId) => selectedSet.has(repositoryId))
		}
		const metrics = await this.metrics.execute(repositoryIds, query.window, {
			refresh: query.refresh === 'true',
		})

		const summary = DashboardSummary.create({
			repositoryIds,
			metrics,
		})

		const response = DashboardSummaryPresenter.toHTTP(summary)
		await setCachedJson(this.cacheRepository, cacheKey, response, WORKSPACE_MEMBER_DASHBOARD_TTL_SECONDS)
		await this.cacheMetrics.recordMiss('workspace_member_dashboard')

		return response
	}
}
