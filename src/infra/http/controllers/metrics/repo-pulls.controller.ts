import {
	BadRequestException,
	Controller,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Query,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { Roles } from '@/infra/authorization/roles'
import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepoPullsPresenter } from '@/infra/http/presenters/repo-pulls.presenter'

const paramsSchema = z.object({
	repoId: z.string().uuid(),
})

const querySchema = z.object({
	from: z.string().datetime(),
	to: z.string().datetime(),
})

@Controller('/repos/:repoId/pulls')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class RepoPullsController {
	constructor(private getRepoPulls: GetRepoPullsUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { repoId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { from: string; to: string },
	) {
		const from = new Date(query.from)
		const to = new Date(query.to)

		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
			throw new BadRequestException('Invalid date range')
		}

		const result = await this.getRepoPulls.execute({
			userId: user.sub,
			repoId: params.repoId,
			from,
			to,
		})

		if (result.isLeft()) {
			const error = result.value
			switch (error.constructor) {
				case NotAllowedError:
					throw new ForbiddenException('Forbidden')
				case NotFoundError:
					throw new NotFoundException(error.message)
				default:
					throw new BadRequestException(error.message)
			}
		}

		return {
			items: RepoPullsPresenter.toHTTP(result.value.items),
		}
	}
}
