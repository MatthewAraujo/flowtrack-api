import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { Controller, Get, Param } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

@Controller('/workspaces/:id/members')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ListWorkspaceMembersController {
	constructor(private members: WorkspaceMembersService) {}

	@Get()
	async handle(@Param(new ZodValidationPipe(paramsSchema)) params: { id: string }) {
		const members = await this.members.listMembersDetailed(params.id)

		return {
			items: members.map((member) => ({
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
