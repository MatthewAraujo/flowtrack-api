import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoMetricsController } from '@/infra/http/controllers/metrics/repo-metrics.controller'

describe('RepoMetricsController', () => {
	let getRepoMetrics: { execute: ReturnType<typeof vi.fn> }
	let sut: RepoMetricsController

	beforeEach(() => {
		getRepoMetrics = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: {
					repositoryId: 'repo-1',
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
				},
			}),
		}

		sut = new RepoMetricsController(getRepoMetrics as any)
	})

	it('returns metrics for repo', async () => {
		const response = await sut.handle(
			{ sub: 'user-1' },
			{ repoId: 'repo-1' },
			{ window: '7d' },
		)

		expect(getRepoMetrics.execute).toHaveBeenCalledWith({
			userId: 'user-1',
			repoId: 'repo-1',
			window: '7d',
			refresh: false,
		})
		expect(response.repository_id).toBe('repo-1')
		expect(response.productivity_score).toBe(42)
	})
})
