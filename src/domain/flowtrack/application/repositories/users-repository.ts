import { User } from '@/domain/flowtrack/enterprise/entities/user'

export abstract class UsersRepository {
	abstract findById(id: string): Promise<User | null>
	abstract findByEmail(email: string): Promise<User | null>
	abstract create(user: User): Promise<void>
	abstract findByName(name: string): Promise<User | null>
	abstract save(user: User): Promise<void>
}
