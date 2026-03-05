import { EnvService } from '@/infra/env/env.service'
import { Injectable } from '@nestjs/common'

type GitHubTokenResponse = {
	access_token: string
	scope?: string
	token_type?: string
}

type GitHubUserResponse = {
	login: string
	name?: string | null
	email?: string | null
}

@Injectable()
export class GithubOAuthService {
	constructor(private envService: EnvService) {}

	async exchangeCodeForToken(code: string): Promise<string> {
		const clientId = this.envService.get('GITHUB_CLIENT_ID')
		const clientSecret = this.envService.get('GITHUB_CLIENT_SECRET')
		const redirectUri = this.envService.get('GITHUB_OAUTH_CALLBACK_URL')

		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
			}),
		})

		if (!response.ok) {
			const body = await response.text()
			throw new Error(`GitHub token exchange failed: ${body}`)
		}

		const data = (await response.json()) as GitHubTokenResponse
		if (!data.access_token) {
			throw new Error('GitHub token exchange returned no access token')
		}

		return data.access_token
	}

	async getProfile(token: string) {
		const userResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
			},
		})

		if (!userResponse.ok) {
			const body = await userResponse.text()
			throw new Error(`GitHub user fetch failed: ${body}`)
		}

		const user = (await userResponse.json()) as GitHubUserResponse

		if (user.email) {
			return user
		}

		const emailResponse = await fetch('https://api.github.com/user/emails', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
			},
		})

		if (!emailResponse.ok) {
			const body = await emailResponse.text()
			throw new Error(`GitHub email fetch failed: ${body}`)
		}

		const emails = (await emailResponse.json()) as Array<{
			email: string
			primary: boolean
			verified: boolean
		}>

		const primaryEmail = emails.find((entry) => entry.primary && entry.verified)
		if (!primaryEmail) {
			throw new Error('No verified primary email found for GitHub user')
		}

		return {
			...user,
			email: primaryEmail.email,
		}
	}
}
