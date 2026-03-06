import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooManyRequestsException } from '@/infra/http/exceptions/too-many-requests.exception'
import { CreateWorkspaceInviteController } from './create-workspace-invite.controller'

describe('CreateWorkspaceInviteController', () => {
	let invites: { createInvite: ReturnType<typeof vi.fn> }
	let rateLimit: { consume: ReturnType<typeof vi.fn> }
	let sut: CreateWorkspaceInviteController

	beforeEach(() => {
		invites = {
			createInvite: vi.fn().mockImplementation(async (data) => ({
				id: 'invite-id',
				workspaceId: data.workspaceId,
				email: data.email,
				role: data.role,
				expiresAt: data.expiresAt,
			})),
		}
		rateLimit = {
			consume: vi.fn().mockResolvedValue({ allowed: true }),
		}
		sut = new CreateWorkspaceInviteController(invites as any, rateLimit as any)
	})

	it('creates a hashed invite token with expiry', async () => {
		const now = Date.now()

		const response = await sut.handle(
			{ sub: 'user-1' },
			{ id: 'workspace-1' },
			{ email: 'Owner@Example.com', role: 'DEVELOPER' },
		)

		const token = response.accept_url.split('token=')[1]
		const expectedHash = createHash('sha256').update(token).digest('hex')

		expect(invites.createInvite).toHaveBeenCalledWith(
			expect.objectContaining({
				workspaceId: 'workspace-1',
				email: 'owner@example.com',
				role: 'DEVELOPER',
				tokenHash: expectedHash,
			}),
		)

		const expiresAt = (invites.createInvite as any).mock.calls[0][0].expiresAt as Date
		const expectedExpiry = now + 7 * 24 * 60 * 60 * 1000
		expect(expiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000)
		expect(expiresAt.getTime()).toBeLessThan(expectedExpiry + 5000)
	})

	it('rejects when rate limit is exceeded', async () => {
		rateLimit.consume.mockResolvedValue({ allowed: false })

		await expect(
			sut.handle(
				{ sub: 'user-1' },
				{ id: 'workspace-1' },
				{ email: 'owner@example.com', role: 'DEVELOPER' },
			),
		).rejects.toBeInstanceOf(TooManyRequestsException)
	})
})
