import { GithubCallbackUseCase } from '@/domain/flowtrack/application/use-cases/oauth/github-callback'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GithubCallbackUseCase', () => {
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
	let sut: GithubCallbackUseCase

	beforeEach(() => {
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

		sut = new GithubCallbackUseCase(
			githubOAuthService as any,
			usersRepository as any,
			encrypter as any,
			tokenCipher as any,
			hashGenerator as any,
			prisma as any,
		)
	})

	it('creates a user and returns access token', async () => {
		const result = await sut.execute({ code: 'code' })

		expect(result.isRight()).toBe(true)
		expect(usersRepository.create).toHaveBeenCalledTimes(1)
		expect(prisma.gitHubAccount.upsert).toHaveBeenCalledTimes(1)
		expect(result.value.accessToken).toBe('jwt-token')
	})
})
