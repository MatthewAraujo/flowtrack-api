import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { TokenCipher } from '../../cryptography/token-cipher'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'
import { GitHubService } from '@/infra/github/github.service'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

type SyncKind = 'FULL' | 'DAILY'

type SyncResult = {
	repositories: number
	commitsUpserted: number
	pullsUpserted: number
	reviewsUpserted: number
	syncedAt: string
	days: number
	status: 'performed' | 'skipped'
	nextAllowedAt: string | null
}

@Injectable()
export class SyncProfileDataUseCase {
	constructor(
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private ingestion: IngestRepositoryActivityUseCase,
		private githubService: GitHubService,
	) { }

	private buildWindow(days: number) {
		const to = new Date()
		const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
		return { from, to }
	}

	private buildFullWindow() {
		const to = new Date()
		const from = new Date('2008-01-01T00:00:00.000Z')
		return { from, to }
	}

	private buildIncrementalWindow(from: Date | null | undefined, to: Date) {
		if (from) {
			const start = new Date(from.getTime() + 1)
			return { from: start, to }
		}
		return { from: new Date('2008-01-01T00:00:00.000Z'), to }
	}

	private maxDate(values: Array<Date | null | undefined>) {
		const valid = values.filter((value): value is Date => Boolean(value))
		if (valid.length === 0) {
			return null
		}
		return new Date(Math.max(...valid.map((value) => value.getTime())))
	}

	private buildSyncResult(params: {
		repositories?: number
		commitsUpserted?: number
		pullsUpserted?: number
		reviewsUpserted?: number
		syncedAt: string
		days: number
		status: 'performed' | 'skipped'
		nextAllowedAt: string | null
	}): SyncResult {
		return {
			repositories: params.repositories ?? 0,
			commitsUpserted: params.commitsUpserted ?? 0,
			pullsUpserted: params.pullsUpserted ?? 0,
			reviewsUpserted: params.reviewsUpserted ?? 0,
			syncedAt: params.syncedAt,
			days: params.days,
			status: params.status,
			nextAllowedAt: params.nextAllowedAt,
		}
	}

	private async syncRepositories(token: string, userId: string) {
		const repos = await this.githubService.listRepositories(token)
		const results: Array<{
			id: string
			ownerLogin: string
			name: string
			shouldSync: boolean
			lastSyncedAt: Date | null
			lastCommitSyncedAt: Date | null
			lastPrUpdatedAt: Date | null
			lastReviewSyncedAt: Date | null
			fullBackfillCompleted: boolean
			syncLockUntil: Date | null
		}> = []

		for (const repo of repos) {
			const providerUpdatedAt = new Date(repo.updated_at)
			const existing = await this.prisma.repository.findUnique({
				where: {
					provider_providerRepoId: {
						provider: 'github',
						providerRepoId: repo.id.toString(),
					},
				},
				select: {
					lastProviderUpdatedAt: true,
					lastSyncedAt: true,
					lastCommitSyncedAt: true,
					lastPrUpdatedAt: true,
					lastReviewSyncedAt: true,
					fullBackfillCompleted: true,
					syncLockUntil: true,
				},
			})
			const lastSyncedAt = existing?.lastSyncedAt ?? null
			const fullBackfillCompleted = existing?.fullBackfillCompleted ?? false
			const shouldSync = !lastSyncedAt || providerUpdatedAt.getTime() > lastSyncedAt.getTime()

			const stored = await this.prisma.repository.upsert({
				where: {
					provider_providerRepoId: {
						provider: 'github',
						providerRepoId: repo.id.toString(),
					},
				},
				update: {
					name: repo.name,
					fullName: repo.full_name,
					isPrivate: repo.private,
					ownerLogin: repo.owner.login,
					defaultBranch: repo.default_branch ?? null,
					lastProviderUpdatedAt: providerUpdatedAt,
				},
				create: {
					id: new UniqueEntityID().toString(),
					provider: 'github',
					providerRepoId: repo.id.toString(),
					name: repo.name,
					fullName: repo.full_name,
					isPrivate: repo.private,
					ownerLogin: repo.owner.login,
					defaultBranch: repo.default_branch ?? null,
					lastProviderUpdatedAt: providerUpdatedAt,
				},
			})

			await this.prisma.userRepositoryAccess.upsert({
				where: {
					userId_repositoryId: {
						userId,
						repositoryId: stored.id,
					},
				},
				update: {},
				create: {
					id: new UniqueEntityID().toString(),
					userId,
					repositoryId: stored.id,
				},
			})

			results.push({
				id: stored.id,
				ownerLogin: stored.ownerLogin,
				name: stored.name,
				shouldSync,
				lastSyncedAt,
				lastCommitSyncedAt: existing?.lastCommitSyncedAt ?? null,
				lastPrUpdatedAt: existing?.lastPrUpdatedAt ?? null,
				lastReviewSyncedAt: existing?.lastReviewSyncedAt ?? null,
				fullBackfillCompleted,
				syncLockUntil: existing?.syncLockUntil ?? null,
			})
		}

		return results
	}

	async execute(
		userId: string,
		options?: { kind?: SyncKind },
	): Promise<SyncResult> {
		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId, provider: 'github' },
		})

		if (!githubAccount?.accessToken) {
			const syncedAt = new Date().toISOString()
			return this.buildSyncResult({
				syncedAt,
				days: 1,
				status: 'skipped',
				nextAllowedAt: null,
			})
		}

		const requestedKind: SyncKind = options?.kind ?? 'DAILY'
		const shouldForceFull = !githubAccount.lastFullSyncAt
		const kind: SyncKind = shouldForceFull ? 'FULL' : requestedKind
		const lastSync = this.maxDate([githubAccount.lastDailySyncAt])

		if (kind !== 'FULL' && lastSync) {
			const lastSyncTime = lastSync.getTime()
			const nextAllowed = lastSyncTime + 24 * 60 * 60 * 1000
			if (Date.now() < nextAllowed) {
				return this.buildSyncResult({
					syncedAt: lastSync.toISOString(),
					days: 1,
					status: 'skipped',
					nextAllowedAt: new Date(nextAllowed).toISOString(),
				})
			}
		}

		const token = await this.tokenCipher.decrypt(githubAccount.accessToken)
		const repositories = await this.syncRepositories(token, userId)
		const now = new Date()
		const { from, to } = kind === 'FULL' ? this.buildFullWindow() : this.buildWindow(1)
		const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)))
		const maxDurationMs = kind === 'FULL' ? 5 * 60 * 1000 : null
		const syncStart = Date.now()
		let completedAll = true

		let commitsUpserted = 0
		let pullsUpserted = 0
		let reviewsUpserted = 0

		for (const repo of repositories) {
			const isLocked = repo.syncLockUntil ? repo.syncLockUntil.getTime() > now.getTime() : false
			if (isLocked) {
				continue
			}

			const forceFull = kind === 'FULL' && !repo.fullBackfillCompleted
			if (!forceFull && !repo.shouldSync) {
				continue
			}
			if (maxDurationMs !== null && Date.now() - syncStart > maxDurationMs) {
				completedAll = false
				break
			}

			const lockUntil = new Date(Date.now() + 15 * 60 * 1000)
			await this.prisma.repository.update({
				where: { id: repo.id },
				data: { syncLockUntil: lockUntil },
			})

			const commitWindow = forceFull
				? this.buildFullWindow()
				: this.buildIncrementalWindow(repo.lastCommitSyncedAt, now)
			const prWindow = forceFull
				? this.buildFullWindow()
				: this.buildIncrementalWindow(repo.lastPrUpdatedAt, now)
			const reviewWindow = forceFull
				? this.buildFullWindow()
				: this.buildIncrementalWindow(repo.lastReviewSyncedAt, now)
			const startFrom = new Date(
				Math.min(commitWindow.from.getTime(), prWindow.from.getTime(), reviewWindow.from.getTime()),
			)
			const result = await this.ingestion.execute({
				token,
				repositoryId: repo.id,
				owner: repo.ownerLogin,
				repo: repo.name,
				from: startFrom,
				to: now,
				prUpdatedSince: forceFull ? null : repo.lastPrUpdatedAt,
				reviewSubmittedSince: forceFull ? null : repo.lastReviewSyncedAt,
				exhaustivePulls: forceFull,
				useSearchPulls: !forceFull,
			})

			commitsUpserted += result.commitsUpserted
			pullsUpserted += result.pullsUpserted
			reviewsUpserted += result.reviewsUpserted

			await this.prisma.repository.update({
				where: { id: repo.id },
				data: {
					lastSyncedAt: now,
					lastCommitSyncedAt: now,
					lastPrUpdatedAt: now,
					lastReviewSyncedAt: now,
					fullBackfillCompleted: repo.fullBackfillCompleted || forceFull,
					syncLockUntil: null,
				},
			})
		}

		const syncedAt = new Date()
		const updateData =
			kind === 'FULL'
				? completedAll
					? { lastFullSyncAt: syncedAt }
					: null
				: { lastDailySyncAt: syncedAt }

		if (updateData) {
			await this.prisma.gitHubAccount.update({
				where: { id: githubAccount.id },
				data: updateData,
			})
		}

		return this.buildSyncResult({
			repositories: repositories.length,
			commitsUpserted,
			pullsUpserted,
			reviewsUpserted,
			syncedAt: syncedAt.toISOString(),
			days,
			status: 'performed',
			nextAllowedAt: null,
		})
	}
}
