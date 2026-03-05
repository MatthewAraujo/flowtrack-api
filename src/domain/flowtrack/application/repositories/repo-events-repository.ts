import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'

export abstract class RepoEventsRepository {
	abstract listCommits(params: {
		repositoryId: string
		from: Date
		to: Date
	}): Promise<CommitEvent[]>
	abstract listPulls(params: {
		repositoryId: string
		from: Date
		to: Date
	}): Promise<PullRequestEvent[]>
}
