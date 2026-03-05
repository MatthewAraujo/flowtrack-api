import { Either, left, right } from '@/core/either'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { TokenCipher } from '../../cryptography/token-cipher'
import { NotFoundError } from '../errors/not-found-error'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'

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
		private tokenCipher: TokenCipher,
		private ingestion: IngestRepositoryActivityUseCase,
	) {}

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

		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId, provider: 'github' },
		})

		if (!githubAccount?.accessToken) {
			return left(new NotFoundError('token', 'GitHub account'))
		}

		const token = await this.tokenCipher.decrypt(githubAccount.accessToken)

		await this.ingestion.execute({
			token,
			repositoryId: repository.id,
			owner: repository.ownerLogin,
			repo: repository.name,
			from,
			to,
		})

		const commits = await this.ingestion.listCommitEvents(repository.id, from, to)

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
