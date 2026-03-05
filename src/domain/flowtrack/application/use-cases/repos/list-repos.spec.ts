import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ListReposUseCase', () => {
	let prisma: {
		repository: {
			count: ReturnType<typeof vi.fn>
			findMany: ReturnType<typeof vi.fn>
		}
	}
	let sut: ListReposUseCase

	beforeEach(() => {
		prisma = {
			repository: {
				count: vi.fn().mockResolvedValue(1),
				findMany: vi.fn().mockResolvedValue([
					{
						id: 'repo-1',
						provider: 'github',
						providerRepoId: '1',
						name: 'flowtrack',
						fullName: 'acme/flowtrack',
						isPrivate: false,
						ownerLogin: 'acme',
						defaultBranch: 'main',
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				]),
			},
		}

		sut = new ListReposUseCase(prisma as any)
	})

	it('returns persisted repositories', async () => {
		const result = await sut.execute({ userId: 'user-1' })

		expect(result.items).toHaveLength(1)
	})
})
