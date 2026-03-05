import { UniqueEntityID } from '@/core/entities/unique-entity-id'
import { Repository, RepositoryProps } from '@/domain/flowtrack/enterprise/entities/repository'
import { faker } from '@faker-js/faker'

export function makeRepository(override: Partial<RepositoryProps> = {}, id?: UniqueEntityID) {
	const repo = Repository.create(
		{
			provider: 'github',
			providerRepoId: faker.number.int({ min: 1, max: 999999 }).toString(),
			name: faker.word.noun(),
			fullName: `${faker.word.noun()}/${faker.word.noun()}`,
			isPrivate: false,
			ownerLogin: faker.internet.username(),
			defaultBranch: 'main',
			...override,
		},
		id,
	)

	return repo
}
