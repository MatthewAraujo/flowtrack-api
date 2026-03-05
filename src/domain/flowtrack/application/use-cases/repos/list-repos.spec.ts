import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'
import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ListReposUseCase', () => {
	let usersRepository: { findById: ReturnType<typeof vi.fn> }
	let githubService: { listRepositories: ReturnType<typeof vi.fn> }
	let repositoriesRepository: {
		findByProviderRepoId: ReturnType<typeof vi.fn>
		create: ReturnType<typeof vi.fn>
		save: ReturnType<typeof vi.fn>
	}
	let prisma: {
		gitHubAccount: { findFirst: ReturnType<typeof vi.fn> }
		userRepositoryAccess: { upsert: ReturnType<typeof vi.fn> }
		repository: {
			count: ReturnType<typeof vi.fn>
			findMany: ReturnType<typeof vi.fn>
		}
	}
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let cacheRepository: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }
	let sut: ListReposUseCase

	beforeEach(() => {
		usersRepository = { findById: vi.fn().mockResolvedValue({ githubAccessToken: 'legacy' }) }
		githubService = {
			listRepositories: vi.fn().mockResolvedValue([
				{
					id: 1,
					name: 'flowtrack',
					full_name: 'acme/flowtrack',
					private: false,
					owner: { login: 'acme' },
					default_branch: 'main',
				},
			]),
		}
		repositoriesRepository = {
			findByProviderRepoId: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
			save: vi.fn(),
		}
		prisma = {
			gitHubAccount: { findFirst: vi.fn().mockResolvedValue({ accessToken: 'encrypted' }) },
			userRepositoryAccess: { upsert: vi.fn() },
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
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		cacheRepository = {
			get: vi.fn().mockResolvedValue('1'),
			set: vi.fn(),
		}

		sut = new ListReposUseCase(
			usersRepository as any,
			githubService as any,
			repositoriesRepository as any,
			prisma as any,
			tokenCipher as any,
			cacheRepository as any,
		)
	})

	it('returns persisted repositories', async () => {
		const result = await sut.execute({ userId: 'user-1' })

		expect(githubService.listRepositories).not.toHaveBeenCalled()
		expect(result.items).toHaveLength(1)
	})
})
