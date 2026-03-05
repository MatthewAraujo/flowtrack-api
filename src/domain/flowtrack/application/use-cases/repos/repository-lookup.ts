import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'
import { NotFoundError } from '../errors/not-found-error'
import { Either, left, right } from '@/core/either'

type RepositoryRecord = { id: string }

export async function ensureRepository(
	repositories: RepositoryLookupRepository,
	repoId: string,
): Promise<Either<NotFoundError, RepositoryRecord>> {
	const repository = await repositories.findById(repoId)

	if (!repository) {
		return left(new NotFoundError(repoId, 'Repository'))
	}

	return right(repository)
}
