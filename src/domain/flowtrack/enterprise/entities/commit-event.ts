import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

export interface CommitEventProps {
	sha: string
	authorLogin?: string | null
	authorEmail?: string | null
	message?: string | null
	committedAt: Date
}

export class CommitEvent extends Entity<CommitEventProps> {
	get sha() {
		return this.props.sha
	}

	get authorLogin() {
		return this.props.authorLogin ?? null
	}

	get authorEmail() {
		return this.props.authorEmail ?? null
	}

	get message() {
		return this.props.message ?? null
	}

	get committedAt() {
		return this.props.committedAt
	}

	static create(props: CommitEventProps, id?: UniqueEntityID) {
		return new CommitEvent(props, id)
	}
}
