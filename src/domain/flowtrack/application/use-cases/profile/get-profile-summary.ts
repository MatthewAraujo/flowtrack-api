import { calculateMetrics } from '@/domain/flowtrack/application/use-cases/metrics/metrics-calculator'
import { ProfileSummary } from '@/domain/flowtrack/enterprise/entities/value-objects/profile-summary'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

const PROFILE_CACHE_TTL_SECONDS = 86400

@Injectable()
export class GetProfileSummaryUseCase {
	constructor(
		private prisma: PrismaService,
		private cacheRepository: CacheRepository,
	) {}

	private roundToMinute(date: Date) {
		const rounded = Math.floor(date.getTime() / 60000) * 60000
		return new Date(rounded)
	}

	private earliestDate(dates: Array<Date | null | undefined>) {
		const valid = dates.filter((value): value is Date => Boolean(value))
		if (valid.length === 0) {
			return null
		}
		return new Date(Math.min(...valid.map((value) => value.getTime())))
	}

	async execute(userId: string, options?: { refresh?: boolean }) {
		const cacheKey = `profile:summary:${userId}`
		const cached = options?.refresh ? null : await this.cacheRepository.get(cacheKey)
		if (cached) {
			const parsed = JSON.parse(cached) as {
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

		const access = await this.prisma.userRepositoryAccess.findMany({
			where: { userId },
			select: { repositoryId: true },
		})

		const repositoryIds = access.map((entry) => entry.repositoryId)
		const now = this.roundToMinute(new Date())

		if (repositoryIds.length === 0) {
			const empty = ProfileSummary.create({
				repositoryIds: [],
				window: 'all',
				from: now,
				to: now,
				meanCommitsPerWeek: 0,
				meanPrCycleTimeHours: null,
				prRejectionRate: 0,
				linesAdded: 0,
				linesDeleted: 0,
				netLines: 0,
				productivityScore: 0,
				counts: {
					commits: 0,
					closedPrs: 0,
					reviews: 0,
				},
			})

			await this.cacheRepository.set(
				cacheKey,
				JSON.stringify({
					repositoryIds: empty.repositoryIds,
					window: empty.window,
					from: empty.from,
					to: empty.to,
					meanCommitsPerWeek: empty.meanCommitsPerWeek,
					meanPrCycleTimeHours: empty.meanPrCycleTimeHours,
					prRejectionRate: empty.prRejectionRate,
					linesAdded: empty.linesAdded,
					linesDeleted: empty.linesDeleted,
					netLines: empty.netLines,
					productivityScore: empty.productivityScore,
					counts: empty.counts,
				}),
				PROFILE_CACHE_TTL_SECONDS,
			)

			return empty
		}

		const [commitMin, pullMin, reviewMin] = await Promise.all([
			this.prisma.commitEvent.aggregate({
				where: { repositoryId: { in: repositoryIds } },
				_min: { committedAt: true },
			}),
			this.prisma.pullRequestEvent.aggregate({
				where: { repositoryId: { in: repositoryIds } },
				_min: { createdAt: true },
			}),
			this.prisma.reviewEvent.aggregate({
				where: { repositoryId: { in: repositoryIds } },
				_min: { submittedAt: true },
			}),
		])

		const from =
			this.earliestDate([
				commitMin._min.committedAt,
				pullMin._min.createdAt,
				reviewMin._min.submittedAt,
			]) ?? now

		const [commitCount, reviewCount, pulls] = await Promise.all([
			this.prisma.commitEvent.count({
				where: { repositoryId: { in: repositoryIds } },
			}),
			this.prisma.reviewEvent.count({
				where: { repositoryId: { in: repositoryIds } },
			}),
			this.prisma.pullRequestEvent.findMany({
				where: { repositoryId: { in: repositoryIds } },
				select: {
					createdAt: true,
					closedAt: true,
					mergedAt: true,
					additions: true,
					deletions: true,
				},
			}),
		])

		const calculated = calculateMetrics({
			from,
			to: now,
			commits: commitCount,
			pulls,
			reviews: reviewCount,
		})

		const summary = ProfileSummary.create({
			repositoryIds,
			window: 'all',
			from,
			to: now,
			meanCommitsPerWeek: calculated.meanCommitsPerWeek,
			meanPrCycleTimeHours: calculated.meanPrCycleTimeHours,
			prRejectionRate: calculated.prRejectionRate,
			linesAdded: calculated.linesAdded,
			linesDeleted: calculated.linesDeleted,
			netLines: calculated.netLines,
			productivityScore: calculated.productivityScore,
			counts: calculated.counts,
		})

		await this.cacheRepository.set(
			cacheKey,
			JSON.stringify({
				repositoryIds: summary.repositoryIds,
				window: summary.window,
				from: summary.from,
				to: summary.to,
				meanCommitsPerWeek: summary.meanCommitsPerWeek,
				meanPrCycleTimeHours: summary.meanPrCycleTimeHours,
				prRejectionRate: summary.prRejectionRate,
				linesAdded: summary.linesAdded,
				linesDeleted: summary.linesDeleted,
				netLines: summary.netLines,
				productivityScore: summary.productivityScore,
				counts: summary.counts,
			}),
			PROFILE_CACHE_TTL_SECONDS,
		)

		return summary
	}
}
