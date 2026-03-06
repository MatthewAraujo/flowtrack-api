import { randomUUID } from 'node:crypto'

import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

export type WorkspaceAuditAction = 'MEMBER_ADDED' | 'MEMBER_REMOVED' | 'ROLE_UPDATED'

interface AuditLogInput {
	workspaceId: string
	actorUserId: string
	action: WorkspaceAuditAction
	targetUserId?: string | null
	metadata?: Record<string, unknown> | null
}

@Injectable()
export class WorkspaceAuditLogsService {
	constructor(private prisma: PrismaService) {}

	async log({ workspaceId, actorUserId, action, targetUserId, metadata }: AuditLogInput) {
		return this.prisma.workspaceAuditLog.create({
			data: {
				id: randomUUID(),
				workspaceId,
				actorUserId,
				action,
				targetUserId: targetUserId ?? null,
				metadata: metadata ?? undefined,
			},
		})
	}
}
