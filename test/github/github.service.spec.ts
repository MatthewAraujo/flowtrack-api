import { GitHubService } from '@/infra/github/github.service'
import { InMemoryCacheRepository } from 'test/repositories/in-memory-cache-repository'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const makeResponse = (
	data: unknown,
	init?: { ok?: boolean; status?: number; headers?: Record<string, string> },
) => {
	const headers = new Headers(init?.headers ?? {})
	return {
		ok: init?.ok ?? true,
		status: init?.status ?? 200,
		headers,
		json: async () => data,
		text: async () => JSON.stringify(data),
	} as any
}

describe('GitHubService', () => {
	let cache: InMemoryCacheRepository
	let sut: GitHubService

	beforeEach(() => {
		cache = new InMemoryCacheRepository()
		sut = new GitHubService(cache)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns cached data when rate limited', async () => {
		const token = 'token-123'
		const repos = [
			{
				id: 1,
				name: 'flowtrack',
				full_name: 'acme/flowtrack',
				private: false,
				owner: { login: 'acme' },
				default_branch: 'main',
			},
		]

		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(makeResponse(repos))

		const first = await sut.listRepositories(token)
		expect(first).toHaveLength(1)
		expect(fetchMock).toHaveBeenCalledTimes(1)

		fetchMock.mockResolvedValueOnce(
			makeResponse(
				{ message: 'rate limit' },
				{
					ok: false,
					status: 403,
					headers: {
						'x-ratelimit-remaining': '0',
						'x-ratelimit-reset': `${Math.floor(Date.now() / 1000) + 3600}`,
					},
				},
			),
		)

		const second = await sut.listRepositories(token)
		expect(second).toEqual(first)
	})
})
