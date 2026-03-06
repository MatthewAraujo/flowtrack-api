import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class RepositoryAccessService {
	constructor(private prisma: PrismaService) {}

	async hasAccess(userId: string, repositoryId: string): Promise<boolean> {
		const access = await this.prisma.userRepositoryAccess.findUnique({
			where: {
				userId_repositoryId: {
					userId,
					repositoryId,
				},
			},
		})

		return Boolean(access)
	}

	async listRepositoryIds(userId: string): Promise<string[]> {
		const access = await this.prisma.userRepositoryAccess.findMany({
			where: { userId },
			select: { repositoryId: true },
		})

		return access.map((entry) => entry.repositoryId)
	}

	async filterAccessible(userId: string, repositoryIds: string[]): Promise<Set<string>> {
		if (repositoryIds.length === 0) {
			return new Set()
		}

		const access = await this.prisma.userRepositoryAccess.findMany({
			where: {
				userId,
				repositoryId: { in: repositoryIds },
			},
			select: { repositoryId: true },
		})

		return new Set(access.map((entry) => entry.repositoryId))
	}

	async listRepositoryIdsForUsers(userIds: string[]): Promise<string[]> {
		if (userIds.length === 0) {
			return []
		}

		const access = await this.prisma.userRepositoryAccess.findMany({
			where: {
				userId: { in: userIds },
			},
			select: { repositoryId: true },
		})

		return Array.from(new Set(access.map((entry) => entry.repositoryId)))
	}
}
