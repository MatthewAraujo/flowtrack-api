import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { WorkspaceRepositoriesService } from '@/domain/flowtrack/application/services/workspace-repositories.service'
import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

@Controller('/workspaces/:id')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class GetWorkspaceController {
	constructor(
		private workspaces: WorkspacesService,
		private workspaceRepositories: WorkspaceRepositoriesService,
	) {}

	@Get()
	async handle(@Param(new ZodValidationPipe(paramsSchema)) params: { id: string }) {
		const workspace = await this.workspaces.getWithMembers(params.id)

		if (!workspace) {
			throw new NotFoundException('Workspace not found')
		}

		const selectedRepositoryIds = await this.workspaceRepositories.listSelectedRepositoryIds(params.id)

		return {
			id: workspace.id,
			name: workspace.name,
			created_at: workspace.createdAt,
			updated_at: workspace.updatedAt,
			selected_repository_ids: selectedRepositoryIds,
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
