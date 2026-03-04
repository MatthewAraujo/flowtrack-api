import { RepoMetrics } from '@/domain/flowtrack/enterprise/entities/value-objects/repo-metrics'

export class RepoMetricsPresenter {
	static toHTTP(metrics: RepoMetrics) {
		return {
			repository_id: metrics.repositoryId,
			window: metrics.metrics.window,
			from: metrics.metrics.from,
			to: metrics.metrics.to,
			mean_commits_per_week: metrics.metrics.meanCommitsPerWeek,
			mean_pr_cycle_time_hours: metrics.metrics.meanPrCycleTimeHours,
			pr_rejection_rate: metrics.metrics.prRejectionRate,
			lines_added: metrics.metrics.linesAdded,
			lines_deleted: metrics.metrics.linesDeleted,
			net_lines: metrics.metrics.netLines,
			productivity_score: metrics.metrics.productivityScore,
			counts: metrics.metrics.counts,
		}
	}
}
