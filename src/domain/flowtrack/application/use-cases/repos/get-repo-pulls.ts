import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { ensureRepository } from './repository-lookup'
import { RepoEventsRepository } from '@/domain/flowtrack/application/repositories/repo-events-repository'
import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'

interface GetRepoPullsUseCaseRequest {
	userId: string
	repoId: string
	from: Date
	to: Date
}

type GetRepoPullsUseCaseResponse = Either<
	NotAllowedError | NotFoundError,
	{
		items: PullRequestEvent[]
	}
>

@Injectable()
export class GetRepoPullsUseCase {
	constructor(
		private repositoryAccess: RepositoryAccessService,
		private repositories: RepositoryLookupRepository,
		private repoEvents: RepoEventsRepository,
	) {}

	async execute({
		userId,
		repoId,
		from,
		to,
	}: GetRepoPullsUseCaseRequest): Promise<GetRepoPullsUseCaseResponse> {
		const hasAccess = await this.repositoryAccess.hasAccess(userId, repoId)
		if (!hasAccess) {
			return left(new NotAllowedError())
		}

		const repositoryResult = await ensureRepository(this.repositories, repoId)
		if (repositoryResult.isLeft()) {
			return left(repositoryResult.value)
		}
		const repository = repositoryResult.value

		const pulls = await this.repoEvents.listPulls({
			repositoryId: repository.id,
			from,
			to,
		})

		return right({
			items: pulls,
		})
	}
}
