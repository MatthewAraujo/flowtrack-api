import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { GetRepoMetricsUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-repo-metrics'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { throwUseCaseError } from '@/infra/http/errors/use-case-error'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { RepoMetricsPresenter } from '@/infra/http/presenters/repo-metrics.presenter'
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

const paramsSchema = z.object({
	repoId: z.string().uuid(),
})

const querySchema = z.object({
	window: z.enum(['7d', '30d', '90d']),
	refresh: z.string().optional(),
})

@Controller('/repos/:repoId/metrics')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class RepoMetricsController {
	constructor(private getRepoMetrics: GetRepoMetricsUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { repoId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { window: '7d' | '30d' | '90d'; refresh?: string },
	) {
		const result = await this.getRepoMetrics.execute({
			userId: user.sub,
			repoId: params.repoId,
			window: query.window,
			refresh: query.refresh === 'true',
		})

		if (result.isLeft()) {
			throwUseCaseError(
				result.value,
				[
					[NotAllowedError, () => new ForbiddenException('Forbidden')],
					[NotFoundError, (error) => new NotFoundException(error.message)],
				],
				(error) => new BadRequestException(error.message),
			)
		}

		return RepoMetricsPresenter.toHTTP(result.value)
	}
}
