import { describe, expect, it, vi } from 'vitest'
import { Reflector } from '@nestjs/core'
import type { ExecutionContext } from '@nestjs/common'
import { WorkspaceRolesGuard } from './workspace-roles.guard'
import { WORKSPACE_ROLES_KEY } from './workspace-roles'

function makeContext({
	userId,
	workspaceId,
	requiredRoles,
}: {
	userId?: string
	workspaceId?: string
	requiredRoles?: string[]
}): ExecutionContext {
	const handler = () => {}
	const controller = class TestController {}

	if (requiredRoles) {
		Reflect.defineMetadata(WORKSPACE_ROLES_KEY, requiredRoles, handler)
	}

	return {
		getHandler: () => handler,
		getClass: () => controller,
		switchToHttp: () => ({
			getRequest: () => ({
				user: userId ? { sub: userId } : undefined,
				params: workspaceId ? { id: workspaceId } : {},
			}),
		}),
	} as unknown as ExecutionContext
}

describe('WorkspaceRolesGuard', () => {
	it('allows access when no workspace roles are required', async () => {
		const guard = new WorkspaceRolesGuard(new Reflector(), { getRole: vi.fn() } as any)
		const context = makeContext({ userId: 'user-1', workspaceId: 'workspace-1' })

		await expect(guard.canActivate(context)).resolves.toBe(true)
	})

	it('denies access when no workspace membership exists', async () => {
		const guard = new WorkspaceRolesGuard(new Reflector(), { getRole: vi.fn().mockResolvedValue(null) } as any)
		const context = makeContext({
			userId: 'user-1',
			workspaceId: 'workspace-1',
			requiredRoles: ['ENGINEERING_MANAGER'],
		})

		await expect(guard.canActivate(context)).resolves.toBe(false)
	})

	it('allows access when workspace role matches', async () => {
		const guard = new WorkspaceRolesGuard(new Reflector(), {
			getRole: vi.fn().mockResolvedValue('TECH_LEAD'),
		} as any)
		const context = makeContext({
			userId: 'user-1',
			workspaceId: 'workspace-1',
			requiredRoles: ['TECH_LEAD', 'ENGINEERING_MANAGER'],
		})

		await expect(guard.canActivate(context)).resolves.toBe(true)
	})
})
