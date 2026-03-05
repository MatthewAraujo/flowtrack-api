import { AuthenticateUserUseCase } from '@/domain/flowtrack/application/use-cases/auth/authenticate-user'
import { Public } from '@/infra/auth/public'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import {
	Body,
	Controller,
	Post,
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
			return result
		}

		const { accessToken } = result.value

		return {
			access_token: accessToken,
		}
	}
}
