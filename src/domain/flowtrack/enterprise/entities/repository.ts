import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

export interface RepositoryProps {
	provider: 'github'
	providerRepoId: string
	name: string
	fullName: string
	isPrivate: boolean
	ownerLogin: string
	defaultBranch?: string | null
	createdAt?: Date
	updatedAt?: Date
}

export class Repository extends Entity<RepositoryProps> {
	get provider() {
		return this.props.provider
	}

	get providerRepoId() {
		return this.props.providerRepoId
	}

	get name() {
		return this.props.name
	}

	get fullName() {
		return this.props.fullName
	}

	get isPrivate() {
		return this.props.isPrivate
	}

	get ownerLogin() {
		return this.props.ownerLogin
	}

	get defaultBranch() {
		return this.props.defaultBranch ?? null
	}

	set defaultBranch(value: string | null | undefined) {
		this.props.defaultBranch = value ?? null
		this.props.updatedAt = new Date()
	}

	get createdAt() {
		return this.props.createdAt ?? new Date()
	}

	get updatedAt() {
		return this.props.updatedAt ?? new Date()
	}

	static create(props: RepositoryProps, id?: UniqueEntityID) {
		const repo = new Repository(
			{
				...props,
				createdAt: props.createdAt ?? new Date(),
				updatedAt: props.updatedAt ?? new Date(),
			},
			id,
		)

		return repo
	}
}
