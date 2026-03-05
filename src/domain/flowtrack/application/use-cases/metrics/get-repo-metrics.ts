import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepoMetrics } from '@/domain/flowtrack/enterprise/entities/value-objects/repo-metrics'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { GetMetricsForReposUseCase } from './get-metrics-for-repos'

interface GetRepoMetricsUseCaseRequest {
	userId: string
	repoId: string
	window: '7d' | '30d' | '90d'
	refresh?: boolean
}

type GetRepoMetricsUseCaseResponse = Either<NotAllowedError | NotFoundError, RepoMetrics>

@Injectable()
export class GetRepoMetricsUseCase {
	constructor(
		private prisma: PrismaService,
		private metrics: GetMetricsForReposUseCase,
	) {}

	async execute({
		userId,
		repoId,
		window,
		refresh,
	}: GetRepoMetricsUseCaseRequest): Promise<GetRepoMetricsUseCaseResponse> {
		const access = await this.prisma.userRepositoryAccess.findUnique({
			where: {
				userId_repositoryId: {
					userId,
					repositoryId: repoId,
				},
			},
		})

		if (!access) {
			return left(new NotAllowedError())
		}

		const repository = await this.prisma.repository.findUnique({
			where: { id: repoId },
		})

		if (!repository) {
			return left(new NotFoundError(repoId, 'Repository'))
		}

		const metrics = await this.metrics.execute([repository.id], window, { refresh })

		return right(
			RepoMetrics.create({
				repositoryId: repository.id,
				metrics,
			}),
		)
	}
}
