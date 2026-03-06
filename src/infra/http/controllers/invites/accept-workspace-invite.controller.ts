import { createHash } from 'node:crypto'

import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { WorkspaceInvitesService } from '@/domain/flowtrack/application/services/workspace-invites.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Controller, NotFoundException, Param, Post } from '@nestjs/common'
import { z } from 'zod'

const paramsSchema = z.object({
	token: z.string().min(10),
})

function hashInviteToken(token: string) {
	return createHash('sha256').update(token).digest('hex')
}

@Controller('/invites/:token/accept')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class AcceptWorkspaceInviteController {
	constructor(
		private invites: WorkspaceInvitesService,
		private members: WorkspaceMembersService,
		private prisma: PrismaService,
	) {}

	@Post()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { token: string },
	) {
		const account = await this.prisma.user.findUnique({
			where: { id: user.sub },
			select: { email: true },
		})

		if (!account) {
			throw new NotFoundException('User not found')
		}

		const tokenHash = hashInviteToken(params.token)
		const invite = await this.invites.acceptInviteByToken(tokenHash, user.sub, account.email)

		if (!invite) {
			throw new NotFoundException('Invite not found or expired')
		}

		const existingRole = await this.members.getRole(user.sub, invite.workspaceId)
		if (!existingRole) {
			await this.members.addMember({
				workspaceId: invite.workspaceId,
				userId: user.sub,
				role: invite.role ?? 'DEVELOPER',
				status: 'ACTIVE',
				joinedAt: new Date(),
			})
		}

		return {
			workspace_id: invite.workspaceId,
			role: invite.role,
			status: 'ACTIVE',
		}
	}
}
