import { faker } from '@faker-js/faker'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { CommitEvent, CommitEventProps } from '@/domain/flowtrack/enterprise/entities/commit-event'

export function makeCommitEvent(
	override: Partial<CommitEventProps> = {},
	id?: UniqueEntityID,
) {
	return CommitEvent.create(
		{
			sha: faker.git.commitSha(),
			authorLogin: faker.internet.username(),
			authorEmail: faker.internet.email(),
			message: faker.git.commitMessage(),
			committedAt: new Date(),
			...override,
		},
		id,
	)
}
