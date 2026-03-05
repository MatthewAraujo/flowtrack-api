import { Either, left, right } from '@/core/either'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { NotFoundError } from '../errors/not-found-error'

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
	constructor(private prisma: PrismaService) {}

	async execute({
		userId,
		repoId,
		from,
		to,
	}: GetRepoCommitsUseCaseRequest): Promise<GetRepoCommitsUseCaseResponse> {
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
			items: commits.map((commit) =>
				CommitEvent.create(
					{
						sha: commit.sha,
						authorLogin: commit.authorLogin,
						authorEmail: commit.authorEmail,
						message: commit.message,
						committedAt: commit.committedAt,
					},
					new UniqueEntityID(commit.id),
				),
			),
		})
	}
}
