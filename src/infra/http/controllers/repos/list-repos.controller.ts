import { Controller, Get, Query } from '@nestjs/common'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'

@Controller('/repos')
export class ListReposController {
	constructor(private listRepos: ListReposUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Query('q') query?: string,
	) {
		return this.listRepos.execute({
			userId: user.sub,
			query,
		})
	}
}
