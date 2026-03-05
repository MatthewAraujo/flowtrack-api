import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
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
		private prisma: PrismaService,
		private metrics: GetMetricsForReposUseCase,
	) {}

	async execute({
		userId,
		repositoryIds,
		window,
		refresh,
	}: GetDashboardSummaryUseCaseRequest): Promise<GetDashboardSummaryUseCaseResponse> {
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
