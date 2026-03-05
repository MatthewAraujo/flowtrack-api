import { Either, left, right } from '@/core/either'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { TokenCipher } from '../../cryptography/token-cipher'
import { NotFoundError } from '../errors/not-found-error'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'

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
		private tokenCipher: TokenCipher,
		private ingestion: IngestRepositoryActivityUseCase,
	) {}

	async execute({
		userId,
		repoId,
		from,
		to,
	}: GetRepoPullsUseCaseRequest): Promise<GetRepoPullsUseCaseResponse> {
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

		const pulls = await this.ingestion.listPullRequestEvents(repository.id, from, to)

		return right({
			items: pulls.map((pull) =>
				PullRequestEvent.create(
					{
						number: pull.number,
						title: pull.title,
						state: pull.state,
						isMerged: pull.isMerged,
						authorLogin: pull.authorLogin,
						createdAt: pull.createdAt,
						closedAt: pull.closedAt,
						mergedAt: pull.mergedAt,
						additions: pull.additions,
						deletions: pull.deletions,
						changedFiles: pull.changedFiles,
					},
					new UniqueEntityID(pull.id),
				),
			),
		})
	}
}
