import { createHash, randomBytes } from 'node:crypto'

import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceInvitesService } from '@/domain/flowtrack/application/services/workspace-invites.service'
import { Body, Controller, Param, Post } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

const bodySchema = z.object({
	email: z.string().email(),
	role: z.enum(['ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER']).optional(),
})

const INVITE_EXPIRY_DAYS = 7

function hashInviteToken(token: string) {
	return createHash('sha256').update(token).digest('hex')
}

@Controller('/workspaces/:id/invites')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class CreateWorkspaceInviteController {
	constructor(private invites: WorkspaceInvitesService) {}

	@Post()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string },
		@Body(new ZodValidationPipe(bodySchema))
		body: { email: string; role?: 'ENGINEERING_MANAGER' | 'TECH_LEAD' | 'DEVELOPER' },
	) {
		const token = randomBytes(32).toString('base64url')
		const tokenHash = hashInviteToken(token)
		const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

		const invite = await this.invites.createInvite({
			workspaceId: params.id,
			email: body.email,
			role: body.role,
			tokenHash,
			createdBy: user.sub,
			expiresAt,
		})

		return {
			id: invite.id,
			workspace_id: invite.workspaceId,
			email: invite.email,
			role: invite.role,
			expires_at: invite.expiresAt,
			accept_url: `/invites/accept?token=${token}`,
		}
	}
}
