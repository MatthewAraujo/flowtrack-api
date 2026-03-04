import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubIngestionService } from '@/infra/github/github-ingestion.service'

describe('GitHubIngestionService', () => {
	let githubService: {
		listCommits: ReturnType<typeof vi.fn>
		listPullRequests: ReturnType<typeof vi.fn>
		getPullDetails: ReturnType<typeof vi.fn>
		listReviews: ReturnType<typeof vi.fn>
	}
	let prisma: any
	let sut: GitHubIngestionService

	beforeEach(() => {
		githubService = {
			listCommits: vi.fn(),
			listPullRequests: vi.fn(),
			getPullDetails: vi.fn(),
			listReviews: vi.fn(),
		}

		prisma = {
			commitEvent: { upsert: vi.fn(), findMany: vi.fn() },
			pullRequestEvent: { upsert: vi.fn(), findMany: vi.fn() },
			reviewEvent: { upsert: vi.fn(), findMany: vi.fn() },
		}

		sut = new GitHubIngestionService(githubService as any, prisma)
	})

	it('ingests commits, pulls, and reviews', async () => {
		githubService.listCommits.mockResolvedValue([
			{
				sha: 'c1',
				commit: {
					message: 'feat: add',
					author: { name: 'Dev', email: 'dev@example.com', date: new Date().toISOString() },
				},
				author: { login: 'dev' },
			},
		])

		githubService.listPullRequests.mockResolvedValue([
			{
				id: 10,
				number: 2,
				title: 'Add feature',
				state: 'closed',
				user: { login: 'dev' },
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				closed_at: new Date().toISOString(),
				merged_at: null,
			},
		])

		githubService.getPullDetails.mockResolvedValue({
			id: 10,
			number: 2,
			title: 'Add feature',
			state: 'closed',
			user: { login: 'dev' },
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			closed_at: new Date().toISOString(),
			merged_at: null,
			additions: 12,
			deletions: 3,
			changed_files: 2,
		})

		githubService.listReviews.mockResolvedValue([
			{
				id: 100,
				state: 'APPROVED',
				submitted_at: new Date().toISOString(),
				user: { login: 'reviewer' },
			},
		])

		const result = await sut.ingestRepositoryActivity({
			token: 'token',
			repositoryId: 'repo-1',
			owner: 'acme',
			repo: 'flowtrack',
			from: new Date(Date.now() - 86400000),
			to: new Date(),
		})

		expect(result).toEqual({
			commitsUpserted: 1,
			pullsUpserted: 1,
			reviewsUpserted: 1,
		})
		expect(prisma.commitEvent.upsert).toHaveBeenCalledTimes(1)
		expect(prisma.pullRequestEvent.upsert).toHaveBeenCalledTimes(1)
		expect(prisma.reviewEvent.upsert).toHaveBeenCalledTimes(1)
	})

	it('lists stored events by time range', async () => {
		prisma.commitEvent.findMany.mockResolvedValue([{ id: 'c1' }])
		prisma.pullRequestEvent.findMany.mockResolvedValue([{ id: 'p1' }])
		prisma.reviewEvent.findMany.mockResolvedValue([{ id: 'r1' }])

		const from = new Date(Date.now() - 86400000)
		const to = new Date()

		const commits = await sut.listCommitEvents('repo-1', from, to)
		const pulls = await sut.listPullRequestEvents('repo-1', from, to)
		const reviews = await sut.listReviewEvents('repo-1', from, to)

		expect(commits).toHaveLength(1)
		expect(pulls).toHaveLength(1)
		expect(reviews).toHaveLength(1)
	})
})
