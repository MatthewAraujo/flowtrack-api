import { Public } from '@/infra/auth/public'
import { BadRequestException, Controller, Get, HttpCode, Query } from '@nestjs/common'
import { EnvService } from '@/infra/env/env.service'
import { GithubCallbackUseCase } from '@/domain/flowtrack/application/use-cases/oauth/github-callback'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'

@Controller('/auth/github')
@Public()
export class GithubCallbackController {
	constructor(
		private envService: EnvService,
		private githubCallback: GithubCallbackUseCase,
	) {}

	@Get('/callback')
	@HttpCode(200)
	async callback(@Query('code') code?: string, @Query('state') state?: string) {
		if (!code) {
			return { error: 'Missing OAuth code' }
		}

		const result = await this.githubCallback.execute({ code })
		if (result.isLeft()) {
			const error = result.value
			switch (error.constructor) {
				case NotFoundError:
					throw new BadRequestException(error.message)
				default:
					throw new BadRequestException(error.message)
			}
		}

		const { accessToken } = result.value
		const uiCallback = this.envService.get('GITHUB_OAUTH_UI_REDIRECT_URL')
		return {
			access_token: accessToken,
			redirect_url: `${uiCallback}?token=${accessToken}`,
		}
	}
}
