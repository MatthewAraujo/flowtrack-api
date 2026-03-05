import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { ensureRepository } from './repository-lookup'
import { RepoEventsRepository } from '@/domain/flowtrack/application/repositories/repo-events-repository'
import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'

interface GetRepoCommitsUseCaseRequest {
	userId: string
	repoId: string
	from: Date
	to: Date
}

type GetRepoCommitsUseCaseResponse = Either<
	NotAllowedError | NotFoundError,
	{
		items: CommitEvent[]
	}
>

@Injectable()
export class GetRepoCommitsUseCase {
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
	}: GetRepoCommitsUseCaseRequest): Promise<GetRepoCommitsUseCaseResponse> {
		const hasAccess = await this.repositoryAccess.hasAccess(userId, repoId)
		if (!hasAccess) {
			return left(new NotAllowedError())
		}

		const repositoryResult = await ensureRepository(this.repositories, repoId)
		if (repositoryResult.isLeft()) {
			return left(repositoryResult.value)
		}
		const repository = repositoryResult.value

		const commits = await this.repoEvents.listCommits({
			repositoryId: repository.id,
			from,
			to,
		})

		return right({
			items: commits,
		})
	}
}
