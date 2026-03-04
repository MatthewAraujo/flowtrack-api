import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Repository } from '@/domain/assistent/enterprise/entities/repository'
import { Prisma, Repository as PrismaRepository } from 'generated/prisma'

export class PrismaRepositoryMapper {
	static toDomain(raw: PrismaRepository): Repository {
		return Repository.create(
			{
				provider: raw.provider as Repository['provider'],
				providerRepoId: raw.providerRepoId,
				name: raw.name,
				fullName: raw.fullName,
				isPrivate: raw.isPrivate,
				ownerLogin: raw.ownerLogin,
				defaultBranch: raw.defaultBranch,
				createdAt: raw.createdAt,
				updatedAt: raw.updatedAt,
			},
			new UniqueEntityID(raw.id),
		)
	}

	static toPrisma(repository: Repository): Prisma.RepositoryUncheckedCreateInput {
		return {
			id: repository.id.toString(),
			provider: repository.provider,
			providerRepoId: repository.providerRepoId,
			name: repository.name,
			fullName: repository.fullName,
			isPrivate: repository.isPrivate,
			ownerLogin: repository.ownerLogin,
			defaultBranch: repository.defaultBranch,
			createdAt: repository.createdAt,
			updatedAt: repository.updatedAt,
		}
	}
}
