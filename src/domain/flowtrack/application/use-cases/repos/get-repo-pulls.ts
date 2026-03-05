import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'
import { toPullRequestEvent } from './repo-event-mappers'
import { ensureRepository } from './repository-lookup'

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
		private prisma: PrismaService,
		private repositoryAccess: RepositoryAccessService,
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

		const repositoryResult = await ensureRepository(this.prisma, repoId)
		if (repositoryResult.isLeft()) {
			return left(repositoryResult.value)
		}
		const repository = repositoryResult.value

		const pulls = await this.prisma.pullRequestEvent.findMany({
			where: {
				repositoryId: repository.id,
				createdAt: {
					lte: to,
				},
				OR: [
					{
						createdAt: {
							gte: from,
						},
					},
					{
						closedAt: {
							gte: from,
						},
					},
					{
						mergedAt: {
							gte: from,
						},
					},
				],
			},
			orderBy: {
				createdAt: 'asc',
			},
		})

		return right({
			items: pulls.map(toPullRequestEvent),
		})
	}
}
