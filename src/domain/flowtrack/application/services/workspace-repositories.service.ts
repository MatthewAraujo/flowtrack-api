import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class WorkspaceRepositoriesService {
	constructor(private prisma: PrismaService) {}

	async listSelectedRepositoryIds(workspaceId: string): Promise<string[]> {
		const selections = await this.prisma.workspaceRepositorySelection.findMany({
			where: { workspaceId },
			orderBy: { createdAt: 'asc' },
			select: { repositoryId: true },
		})

		return selections.map((selection) => selection.repositoryId)
	}

	async replaceSelection(workspaceId: string, repositoryIds: string[]) {
		const uniqueIds = Array.from(new Set(repositoryIds))

		await this.prisma.$transaction(async (tx) => {
			await tx.workspaceRepositorySelection.deleteMany({ where: { workspaceId } })

			if (uniqueIds.length === 0) {
				return
			}

			await tx.workspaceRepositorySelection.createMany({
				data: uniqueIds.map((repositoryId) => ({
					workspaceId,
					repositoryId,
				})),
			})
		})

		return uniqueIds
	}
}
