import { Either, left, right } from '@/core/either'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { User } from '@/domain/flowtrack/enterprise/entities/user'
import { Injectable } from '@nestjs/common'
import { Encrypter } from '../../cryptography/encrypter'
import { HashGenerator } from '../../cryptography/hash-generator'
import { TokenCipher } from '../../cryptography/token-cipher'
import { UsersRepository } from '../../repositories/users-repository'
import { GithubOAuthService } from '@/infra/oauth/github-oauth.service'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

interface GithubCallbackUseCaseRequest {
	code: string
}

type GithubCallbackUseCaseResponse = Either<
	NotFoundError,
	{
		accessToken: string
		userId: string
		role: string
	}
>

@Injectable()
export class GithubCallbackUseCase {
	constructor(
		private githubOAuthService: GithubOAuthService,
		private usersRepository: UsersRepository,
		private encrypter: Encrypter,
		private tokenCipher: TokenCipher,
		private hashGenerator: HashGenerator,
		private prisma: PrismaService,
	) {}

	async execute({
		code,
	}: GithubCallbackUseCaseRequest): Promise<GithubCallbackUseCaseResponse> {
		const token = await this.githubOAuthService.exchangeCodeForToken(code)
		const encryptedToken = await this.tokenCipher.encrypt(token)
		const profile = await this.githubOAuthService.getProfile(token)

		if (!profile?.email) {
			return left(new NotFoundError('email', 'GitHub profile'))
		}

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

		await this.prisma.gitHubAccount.upsert({
			where: {
				provider_login: {
					provider: 'github',
					login: profile.login,
				},
			},
			update: {
				userId: user.id.toString(),
				email: profile.email,
				accessToken: encryptedToken,
			},
			create: {
				id: new UniqueEntityID().toString(),
				userId: user.id.toString(),
				provider: 'github',
				login: profile.login,
				email: profile.email,
				accessToken: encryptedToken,
			},
		})

		const accessToken = await this.encrypter.encrypt({
			sub: user.id.toString(),
			role: user.role,
		})

		return right({
			accessToken,
			userId: user.id.toString(),
			role: user.role,
		})
	}
}
