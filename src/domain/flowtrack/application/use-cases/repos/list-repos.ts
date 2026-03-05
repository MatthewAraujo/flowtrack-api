import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GitHubService } from '@/infra/github/github.service'
import { Injectable } from '@nestjs/common'
import type { Prisma } from 'generated/prisma'
import { TokenCipher } from '../../cryptography/token-cipher'
import { RepositoriesRepository } from '../../repositories/repositories-repository'
import { UsersRepository } from '../../repositories/users-repository'

interface ListReposUseCaseRequest {
	userId: string
	query?: string
	owner?: string
	page?: number
	pageSize?: number
}

const REPO_SYNC_TTL_SECONDS = 86400

@Injectable()
export class ListReposUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private githubService: GitHubService,
		private repositoriesRepository: RepositoriesRepository,
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private cacheRepository: CacheRepository,
	) {}

	async execute({ userId, query, owner, page = 1, pageSize = 10 }: ListReposUseCaseRequest) {
		const currentUser = await this.usersRepository.findById(userId)

		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: {
				userId,
				provider: 'github',
			},
		})

		const encryptedToken = githubAccount?.accessToken ?? currentUser?.githubAccessToken

		const cacheKey = `repos:sync:${userId}`
		const hasRecentSync = Boolean(await this.cacheRepository.get<string>(cacheKey))

		if (!hasRecentSync && encryptedToken) {
			const token = await this.tokenCipher.decrypt(encryptedToken)
			const repos = await this.githubService.listRepositories(token)

			await Promise.all(
				repos.map(async (repo) => {
					const existing = await this.repositoriesRepository.findByProviderRepoId(
						'github',
						repo.id.toString(),
					)

					if (existing) {
						existing.defaultBranch = repo.default_branch ?? null
						await this.repositoriesRepository.save(existing)
						await this.ensureAccess(userId, existing.id.toString())
						return
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
				}),
			)

			await this.cacheRepository.set(cacheKey, '1', REPO_SYNC_TTL_SECONDS)
		}

		const safePageSize = Math.max(1, Math.min(pageSize, 100))
		const safePage = Math.max(1, page)

		const baseWhere: Prisma.RepositoryWhereInput = {
			access: {
				some: {
					userId,
				},
			},
		}

		const queryWhere: Prisma.RepositoryWhereInput = query
			? {
					fullName: {
						contains: query,
						mode: 'insensitive',
					},
				}
			: {}

		const ownerWhere: Prisma.RepositoryWhereInput = owner
			? {
					ownerLogin: {
						equals: owner,
						mode: 'insensitive',
					},
				}
			: {}

		const whereForItems: Prisma.RepositoryWhereInput = {
			AND: [baseWhere, queryWhere, ownerWhere],
		}

		const whereForOrgs: Prisma.RepositoryWhereInput = {
			AND: [baseWhere, queryWhere],
		}

		const total = await this.prisma.repository.count({ where: whereForItems })
		const totalPages = Math.max(1, Math.ceil(total / safePageSize))
		const effectivePage = Math.min(safePage, totalPages)

		const [items, orgRows] = await Promise.all([
			this.prisma.repository.findMany({
				where: whereForItems,
				orderBy: { fullName: 'asc' },
				skip: (effectivePage - 1) * safePageSize,
				take: safePageSize,
			}),
			this.prisma.repository.findMany({
				where: whereForOrgs,
				distinct: ['ownerLogin'],
				select: { ownerLogin: true },
				orderBy: { ownerLogin: 'asc' },
			}),
		])

		const orgs = orgRows
			.map((row) => row.ownerLogin)
			.filter((value): value is string => Boolean(value))

		return {
			items: items.map(
				(repo) =>
					Repository.create(
						{
							provider: repo.provider as Repository['provider'],
							providerRepoId: repo.providerRepoId,
							name: repo.name,
							fullName: repo.fullName,
							isPrivate: repo.isPrivate,
							ownerLogin: repo.ownerLogin,
							defaultBranch: repo.defaultBranch,
							createdAt: repo.createdAt,
							updatedAt: repo.updatedAt,
						},
						new UniqueEntityID(repo.id),
					),
			),
			total,
			page: effectivePage,
			pageSize: safePageSize,
			orgs,
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
