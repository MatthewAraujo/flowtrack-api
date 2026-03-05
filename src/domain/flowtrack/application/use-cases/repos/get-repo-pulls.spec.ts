import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetRepoPullsUseCase', () => {
	let prisma: any
	let tokenCipher: { decrypt: ReturnType<typeof vi.fn> }
	let ingestion: {
		execute: ReturnType<typeof vi.fn>
		listPullRequestEvents: ReturnType<typeof vi.fn>
	}
	let sut: GetRepoPullsUseCase

	beforeEach(() => {
		prisma = {
			userRepositoryAccess: { findUnique: vi.fn() },
			repository: { findUnique: vi.fn() },
			gitHubAccount: { findFirst: vi.fn() },
		}
		tokenCipher = { decrypt: vi.fn().mockResolvedValue('token') }
		ingestion = {
			execute: vi.fn(),
			listPullRequestEvents: vi.fn().mockResolvedValue([
				{
					id: 'p1',
					number: 1,
					title: 'Add feature',
					state: 'closed',
					isMerged: true,
					authorLogin: null,
					createdAt: new Date(),
					closedAt: new Date(),
					mergedAt: new Date(),
					additions: 1,
					deletions: 1,
					changedFiles: 1,
				},
			]),
		}

		sut = new GetRepoPullsUseCase(prisma, tokenCipher as any, ingestion as any)
	})

	it('returns pulls when access granted', async () => {
		prisma.userRepositoryAccess.findUnique.mockResolvedValue({ id: 'access-1' })
		prisma.repository.findUnique.mockResolvedValue({
			id: 'repo-1',
			ownerLogin: 'acme',
			name: 'flowtrack',
		})
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
