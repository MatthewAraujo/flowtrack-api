import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListReposController } from '@/infra/http/controllers/repos/list-repos.controller'

describe('ListReposController', () => {
	let listRepos: { execute: ReturnType<typeof vi.fn> }
	let sut: ListReposController

	beforeEach(() => {
		listRepos = {
			execute: vi.fn().mockResolvedValue({
				items: [
					{
						id: 'repo-1',
						name: 'flowtrack',
						full_name: 'acme/flowtrack',
						is_private: false,
						owner_login: 'acme',
						default_branch: 'main',
					},
				],
			}),
		}

		sut = new ListReposController(listRepos as any)
	})

	it('lists repositories using use-case', async () => {
		const response = await sut.handle({ sub: 'user-1' }, undefined)

		expect(listRepos.execute).toHaveBeenCalledWith({
			userId: 'user-1',
			query: undefined,
		})
		expect(response.items).toHaveLength(1)
	})
})
