import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ReposPresenter } from '@/infra/http/presenters/repos.presenter'
import { Controller, Get, Query } from '@nestjs/common'

@Controller('/repos')
export class ListReposController {
	constructor(private listRepos: ListReposUseCase) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }, @Query('q') query?: string) {
		const result = await this.listRepos.execute({
			userId: user.sub,
			query,
		})

		return {
			items: ReposPresenter.toHTTP(result.items),
		}
	}
}
