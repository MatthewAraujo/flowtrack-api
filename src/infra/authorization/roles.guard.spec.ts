import { describe, expect, it } from 'vitest'
import { Reflector } from '@nestjs/core'
import type { ExecutionContext } from '@nestjs/common'
import { ROLES_KEY, type Role } from './roles'
import { RolesGuard } from './roles.guard'

function makeContext(role?: Role, requiredRoles?: Role[]): ExecutionContext {
	const handler = () => {}
	const controller = class TestController {}

	if (requiredRoles) {
		Reflect.defineMetadata(ROLES_KEY, requiredRoles, handler)
	}

	return {
		getHandler: () => handler,
		getClass: () => controller,
		switchToHttp: () => ({
			getRequest: () => ({
				user: role ? { role } : undefined,
			}),
		}),
	} as unknown as ExecutionContext
}

describe('RolesGuard', () => {
	it('allows access when no roles are required', () => {
		const guard = new RolesGuard(new Reflector())
		const context = makeContext('DEVELOPER')

		expect(guard.canActivate(context)).toBe(true)
	})

	it('denies access when user role does not match', () => {
		const guard = new RolesGuard(new Reflector())
		const context = makeContext('DEVELOPER', ['TECH_LEAD'])

		expect(guard.canActivate(context)).toBe(false)
	})

	it('allows access when user role matches', () => {
		const guard = new RolesGuard(new Reflector())
		const context = makeContext('TECH_LEAD', ['TECH_LEAD', 'ENGINEERING_MANAGER'])

		expect(guard.canActivate(context)).toBe(true)
	})
})
