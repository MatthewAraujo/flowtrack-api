import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GithubCallbackController } from '@/infra/http/controllers/auth/github-callback.controller'
import { User } from '@/domain/assistent/enterprise/entities/user'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

describe('GithubCallbackController', () => {
	let envService: { get: ReturnType<typeof vi.fn> }
	let githubOAuthService: {
		exchangeCodeForToken: ReturnType<typeof vi.fn>
		getProfile: ReturnType<typeof vi.fn>
	}
	let usersRepository: {
		findByEmail: ReturnType<typeof vi.fn>
		create: ReturnType<typeof vi.fn>
		save: ReturnType<typeof vi.fn>
	}
	let encrypter: { encrypt: ReturnType<typeof vi.fn> }
	let tokenCipher: { encrypt: ReturnType<typeof vi.fn> }
	let hashGenerator: { hash: ReturnType<typeof vi.fn> }
	let prisma: { gitHubAccount: { upsert: ReturnType<typeof vi.fn> } }

	let sut: GithubCallbackController

	beforeEach(() => {
		envService = { get: vi.fn().mockReturnValue('https://ui.local/callback') }
		githubOAuthService = {
			exchangeCodeForToken: vi.fn().mockResolvedValue('token'),
			getProfile: vi.fn().mockResolvedValue({
				login: 'octo',
				name: 'Octo Cat',
				email: 'octo@example.com',
			}),
		}
		usersRepository = {
			findByEmail: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
			save: vi.fn(),
		}
		encrypter = { encrypt: vi.fn().mockResolvedValue('jwt-token') }
		tokenCipher = { encrypt: vi.fn().mockResolvedValue('encrypted-token') }
		hashGenerator = { hash: vi.fn().mockResolvedValue('hashed') }
		prisma = { gitHubAccount: { upsert: vi.fn() } }

		sut = new GithubCallbackController(
			envService as any,
			githubOAuthService as any,
			usersRepository as any,
			encrypter as any,
			tokenCipher as any,
			hashGenerator as any,
			prisma as any,
		)
	})

	it('creates a new user and returns UI redirect', async () => {
		const response = await sut.callback('code', 'state')

		expect(usersRepository.create).toHaveBeenCalledTimes(1)
		const createdUser = usersRepository.create.mock.calls[0][0] as User
		expect(createdUser.email).toBe('octo@example.com')

		expect(prisma.gitHubAccount.upsert).toHaveBeenCalledTimes(1)
		const upsertArgs = prisma.gitHubAccount.upsert.mock.calls[0][0]
		expect(upsertArgs.create).toMatchObject({
			provider: 'github',
			login: 'octo',
			email: 'octo@example.com',
			accessToken: 'encrypted-token',
		})

		expect(response).toEqual({
			access_token: 'jwt-token',
			redirect_url: 'https://ui.local/callback?token=jwt-token',
		})
	})

	it('updates an existing user token', async () => {
		const existing = User.create(
			{
				name: 'Existing',
				email: 'octo@example.com',
				password: 'hashed',
				role: 'DEVELOPER',
				githubAccessToken: 'old',
			},
			new UniqueEntityID('user-1'),
		)

		usersRepository.findByEmail.mockResolvedValue(existing)

		await sut.callback('code', 'state')

		expect(usersRepository.save).toHaveBeenCalledTimes(1)
	})
})
