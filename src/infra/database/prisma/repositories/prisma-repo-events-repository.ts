import { RepoEventsRepository } from '@/domain/flowtrack/application/repositories/repo-events-repository'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'
import { toCommitEvent, toPullRequestEvent } from '@/domain/flowtrack/application/mappers/repo-event-mappers'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaRepoEventsRepository implements RepoEventsRepository {
	constructor(private prisma: PrismaService) {}

	async listCommits(params: {
		repositoryId: string
		from: Date
		to: Date
	}): Promise<CommitEvent[]> {
		const { repositoryId, from, to } = params
		const rows = await this.prisma.commitEvent.findMany({
			where: {
				repositoryId,
				committedAt: {
					gte: from,
					lte: to,
				},
			},
			orderBy: {
				committedAt: 'asc',
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
		repositoryId: string
		from: Date
		to: Date
	}): Promise<PullRequestEvent[]> {
		const { repositoryId, from, to } = params
		const rows = await this.prisma.pullRequestEvent.findMany({
			where: {
				repositoryId,
				createdAt: {
					lte: to,
				},
				OR: [
					{
						createdAt: {
							gte: from,
						},
					},
					{
						closedAt: {
							gte: from,
						},
					},
					{
						mergedAt: {
							gte: from,
						},
					},
				],
			},
			orderBy: {
				createdAt: 'asc',
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
}
