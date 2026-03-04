import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'

export class ReposPresenter {
	static toHTTP(items: Repository[]) {
		return items.map((repo) => ({
			id: repo.id.toString(),
			name: repo.name,
			full_name: repo.fullName,
			is_private: repo.isPrivate,
			owner_login: repo.ownerLogin,
			default_branch: repo.defaultBranch,
		}))
	}
}
