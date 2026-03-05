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
	}
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
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
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }

		sut = new ListReposUseCase(
			usersRepository as any,
			githubService as any,
			repositoriesRepository as any,
			prisma as any,
			tokenCipher as any,
		)
	})

	it('returns persisted repositories', async () => {
		repositoriesRepository.create.mockImplementation(async (repo: Repository) => repo)

		const result = await sut.execute({ userId: 'user-1' })

		expect(githubService.listRepositories).toHaveBeenCalledWith('token')
		expect(result.items).toHaveLength(1)
	})
})
