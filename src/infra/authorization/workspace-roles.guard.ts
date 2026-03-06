import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { WORKSPACE_ROLES_KEY, type WorkspaceRole } from './workspace-roles'
import { isRole } from './roles'

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private workspaceMembers: WorkspaceMembersService,
	) {}

	async canActivate(context: ExecutionContext) {
		const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(WORKSPACE_ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!requiredRoles || requiredRoles.length === 0) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const user = request.user as { sub?: string } | undefined
		const workspaceId = this.resolveWorkspaceId(request)

		if (!user?.sub || !workspaceId) {
			return false
		}

		const role = await this.workspaceMembers.getRole(user.sub, workspaceId)

		if (!role || !isRole(role)) {
			return false
		}

		request.workspaceRole = role

		return requiredRoles.includes(role)
	}

	private resolveWorkspaceId(request: {
		params?: Record<string, string>
		query?: Record<string, string>
		body?: Record<string, string>
	}) {
		return (
			request.params?.workspaceId ??
			request.params?.id ??
			request.body?.workspaceId ??
			request.query?.workspaceId
		)
	}
}
