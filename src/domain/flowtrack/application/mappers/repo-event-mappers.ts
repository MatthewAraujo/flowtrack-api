import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'
import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'

type CommitRecord = {
	id: string
	sha: string
	authorLogin: string | null
	authorEmail: string | null
	message: string | null
	committedAt: Date
}

type PullRequestRecord = {
	id: string
	number: number
	title: string
	state: string
	isMerged: boolean
	authorLogin: string | null
	createdAt: Date
	closedAt: Date | null
	mergedAt: Date | null
	additions: number | null
	deletions: number | null
	changedFiles: number | null
}

export function toCommitEvent(record: CommitRecord): CommitEvent {
	return CommitEvent.create(
		{
			sha: record.sha,
			authorLogin: record.authorLogin,
			authorEmail: record.authorEmail,
			message: record.message,
			committedAt: record.committedAt,
		},
		new UniqueEntityID(record.id),
	)
}

export function toPullRequestEvent(record: PullRequestRecord): PullRequestEvent {
	return PullRequestEvent.create(
		{
			number: record.number,
			title: record.title,
			state: record.state,
			isMerged: record.isMerged,
			authorLogin: record.authorLogin,
			createdAt: record.createdAt,
			closedAt: record.closedAt,
			mergedAt: record.mergedAt,
			additions: record.additions,
			deletions: record.deletions,
			changedFiles: record.changedFiles,
		},
		new UniqueEntityID(record.id),
	)
}
