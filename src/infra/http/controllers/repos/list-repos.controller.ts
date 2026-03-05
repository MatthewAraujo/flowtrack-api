import { ListReposUseCase } from '@/domain/flowtrack/application/use-cases/repos/list-repos'
import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { ReposPresenter } from '@/infra/http/presenters/repos.presenter'
import { Controller, Get, Query } from '@nestjs/common'

@Controller('/repos')
export class ListReposController {
	constructor(private listRepos: ListReposUseCase) {}

	@Get()
	async handle(
		@CurrentUser() user: { sub: string },
		@Query('q') query?: string,
		@Query('owner') owner?: string,
		@Query('page') page?: string,
		@Query('pageSize') pageSize?: string,
	) {
		const parsedPage = page ? Number.parseInt(page, 10) : undefined
		const parsedPageSize = pageSize ? Number.parseInt(pageSize, 10) : undefined
		const result = await this.listRepos.execute({
			userId: user.sub,
			query,
			owner,
			page: Number.isFinite(parsedPage) ? parsedPage : undefined,
			pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
		})

		return {
			items: ReposPresenter.toHTTP(result.items),
			meta: {
				total: result.total,
				page: result.page,
				pageSize: result.pageSize,
			},
			orgs: result.orgs,
		}
	}
}
