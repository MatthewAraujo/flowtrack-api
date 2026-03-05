import { RepoCommitsController } from '@/infra/http/controllers/metrics/repo-commits.controller'
import { makeCommitEvent } from 'test/factories/make-commit-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('RepoCommitsController', () => {
	let getRepoCommits: { execute: ReturnType<typeof vi.fn> }
	let sut: RepoCommitsController

	beforeEach(() => {
		getRepoCommits = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: {
					items: [
						makeCommitEvent({
							sha: 'abc',
							authorLogin: 'dev',
							authorEmail: 'dev@example.com',
							message: 'feat: add',
							committedAt: new Date('2026-03-01T00:00:00.000Z'),
						}),
					],
				},
			}),
		}

		sut = new RepoCommitsController(getRepoCommits as any)
	})

	it('returns commit events', async () => {
		const response = await sut.handle(
			{ sub: 'user-1' },
			{ repoId: 'repo-1' },
			{ from: '2026-03-01T00:00:00.000Z', to: '2026-03-02T00:00:00.000Z' },
		)

		expect(getRepoCommits.execute).toHaveBeenCalledWith({
			userId: 'user-1',
			repoId: 'repo-1',
			from: new Date('2026-03-01T00:00:00.000Z'),
			to: new Date('2026-03-02T00:00:00.000Z'),
		})
		if ('items' in response) {
			expect(response.items).toHaveLength(1)
		} else {
			throw new Error('Expected commits response')
		}
	})
})
