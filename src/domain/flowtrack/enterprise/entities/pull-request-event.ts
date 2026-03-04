import { Entity } from '@/core/entities/entity'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'

export interface PullRequestEventProps {
	number: number
	title: string
	state: string
	isMerged: boolean
	authorLogin?: string | null
	createdAt: Date
	closedAt?: Date | null
	mergedAt?: Date | null
	additions?: number | null
	deletions?: number | null
	changedFiles?: number | null
}

export class PullRequestEvent extends Entity<PullRequestEventProps> {
	get number() {
		return this.props.number
	}

	get title() {
		return this.props.title
	}

	get state() {
		return this.props.state
	}

	get isMerged() {
		return this.props.isMerged
	}

	get authorLogin() {
		return this.props.authorLogin ?? null
	}

	get createdAt() {
		return this.props.createdAt
	}

	get closedAt() {
		return this.props.closedAt ?? null
	}

	get mergedAt() {
		return this.props.mergedAt ?? null
	}

	get additions() {
		return this.props.additions ?? null
	}

	get deletions() {
		return this.props.deletions ?? null
	}

	get changedFiles() {
		return this.props.changedFiles ?? null
	}

	static create(props: PullRequestEventProps, id?: UniqueEntityID) {
		return new PullRequestEvent(props, id)
	}
}
