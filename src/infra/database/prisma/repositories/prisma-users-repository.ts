import { UsersRepository } from '@/domain/assistent/application/repositories/users-repository'
import { User } from '@/domain/assistent/enterprise/entities/user'
import { Injectable } from '@nestjs/common'
import { PrismaUserMapper } from '../mappers/prisma-user-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
	constructor(private prisma: PrismaService) { }

	async findByEmail(email: string): Promise<User | null> {
		const user = await this.prisma.user.findUnique({
			where: {
				email,
			},
		})

		if (!user) {
			return null
		}

		return PrismaUserMapper.toDomain(user)
	}

	async create(user: User): Promise<void> {
		const data = PrismaUserMapper.toPrisma(user)

		await this.prisma.user.create({
			data,
		})
	}

	async save(user: User): Promise<void> {
		const data = PrismaUserMapper.toPrisma(user)

		await this.prisma.user.update({
			where: { id: user.id.toString() },
			data: {
				name: data.name,
				email: data.email,
				password: data.password,
				role: data.role,
				githubAccessToken: data.githubAccessToken,
			},
		})
	}
	async findByName(name: string): Promise<User | null> {
		const user = await this.prisma.user.findFirst({
			where: {
				name,
			},
		})

		if (!user) {
			return null
		}

		return PrismaUserMapper.toDomain(user)
	}
}
