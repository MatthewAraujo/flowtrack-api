import { ValueObject } from '@/core/entities/value-object'
import { MetricsAggregate } from './metrics-aggregate'

export interface DashboardSummaryProps {
	repositoryIds: string[]
	metrics: MetricsAggregate
}

export class DashboardSummary extends ValueObject<DashboardSummaryProps> {
	get repositoryIds() {
		return this.props.repositoryIds
	}

	get metrics() {
		return this.props.metrics
	}

	static create(props: DashboardSummaryProps) {
		return new DashboardSummary(props)
	}
}
