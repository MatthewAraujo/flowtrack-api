import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoPullsUseCase', () => {
	let prisma: any
	let repositoryAccess: { hasAccess: ReturnType<typeof vi.fn> }
	let sut: GetRepoPullsUseCase

	beforeEach(() => {
		prisma = {
			repository: { findUnique: vi.fn() },
			pullRequestEvent: { findMany: vi.fn() },
		}
		repositoryAccess = { hasAccess: vi.fn().mockResolvedValue(true) }

		sut = new GetRepoPullsUseCase(prisma, repositoryAccess as any)
	})

	it('returns pulls when access granted', async () => {
		prisma.repository.findUnique.mockResolvedValue({
			id: 'repo-1',
			ownerLogin: 'acme',
			name: 'flowtrack',
		})
		prisma.pullRequestEvent.findMany.mockResolvedValue([
			{
				id: 'p1',
				number: 1,
				title: 'Add feature',
				state: 'closed',
				isMerged: true,
				authorLogin: null,
				createdAt: new Date('2026-03-01T12:00:00.000Z'),
				closedAt: new Date('2026-03-02T12:00:00.000Z'),
				mergedAt: new Date('2026-03-02T14:00:00.000Z'),
				additions: 1,
				deletions: 1,
				changedFiles: 1,
			},
		])

		const result = await sut.execute({
			userId: 'user-1',
			repoId: 'repo-1',
			from: new Date('2026-03-01T00:00:00.000Z'),
			to: new Date('2026-03-02T00:00:00.000Z'),
		})

		expect(result.isRight()).toBe(true)
		if (result.isRight()) {
			expect(result.value.items).toHaveLength(1)
			expect(result.value.items[0].number).toBe(1)
		}
	})
})
