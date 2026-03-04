import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetMetricsForReposUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-metrics-for-repos'
import { InMemoryCacheRepository } from 'test/repositories/in-memory-cache-repository'

describe('GetMetricsForReposUseCase', () => {
	let prisma: any
	let cache: InMemoryCacheRepository
	let sut: GetMetricsForReposUseCase

	beforeEach(() => {
		prisma = {
			commitEvent: { findMany: vi.fn() },
			pullRequestEvent: { findMany: vi.fn() },
			reviewEvent: { findMany: vi.fn() },
		}
		cache = new InMemoryCacheRepository()
		sut = new GetMetricsForReposUseCase(prisma, cache)
	})

	it('calculates core metrics', () => {
		const from = new Date('2026-03-01T00:00:00.000Z')
		const to = new Date('2026-03-08T00:00:00.000Z')

		const metrics = sut.calculateMetrics({
			window: '7d',
			from,
			to,
			commits: 10,
			pulls: [
				{
					createdAt: new Date('2026-03-01T00:00:00.000Z'),
					closedAt: new Date('2026-03-02T00:00:00.000Z'),
					mergedAt: null,
					additions: 12,
					deletions: 2,
				},
				{
					createdAt: new Date('2026-03-03T00:00:00.000Z'),
					closedAt: null,
					mergedAt: new Date('2026-03-04T00:00:00.000Z'),
					additions: 20,
					deletions: 5,
				},
			],
			reviews: 4,
		})

		expect(metrics.meanCommitsPerWeek).toBeCloseTo(10, 2)
		expect(metrics.prRejectionRate).toBeCloseTo(0.5, 2)
		expect(metrics.meanPrCycleTimeHours).toBeCloseTo(24, 2)
		expect(metrics.linesAdded).toBe(32)
		expect(metrics.linesDeleted).toBe(7)
		expect(metrics.netLines).toBe(25)
		expect(metrics.productivityScore).toBe(42)
	})

	it('uses cached metrics for same window bucket', async () => {
		prisma.commitEvent.findMany.mockResolvedValue([])
		prisma.pullRequestEvent.findMany.mockResolvedValue([])
		prisma.reviewEvent.findMany.mockResolvedValue([])

		const first = await sut.execute(['repo-1'], '7d')
		const second = await sut.execute(['repo-1'], '7d')

		expect(first.window).toBe('7d')
		expect(second.window).toBe('7d')
		expect(prisma.commitEvent.findMany).toHaveBeenCalledTimes(1)
	})
})
