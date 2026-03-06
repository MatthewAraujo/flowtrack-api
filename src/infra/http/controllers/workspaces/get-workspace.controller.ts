import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

@Controller('/workspaces/:id')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class GetWorkspaceController {
	constructor(private workspaces: WorkspacesService) {}

	@Get()
	async handle(@Param(new ZodValidationPipe(paramsSchema)) params: { id: string }) {
		const workspace = await this.workspaces.getWithMembers(params.id)

		if (!workspace) {
			throw new NotFoundException('Workspace not found')
		}

		return {
			id: workspace.id,
			name: workspace.name,
			created_at: workspace.createdAt,
			updated_at: workspace.updatedAt,
			members: workspace.members.map((member) => ({
				user_id: member.userId,
				name: member.user?.name ?? null,
				email: member.user?.email ?? null,
				role: member.role,
				status: member.status,
				joined_at: member.joinedAt,
			})),
		}
	}
}
