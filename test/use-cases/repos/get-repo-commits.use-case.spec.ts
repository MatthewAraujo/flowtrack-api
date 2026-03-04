import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GetRepoCommitsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-commits'

describe('GetRepoCommitsUseCase', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestion: { execute: ReturnType<typeof vi.fn>; listCommitEvents: ReturnType<typeof vi.fn> }
	let sut: GetRepoCommitsUseCase

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestion = {
			execute: vi.fn(),
			listCommitEvents: vi.fn().mockResolvedValue([{ id: 'c1', sha: 'abc', authorLogin: null, authorEmail: null, message: null, committedAt: new Date() }]),
		}

		sut = new GetRepoCommitsUseCase(prisma, tokenCipher as any, ingestion as any)
	})

	it('returns commits when access granted', async () => {
		prisma.userRepositoryAccess.findUnique.mockResolvedValue({ id: 'access-1' })
		prisma.repository.findUnique.mockResolvedValue({ id: 'repo-1', ownerLogin: 'acme', name: 'flowtrack' })
		prisma.gitHubAccount.findFirst.mockResolvedValue({ accessToken: 'encrypted' })

		const result = await sut.execute({
			userId: 'user-1',
			repoId: 'repo-1',
			from: new Date('2026-03-01T00:00:00.000Z'),
			to: new Date('2026-03-02T00:00:00.000Z'),
		})

		expect(result.isRight()).toBe(true)
		expect(result.value.items).toHaveLength(1)
	})
})
