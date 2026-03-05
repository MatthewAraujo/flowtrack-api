import { GetDashboardSummaryUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-dashboard-summary'
import { makeMetricsAggregate } from 'test/factories/make-metrics-aggregate'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetDashboardSummaryUseCase', () => {
	let metrics: { execute: ReturnType<typeof vi.fn> }
	let repositoryAccess: { filterAccessible: ReturnType<typeof vi.fn> }
	let sut: GetDashboardSummaryUseCase

	beforeEach(() => {
		metrics = {
			execute: vi.fn().mockResolvedValue(
				makeMetricsAggregate({
					window: '30d',
					meanCommitsPerWeek: 8,
					meanPrCycleTimeHours: 20,
					prRejectionRate: 0.2,
					linesAdded: 100,
					linesDeleted: 40,
					netLines: 60,
					productivityScore: 60,
					counts: { commits: 32, closedPrs: 4, reviews: 12 },
				}),
			),
		}
		repositoryAccess = { filterAccessible: vi.fn() }

		sut = new GetDashboardSummaryUseCase(metrics as any, repositoryAccess as any)
	})

	it('returns dashboard summary for repos', async () => {
		repositoryAccess.filterAccessible.mockResolvedValue(new Set(['repo-1', 'repo-2']))

		const result = await sut.execute({
			userId: 'user-1',
			repositoryIds: ['repo-1', 'repo-2'],
			window: '30d',
		})

		expect(result.isRight()).toBe(true)
		if (result.isRight()) {
			expect(result.value.repositoryIds).toEqual(['repo-1', 'repo-2'])
		}
	})
})
