import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { GetRepoCommitsUseCase } from '@/domain/flowtrack/application/use-cases/repos/get-repo-commits'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { ZodValidationPipe } from '@/infra/http/pipes/zod-validation-pipe'
import { RepoCommitsPresenter } from '@/infra/http/presenters/repo-commits.presenter'
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
	from: z.string().datetime(),
	to: z.string().datetime(),
})

@Controller('/repos/:repoId/commits')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class RepoCommitsController {
	constructor(private getRepoCommits: GetRepoCommitsUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Param(new ZodValidationPipe(paramsSchema)) params: { repoId: string },
		@Query(new ZodValidationPipe(querySchema))
		query: { from: string; to: string; refresh?: string },
	) {
		const from = new Date(query.from)
		const to = new Date(query.to)
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
			throw new BadRequestException('Invalid date range')
		}

		const result = await this.getRepoCommits.execute({
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
			items: RepoCommitsPresenter.toHTTP(result.value.items),
		}
	}
}
