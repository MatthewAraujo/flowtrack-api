import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'

export abstract class RepositoriesRepository {
	abstract findByProviderRepoId(
		provider: Repository['provider'],
		providerRepoId: string,
	): Promise<Repository | null>
	abstract create(repository: Repository): Promise<void>
	abstract save(repository: Repository): Promise<void>
}
