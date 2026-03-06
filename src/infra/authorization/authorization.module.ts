import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { WorkspacesModule } from '@/infra/workspaces/workspaces.module'
import { RolesGuard } from './roles.guard'
import { WorkspaceRolesGuard } from './workspace-roles.guard'

@Module({
	imports: [WorkspacesModule],
	providers: [
		{
			provide: APP_GUARD,
			useClass: RolesGuard,
		},
		{
			provide: APP_GUARD,
			useClass: WorkspaceRolesGuard,
		},
	],
	exports: [WorkspaceRolesGuard],
})
export class AuthorizationModule {}
