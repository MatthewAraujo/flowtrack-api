import { describe, expect, it, vi } from 'vitest'
import { UpdateWorkspaceMemberController } from './update-workspace-member.controller'

describe('UpdateWorkspaceMemberController', () => {
	it('logs audit entry when role changes', async () => {
		const members = {
			getRole: vi.fn().mockResolvedValue('DEVELOPER'),
			updateRole: vi.fn().mockResolvedValue({
				userId: 'user-2',
				role: 'TECH_LEAD',
				status: 'ACTIVE',
				joinedAt: new Date(),
			}),
		}
		const auditLogs = { log: vi.fn() }
		const sut = new UpdateWorkspaceMemberController(members as any, auditLogs as any)

		const response = await sut.handle(
			{ sub: 'manager-1' },
			{ id: 'workspace-1', userId: 'user-2' },
			{ role: 'TECH_LEAD' },
		)

		expect(response.role).toBe('TECH_LEAD')
		expect(auditLogs.log).toHaveBeenCalledWith(
			expect.objectContaining({
				workspaceId: 'workspace-1',
				actorUserId: 'manager-1',
				action: 'ROLE_UPDATED',
				targetUserId: 'user-2',
				metadata: expect.objectContaining({
					previousRole: 'DEVELOPER',
					newRole: 'TECH_LEAD',
				}),
			}),
		)
	})

	it('does not log audit entry when role is unchanged', async () => {
		const members = {
			getRole: vi.fn().mockResolvedValue('DEVELOPER'),
			updateRole: vi.fn().mockResolvedValue({
				userId: 'user-2',
				role: 'DEVELOPER',
				status: 'ACTIVE',
				joinedAt: new Date(),
			}),
		}
		const auditLogs = { log: vi.fn() }
		const sut = new UpdateWorkspaceMemberController(members as any, auditLogs as any)

		await sut.handle(
			{ sub: 'manager-1' },
			{ id: 'workspace-1', userId: 'user-2' },
			{ role: 'DEVELOPER' },
		)

		expect(auditLogs.log).not.toHaveBeenCalled()
	})
})
