import { faker } from '@faker-js/faker'
import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import {
	PullRequestEvent,
	PullRequestEventProps,
} from '@/domain/flowtrack/enterprise/entities/pull-request-event'

export function makePullRequestEvent(
	override: Partial<PullRequestEventProps> = {},
	id?: UniqueEntityID,
) {
	return PullRequestEvent.create(
		{
			number: faker.number.int({ min: 1, max: 9999 }),
			title: faker.lorem.words(3),
			state: 'closed',
			isMerged: true,
			authorLogin: faker.internet.username(),
			createdAt: new Date(),
			closedAt: new Date(),
			mergedAt: new Date(),
			additions: faker.number.int({ min: 1, max: 200 }),
			deletions: faker.number.int({ min: 1, max: 200 }),
			changedFiles: faker.number.int({ min: 1, max: 20 }),
			...override,
		},
		id,
	)
}
