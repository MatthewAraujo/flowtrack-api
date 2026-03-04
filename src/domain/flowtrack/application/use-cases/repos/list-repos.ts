import { Injectable } from '@nestjs/common'
import { UsersRepository } from '../../repositories/users-repository'
import { GitHubService } from '@/infra/github/github.service'
import { RepositoriesRepository } from '../../repositories/repositories-repository'
import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { TokenCipher } from '../../cryptography/token-cipher'

interface ListReposUseCaseRequest {
	userId: string
	query?: string
}

@Injectable()
export class ListReposUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private githubService: GitHubService,
		private repositoriesRepository: RepositoriesRepository,
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
	) {}

	async execute({ userId, query }: ListReposUseCaseRequest) {
		const currentUser = await this.usersRepository.findById(userId)

		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: {
				userId,
				provider: 'github',
			},
		})

		const encryptedToken = githubAccount?.accessToken ?? currentUser?.githubAccessToken

		if (!encryptedToken) {
			return { items: [] }
		}

		const token = await this.tokenCipher.decrypt(encryptedToken)
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
					await this.ensureAccess(userId, existing.id.toString())
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
				await this.ensureAccess(userId, created.id.toString())
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
