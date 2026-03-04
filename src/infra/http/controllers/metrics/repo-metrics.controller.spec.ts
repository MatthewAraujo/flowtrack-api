import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoMetricsController } from '@/infra/http/controllers/metrics/repo-metrics.controller'
import { makeRepoMetrics } from 'test/factories/make-repo-metrics'

describe('RepoMetricsController', () => {
	let getRepoMetrics: { execute: ReturnType<typeof vi.fn> }
	let sut: RepoMetricsController

	beforeEach(() => {
		getRepoMetrics = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: makeRepoMetrics('repo-1'),
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
		expect(response.productivity_score).toBe(60)
	})
})
