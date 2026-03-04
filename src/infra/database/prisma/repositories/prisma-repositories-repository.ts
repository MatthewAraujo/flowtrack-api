import { Injectable } from '@nestjs/common'
import { RepositoriesRepository } from '@/domain/flowtrack/application/repositories/repositories-repository'
import { Repository } from '@/domain/flowtrack/enterprise/entities/repository'
import { PrismaService } from '../prisma.service'
import { PrismaRepositoryMapper } from '../mappers/prisma-repository-mapper'

@Injectable()
export class PrismaRepositoriesRepository implements RepositoriesRepository {
	constructor(private prisma: PrismaService) {}

	async findByProviderRepoId(
		provider: Repository['provider'],
		providerRepoId: string,
	): Promise<Repository | null> {
		const repo = await this.prisma.repository.findUnique({
			where: {
				provider_providerRepoId: {
					provider,
					providerRepoId,
				},
			},
		})

		if (!repo) {
			return null
		}

		return PrismaRepositoryMapper.toDomain(repo)
	}

	async create(repository: Repository): Promise<void> {
		const data = PrismaRepositoryMapper.toPrisma(repository)
		await this.prisma.repository.create({ data })
	}

	async save(repository: Repository): Promise<void> {
		const data = PrismaRepositoryMapper.toPrisma(repository)
		await this.prisma.repository.update({
			where: { id: repository.id.toString() },
			data: {
				name: data.name,
				fullName: data.fullName,
				isPrivate: data.isPrivate,
				ownerLogin: data.ownerLogin,
				defaultBranch: data.defaultBranch,
				updatedAt: data.updatedAt,
			},
		})
	}
}
