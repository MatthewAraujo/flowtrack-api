import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { makePullRequestEvent } from 'test/factories/make-pull-request-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoPullsUseCase', () => {
	let repositoryAccess: { hasAccess: ReturnType<typeof vi.fn> }
	let repositories: { findById: ReturnType<typeof vi.fn> }
	let repoEvents: { listPulls: ReturnType<typeof vi.fn> }
	let sut: GetRepoPullsUseCase

	beforeEach(() => {
		repositoryAccess = { hasAccess: vi.fn().mockResolvedValue(true) }
		repositories = { findById: vi.fn() }
		repoEvents = { listPulls: vi.fn() }

		sut = new GetRepoPullsUseCase(
			repositoryAccess as any,
			repositories as any,
			repoEvents as any,
		)
	})

	it('returns pulls when access granted', async () => {
		repositories.findById.mockResolvedValue({
			id: 'repo-1',
		})
		repoEvents.listPulls.mockResolvedValue([
			makePullRequestEvent({
				number: 1,
				createdAt: new Date('2026-03-01T12:00:00.000Z'),
				closedAt: new Date('2026-03-02T12:00:00.000Z'),
				mergedAt: new Date('2026-03-02T14:00:00.000Z'),
				additions: 1,
				deletions: 1,
				changedFiles: 1,
			}),
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
