import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { BadRequestException, Controller, Delete, NotFoundException, Param } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
})

@Controller('/workspaces/:id/members/:userId')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class RemoveWorkspaceMemberController {
	constructor(private members: WorkspaceMembersService) {}

	@Delete()
	async handle(@Param(new ZodValidationPipe(paramsSchema)) params: { id: string; userId: string }) {
		try {
			await this.members.removeMember(params.id, params.userId)
			return { removed: true }
		} catch (error) {
			if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
				throw new NotFoundException('Workspace member not found')
			}
			throw new BadRequestException('Unable to remove workspace member')
		}
	}
}
