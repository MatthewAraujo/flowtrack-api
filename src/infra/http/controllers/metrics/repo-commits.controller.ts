import {
	BadRequestException,
	Controller,
	Get,
	NotFoundException,
	Param,
	Query,
	UnauthorizedException,
	ForbiddenException,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { TokenCipher } from '@/domain/assistent/application/cryptography/token-cipher'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GitHubIngestionService } from '@/infra/github/github-ingestion.service'
import { Roles } from '@/infra/authorization/roles'

const paramsSchema = z.object({
	repoId: z.string().uuid(),
})

const querySchema = z.object({
	from: z.string().datetime(),
	to: z.string().datetime(),
})

@Controller('/repos/:repoId/commits')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class RepoCommitsController {
	constructor(
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private ingestionService: GitHubIngestionService,
	) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { repoId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { from: string; to: string; refresh?: string },
	) {
		await this.ensureAccess(user.sub, params.repoId)

		const repository = await this.prisma.repository.findUnique({
			where: { id: params.repoId },
		})

		if (!repository) {
			throw new NotFoundException('Repository not found')
		}

		const token = await this.getGitHubToken(user.sub)
		const from = new Date(query.from)
		const to = new Date(query.to)
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
			throw new BadRequestException('Invalid date range')
		}

		await this.ingestionService.ingestRepositoryActivity({
			token,
			repositoryId: repository.id,
			owner: repository.ownerLogin,
			repo: repository.name,
			from,
			to,
		})

		const commits = await this.ingestionService.listCommitEvents(repository.id, from, to)

		return {
			items: commits.map((commit) => ({
				id: commit.id,
				sha: commit.sha,
				author_login: commit.authorLogin,
				author_email: commit.authorEmail,
				message: commit.message,
				committed_at: commit.committedAt,
			})),
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
