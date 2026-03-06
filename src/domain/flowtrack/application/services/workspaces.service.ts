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
			include: {
				members: {
					where: { userId },
					select: {
						role: true,
						status: true,
					},
				},
			},
		})
	}

	async findById(workspaceId: string) {
		return this.prisma.workspace.findUnique({
			where: { id: workspaceId },
		})
	}

	async getWithMembers(workspaceId: string) {
		return this.prisma.workspace.findUnique({
			where: { id: workspaceId },
			include: {
				members: {
					orderBy: { joinedAt: 'asc' },
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
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
