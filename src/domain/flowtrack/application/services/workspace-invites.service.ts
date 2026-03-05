import { randomUUID } from 'node:crypto'

import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

interface CreateWorkspaceInviteInput {
	workspaceId: string
	email: string
	role?: string
	tokenHash: string
	createdBy: string
	expiresAt: Date
}

@Injectable()
export class WorkspaceInvitesService {
	constructor(private prisma: PrismaService) {}

	async createInvite({
		workspaceId,
		email,
		role,
		tokenHash,
		createdBy,
		expiresAt,
	}: CreateWorkspaceInviteInput) {
		return this.prisma.workspaceInvite.create({
			data: {
				id: randomUUID(),
				workspaceId,
				email,
				role: role ?? 'DEVELOPER',
				tokenHash,
				createdBy,
				expiresAt,
			},
		})
	}

	async acceptInviteByToken(tokenHash: string, userId: string) {
		const now = new Date()

		const updated = await this.prisma.workspaceInvite.updateMany({
			where: {
				tokenHash,
				acceptedAt: null,
				expiresAt: {
					gt: now,
				},
			},
			data: {
				acceptedAt: now,
				usedByUserId: userId,
			},
		})

		if (updated.count === 0) {
			return null
		}

		return this.prisma.workspaceInvite.findFirst({
			where: { tokenHash },
		})
	}

	async revokeInvite(inviteId: string) {
		return this.prisma.workspaceInvite.delete({
			where: { id: inviteId },
		})
	}
}
