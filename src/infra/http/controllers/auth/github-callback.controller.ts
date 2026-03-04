import { Public } from '@/infra/auth/public'
import { Controller, Get, HttpCode, Query } from '@nestjs/common'
import { EnvService } from '@/infra/env/env.service'
import { GithubOAuthService } from '@/infra/oauth/github-oauth.service'
import { UsersRepository } from '@/domain/assistent/application/repositories/users-repository'
import { User } from '@/domain/assistent/enterprise/entities/user'
import { Encrypter } from '@/domain/assistent/application/cryptography/encrypter'
import { HashGenerator } from '@/domain/assistent/application/cryptography/hash-generator'
import { TokenCipher } from '@/domain/assistent/application/cryptography/token-cipher'

@Controller('/auth/github')
@Public()
export class GithubCallbackController {
	constructor(
		private envService: EnvService,
		private githubOAuthService: GithubOAuthService,
		private usersRepository: UsersRepository,
		private encrypter: Encrypter,
		private tokenCipher: TokenCipher,
		private hashGenerator: HashGenerator,
	) {}

	@Get('/callback')
	@HttpCode(200)
	async callback(@Query('code') code?: string, @Query('state') state?: string) {
		if (!code) {
			return { error: 'Missing OAuth code' }
		}

		const token = await this.githubOAuthService.exchangeCodeForToken(code)
		const encryptedToken = await this.tokenCipher.encrypt(token)
		const profile = await this.githubOAuthService.getProfile(token)

		let user = await this.usersRepository.findByEmail(profile.email)
		if (!user) {
			const password = await this.hashGenerator.hash('oauth')
			user = User.create({
				name: profile.name ?? profile.login,
				email: profile.email,
				password,
				role: 'DEVELOPER',
				githubAccessToken: encryptedToken,
			})
			await this.usersRepository.create(user)
		} else {
			user.githubAccessToken = encryptedToken
			await this.usersRepository.save(user)
		}

		const accessToken = await this.encrypter.encrypt({
			sub: user.id.toString(),
			role: user.role,
		})

		const uiCallback = this.envService.get('GITHUB_OAUTH_UI_REDIRECT_URL')
		return {
			access_token: accessToken,
			redirect_url: `${uiCallback}?token=${accessToken}`,
		}
	}
}
