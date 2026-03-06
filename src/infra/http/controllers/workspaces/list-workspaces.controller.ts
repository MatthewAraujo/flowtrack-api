import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { WorkspaceInvitesService } from '@/domain/flowtrack/application/services/workspace-invites.service'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { Controller, Get, NotFoundException } from '@nestjs/common'

@Controller('/workspaces')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ListWorkspacesController {
	constructor(
		private workspaces: WorkspacesService,
		private invites: WorkspaceInvitesService,
		private prisma: PrismaService,
	) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }) {
		const account = await this.prisma.user.findUnique({
			where: { id: user.sub },
			select: { email: true },
		})

		if (!account) {
			throw new NotFoundException('User not found')
		}

		const workspaces = await this.workspaces.listForUser(user.sub)
		const pendingInvites = await this.invites.listPendingInvitesForEmail(account.email.toLowerCase())

		return {
			items: workspaces.map((workspace) => ({
				id: workspace.id,
				name: workspace.name,
				created_at: workspace.createdAt,
				updated_at: workspace.updatedAt,
				role: workspace.members[0]?.role ?? null,
				status: workspace.members[0]?.status ?? null,
			})),
			invites: pendingInvites.map((invite) => ({
				id: invite.id,
				workspace_id: invite.workspaceId,
				workspace_name: invite.workspace.name,
				role: invite.role,
				email: invite.email,
				expires_at: invite.expiresAt,
			})),
		}
	}
}
