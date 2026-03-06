import { Module } from '@nestjs/common'

import { WorkspaceAuditLogsService } from '@/domain/flowtrack/application/services/workspace-audit-logs.service'
import { WorkspaceMembersService } from '@/domain/flowtrack/application/services/workspace-members.service'
import { WorkspaceInvitesService } from '@/domain/flowtrack/application/services/workspace-invites.service'
import { WorkspacesService } from '@/domain/flowtrack/application/services/workspaces.service'
import { DatabaseModule } from '../database/database.module'

@Module({
	imports: [DatabaseModule],
	providers: [
		WorkspacesService,
		WorkspaceMembersService,
		WorkspaceInvitesService,
		WorkspaceAuditLogsService,
	],
	exports: [
		WorkspacesService,
		WorkspaceMembersService,
		WorkspaceInvitesService,
		WorkspaceAuditLogsService,
	],
})
export class WorkspacesModule {}
