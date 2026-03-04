import { DomainEvents } from '@/core/events/domain-events'
import { UsersRepository } from '@/domain/assistent/application/repositories/users-repository'
import { User } from '@/domain/assistent/enterprise/entities/user'

export class InMemoryUsersRepository implements UsersRepository {
	public items: User[] = []

	async findByEmail(email: string) {
		const user = this.items.find((item) => item.email === email)

		if (!user) {
			return null
		}

		return user
	}

	async create(user: User) {
		this.items.push(user)

		DomainEvents.dispatchEventsForAggregate(user.id)
	}
	async findByName(name: string) {
		const user = this.items.find((item) => item.name.toLowerCase() === name.toLowerCase())

		if (!user) {
			return null
		}

		return user
	}
}
