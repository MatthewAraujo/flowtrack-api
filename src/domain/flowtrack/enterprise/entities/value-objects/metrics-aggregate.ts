import { ValueObject } from '@/core/entities/value-object'

export interface MetricsAggregateProps {
	window: '7d' | '30d' | '90d'
	from: Date
	to: Date
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

export class MetricsAggregate extends ValueObject<MetricsAggregateProps> {
	get window() {
		return this.props.window
	}

	get from() {
		return this.props.from
	}

	get to() {
		return this.props.to
	}

	get meanCommitsPerWeek() {
		return this.props.meanCommitsPerWeek
	}

	get meanPrCycleTimeHours() {
		return this.props.meanPrCycleTimeHours
	}

	get prRejectionRate() {
		return this.props.prRejectionRate
	}

	get linesAdded() {
		return this.props.linesAdded
	}

	get linesDeleted() {
		return this.props.linesDeleted
	}

	get netLines() {
		return this.props.netLines
	}

	get productivityScore() {
		return this.props.productivityScore
	}

	get counts() {
		return this.props.counts
	}

	static create(props: MetricsAggregateProps) {
		return new MetricsAggregate(props)
	}
}
