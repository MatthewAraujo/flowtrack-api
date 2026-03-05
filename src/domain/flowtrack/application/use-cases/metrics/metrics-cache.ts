import { MetricsAggregate } from '@/domain/flowtrack/enterprise/entities/value-objects/metrics-aggregate'

export type MetricsAggregateCache = {
	window: '7d' | '30d' | '90d'
	from: string
	to: string
	meanCommitsPerWeek: number
	meanPrCycleTimeHours: number | null
	prRejectionRate: number
	linesAdded: number
	linesDeleted: number
	netLines: number
	productivityScore: number
	counts: {
		commits: number
		closedPrs: number
		reviews: number
	}
}

export function toMetricsAggregateCache(metrics: MetricsAggregate): MetricsAggregateCache {
	return {
		window: metrics.window,
		from: metrics.from.toISOString(),
		to: metrics.to.toISOString(),
		meanCommitsPerWeek: metrics.meanCommitsPerWeek,
		meanPrCycleTimeHours: metrics.meanPrCycleTimeHours,
		prRejectionRate: metrics.prRejectionRate,
		linesAdded: metrics.linesAdded,
		linesDeleted: metrics.linesDeleted,
		netLines: metrics.netLines,
		productivityScore: metrics.productivityScore,
		counts: metrics.counts,
	}
}

export function fromMetricsAggregateCache(parsed: MetricsAggregateCache): MetricsAggregate {
	return MetricsAggregate.create({
		window: parsed.window,
		from: new Date(parsed.from),
		to: new Date(parsed.to),
		meanCommitsPerWeek: parsed.meanCommitsPerWeek,
		meanPrCycleTimeHours: parsed.meanPrCycleTimeHours,
		prRejectionRate: parsed.prRejectionRate,
		linesAdded: parsed.linesAdded,
		linesDeleted: parsed.linesDeleted,
		netLines: parsed.netLines,
		productivityScore: parsed.productivityScore,
		counts: parsed.counts,
	})
}
