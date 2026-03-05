import { PullRequestEvent } from '@/domain/flowtrack/enterprise/entities/pull-request-event'

export class RepoPullsPresenter {
	static toHTTP(items: PullRequestEvent[]) {
		return items.map((pull) => ({
			id: pull.id.toString(),
			number: pull.number,
			title: pull.title,
			state: pull.state,
			is_merged: pull.isMerged,
			author_login: pull.authorLogin,
			created_at: pull.createdAt,
			closed_at: pull.closedAt,
			merged_at: pull.mergedAt,
			additions: pull.additions ?? 0,
			deletions: pull.deletions ?? 0,
			changed_files: pull.changedFiles,
		}))
	}
}
