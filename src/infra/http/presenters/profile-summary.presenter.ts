import { ProfileSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/profile-summary'

export class ProfileSummaryPresenter {
	static toHTTP(summary: ProfileSummary) {
		return {
			repository_ids: summary.repositoryIds,
			window: summary.window,
			from: summary.from,
			to: summary.to,
			mean_commits_per_week: summary.meanCommitsPerWeek,
			mean_pr_cycle_time_hours: summary.meanPrCycleTimeHours,
			pr_rejection_rate: summary.prRejectionRate,
			lines_added: summary.linesAdded,
			lines_deleted: summary.linesDeleted,
			net_lines: summary.netLines,
			productivity_score: summary.productivityScore,
			counts: summary.counts,
		}
	}
}
