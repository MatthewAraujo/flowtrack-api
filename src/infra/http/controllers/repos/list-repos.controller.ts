import { Controller, Get, Query } from '@nestjs/common'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { UsersRepository } from '@/domain/assistent/application/repositories/users-repository'
import { GitHubService } from '@/infra/github/github.service'
import { RepositoriesRepository } from '@/domain/assistent/application/repositories/repositories-repository'
import { Repository } from '@/domain/assistent/enterprise/entities/repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { TokenCipher } from '@/domain/assistent/application/cryptography/token-cipher'

@Controller('/repos')
export class ListReposController {
	constructor(
		private usersRepository: UsersRepository,
		private githubService: GitHubService,
		private repositoriesRepository: RepositoriesRepository,
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
	) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Query('q') query?: string,
	) {
		const currentUser = await this.usersRepository.findById(user.sub)

		if (!currentUser?.githubAccessToken) {
			return { items: [] }
		}

		const token = await this.tokenCipher.decrypt(currentUser.githubAccessToken)
		const repos = await this.githubService.listRepositories(token)

		const storedRepos = await Promise.all(
			repos.map(async (repo) => {
				const existing = await this.repositoriesRepository.findByProviderRepoId(
					'github',
					repo.id.toString(),
				)

				if (existing) {
					existing.defaultBranch = repo.default_branch ?? null
					await this.repositoriesRepository.save(existing)
					await this.ensureAccess(currentUser.id.toString(), existing.id.toString())
					return existing
				}

				const created = Repository.create({
					provider: 'github',
					providerRepoId: repo.id.toString(),
					name: repo.name,
					fullName: repo.full_name,
					isPrivate: repo.private,
					ownerLogin: repo.owner.login,
					defaultBranch: repo.default_branch ?? null,
				})

				await this.repositoriesRepository.create(created)
				await this.ensureAccess(currentUser.id.toString(), created.id.toString())
				return created
			}),
		)

		const filtered = query
			? storedRepos.filter((repo) =>
					repo.fullName.toLowerCase().includes(query.toLowerCase()),
			  )
			: storedRepos

		return {
			items: filtered.map((repo) => ({
				id: repo.id.toString(),
				name: repo.name,
				full_name: repo.fullName,
				is_private: repo.isPrivate,
				owner_login: repo.ownerLogin,
				default_branch: repo.defaultBranch,
			})),
		}
	}

	private async ensureAccess(userId: string, repositoryId: string) {
		await this.prisma.userRepositoryAccess.upsert({
			where: {
				userId_repositoryId: {
					userId,
					repositoryId,
				},
			},
			update: {},
			create: {
				id: new UniqueEntityID().toString(),
				userId,
				repositoryId,
			},
		})
	}
}
