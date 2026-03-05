import { GetRepoCommitsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-commits'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoCommitsUseCase', () => {
	let prisma: any
	let repositoryAccess: { hasAccess: ReturnType<typeof vi.fn> }
	let sut: GetRepoCommitsUseCase

	beforeEach(() => {
		prisma = {
			repository: { findUnique: vi.fn() },
			commitEvent: { findMany: vi.fn() },
		}
		repositoryAccess = { hasAccess: vi.fn().mockResolvedValue(true) }

		sut = new GetRepoCommitsUseCase(prisma, repositoryAccess as any)
	})

	it('returns commits when access granted', async () => {
		prisma.repository.findUnique.mockResolvedValue({
			id: 'repo-1',
			ownerLogin: 'acme',
			name: 'flowtrack',
		})
		prisma.commitEvent.findMany.mockResolvedValue([
			{
				id: 'c1',
				sha: 'abc',
				authorLogin: null,
				authorEmail: null,
				message: null,
				committedAt: new Date('2026-03-01T12:00:00.000Z'),
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
			expect(result.value.items[0].sha).toBe('abc')
		}
	})
})
