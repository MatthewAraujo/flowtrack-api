import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListReposController } from '@/infra/http/controllers/repos/list-repos.controller'
import { User } from '@/domain/assistent/enterprise/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Repository } from '@/domain/assistent/enterprise/entities/repository'

describe('ListReposController', () => {
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

	let sut: ListReposController

	beforeEach(() => {
		usersRepository = { findById: vi.fn() }
		githubService = { listRepositories: vi.fn() }
		repositoriesRepository = {
			findByProviderRepoId: vi.fn(),
			create: vi.fn(),
			save: vi.fn(),
		}
		prisma = {
			gitHubAccount: { findFirst: vi.fn() },
			userRepositoryAccess: { upsert: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn() }

		sut = new ListReposController(
			usersRepository as any,
			githubService as any,
			repositoriesRepository as any,
			prisma as any,
			tokenCipher as any,
		)
	})

	it('lists repositories using GitHub account token', async () => {
		const user = User.create(
			{
				name: 'Dev',
				email: 'dev@example.com',
				password: 'hashed',
				role: 'DEVELOPER',
				githubAccessToken: 'legacy',
			},
			new UniqueEntityID('user-1'),
		)

		usersRepository.findById.mockResolvedValue(user)
		prisma.gitHubAccount.findFirst.mockResolvedValue({
			accessToken: 'encrypted',
		})
		tokenCipher.decrypt.mockResolvedValue('token')
		githubService.listRepositories.mockResolvedValue([
			{
				id: 1,
				name: 'flowtrack',
				full_name: 'acme/flowtrack',
				private: false,
				owner: { login: 'acme' },
				default_branch: 'main',
			},
		])

		repositoriesRepository.findByProviderRepoId.mockResolvedValue(null)
		repositoriesRepository.create.mockImplementation(async (repo: Repository) => repo)

		const response = await sut.handle({ sub: user.id.toString() }, undefined)

		expect(tokenCipher.decrypt).toHaveBeenCalledWith('encrypted')
		expect(githubService.listRepositories).toHaveBeenCalledWith('token')
		expect(prisma.userRepositoryAccess.upsert).toHaveBeenCalledTimes(1)
		expect(response.items).toHaveLength(1)
	})
})
