import { ProfileSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/profile-summary'
import {
	ProfileTrendBucket,
	ProfileTrends,
} from '@/domain/flowtrack/enterprise/entities/value-objects/profile-trends'

export type ProfileSummaryCache = {
	repositoryIds: string[]
	window: 'all'
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

export type ProfileTrendsCache = {
	repositoryIds: string[]
	from: string
	to: string
	bucket: 'month'
	items: ProfileTrendBucket[]
}

export function toProfileSummaryCache(summary: ProfileSummary): ProfileSummaryCache {
	return {
		repositoryIds: summary.repositoryIds,
		window: summary.window,
		from: summary.from.toISOString(),
		to: summary.to.toISOString(),
		meanCommitsPerWeek: summary.meanCommitsPerWeek,
		meanPrCycleTimeHours: summary.meanPrCycleTimeHours,
		prRejectionRate: summary.prRejectionRate,
		linesAdded: summary.linesAdded,
		linesDeleted: summary.linesDeleted,
		netLines: summary.netLines,
		productivityScore: summary.productivityScore,
		counts: summary.counts,
	}
}

export function fromProfileSummaryCache(parsed: ProfileSummaryCache): ProfileSummary {
	return ProfileSummary.create({
		repositoryIds: parsed.repositoryIds,
		window: 'all',
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

export function toProfileTrendsCache(trends: ProfileTrends): ProfileTrendsCache {
	return {
		repositoryIds: trends.repositoryIds,
		from: trends.from.toISOString(),
		to: trends.to.toISOString(),
		bucket: trends.bucket,
		items: trends.items,
	}
}

export function fromProfileTrendsCache(parsed: ProfileTrendsCache): ProfileTrends {
	return ProfileTrends.create({
		repositoryIds: parsed.repositoryIds,
		from: new Date(parsed.from),
		to: new Date(parsed.to),
		bucket: 'month',
		items: parsed.items,
	})
}
