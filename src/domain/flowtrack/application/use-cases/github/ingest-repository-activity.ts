import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GitHubService } from '@/infra/github/github.service'
import { Injectable } from '@nestjs/common'

type IngestionParams = {
	token: string
	repositoryId: string
	owner: string
	repo: string
	from: Date
	to: Date
	exhaustivePulls?: boolean
	useSearchPulls?: boolean
}

@Injectable()
export class IngestRepositoryActivityUseCase {
	constructor(
		private githubService: GitHubService,
		private prisma: PrismaService,
	) {}

	async execute(params: IngestionParams) {
		const { token, repositoryId, owner, repo, from, to, exhaustivePulls, useSearchPulls } = params

		const commits = await this.githubService.listCommits(token, owner, repo, from, to)
		const pulls = await this.githubService.listPullRequests(token, owner, repo, from, to, {
			exhaustive: exhaustivePulls,
			useSearch: useSearchPulls,
		})

		let commitsUpserted = 0
		for (const commit of commits) {
			await this.prisma.commitEvent.upsert({
				where: {
					repositoryId_sha: {
						repositoryId,
						sha: commit.sha,
					},
				},
				update: {
					authorLogin: commit.author?.login ?? null,
					authorEmail: commit.commit.author?.email ?? null,
					message: commit.commit.message ?? null,
					committedAt: new Date(commit.commit.author.date),
				},
				create: {
					id: new UniqueEntityID().toString(),
					repositoryId,
					sha: commit.sha,
					authorLogin: commit.author?.login ?? null,
					authorEmail: commit.commit.author?.email ?? null,
					message: commit.commit.message ?? null,
					committedAt: new Date(commit.commit.author.date),
				},
			})
			commitsUpserted += 1
		}

		let pullsUpserted = 0
		let reviewsUpserted = 0

		for (const pull of pulls) {
			const details = await this.githubService.getPullDetails(token, owner, repo, pull.number)

			await this.prisma.pullRequestEvent.upsert({
				where: {
					repositoryId_number: {
						repositoryId,
						number: pull.number,
					},
				},
				update: {
					githubId: BigInt(pull.id),
					title: details.title,
					state: details.state,
					isMerged: Boolean(details.merged_at),
					authorLogin: details.user?.login ?? null,
					createdAt: new Date(details.created_at),
					updatedAt: new Date(details.updated_at),
					closedAt: details.closed_at ? new Date(details.closed_at) : null,
					mergedAt: details.merged_at ? new Date(details.merged_at) : null,
					additions: details.additions,
					deletions: details.deletions,
					changedFiles: details.changed_files,
				},
				create: {
					id: new UniqueEntityID().toString(),
					repositoryId,
					number: pull.number,
					githubId: BigInt(pull.id),
					title: details.title,
					state: details.state,
					isMerged: Boolean(details.merged_at),
					authorLogin: details.user?.login ?? null,
					createdAt: new Date(details.created_at),
					updatedAt: new Date(details.updated_at),
					closedAt: details.closed_at ? new Date(details.closed_at) : null,
					mergedAt: details.merged_at ? new Date(details.merged_at) : null,
					additions: details.additions,
					deletions: details.deletions,
					changedFiles: details.changed_files,
				},
			})

			pullsUpserted += 1

			const reviews = await this.githubService.listReviews(token, owner, repo, pull.number)
			for (const review of reviews) {
				if (!review.submitted_at) {
					continue
				}

				await this.prisma.reviewEvent.upsert({
					where: {
						repositoryId_githubId: {
							repositoryId,
							githubId: BigInt(review.id),
						},
					},
					update: {
						pullNumber: pull.number,
						reviewerLogin: review.user?.login ?? null,
						state: review.state,
						submittedAt: new Date(review.submitted_at),
					},
					create: {
						id: new UniqueEntityID().toString(),
						repositoryId,
						pullNumber: pull.number,
						githubId: BigInt(review.id),
						reviewerLogin: review.user?.login ?? null,
						state: review.state,
						submittedAt: new Date(review.submitted_at),
					},
				})

				reviewsUpserted += 1
			}
		}

		return {
			commitsUpserted,
			pullsUpserted,
			reviewsUpserted,
		}
	}

	async listCommitEvents(repositoryId: string, from: Date, to: Date) {
		return this.prisma.commitEvent.findMany({
			where: {
				repositoryId,
				committedAt: {
					gte: from,
					lte: to,
				},
			},
			orderBy: {
				committedAt: 'asc',
			},
		})
	}

	async listPullRequestEvents(repositoryId: string, from: Date, to: Date) {
		return this.prisma.pullRequestEvent.findMany({
			where: {
				repositoryId,
				createdAt: {
					lte: to,
				},
				OR: [
					{
						createdAt: {
							gte: from,
						},
					},
					{
						closedAt: {
							gte: from,
						},
					},
					{
						mergedAt: {
							gte: from,
						},
					},
				],
			},
			orderBy: {
				createdAt: 'asc',
			},
		})
	}

	async listReviewEvents(repositoryId: string, from: Date, to: Date) {
		return this.prisma.reviewEvent.findMany({
			where: {
				repositoryId,
				submittedAt: {
					gte: from,
					lte: to,
				},
			},
			orderBy: {
				submittedAt: 'asc',
			},
		})
	}
}
