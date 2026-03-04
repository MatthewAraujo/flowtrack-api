import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepoPullsController } from '@/infra/http/controllers/metrics/repo-pulls.controller'

describe('RepoPullsController', () => {
	let getRepoPulls: { execute: ReturnType<typeof vi.fn> }
	let sut: RepoPullsController

	beforeEach(() => {
		getRepoPulls = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: {
					items: [
						{
							id: 'pull-1',
							number: 1,
							title: 'Add feature',
							state: 'closed',
							isMerged: true,
							authorLogin: 'dev',
							createdAt: new Date('2026-03-01T00:00:00.000Z'),
							closedAt: new Date('2026-03-02T00:00:00.000Z'),
							mergedAt: new Date('2026-03-02T00:00:00.000Z'),
							additions: 10,
							deletions: 2,
							changedFiles: 1,
						},
					],
				},
			}),
		}

		sut = new RepoPullsController(getRepoPulls as any)
	})

	it('returns pull events', async () => {
		const response = await sut.handle(
			{ sub: 'user-1' },
			{ repoId: 'repo-1' },
			{ from: '2026-03-01T00:00:00.000Z', to: '2026-03-02T00:00:00.000Z' },
		)

		expect(getRepoPulls.execute).toHaveBeenCalledWith({
			userId: 'user-1',
			repoId: 'repo-1',
			from: new Date('2026-03-01T00:00:00.000Z'),
			to: new Date('2026-03-02T00:00:00.000Z'),
		})
		expect(response.items).toHaveLength(1)
	})
})
