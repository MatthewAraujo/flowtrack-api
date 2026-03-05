import {
	MetricsAggregate,
	MetricsAggregateProps,
} from '@/domain/flowtrack/enterprise/entities/value-objects/metrics-aggregate'

export function makeMetricsAggregate(override: Partial<MetricsAggregateProps> = {}) {
	return MetricsAggregate.create({
		window: '7d',
		from: new Date('2026-03-01T00:00:00.000Z'),
		to: new Date('2026-03-08T00:00:00.000Z'),
		meanCommitsPerWeek: 10,
		meanPrCycleTimeHours: 24,
		prRejectionRate: 0.2,
		linesAdded: 100,
		linesDeleted: 40,
		netLines: 60,
		productivityScore: 60,
		counts: { commits: 32, closedPrs: 4, reviews: 12 },
		...override,
	})
}
