import { CommitEvent } from '@/domain/flowtrack/enterprise/entities/commit-event'

export class RepoCommitsPresenter {
	static toHTTP(items: CommitEvent[]) {
		return items.map((commit) => ({
			id: commit.id.toString(),
			sha: commit.sha,
			author_login: commit.authorLogin,
			author_email: commit.authorEmail,
			message: commit.message,
			committed_at: commit.committedAt,
		}))
	}
}
