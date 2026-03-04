import { Injectable } from '@nestjs/common'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { MetricsAggregate } from '@/domain/flowtrack/enterprise/entities/value-objects/metrics-aggregate'

type Window = '7d' | '30d' | '90d'

type MetricsResult = MetricsAggregate

@Injectable()
export class GetMetricsForReposUseCase {
	constructor(
		private prisma: PrismaService,
		private cacheRepository: CacheRepository,
	) {}

	getWindowRange(window: Window) {
		const days = window === '7d' ? 7 : window === '30d' ? 30 : 90
		const now = Date.now()
		const roundedNow = Math.floor(now / 60000) * 60000
		const to = new Date(roundedNow)
		const from = new Date(roundedNow - days * 24 * 60 * 60 * 1000)

		return { from, to }
	}

	async execute(
		repositoryIds: string[],
		window: Window,
		options?: { refresh?: boolean },
	): Promise<MetricsResult> {
		const { from, to } = this.getWindowRange(window)
		const cacheKey = `metrics:${window}:${repositoryIds.sort().join(',')}:${from.toISOString()}:${to.toISOString()}`

		if (!options?.refresh) {
			const cached = await this.cacheRepository.get(cacheKey)
			if (cached) {
				const parsed = JSON.parse(cached) as {
					window: Window
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

				return MetricsAggregate.create({
					...parsed,
					from: new Date(parsed.from),
					to: new Date(parsed.to),
				})
			}
		}

		const [commits, pulls, reviews] = await Promise.all([
			this.prisma.commitEvent.findMany({
				where: {
					repositoryId: { in: repositoryIds },
					committedAt: {
						gte: from,
						lte: to,
					},
				},
			}),
			this.prisma.pullRequestEvent.findMany({
				where: {
					repositoryId: { in: repositoryIds },
					OR: [
						{
							closedAt: { gte: from, lte: to },
						},
						{
							mergedAt: { gte: from, lte: to },
						},
					],
				},
			}),
			this.prisma.reviewEvent.findMany({
				where: {
					repositoryId: { in: repositoryIds },
					submittedAt: {
						gte: from,
						lte: to,
					},
				},
			}),
		])

		const metrics = this.calculateMetrics({
			window,
			from,
			to,
			commits: commits.length,
			pulls,
			reviews: reviews.length,
		})

		await this.cacheRepository.set(
			cacheKey,
			JSON.stringify({
				window: metrics.window,
				from: metrics.from,
				to: metrics.to,
				meanCommitsPerWeek: metrics.meanCommitsPerWeek,
				meanPrCycleTimeHours: metrics.meanPrCycleTimeHours,
				prRejectionRate: metrics.prRejectionRate,
				linesAdded: metrics.linesAdded,
				linesDeleted: metrics.linesDeleted,
				netLines: metrics.netLines,
				productivityScore: metrics.productivityScore,
				counts: metrics.counts,
			}),
			300,
		)

		return metrics
	}

	calculateMetrics(params: {
		window: Window
		from: Date
		to: Date
		commits: number
		pulls: Array<{
			createdAt: Date
			closedAt: Date | null
			mergedAt: Date | null
			additions: number | null
			deletions: number | null
		}>
		reviews: number
	}): MetricsResult {
		const { window, from, to, commits, pulls, reviews } = params
		const windowWeeks = Math.max(
			1,
			(to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000),
		)
		const meanCommitsPerWeek = commits / windowWeeks

		const closedPulls = pulls.filter((pull) => pull.closedAt || pull.mergedAt)
		const rejectionCount = closedPulls.filter((pull) => pull.closedAt && !pull.mergedAt)
		const prRejectionRate = closedPulls.length
			? rejectionCount.length / closedPulls.length
			: 0

		const cycleTimes = closedPulls
			.map((pull) => {
				const end = pull.mergedAt ?? pull.closedAt
				if (!end) {
					return null
				}
				return (end.getTime() - pull.createdAt.getTime()) / (1000 * 60 * 60)
			})
			.filter((value): value is number => value !== null && value >= 0)

		const meanPrCycleTimeHours = cycleTimes.length
			? cycleTimes.reduce((acc, value) => acc + value, 0) / cycleTimes.length
			: null

		const linesAdded = closedPulls.reduce(
			(acc, pull) => acc + (pull.additions ?? 0),
			0,
		)
		const linesDeleted = closedPulls.reduce(
			(acc, pull) => acc + (pull.deletions ?? 0),
			0,
		)
		const netLines = linesAdded - linesDeleted

		const productivityScore = this.calculateProductivityScore({
			meanCommitsPerWeek,
			closedPrs: closedPulls.length,
			reviews,
			meanPrCycleTimeHours,
		})

		return MetricsAggregate.create({
			window,
			from,
			to,
			meanCommitsPerWeek,
			meanPrCycleTimeHours,
			prRejectionRate,
			linesAdded,
			linesDeleted,
			netLines,
			productivityScore,
			counts: {
				commits,
				closedPrs: closedPulls.length,
				reviews,
			},
		})
	}

	private calculateProductivityScore(params: {
		meanCommitsPerWeek: number
		closedPrs: number
		reviews: number
		meanPrCycleTimeHours: number | null
	}) {
		const commitScore = this.clamp(params.meanCommitsPerWeek / 20)
		const prThroughputScore = this.clamp(params.closedPrs / 10)
		const reviewScore = this.clamp(params.reviews / 20)
		const cycleTimeScore =
			params.meanPrCycleTimeHours === null
				? 0.5
				: this.clamp(1 - params.meanPrCycleTimeHours / (24 * 7))

		const score =
			0.3 * commitScore +
			0.3 * prThroughputScore +
			0.2 * reviewScore +
			0.2 * cycleTimeScore

		return Math.round(score * 100)
	}

	private clamp(value: number) {
		return Math.max(0, Math.min(1, value))
	}
}
