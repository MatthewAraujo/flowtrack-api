import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetDashboardSummaryUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-dashboard-summary'
import { makeMetricsAggregate } from 'test/factories/make-metrics-aggregate'

describe('GetDashboardSummaryUseCase', () => {
	let prisma: any
	let metrics: { execute: ReturnType<typeof vi.fn> }
	let sut: GetDashboardSummaryUseCase

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findMany: vi.fn() },
		}
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

		sut = new GetDashboardSummaryUseCase(prisma, metrics as any)
	})

	it('returns dashboard summary for repos', async () => {
		prisma.userRepositoryAccess.findMany.mockResolvedValue([
			{ repositoryId: 'repo-1' },
			{ repositoryId: 'repo-2' },
		])

		const result = await sut.execute({
			userId: 'user-1',
			repositoryIds: ['repo-1', 'repo-2'],
			window: '30d',
		})

		expect(result.isRight()).toBe(true)
		expect(result.value.repositoryIds).toEqual(['repo-1', 'repo-2'])
	})
})
