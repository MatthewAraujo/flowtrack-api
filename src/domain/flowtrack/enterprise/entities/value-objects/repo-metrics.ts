import { ValueObject } from '@/core/entities/value-object'
import { MetricsAggregate } from './metrics-aggregate'

export interface RepoMetricsProps {
	repositoryId: string
	metrics: MetricsAggregate
}

export class RepoMetrics extends ValueObject<RepoMetricsProps> {
	get repositoryId() {
		return this.props.repositoryId
	}

	get metrics() {
		return this.props.metrics
	}

	static create(props: RepoMetricsProps) {
		return new RepoMetrics(props)
	}
}
