import { randomUUID } from 'node:crypto'

import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface CreateWorkspaceInput {
	name: string
	createdBy: string
}

interface UpdateWorkspaceInput {
	name?: string
}

@Injectable()
export class WorkspacesService {
	constructor(private prisma: PrismaService) {}

	async create({ name, createdBy }: CreateWorkspaceInput) {
		return this.prisma.workspace.create({
			data: {
				id: randomUUID(),
				name,
				createdBy,
			},
		})
	}

	async listForUser(userId: string) {
		return this.prisma.workspace.findMany({
			where: {
				members: {
					some: { userId },
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}

	async findById(workspaceId: string) {
		return this.prisma.workspace.findUnique({
			where: { id: workspaceId },
		})
	}

	async update(workspaceId: string, data: UpdateWorkspaceInput) {
		return this.prisma.workspace.update({
			where: { id: workspaceId },
			data,
		})
	}

	async remove(workspaceId: string) {
		return this.prisma.workspace.delete({
			where: { id: workspaceId },
		})
	}
}
