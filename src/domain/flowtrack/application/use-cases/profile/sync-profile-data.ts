import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import { TokenCipher } from '../../cryptography/token-cipher'
import { IngestRepositoryActivityUseCase } from '../github/ingest-repository-activity'
import { EnvService } from '@/infra/env/env.service'
import { CacheRepository } from '@/infra/cache/cache-repository'

type SyncResult = {
	repositories: number
	commitsUpserted: number
	pullsUpserted: number
	reviewsUpserted: number
	syncedAt: string
	days: number
}

@Injectable()
export class SyncProfileDataUseCase {
	constructor(
		private prisma: PrismaService,
		private tokenCipher: TokenCipher,
		private ingestion: IngestRepositoryActivityUseCase,
		private envService: EnvService,
		private cacheRepository: CacheRepository,
	) {}

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

	async execute(
		userId: string,
		options?: { days?: number; fullHistory?: boolean; force?: boolean },
	): Promise<SyncResult> {
		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId, provider: 'github' },
		})

		if (!githubAccount?.accessToken) {
			const syncedAt = new Date().toISOString()
			const defaultDays = Number(this.envService.get('PROFILE_SYNC_DAYS'))
			const days = options?.days ?? defaultDays
			return {
				repositories: 0,
				commitsUpserted: 0,
				pullsUpserted: 0,
				reviewsUpserted: 0,
				syncedAt,
				days,
			}
		}

		if (!options?.force) {
			const lastSync = await this.cacheRepository.get<string>(`profile:last_sync:${userId}`)
			if (lastSync) {
				const lastSyncTime = new Date(lastSync).getTime()
				if (Number.isFinite(lastSyncTime)) {
					const nextAllowed = lastSyncTime + 24 * 60 * 60 * 1000
					if (Date.now() < nextAllowed) {
						const syncedAt = new Date().toISOString()
						const defaultDays = Number(this.envService.get('PROFILE_SYNC_DAYS'))
						const days = options?.days ?? defaultDays
						return {
							repositories: 0,
							commitsUpserted: 0,
							pullsUpserted: 0,
							reviewsUpserted: 0,
							syncedAt,
							days,
						}
					}
				}
			}
		}

		const token = await this.tokenCipher.decrypt(githubAccount.accessToken)
		const access = await this.prisma.userRepositoryAccess.findMany({
			where: { userId },
			include: { repository: true },
		})

		const repositories = access
			.map((entry) => entry.repository)
			.filter((repo): repo is NonNullable<typeof repo> => Boolean(repo))

		const defaultDays = Number(this.envService.get('PROFILE_SYNC_DAYS'))
		const days = options?.days ?? defaultDays
		const { from, to } = options?.fullHistory ? this.buildFullWindow() : this.buildWindow(days)

		let commitsUpserted = 0
		let pullsUpserted = 0
		let reviewsUpserted = 0

		for (const repo of repositories) {
			const result = await this.ingestion.execute({
				token,
				repositoryId: repo.id,
				owner: repo.ownerLogin,
				repo: repo.name,
				from,
				to,
			})

			commitsUpserted += result.commitsUpserted
			pullsUpserted += result.pullsUpserted
			reviewsUpserted += result.reviewsUpserted
		}

		const syncedAt = new Date().toISOString()
		await this.cacheRepository.set(`profile:last_sync:${userId}`, syncedAt, 60 * 60 * 24 * 30)

		return {
			repositories: repositories.length,
			commitsUpserted,
			pullsUpserted,
			reviewsUpserted,
			syncedAt,
			days,
		}
	}
}
