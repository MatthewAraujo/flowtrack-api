import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoPullsController } from '@/infra/http/controllers/metrics/repo-pulls.controller'

describe('RepoPullsController', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestionService: {
		ingestRepositoryActivity: ReturnType<typeof vi.fn>
		listPullRequestEvents: ReturnType<typeof vi.fn>
	}
	let sut: RepoPullsController

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestionService = {
			ingestRepositoryActivity: vi.fn(),
			listPullRequestEvents: vi.fn().mockResolvedValue([
				{
					id: 'pull-1',
					number: 1,
					title: 'Add feature',
					state: 'closed',
					isMerged: true,
					authorLogin: 'dev',
					createdAt: new Date('2026-03-01T00:00:00.000Z'),
					closedAt: new Date('2026-03-02T00:00:00.000Z'),
					mergedAt: new Date('2026-03-02T00:00:00.000Z'),
					additions: 10,
					deletions: 2,
					changedFiles: 1,
				},
			]),
		}

		sut = new RepoPullsController(prisma, tokenCipher as any, ingestionService as any)
	})

	it('returns pull events', async () => {
		prisma.userRepositoryAccess.findUnique.mockResolvedValue({ id: 'access-1' })
		prisma.repository.findUnique.mockResolvedValue({
			id: 'repo-1',
			ownerLogin: 'acme',
			name: 'flowtrack',
		})
		prisma.gitHubAccount.findFirst.mockResolvedValue({ accessToken: 'encrypted' })

		const response = await sut.handle(
			{ sub: 'user-1' },
			{ repoId: 'repo-1' },
			{ from: '2026-03-01T00:00:00.000Z', to: '2026-03-02T00:00:00.000Z' },
		)

		expect(response.items).toHaveLength(1)
		expect(response.items[0].number).toBe(1)
	})
})
