import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetRepoMetricsUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-repo-metrics'
import { makeMetricsAggregate } from 'test/factories/make-metrics-aggregate'

describe('GetRepoMetricsUseCase', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestion: { execute: ReturnType<typeof vi.fn> }
	let metrics: { getWindowRange: ReturnType<typeof vi.fn>; execute: ReturnType<typeof vi.fn> }
	let sut: GetRepoMetricsUseCase

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestion = { execute: vi.fn() }
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

		sut = new GetRepoMetricsUseCase(
			prisma,
			tokenCipher as any,
			ingestion as any,
			metrics as any,
		)
	})

	it('returns metrics for repo', async () => {
		prisma.userRepositoryAccess.findUnique.mockResolvedValue({ id: 'access-1' })
		prisma.repository.findUnique.mockResolvedValue({ id: 'repo-1', ownerLogin: 'acme', name: 'flowtrack' })
		prisma.gitHubAccount.findFirst.mockResolvedValue({ accessToken: 'encrypted' })

		const result = await sut.execute({
			userId: 'user-1',
			repoId: 'repo-1',
			window: '7d',
		})

		expect(result.isRight()).toBe(true)
		expect(result.value.repositoryId).toBe('repo-1')
	})
})
