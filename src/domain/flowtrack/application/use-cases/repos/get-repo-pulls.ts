import { Injectable } from '@nestjs/common'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { TokenCipher } from '../../cryptography/token-cipher'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { Either, left, right } from '@/core/either'
import { NotFoundError } from '../errors/not-found-error'

interface GetRepoPullsUseCaseRequest {
	userId: string
	repoId: string
	from: Date
	to: Date
}

type GetRepoPullsUseCaseResponse = Either<
	NotAllowedError | NotFoundError,
	{
		items: Array<{
			id: string
			number: number
			title: string
			state: string
			isMerged: boolean
			authorLogin: string | null
			createdAt: Date
			closedAt: Date | null
			mergedAt: Date | null
			additions: number | null
			deletions: number | null
			changedFiles: number | null
		}>
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
			items: pulls.map((pull) => ({
				id: pull.id,
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
			})),
		})
	}
}
