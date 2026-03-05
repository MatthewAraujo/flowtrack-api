import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class WorkspaceMembersService {
	constructor(private prisma: PrismaService) {}

	async listMembers(workspaceId: string) {
		return this.prisma.workspaceMember.findMany({
			where: { workspaceId },
			orderBy: { joinedAt: 'asc' },
		})
	}

	async getRole(userId: string, workspaceId: string) {
		const member = await this.prisma.workspaceMember.findUnique({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
			select: { role: true },
		})

		return member?.role ?? null
	}

	async updateRole(workspaceId: string, userId: string, role: string) {
		return this.prisma.workspaceMember.update({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
			data: { role },
		})
	}

	async removeMember(workspaceId: string, userId: string) {
		return this.prisma.workspaceMember.delete({
			where: {
				workspaceId_userId: {
					workspaceId,
					userId,
				},
			},
		})
	}
}
