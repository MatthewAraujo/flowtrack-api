type MetricsCalculationInput = {
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
}

type MetricsCalculationResult = {
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

function clamp(value: number) {
	return Math.max(0, Math.min(1, value))
}

function calculateProductivityScore(params: {
	meanCommitsPerWeek: number
	closedPrs: number
	reviews: number
	meanPrCycleTimeHours: number | null
}) {
	const commitScore = clamp(params.meanCommitsPerWeek / 20)
	const prThroughputScore = clamp(params.closedPrs / 10)
	const reviewScore = clamp(params.reviews / 20)
	const cycleTimeScore =
		params.meanPrCycleTimeHours === null
			? 0.5
			: clamp(1 - params.meanPrCycleTimeHours / (24 * 7))

	const score =
		0.3 * commitScore + 0.3 * prThroughputScore + 0.2 * reviewScore + 0.2 * cycleTimeScore

	return Math.round(score * 100)
}

export function calculateMetrics(params: MetricsCalculationInput): MetricsCalculationResult {
	const { from, to, commits, pulls, reviews } = params
	const windowWeeks = Math.max(1, (to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000))
	const meanCommitsPerWeek = commits / windowWeeks

	const closedPulls = pulls.filter((pull) => pull.closedAt || pull.mergedAt)
	const rejectionCount = closedPulls.filter((pull) => pull.closedAt && !pull.mergedAt)
	const prRejectionRate = closedPulls.length ? rejectionCount.length / closedPulls.length : 0

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

	const linesAdded = closedPulls.reduce((acc, pull) => acc + (pull.additions ?? 0), 0)
	const linesDeleted = closedPulls.reduce((acc, pull) => acc + (pull.deletions ?? 0), 0)
	const netLines = linesAdded - linesDeleted

	const productivityScore = calculateProductivityScore({
		meanCommitsPerWeek,
		closedPrs: closedPulls.length,
		reviews,
		meanPrCycleTimeHours,
	})

	return {
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
	}
}
