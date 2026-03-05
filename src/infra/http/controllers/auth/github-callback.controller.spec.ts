import { GithubCallbackController } from '@/infra/http/controllers/auth/github-callback.controller'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GithubCallbackController', () => {
	let envService: { get: ReturnType<typeof vi.fn> }
	let githubCallback: { execute: ReturnType<typeof vi.fn> }
	let listRepos: { execute: ReturnType<typeof vi.fn> }
	let sut: GithubCallbackController

	beforeEach(() => {
		envService = { get: vi.fn().mockReturnValue('https://ui.local/callback') }
		githubCallback = {
			execute: vi.fn().mockResolvedValue({
				isLeft: () => false,
				value: {
					accessToken: 'jwt-token',
					userId: 'user-1',
					role: 'DEVELOPER',
				},
			}),
		}
		listRepos = { execute: vi.fn().mockResolvedValue({ items: [] }) }

		sut = new GithubCallbackController(envService as any, githubCallback as any, listRepos as any)
	})

	it('returns UI redirect with access token', async () => {
		const response = await sut.callback('code', 'state')

		expect(githubCallback.execute).toHaveBeenCalledWith({ code: 'code' })
		expect(response).toEqual({
			url: 'https://ui.local/callback?token=jwt-token',
		})
	})
})
