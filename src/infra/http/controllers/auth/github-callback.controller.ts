import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { GithubCallbackUseCase } from '@/domain/flowtrack/application/use-cases/oauth/github-callback'
import { Public } from '@/infra/auth/public'
import { EnvService } from '@/infra/env/env.service'
import { BadRequestException, Controller, Get, Query, Redirect, Logger } from '@nestjs/common'
import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'

@Controller('/auth/github')
@Public()
export class GithubCallbackController {
	private readonly logger = new Logger(GithubCallbackController.name)

	constructor(
		private envService: EnvService,
		private githubCallback: GithubCallbackUseCase,
		private listRepos: ListReposUseCase,
	) {}

	@Get('/callback')
	@Redirect()
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

		const { accessToken, userId } = result.value

		// Fire-and-forget repo sync; do not block redirect.
		void this.listRepos
			.execute({ userId })
			.catch((error) => this.logger.warn(`Repo sync failed for user ${userId}: ${error?.message ?? error}`))
		const uiCallback = this.envService.get('GITHUB_OAUTH_UI_REDIRECT_URL')
		return {
			url: `${uiCallback}?token=${accessToken}`,
		}
	}
}
