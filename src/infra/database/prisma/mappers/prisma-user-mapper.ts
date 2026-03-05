import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { User, UserRole } from '@/domain/flowtrack/enterprise/entities/user'
import { Prisma, User as PrismaUser } from 'generated/prisma'
export class PrismaUserMapper {
	static toDomain(raw: PrismaUser): User {
		return User.create(
			{
				name: raw.name,
				email: raw.email,
				password: raw.password,
				role: raw.role as UserRole,
				githubAccessToken: raw.githubAccessToken,
			},
			new UniqueEntityID(raw.id),
		)
	}

	static toPrisma(user: User): Prisma.UserUncheckedCreateInput {
		return {
			id: user.id.toString(),
			name: user.name,
			email: user.email,
			password: user.password,
			role: user.role,
			githubAccessToken: user.githubAccessToken,
		}
	}
}
