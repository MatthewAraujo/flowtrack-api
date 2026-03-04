import { Injectable } from '@nestjs/common'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { TokenCipher } from '../../cryptography/token-cipher'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { Either, left, right } from '@/core/either'
import { NotFoundError } from '../errors/not-found-error'
import { GetMetricsForReposUseCase } from './get-metrics-for-repos'
import { RepoMetrics } from '@/domain/flowtrack/enterprise/entities/value-objects/repo-metrics'

interface GetRepoMetricsUseCaseRequest {
	userId: string
	repoId: string
	window: '7d' | '30d' | '90d'
	refresh?: boolean
}

type GetRepoMetricsUseCaseResponse = Either<
	NotAllowedError | NotFoundError,
	RepoMetrics
>

@Injectable()
export class GetRepoMetricsUseCase {
	constructor(
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private ingestion: IngestRepositoryActivityUseCase,
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

		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId, provider: 'github' },
		})

		if (!githubAccount?.accessToken) {
			return left(new NotFoundError('token', 'GitHub account'))
		}

		const token = await this.tokenCipher.decrypt(githubAccount.accessToken)
		const { from, to } = this.metrics.getWindowRange(window)

		await this.ingestion.execute({
			token,
			repositoryId: repository.id,
			owner: repository.ownerLogin,
			repo: repository.name,
			from,
			to,
		})

		const metrics = await this.metrics.execute([repository.id], window, { refresh })

		return right(
			RepoMetrics.create({
				repositoryId: repository.id,
				metrics,
			}),
		)
	}
}
