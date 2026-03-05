import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { toCommitEvent } from './repo-event-mappers'
import { ensureRepository } from './repository-lookup'

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
		private prisma: PrismaService,
		private repositoryAccess: RepositoryAccessService,
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

		const repositoryResult = await ensureRepository(this.prisma, repoId)
		if (repositoryResult.isLeft()) {
			return left(repositoryResult.value)
		}
		const repository = repositoryResult.value

		const commits = await this.prisma.commitEvent.findMany({
			where: {
				repositoryId: repository.id,
				committedAt: {
					gte: from,
					lte: to,
				},
			},
			orderBy: {
				committedAt: 'asc',
			},
		})

		return right({
			items: commits.map(toCommitEvent),
		})
	}
}
