import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { RepoMetrics } from '@/domain/flowtrack/enterprise/entities/value-objects/repo-metrics'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { GetMetricsForReposUseCase } from './get-metrics-for-repos'
import { ensureRepository } from '../repos/repository-lookup'
import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'

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
		private metrics: GetMetricsForReposUseCase,
		private repositoryAccess: RepositoryAccessService,
		private repositories: RepositoryLookupRepository,
	) {}

	async execute({
		userId,
		repoId,
		window,
		refresh,
	}: GetRepoMetricsUseCaseRequest): Promise<GetRepoMetricsUseCaseResponse> {
		const hasAccess = await this.repositoryAccess.hasAccess(userId, repoId)
		if (!hasAccess) {
			return left(new NotAllowedError())
		}

		const repositoryResult = await ensureRepository(this.repositories, repoId)
		if (repositoryResult.isLeft()) {
			return left(repositoryResult.value)
		}
		const repository = repositoryResult.value

		const metrics = await this.metrics.execute([repository.id], window, { refresh })

		return right(
			RepoMetrics.create({
				repositoryId: repository.id,
				metrics,
			}),
		)
	}
}
