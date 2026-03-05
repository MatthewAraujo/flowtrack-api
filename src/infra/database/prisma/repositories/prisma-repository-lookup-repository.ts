import { RepositoryLookupRepository } from '@/domain/flowtrack/application/repositories/repository-lookup-repository'
import { PrismaService } from '../prisma.service'

export class PrismaRepositoryLookupRepository implements RepositoryLookupRepository {
	constructor(private prisma: PrismaService) {}

	async findById(id: string): Promise<{ id: string } | null> {
		return this.prisma.repository.findUnique({
			where: { id },
			select: { id: true },
		})
	}
}
