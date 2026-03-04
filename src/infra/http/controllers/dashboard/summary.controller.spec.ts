import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardSummaryController } from '@/infra/http/controllers/dashboard/summary.controller'

describe('DashboardSummaryController', () => {
	let getDashboardSummary: { execute: ReturnType<typeof vi.fn> }
	let sut: DashboardSummaryController

	beforeEach(() => {
		getDashboardSummary = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: {
					repositoryIds: ['repo-1', 'repo-2'],
					window: '30d',
					from: new Date('2026-02-01T00:00:00.000Z'),
					to: new Date('2026-03-02T00:00:00.000Z'),
					meanCommitsPerWeek: 8,
					meanPrCycleTimeHours: 20,
					prRejectionRate: 0.2,
					linesAdded: 100,
					linesDeleted: 40,
					netLines: 60,
					productivityScore: 60,
					counts: { commits: 32, closedPrs: 4, reviews: 12 },
				},
			}),
		}

		sut = new DashboardSummaryController(getDashboardSummary as any)
	})

	it('returns summary metrics', async () => {
		const response = await sut.handle(
			{ sub: 'user-1' },
			{ repoIds: 'repo-1,repo-2', window: '30d' },
		)

		expect(getDashboardSummary.execute).toHaveBeenCalledWith({
			userId: 'user-1',
			repositoryIds: ['repo-1', 'repo-2'],
			window: '30d',
			refresh: false,
		})
		expect(response.repository_ids).toEqual(['repo-1', 'repo-2'])
		expect(response.productivity_score).toBe(60)
	})
})
