import { describe, expect, it, vi } from 'vitest'
import { WorkspaceInvitesService } from './workspace-invites.service'

describe('WorkspaceInvitesService', () => {
	it('returns null when invite is not found', async () => {
		const prisma = {
			workspaceInvite: {
				findFirst: vi.fn().mockResolvedValue(null),
				update: vi.fn(),
			},
		}
		const sut = new WorkspaceInvitesService(prisma as any)

		const result = await sut.acceptInviteByToken('hash', 'user-1', 'test@example.com')

		expect(result).toBeNull()
		expect(prisma.workspaceInvite.update).not.toHaveBeenCalled()
		expect(prisma.workspaceInvite.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tokenHash: 'hash',
					email: 'test@example.com',
				}),
			}),
		)
	})

	it('accepts invite and records usage', async () => {
		const invite = {
			id: 'invite-1',
			workspaceId: 'workspace-1',
			role: 'DEVELOPER',
		}
		const prisma = {
			workspaceInvite: {
				findFirst: vi.fn().mockResolvedValue(invite),
				update: vi.fn().mockResolvedValue(invite),
			},
		}
		const sut = new WorkspaceInvitesService(prisma as any)

		const result = await sut.acceptInviteByToken('hash', 'user-1', 'test@example.com')

		expect(result).toEqual(invite)
		expect(prisma.workspaceInvite.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'invite-1' },
				data: expect.objectContaining({
					usedByUserId: 'user-1',
				}),
			}),
		)
	})
})
