import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { WorkspaceAuditLogsService } from '@/domain/flowtrack/application/services/workspace-audit-logs.service'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { Body, Controller, Post } from '@nestjs/common'
import { z } from 'zod'

const bodySchema = z.object({
	name: z.string().min(2).max(120),
})

@Controller('/workspaces')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class CreateWorkspaceController {
	constructor(
		private workspaces: WorkspacesService,
		private members: WorkspaceMembersService,
		private auditLogs: WorkspaceAuditLogsService,
	) {}

	@Post()
	async handle(
		@CurrentUser() user: { sub: string },
		@Body(new ZodValidationPipe(bodySchema)) body: { name: string },
	) {
		const workspace = await this.workspaces.create({
			name: body.name,
			createdBy: user.sub,
		})

		await this.members.addMember({
			workspaceId: workspace.id,
			userId: user.sub,
			role: 'ENGINEERING_MANAGER',
			status: 'ACTIVE',
			joinedAt: new Date(),
		})

		await this.auditLogs.log({
			workspaceId: workspace.id,
			actorUserId: user.sub,
			action: 'MEMBER_ADDED',
			targetUserId: user.sub,
			metadata: {
				source: 'workspace_create',
				role: 'ENGINEERING_MANAGER',
			},
		})

		return {
			id: workspace.id,
			name: workspace.name,
			created_at: workspace.createdAt,
			updated_at: workspace.updatedAt,
			role: 'ENGINEERING_MANAGER',
		}
	}
}
