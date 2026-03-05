import { AuthenticateUserUseCase } from '@/domain/flowtrack/application/use-cases/auth/authenticate-user'
import { WrongCredentialsError } from '@/domain/flowtrack/application/use-cases/errors/wrong-credentials-error'
import { Public } from '@/infra/auth/public'
import { throwUseCaseError } from '@/infra/http/errors/use-case-error'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import {
	BadRequestException,
	Body,
	Controller,
	Post,
	UnauthorizedException,
	UsePipes,
} from '@nestjs/common'
import { z } from 'zod'

const authenticateBodySchema = z.object({
	email: z.string().email(),
	password: z.string(),
})

type AuthenticateBodySchema = z.infer<typeof authenticateBodySchema>

@Controller('/sessions')
@Public()
export class AuthenticateController {
	constructor(private authenticateUser: AuthenticateUserUseCase) {}

	@Post()
	@UsePipes(new ZodValidationPipe(authenticateBodySchema))
	async handle(@Body() body: AuthenticateBodySchema) {
		const { email, password } = body

		const result = await this.authenticateUser.execute({
			email,
			password,
		})

		if (result.isLeft()) {
			throwUseCaseError(
				result.value,
				[[WrongCredentialsError, (error) => new UnauthorizedException(error.message)]],
				(error) => new BadRequestException(error.message),
			)
		}

		const { accessToken } = result.value

		return {
			access_token: accessToken,
		}
	}
}
