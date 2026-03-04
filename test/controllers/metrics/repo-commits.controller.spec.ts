import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoCommitsController } from '@/infra/http/controllers/metrics/repo-commits.controller'

describe('RepoCommitsController', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestionService: {
		ingestRepositoryActivity: ReturnType<typeof vi.fn>
		listCommitEvents: ReturnType<typeof vi.fn>
	}
	let sut: RepoCommitsController

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestionService = {
			ingestRepositoryActivity: vi.fn(),
			listCommitEvents: vi.fn().mockResolvedValue([
				{
					id: 'commit-1',
					sha: 'abc',
					authorLogin: 'dev',
					authorEmail: 'dev@example.com',
					message: 'feat: add',
					committedAt: new Date('2026-03-01T00:00:00.000Z'),
				},
			]),
		}

		sut = new RepoCommitsController(prisma, tokenCipher as any, ingestionService as any)
	})

	it('returns commit events', async () => {
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
		expect(response.items[0].sha).toBe('abc')
	})
})
