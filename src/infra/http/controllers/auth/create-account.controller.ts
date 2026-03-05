import { RegisterUserUseCase } from '@/domain/flowtrack/application/use-cases/auth/register-user'
import { Public } from '@/infra/auth/public'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import {
	Body,
	Controller,
	HttpCode,
	Post,
	UsePipes,
} from '@nestjs/common'
import { z } from 'zod'

const createAccountBodySchema = z.object({
	name: z.string(),
	email: z.string().email(),
	password: z.string(),
})

type CreateAccountBodySchema = z.infer<typeof createAccountBodySchema>

@Controller('/accounts')
@Public()
export class CreateAccountController {
	constructor(private registerUser: RegisterUserUseCase) {}

	@Post()
	@HttpCode(201)
	@UsePipes(new ZodValidationPipe(createAccountBodySchema))
	async handle(@Body() body: CreateAccountBodySchema) {
		const { name, email, password } = body

		const result = await this.registerUser.execute({
			name,
			email,
			password,
		})

		if (result.isLeft()) {
			return result
		}
	}
}
