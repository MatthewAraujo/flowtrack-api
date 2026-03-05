import { DashboardSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/dashboard-summary'
import { makeMetricsAggregate } from './make-metrics-aggregate'

export function makeDashboardSummary(repositoryIds: string[] = ['repo-1', 'repo-2']) {
	return DashboardSummary.create({
		repositoryIds,
		metrics: makeMetricsAggregate({ window: '30d' }),
	})
}
