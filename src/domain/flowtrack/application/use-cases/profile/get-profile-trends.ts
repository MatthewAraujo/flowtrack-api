import { ProfileTrendBucket, ProfileTrends } from '@/domain/flowtrack/enterprise/entities/value-objects/profile-trends'
import {
	fromProfileTrendsCache,
	toProfileTrendsCache,
	type ProfileTrendsCache,
} from '@/domain/flowtrack/application/use-cases/profile/profile-cache'
import { RepositoryAccessService } from '@/domain/flowtrack/application/services/repository-access.service'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { getCachedJson, setCachedJson } from '@/infra/cache/cache-json'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

const PROFILE_CACHE_TTL_SECONDS = 86400

type PullRow = {
	createdAt: Date
	additions: number | null
	deletions: number | null
}

@Injectable()
export class GetProfileTrendsUseCase {
	constructor(
		private prisma: PrismaService,
		private cacheRepository: CacheRepository,
		private repositoryAccess: RepositoryAccessService,
	) {}

	private monthKey(date: Date) {
		const year = date.getUTCFullYear()
		const month = date.getUTCMonth() + 1
		return `${year}-${String(month).padStart(2, '0')}`
	}

	private monthLabel(key: string) {
		const [year, month] = key.split('-').map(Number)
		if (!year || !month) {
			return key
		}
		const date = new Date(Date.UTC(year, month - 1, 1))
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
	}

	async execute(userId: string, options?: { refresh?: boolean }) {
		const cacheKey = `profile:trends:${userId}`
		const cached = options?.refresh
			? null
			: await getCachedJson<ProfileTrendsCache>(this.cacheRepository, cacheKey)
		if (cached) {
			return fromProfileTrendsCache(cached)
		}

		const repositoryIds = await this.repositoryAccess.listRepositoryIds(userId)
		const now = new Date()

		if (repositoryIds.length === 0) {
			const empty = ProfileTrends.create({
				repositoryIds: [],
				from: now,
				to: now,
				bucket: 'month',
				items: [],
			})

			await setCachedJson(
				this.cacheRepository,
				cacheKey,
				toProfileTrendsCache(empty),
				PROFILE_CACHE_TTL_SECONDS,
			)

			return empty
		}

		const pulls = await this.prisma.pullRequestEvent.findMany({
			where: { repositoryId: { in: repositoryIds } },
			select: {
				createdAt: true,
				additions: true,
				deletions: true,
			},
			orderBy: { createdAt: 'asc' },
		})

		const earliest = pulls.length > 0 ? pulls[0].createdAt : now
		const buckets = new Map<string, ProfileTrendBucket>()

		const ensureBucket = (key: string) => {
			if (!buckets.has(key)) {
				buckets.set(key, {
					label: this.monthLabel(key),
					additions: 0,
					deletions: 0,
					prs: 0,
				})
			}
			return buckets.get(key)!
		}

		pulls.forEach((pull: PullRow) => {
			const key = this.monthKey(pull.createdAt)
			const bucket = ensureBucket(key)
			bucket.additions += pull.additions ?? 0
			bucket.deletions += pull.deletions ?? 0
			bucket.prs += 1
		})

		const sortedKeys = Array.from(buckets.keys()).sort()
		const items = sortedKeys.map((key) => buckets.get(key)!)

		const trends = ProfileTrends.create({
			repositoryIds,
			from: earliest,
			to: now,
			bucket: 'month',
			items,
		})

		await setCachedJson(
			this.cacheRepository,
			cacheKey,
			toProfileTrendsCache(trends),
			PROFILE_CACHE_TTL_SECONDS,
		)

		return trends
	}
}
