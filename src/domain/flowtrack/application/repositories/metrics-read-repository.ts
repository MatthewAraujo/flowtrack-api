import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'

export abstract class MetricsReadRepository {
	abstract listCommits(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<CommitEvent[]>
	abstract listPulls(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<PullRequestEvent[]>
	abstract listReviews(params: {
		repositoryIds: string[]
		from: Date
		to: Date
	}): Promise<
		Array<{
			id: string
		}>
	>
}
