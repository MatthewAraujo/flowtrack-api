import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardSummaryController } from '@/infra/http/controllers/dashboard/summary.controller'
import { makeDashboardSummary } from 'test/factories/make-dashboard-summary'

describe('DashboardSummaryController', () => {
	let getDashboardSummary: { execute: ReturnType<typeof vi.fn> }
	let sut: DashboardSummaryController

	beforeEach(() => {
		getDashboardSummary = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: makeDashboardSummary(['repo-1', 'repo-2']),
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
