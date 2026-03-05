import { SetMetadata } from '@nestjs/common'
import type { Role } from './roles'

export const WORKSPACE_ROLES_KEY = 'workspace_roles'

export type WorkspaceRole = Role

export const WorkspaceRoles = (...roles: WorkspaceRole[]) => SetMetadata(WORKSPACE_ROLES_KEY, roles)
