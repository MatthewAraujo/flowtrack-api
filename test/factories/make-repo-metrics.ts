import { RepoMetrics } from '@/domain/flowtrack/enterprise/entities/value-objects/repo-metrics'
import { makeMetricsAggregate } from './make-metrics-aggregate'

export function makeRepoMetrics(repositoryId = 'repo-1') {
	return RepoMetrics.create({
		repositoryId,
		metrics: makeMetricsAggregate(),
	})
}
