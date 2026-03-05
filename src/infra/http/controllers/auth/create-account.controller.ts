import { RegisterUserUseCase } from '@/domain/flowtrack/application/use-cases/auth/register-user'
import { UserAlreadyExistsError } from '@/domain/flowtrack/application/use-cases/errors/user-already-exists-error'
import { Public } from '@/infra/auth/public'
import { throwUseCaseError } from '@/infra/http/errors/use-case-error'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import {
	BadRequestException,
	Body,
	ConflictException,
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
			throwUseCaseError(
				result.value,
				[[UserAlreadyExistsError, (error) => new ConflictException(error.message)]],
				(error) => new BadRequestException(error.message),
			)
		}
	}
}
