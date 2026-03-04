import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

export interface UserProps {
	name: string
	email: string
	password: string
	role: UserRole
	githubAccessToken?: string | null
}

export type UserRole = 'ENGINEERING_MANAGER' | 'TECH_LEAD' | 'DEVELOPER'

export class User extends Entity<UserProps> {
	get name() {
		return this.props.name
	}

	get email() {
		return this.props.email
	}

	get password() {
		return this.props.password
	}

	get role() {
		return this.props.role
	}

	get githubAccessToken() {
		return this.props.githubAccessToken ?? null
	}

	set githubAccessToken(value: string | null | undefined) {
		this.props.githubAccessToken = value ?? null
	}

	static create(props: UserProps, id?: UniqueEntityID) {
		const user = new User(props, id)

		return user
	}
}
