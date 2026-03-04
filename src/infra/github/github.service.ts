import { Injectable } from '@nestjs/common'

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

@Injectable()
export class GitHubService {
	async listRepositories(token: string): Promise<GitHubRepo[]> {
		const repos: GitHubRepo[] = []
		let page = 1
		const perPage = 100

		while (true) {
			const response = await fetch(
				`https://api.github.com/user/repos?per_page=${perPage}&page=${page}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/vnd.github+json',
					},
				},
			)

			if (!response.ok) {
				const body = await response.text()
				throw new Error(`GitHub repos fetch failed: ${body}`)
			}

			const data = (await response.json()) as GitHubRepo[]
			repos.push(...data)

			if (data.length < perPage) {
				break
			}

			page += 1
		}

		return repos
	}
}
