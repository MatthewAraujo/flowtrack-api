import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { NotFoundError } from '../errors/not-found-error'
import { Either, left, right } from '@/core/either'

type RepositoryRecord = { id: string }

export async function ensureRepository(
	prisma: PrismaService,
	repoId: string,
): Promise<Either<NotFoundError, RepositoryRecord>> {
	const repository = await prisma.repository.findUnique({
		where: { id: repoId },
		select: { id: true },
	})

	if (!repository) {
		return left(new NotFoundError(repoId, 'Repository'))
	}

	return right(repository)
}
