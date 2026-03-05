import { GetRepoPullsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-pulls'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { RepoPullsPresenter } from '@/infra/http/presenters/repo-pulls.presenter'
import { parseDateRange } from '@/infra/http/utils/date-range'
import {
	Controller,
	Get,
	Param,
	Query,
} from '@nestjs/common'
import { z } from 'zod'

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
		const { from, to } = parseDateRange(query)

		const result = await this.getRepoPulls.execute({
			userId: user.sub,
			repoId: params.repoId,
			from,
			to,
		})

		if (result.isLeft()) {
			return result
		}

		return {
			items: RepoPullsPresenter.toHTTP(result.value.items),
		}
	}
}
