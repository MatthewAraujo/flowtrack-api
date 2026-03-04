import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { Either, left, right } from '@/core/either'
import { GetMetricsForReposUseCase } from './get-metrics-for-repos'

interface GetDashboardSummaryUseCaseRequest {
	userId: string
	repositoryIds: string[]
	window: '7d' | '30d' | '90d'
	refresh?: boolean
}

type GetDashboardSummaryUseCaseResponse = Either<
	NotAllowedError,
	{
		repositoryIds: string[]
		window: '7d' | '30d' | '90d'
		from: Date
		to: Date
		meanCommitsPerWeek: number
		meanPrCycleTimeHours: number | null
		prRejectionRate: number
		linesAdded: number
		linesDeleted: number
		netLines: number
		productivityScore: number
		counts: {
			commits: number
			closedPrs: number
			reviews: number
		}
	}
>

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

		return right({
			repositoryIds,
			window: metrics.window,
			from: metrics.from,
			to: metrics.to,
			meanCommitsPerWeek: metrics.meanCommitsPerWeek,
			meanPrCycleTimeHours: metrics.meanPrCycleTimeHours,
			prRejectionRate: metrics.prRejectionRate,
			linesAdded: metrics.linesAdded,
			linesDeleted: metrics.linesDeleted,
			netLines: metrics.netLines,
			productivityScore: metrics.productivityScore,
			counts: metrics.counts,
		})
	}
}
