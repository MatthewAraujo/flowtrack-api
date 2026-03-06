import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceAuditLogsService } from '@/domain/flowtrack/application/services/workspace-audit-logs.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { Controller, Delete, NotFoundException, Param } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
})

@Controller('/workspaces/:id/members/:userId')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class RemoveWorkspaceMemberController {
	constructor(
		private members: WorkspaceMembersService,
		private auditLogs: WorkspaceAuditLogsService,
	) {}

	@Delete()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string; userId: string },
	) {
		const role = await this.members.getRole(params.userId, params.id)
		if (!role) {
			throw new NotFoundException('Workspace member not found')
		}

		await this.members.removeMember(params.id, params.userId)

		await this.auditLogs.log({
			workspaceId: params.id,
			actorUserId: user.sub,
			action: 'MEMBER_REMOVED',
			targetUserId: params.userId,
			metadata: {
				role,
			},
		})

		return { removed: true }
	}
}
