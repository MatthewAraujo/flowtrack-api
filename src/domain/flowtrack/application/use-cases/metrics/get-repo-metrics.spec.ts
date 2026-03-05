import { GetRepoMetricsUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-repo-metrics'
import { makeMetricsAggregate } from 'test/factories/make-metrics-aggregate'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoMetricsUseCase', () => {
	let metrics: { getWindowRange: ReturnType<typeof vi.fn>; execute: ReturnType<typeof vi.fn> }
	let repositoryAccess: { hasAccess: ReturnType<typeof vi.fn> }
	let repositories: { findById: ReturnType<typeof vi.fn> }
	let sut: GetRepoMetricsUseCase

	beforeEach(() => {
		metrics = {
			getWindowRange: vi.fn().mockReturnValue({
				from: new Date('2026-03-01T00:00:00.000Z'),
				to: new Date('2026-03-08T00:00:00.000Z'),
			}),
			execute: vi.fn().mockResolvedValue(
				makeMetricsAggregate({
					window: '7d',
					meanCommitsPerWeek: 10,
					meanPrCycleTimeHours: 24,
					prRejectionRate: 0.5,
					linesAdded: 30,
					linesDeleted: 5,
					netLines: 25,
					productivityScore: 42,
					counts: { commits: 10, closedPrs: 2, reviews: 4 },
				}),
			),
		}
		repositoryAccess = { hasAccess: vi.fn().mockResolvedValue(true) }
		repositories = { findById: vi.fn() }

		sut = new GetRepoMetricsUseCase(
			metrics as any,
			repositoryAccess as any,
			repositories as any,
		)
	})

	it('returns metrics for repo', async () => {
		repositories.findById.mockResolvedValue({
			id: 'repo-1',
		})

		const result = await sut.execute({
			userId: 'user-1',
			repoId: 'repo-1',
			window: '7d',
		})

		expect(result.isRight()).toBe(true)
		if (result.isRight()) {
			expect(result.value.repositoryId).toBe('repo-1')
		}
	})
})
