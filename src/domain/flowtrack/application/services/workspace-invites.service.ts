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

	async acceptInviteByToken(tokenHash: string, userId: string, email: string) {
		const now = new Date()

		const invite = await this.prisma.workspaceInvite.findFirst({
			where: {
				tokenHash,
				email,
				acceptedAt: null,
				expiresAt: {
					gt: now,
				},
			},
		})

		if (!invite) {
			return null
		}

		await this.prisma.workspaceInvite.update({
			where: { id: invite.id },
			data: {
				acceptedAt: now,
				usedByUserId: userId,
			},
		})

		return invite
	}

	async listPendingInvitesForEmail(email: string) {
		const now = new Date()

		return this.prisma.workspaceInvite.findMany({
			where: {
				email,
				acceptedAt: null,
				expiresAt: {
					gt: now,
				},
			},
			include: {
				workspace: true,
			},
		})
	}

	async revokeInvite(inviteId: string) {
		return this.prisma.workspaceInvite.delete({
			where: { id: inviteId },
		})
	}
}
