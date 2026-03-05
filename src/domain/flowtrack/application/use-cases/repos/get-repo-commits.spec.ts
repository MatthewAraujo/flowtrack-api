import { GetRepoCommitsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-commits'
import { makeCommitEvent } from 'test/factories/make-commit-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoCommitsUseCase', () => {
	let repositoryAccess: { hasAccess: ReturnType<typeof vi.fn> }
	let repositories: { findById: ReturnType<typeof vi.fn> }
	let repoEvents: { listCommits: ReturnType<typeof vi.fn> }
	let sut: GetRepoCommitsUseCase

	beforeEach(() => {
		repositoryAccess = { hasAccess: vi.fn().mockResolvedValue(true) }
		repositories = { findById: vi.fn() }
		repoEvents = { listCommits: vi.fn() }

		sut = new GetRepoCommitsUseCase(
			repositoryAccess as any,
			repositories as any,
			repoEvents as any,
		)
	})

	it('returns commits when access granted', async () => {
		repositories.findById.mockResolvedValue({
			id: 'repo-1',
		})
		repoEvents.listCommits.mockResolvedValue([
			makeCommitEvent({ sha: 'abc', committedAt: new Date('2026-03-01T12:00:00.000Z') }),
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
