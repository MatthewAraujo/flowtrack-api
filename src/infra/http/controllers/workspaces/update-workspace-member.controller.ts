import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { BadRequestException, Controller, NotFoundException, Param, Patch, Body } from '@nestjs/common'
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
	constructor(private members: WorkspaceMembersService) {}

	@Patch()
	async handle(
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string; userId: string },
		@Body(new ZodValidationPipe(bodySchema)) body: { role: 'ENGINEERING_MANAGER' | 'TECH_LEAD' | 'DEVELOPER' },
	) {
		try {
			const member = await this.members.updateRole(params.id, params.userId, body.role)

			return {
				user_id: member.userId,
				role: member.role,
				status: member.status,
				joined_at: member.joinedAt,
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('Record to update not found')) {
				throw new NotFoundException('Workspace member not found')
			}
			throw new BadRequestException('Unable to update workspace member')
		}
	}
}
