import { ProfileTrends } from '@/domain/flowtrack/enterprise/entities/value-objects/profile-trends'

export class ProfileTrendsPresenter {
	static toHTTP(trends: ProfileTrends) {
		return {
			repository_ids: trends.repositoryIds,
			from: trends.from,
			to: trends.to,
			bucket: trends.bucket,
			items: trends.items,
		}
	}
}
