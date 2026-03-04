import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { CacheRepository } from '@/infra/cache/cache-repository'

type GitHubRepo = {
	id: number
	name: string
	full_name: string
	private: boolean
	owner: {
		login: string
	}
	default_branch?: string
}

type GitHubCommit = {
	sha: string
	commit: {
		message: string
		author: {
			name: string
			email: string
			date: string
		}
	}
	author?: {
		login: string
	}
}

type GitHubPull = {
	id: number
	number: number
	title: string
	state: string
	user?: {
		login: string
	}
	created_at: string
	updated_at: string
	closed_at: string | null
	merged_at: string | null
}

type GitHubPullDetails = GitHubPull & {
	additions: number
	deletions: number
	changed_files: number
}

type GitHubReview = {
	id: number
	state: string
	submitted_at: string | null
	user?: {
		login: string
	}
}

const DEFAULT_PER_PAGE = 100
const CACHE_TTL = {
	repos: 300,
	commits: 600,
	pulls: 600,
	reviews: 600,
	pullDetails: 600,
}

@Injectable()
export class GitHubService {
	constructor(private cacheRepository: CacheRepository) {}

	async listRepositories(token: string): Promise<GitHubRepo[]> {
		const tokenKey = this.tokenKey(token)
		return this.paginate<GitHubRepo>(
			(page) =>
				this.requestJson<GitHubRepo[]>(
					`https://api.github.com/user/repos?per_page=${DEFAULT_PER_PAGE}&page=${page}`,
					token,
					{
						cacheKey: `github:${tokenKey}:repos:page:${page}`,
						ttlSeconds: CACHE_TTL.repos,
					},
				),
		)
	}

	async listCommits(
		token: string,
		owner: string,
		repo: string,
		from: Date,
		to: Date,
	): Promise<GitHubCommit[]> {
		const tokenKey = this.tokenKey(token)
		const since = from.toISOString()
		const until = to.toISOString()

		return this.paginate<GitHubCommit>(
			(page) =>
				this.requestJson<GitHubCommit[]>(
					`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${DEFAULT_PER_PAGE}&page=${page}&since=${since}&until=${until}`,
					token,
					{
						cacheKey: `github:${tokenKey}:commits:${owner}/${repo}:${since}:${until}:page:${page}`,
						ttlSeconds: CACHE_TTL.commits,
					},
				),
		)
	}

	async listPullRequests(
		token: string,
		owner: string,
		repo: string,
		from: Date,
		to: Date,
	): Promise<GitHubPull[]> {
		const tokenKey = this.tokenKey(token)
		const results: GitHubPull[] = []
		let page = 1
		const fromTime = from.getTime()

		while (true) {
			const data = await this.requestJson<GitHubPull[]>(
				`https://api.github.com/repos/${owner}/${repo}/pulls?per_page=${DEFAULT_PER_PAGE}&page=${page}&state=all&sort=updated&direction=desc`,
				token,
				{
					cacheKey: `github:${tokenKey}:pulls:${owner}/${repo}:page:${page}`,
					ttlSeconds: CACHE_TTL.pulls,
				},
			)

			results.push(...data)

			if (data.length < DEFAULT_PER_PAGE) {
				break
			}

			const oldest = data[data.length - 1]
			if (oldest && new Date(oldest.updated_at).getTime() < fromTime) {
				break
			}

			page += 1
		}

		return results.filter((pull) => {
			const createdAt = new Date(pull.created_at).getTime()
			const closedAt = pull.closed_at ? new Date(pull.closed_at).getTime() : null
			const mergedAt = pull.merged_at ? new Date(pull.merged_at).getTime() : null

			return (
				(createdAt >= fromTime && createdAt <= to.getTime()) ||
				(closedAt !== null && closedAt >= fromTime && closedAt <= to.getTime()) ||
				(mergedAt !== null && mergedAt >= fromTime && mergedAt <= to.getTime())
			)
		})
	}

	async getPullDetails(
		token: string,
		owner: string,
		repo: string,
		number: number,
	): Promise<GitHubPullDetails> {
		const tokenKey = this.tokenKey(token)
		return this.requestJson<GitHubPullDetails>(
			`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
			token,
			{
				cacheKey: `github:${tokenKey}:pull:${owner}/${repo}:${number}`,
				ttlSeconds: CACHE_TTL.pullDetails,
			},
		)
	}

	async listReviews(
		token: string,
		owner: string,
		repo: string,
		number: number,
	): Promise<GitHubReview[]> {
		const tokenKey = this.tokenKey(token)
		return this.paginate<GitHubReview>(
			(page) =>
				this.requestJson<GitHubReview[]>(
					`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=${DEFAULT_PER_PAGE}&page=${page}`,
					token,
					{
						cacheKey: `github:${tokenKey}:reviews:${owner}/${repo}:${number}:page:${page}`,
						ttlSeconds: CACHE_TTL.reviews,
					},
				),
		)
	}

	private async paginate<T>(fetchPage: (page: number) => Promise<T[]>): Promise<T[]> {
		const results: T[] = []
		let page = 1

		while (true) {
			const data = await fetchPage(page)
			results.push(...data)

			if (data.length < DEFAULT_PER_PAGE) {
				break
			}

			page += 1
		}

		return results
	}

	private async requestJson<T>(
		url: string,
		token: string,
		options: { cacheKey?: string; ttlSeconds?: number } = {},
		attempt = 0,
	): Promise<T> {
		const cached = options.cacheKey
			? await this.cacheRepository.get<T>(options.cacheKey)
			: null

		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github+json',
				},
			})

			const remainingHeader = response.headers.get('x-ratelimit-remaining')
			const resetHeader = response.headers.get('x-ratelimit-reset')
			const remaining = remainingHeader ? Number(remainingHeader) : null
			const reset = resetHeader ? Number(resetHeader) : null

			if (!response.ok) {
				if (response.status === 403 || response.status === 429) {
					if (remaining !== null && remaining <= 0 && cached) {
						return JSON.parse(cached) as T
					}
					const resetTime = reset ? new Date(reset * 1000).toISOString() : 'unknown'
					throw new Error(`GitHub rate limit exceeded. Reset at ${resetTime}.`)
				}

				const body = await response.text()
				throw new Error(`GitHub request failed: ${body}`)
			}

			const data = (await response.json()) as T

			if (options.cacheKey) {
				await this.cacheRepository.set(
					options.cacheKey,
					JSON.stringify(data),
					options.ttlSeconds,
				)
			}

			return data
		} catch (error) {
			const isRetryable = error instanceof Error && attempt < 2
			if (isRetryable) {
				await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
				return this.requestJson(url, token, options, attempt + 1)
			}

			if (cached) {
				return JSON.parse(cached) as T
			}

			throw error
		}
	}

	private tokenKey(token: string) {
		return createHash('sha256').update(token).digest('hex').slice(0, 12)
	}
}
