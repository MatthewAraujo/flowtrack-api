import { MetricsReadRepository } from '@/domain/flowtrack/application/repositories/metrics-read-repository'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'
import { toCommitEvent, toPullRequestEvent } from '@/domain/flowtrack/application/mappers/repo-event-mappers'
import { PrismaService } from '../prisma.service'

export class PrismaMetricsReadRepository implements MetricsReadRepository {
	constructor(private prisma: PrismaService) {}

	async listCommits(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<CommitEvent[]> {
		const { repositoryIds, from, to } = params
		const rows = await this.prisma.commitEvent.findMany({
			where: {
				repositoryId: { in: repositoryIds },
				committedAt: {
					gte: from,
					lte: to,
				},
			},
			select: {
				id: true,
				sha: true,
				authorLogin: true,
				authorEmail: true,
				message: true,
				committedAt: true,
			},
		})

		return rows.map(toCommitEvent)
	}

	async listPulls(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<PullRequestEvent[]> {
		const { repositoryIds, from, to } = params
		const rows = await this.prisma.pullRequestEvent.findMany({
			where: {
				repositoryId: { in: repositoryIds },
				OR: [
					{
						closedAt: { gte: from, lte: to },
					},
					{
						mergedAt: { gte: from, lte: to },
					},
				],
			},
			select: {
				id: true,
				number: true,
				title: true,
				state: true,
				isMerged: true,
				authorLogin: true,
				createdAt: true,
				closedAt: true,
				mergedAt: true,
				additions: true,
				deletions: true,
				changedFiles: true,
			},
		})

		return rows.map(toPullRequestEvent)
	}

	async listReviews(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<Array<{ id: string }>> {
		const { repositoryIds, from, to } = params
		return this.prisma.reviewEvent.findMany({
			where: {
				repositoryId: { in: repositoryIds },
				submittedAt: {
					gte: from,
					lte: to,
				},
			},
			select: { id: true },
		})
	}
}
