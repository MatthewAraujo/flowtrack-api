import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoMetricsController } from '@/infra/http/controllers/metrics/repo-metrics.controller'

describe('RepoMetricsController', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestionService: { ingestRepositoryActivity: ReturnType<typeof vi.fn> }
	let metricsService: {
		getWindowRange: ReturnType<typeof vi.fn>
		getMetricsForRepos: ReturnType<typeof vi.fn>
	}
	let sut: RepoMetricsController

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestionService = { ingestRepositoryActivity: vi.fn() }
		metricsService = {
			getWindowRange: vi.fn().mockReturnValue({
				from: new Date('2026-03-01T00:00:00.000Z'),
				to: new Date('2026-03-08T00:00:00.000Z'),
			}),
			getMetricsForRepos: vi.fn().mockResolvedValue({
				window: '7d',
				from: new Date('2026-03-01T00:00:00.000Z'),
				to: new Date('2026-03-08T00:00:00.000Z'),
				meanCommitsPerWeek: 10,
				meanPrCycleTimeHours: 24,
				prRejectionRate: 0.5,
				linesAdded: 30,
				linesDeleted: 5,
				netLines: 25,
				productivityScore: 42,
				counts: { commits: 10, closedPrs: 2, reviews: 4 },
			}),
		}

		sut = new RepoMetricsController(
			prisma,
			tokenCipher as any,
			ingestionService as any,
			metricsService as any,
		)
	})

	it('returns metrics for repo', async () => {
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
			{ window: '7d' },
		)

		expect(ingestionService.ingestRepositoryActivity).toHaveBeenCalledTimes(1)
		expect(response.repository_id).toBe('repo-1')
		expect(response.productivity_score).toBe(42)
	})
})
