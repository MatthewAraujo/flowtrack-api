import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'

export class DashboardSummaryPresenter {
	static toHTTP(summary: DashboardSummary) {
		return {
			repository_ids: summary.repositoryIds,
			window: summary.metrics.window,
			from: summary.metrics.from,
			to: summary.metrics.to,
			mean_commits_per_week: summary.metrics.meanCommitsPerWeek,
			mean_pr_cycle_time_hours: summary.metrics.meanPrCycleTimeHours,
			pr_rejection_rate: summary.metrics.prRejectionRate,
			lines_added: summary.metrics.linesAdded,
			lines_deleted: summary.metrics.linesDeleted,
			net_lines: summary.metrics.netLines,
			productivity_score: summary.metrics.productivityScore,
			counts: summary.metrics.counts,
		}
	}
}
