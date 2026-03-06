import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceAuditLogsService } from '@/domain/flowtrack/application/services/workspace-audit-logs.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { Controller, NotFoundException, Param, Patch, Body } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
})

const bodySchema = z.object({
	role: z.enum(['ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER']),
})

@Controller('/workspaces/:id/members/:userId')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class UpdateWorkspaceMemberController {
	constructor(
		private members: WorkspaceMembersService,
		private auditLogs: WorkspaceAuditLogsService,
	) {}

	@Patch()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string; userId: string },
		@Body(new ZodValidationPipe(bodySchema)) body: { role: 'ENGINEERING_MANAGER' | 'TECH_LEAD' | 'DEVELOPER' },
	) {
		const currentRole = await this.members.getRole(params.userId, params.id)
		if (!currentRole) {
			throw new NotFoundException('Workspace member not found')
		}

		const member = await this.members.updateRole(params.id, params.userId, body.role)

		if (currentRole !== body.role) {
			await this.auditLogs.log({
				workspaceId: params.id,
				actorUserId: user.sub,
				action: 'ROLE_UPDATED',
				targetUserId: params.userId,
				metadata: {
					previousRole: currentRole,
					newRole: body.role,
				},
			})
		}

		return {
			user_id: member.userId,
			role: member.role,
			status: member.status,
			joined_at: member.joinedAt,
		}
	}
}
