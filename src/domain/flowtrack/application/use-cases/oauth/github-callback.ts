import { Either, left, right } from '@/core/either'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { User } from '@/domain/flowtrack/enterprise/entities/user'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { GithubOAuthService } from '@/infra/oauth/github-oauth.service'
import { Injectable, Logger } from '@nestjs/common'
import { Encrypter } from '../../cryptography/encrypter'
import { HashGenerator } from '../../cryptography/hash-generator'
import { TokenCipher } from '../../cryptography/token-cipher'
import { UsersRepository } from '../../repositories/users-repository'
import { SyncProfileDataUseCase } from '../profile/sync-profile-data'

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
	private readonly logger = new Logger(GithubCallbackUseCase.name)

	constructor(
		private githubOAuthService: GithubOAuthService,
		private usersRepository: UsersRepository,
		private encrypter: Encrypter,
		private tokenCipher: TokenCipher,
		private hashGenerator: HashGenerator,
		private prisma: PrismaService,
		private syncProfileData: SyncProfileDataUseCase,
	) {}

	async execute({ code }: GithubCallbackUseCaseRequest): Promise<GithubCallbackUseCaseResponse> {
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

		void this.syncProfileData.execute(user.id.toString(), { kind: 'FULL' }).catch((error) => {
			this.logger.warn(
				`Full profile sync failed for user ${user.id.toString()}: ${error instanceof Error ? error.message : error}`,
			)
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
