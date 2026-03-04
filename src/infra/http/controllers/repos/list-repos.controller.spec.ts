import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListReposController } from '@/infra/http/controllers/repos/list-repos.controller'
import { makeRepository } from 'test/factories/make-repository'

describe('ListReposController', () => {
	let listRepos: { execute: ReturnType<typeof vi.fn> }
	let sut: ListReposController

	beforeEach(() => {
		listRepos = {
			execute: vi.fn().mockResolvedValue({
				items: [
					makeRepository({
						fullName: 'acme/flowtrack',
						name: 'flowtrack',
						ownerLogin: 'acme',
					}),
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
		expect(response.items[0].full_name).toBe('acme/flowtrack')
	})
})
