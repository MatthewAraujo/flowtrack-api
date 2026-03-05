import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'
import { Injectable } from '@nestjs/common'
import { GetMetricsForReposUseCase } from './get-metrics-for-repos'

interface GetDashboardSummaryUseCaseRequest {
	userId: string
	repositoryIds: string[]
	window: '7d' | '30d' | '90d'
	refresh?: boolean
}

type GetDashboardSummaryUseCaseResponse = Either<NotAllowedError, DashboardSummary>

@Injectable()
export class GetDashboardSummaryUseCase {
	constructor(
		private metrics: GetMetricsForReposUseCase,
		private repositoryAccess: RepositoryAccessService,
	) {}

	async execute({
		userId,
		repositoryIds,
		window,
		refresh,
	}: GetDashboardSummaryUseCaseRequest): Promise<GetDashboardSummaryUseCaseResponse> {
		const accessIds = await this.repositoryAccess.filterAccessible(userId, repositoryIds)
		const missing = repositoryIds.filter((id) => !accessIds.has(id))

		if (missing.length > 0) {
			return left(new NotAllowedError())
		}

		const metrics = await this.metrics.execute(repositoryIds, window, { refresh })

		return right(
			DashboardSummary.create({
				repositoryIds,
				metrics,
			}),
		)
	}
}
