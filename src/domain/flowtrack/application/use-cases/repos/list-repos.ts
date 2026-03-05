import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import type { Prisma } from 'generated/prisma'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

interface ListReposUseCaseRequest {
	userId: string
	query?: string
	owner?: string
	page?: number
	pageSize?: number
}

@Injectable()
export class ListReposUseCase {
	constructor(
		private prisma: PrismaService,
	) {}

	async execute({ userId, query, owner, page = 1, pageSize = 10 }: ListReposUseCaseRequest) {
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
}
