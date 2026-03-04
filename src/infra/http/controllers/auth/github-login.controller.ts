import { Public } from '@/infra/auth/public'
import { Controller, Get, Res } from '@nestjs/common'
import { EnvService } from '@/infra/env/env.service'
import type { Response } from 'express'

@Controller('/auth/github')
@Public()
export class GithubLoginController {
	constructor(private envService: EnvService) {}

	@Get('/login')
	login(@Res() response: Response) {
		const clientId = this.envService.get('GITHUB_CLIENT_ID')
		const redirectUri = this.envService.get('GITHUB_OAUTH_CALLBACK_URL')

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			scope: 'repo read:org user:email',
			allow_signup: 'true',
		})

		return response.redirect(
			`https://github.com/login/oauth/authorize?${params.toString()}`,
		)
	}
}
