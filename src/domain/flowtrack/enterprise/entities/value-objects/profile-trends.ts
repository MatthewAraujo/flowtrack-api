import { ValueObject } from '@/core/entities/value-object'

export type ProfileTrendBucket = {
	label: string
	additions: number
	deletions: number
	prs: number
}

export interface ProfileTrendsProps {
	repositoryIds: string[]
	from: Date
	to: Date
	bucket: 'month'
	items: ProfileTrendBucket[]
}

export class ProfileTrends extends ValueObject<ProfileTrendsProps> {
	get repositoryIds() {
		return this.props.repositoryIds
	}

	get from() {
		return this.props.from
	}

	get to() {
		return this.props.to
	}

	get bucket() {
		return this.props.bucket
	}

	get items() {
		return this.props.items
	}

	static create(props: ProfileTrendsProps) {
		return new ProfileTrends(props)
	}
}
