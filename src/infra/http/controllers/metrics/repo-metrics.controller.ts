import {
	Controller,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Query,
	BadRequestException,
} from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { Roles } from '@/infra/authorization/roles'
import { GetRepoMetricsUseCase } from '@/domain/flowtrack/application/use-cases/metrics/get-repo-metrics'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { RepoMetricsPresenter } from '@/infra/http/presenters/repo-metrics.presenter'

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

		return RepoMetricsPresenter.toHTTP(result.value)
	}
}
