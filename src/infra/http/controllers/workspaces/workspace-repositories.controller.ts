import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { WorkspaceRoles } from '@/infra/authorization/workspace-roles'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { WorkspaceRepositoriesService } from '@/domain/flowtrack/application/services/workspace-repositories.service'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { BadRequestException, Controller, Get, NotFoundException, Param, Put, Body } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	id: z.string().uuid(),
})

const bodySchema = z.object({
	repositoryIds: z.array(z.string().min(1)).max(200),
})

@Controller('/workspaces/:id/repositories')
@WorkspaceRoles('ENGINEERING_MANAGER', 'TECH_LEAD')
export class WorkspaceRepositoriesController {
	constructor(
		private workspaces: WorkspacesService,
		private workspaceRepositories: WorkspaceRepositoriesService,
		private repositoryAccess: RepositoryAccessService,
	) {}

	@Get()
	async handle(@Param(new ZodValidationPipe(paramsSchema)) params: { id: string }) {
		const workspace = await this.workspaces.findById(params.id)
		if (!workspace) {
			throw new NotFoundException('Workspace not found')
		}

		const repositoryIds = await this.workspaceRepositories.listSelectedRepositoryIds(params.id)

		return { repository_ids: repositoryIds }
	}

	@Put()
	async update(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { id: string },
		@Body(new ZodValidationPipe(bodySchema)) body: { repositoryIds: string[] },
	) {
		const workspace = await this.workspaces.findById(params.id)
		if (!workspace) {
			throw new NotFoundException('Workspace not found')
		}

		const uniqueRepositoryIds = Array.from(new Set(body.repositoryIds.map((id) => id.trim()))).filter(
			Boolean,
		)
		const accessible = await this.repositoryAccess.filterAccessible(user.sub, uniqueRepositoryIds)
		const missing = uniqueRepositoryIds.filter((id) => !accessible.has(id))
		if (missing.length > 0) {
			throw new BadRequestException('One or more repositories are not accessible')
		}

		const repositoryIds = await this.workspaceRepositories.replaceSelection(
			params.id,
			uniqueRepositoryIds,
		)

		return { repository_ids: repositoryIds }
	}
}
