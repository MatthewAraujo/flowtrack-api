import { MetricsAggregate } from '@/domain/flowtrack/enterprise/entities/value-objects/metrics-aggregate'
import { CacheRepository } from '@/infra/cache/cache-repository'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { calculateMetrics } from './metrics-calculator'

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
		const calculated = calculateMetrics({ from, to, commits, pulls, reviews })

		return MetricsAggregate.create({
			window,
			from,
			to,
			meanCommitsPerWeek: calculated.meanCommitsPerWeek,
			meanPrCycleTimeHours: calculated.meanPrCycleTimeHours,
			prRejectionRate: calculated.prRejectionRate,
			linesAdded: calculated.linesAdded,
			linesDeleted: calculated.linesDeleted,
			netLines: calculated.netLines,
			productivityScore: calculated.productivityScore,
			counts: calculated.counts,
		})
	}
}
