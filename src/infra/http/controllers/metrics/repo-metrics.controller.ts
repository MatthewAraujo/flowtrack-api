import {
	Controller,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Query,
	UnauthorizedException,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { TokenCipher } from '@/domain/assistent/application/cryptography/token-cipher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GitHubIngestionService } from '@/infra/github/github-ingestion.service'
import { MetricsService } from '@/infra/metrics/metrics.service'
import { Roles } from '@/infra/authorization/roles'

const paramsSchema = z.object({
	repoId: z.string().uuid(),
})

const querySchema = z.object({
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

@Controller('/repos/:repoId/metrics')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class RepoMetricsController {
	constructor(
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private ingestionService: GitHubIngestionService,
		private metricsService: MetricsService,
	) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { repoId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { window: '7d' | '30d' | '90d'; refresh?: string },
	) {
		await this.ensureAccess(user.sub, params.repoId)

		const repository = await this.prisma.repository.findUnique({
			where: { id: params.repoId },
		})

		if (!repository) {
			throw new NotFoundException('Repository not found')
		}

		const token = await this.getGitHubToken(user.sub)
		const { from, to } = this.metricsService.getWindowRange(query.window)

		await this.ingestionService.ingestRepositoryActivity({
			token,
			repositoryId: repository.id,
			owner: repository.ownerLogin,
			repo: repository.name,
			from,
			to,
		})

		const metrics = await this.metricsService.getMetricsForRepos(
			[repository.id],
			query.window,
			{ refresh: query.refresh === 'true' },
		)

		return {
			repository_id: repository.id,
			window: metrics.window,
			from: metrics.from,
			to: metrics.to,
			mean_commits_per_week: metrics.meanCommitsPerWeek,
			mean_pr_cycle_time_hours: metrics.meanPrCycleTimeHours,
			pr_rejection_rate: metrics.prRejectionRate,
			lines_added: metrics.linesAdded,
			lines_deleted: metrics.linesDeleted,
			net_lines: metrics.netLines,
			productivity_score: metrics.productivityScore,
			counts: metrics.counts,
		}
	}

	private async ensureAccess(userId: string, repositoryId: string) {
		const access = await this.prisma.userRepositoryAccess.findUnique({
			where: {
				userId_repositoryId: {
					userId,
					repositoryId,
				},
			},
		})

		if (!access) {
			throw new ForbiddenException('Forbidden')
		}
	}

	private async getGitHubToken(userId: string) {
		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId, provider: 'github' },
		})

		if (!githubAccount?.accessToken) {
			throw new UnauthorizedException('Missing GitHub token')
		}

		return this.tokenCipher.decrypt(githubAccount.accessToken)
	}
}
