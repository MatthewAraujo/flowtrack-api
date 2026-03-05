import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'
import { faker } from '@faker-js/faker'

import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

const PASSWORD_PLAIN = 'Flowtrack123!'

const ROLES = [
	{ id: 'role-engineering-manager', name: 'ENGINEERING_MANAGER' },
	{ id: 'role-tech-lead', name: 'TECH_LEAD' },
	{ id: 'role-developer', name: 'DEVELOPER' },
]

const USERS = [
	{
		id: 'user-manager',
		name: 'Morgan Manager',
		email: 'manager@flowtrack.local',
		role: 'ENGINEERING_MANAGER',
	},
	{
		id: 'user-lead',
		name: 'Taylor Lead',
		email: 'lead@flowtrack.local',
		role: 'TECH_LEAD',
	},
	{
		id: 'user-dev',
		name: 'Jordan Dev',
		email: 'dev@flowtrack.local',
		role: 'DEVELOPER',
	},
]

const REPOSITORIES = [
	{
		id: 'repo-core-platform',
		provider: 'github',
		providerRepoId: '10001',
		name: 'flowtrack-core',
		fullName: 'flowtrack/flowtrack-core',
		ownerLogin: 'flowtrack',
		defaultBranch: 'main',
		isPrivate: false,
	},
	{
		id: 'repo-ui',
		provider: 'github',
		providerRepoId: '10002',
		name: 'flowtrack-ui',
		fullName: 'flowtrack/flowtrack-ui',
		ownerLogin: 'flowtrack',
		defaultBranch: 'main',
		isPrivate: false,
	},
]

function daysAgo(days: number) {
	const now = Date.now()
	return new Date(now - days * 24 * 60 * 60 * 1000)
}

async function seedRoles() {
	await Promise.all(
		ROLES.map((role) =>
			prisma.role.upsert({
				where: { name: role.name },
				create: role,
				update: {},
			}),
		),
	)
}

async function seedUsers() {
	const hashedPassword = await hash(PASSWORD_PLAIN, 8)

	await Promise.all(
		USERS.map((user) =>
			prisma.user.upsert({
				where: { email: user.email },
				create: {
					id: user.id,
					name: user.name,
					email: user.email,
					password: hashedPassword,
					role: user.role,
				},
				update: {
					name: user.name,
					password: hashedPassword,
					role: user.role,
				},
			}),
		),
	)

	const rolesByName = await prisma.role.findMany()
	const roleMap = new Map(rolesByName.map((role) => [role.name, role.id]))

	await Promise.all(
		USERS.map((user) => {
			const roleId = roleMap.get(user.role)
			if (!roleId) {
				return Promise.resolve()
			}

			return prisma.userRole.upsert({
				where: {
					userId_roleId: {
						userId: user.id,
						roleId,
					},
				},
				create: {
					id: randomUUID(),
					userId: user.id,
					roleId,
				},
				update: {},
			})
		}),
	)

	await Promise.all(
		USERS.map((user) =>
			prisma.gitHubAccount.upsert({
				where: {
					provider_login: {
						provider: 'github',
						login: user.email.split('@')[0],
					},
				},
				create: {
					id: `gh-${user.id}`,
					userId: user.id,
					provider: 'github',
					login: user.email.split('@')[0],
					email: user.email,
					accessToken: 'seeded-access-token',
					lastFullSyncAt: daysAgo(3),
					lastDailySyncAt: daysAgo(1),
					lastManualSyncAt: daysAgo(1),
				},
				update: {
					email: user.email,
				},
			}),
		),
	)
}

async function seedRepositories() {
	await Promise.all(
		REPOSITORIES.map((repo) =>
			prisma.repository.upsert({
				where: {
					provider_providerRepoId: {
						provider: repo.provider,
						providerRepoId: repo.providerRepoId,
					},
				},
				create: repo,
				update: {
					name: repo.name,
					fullName: repo.fullName,
					ownerLogin: repo.ownerLogin,
					defaultBranch: repo.defaultBranch,
					isPrivate: repo.isPrivate,
				},
			}),
		),
	)

	const accessEntries = [
		{ userId: USERS[0].id, repositoryId: REPOSITORIES[0].id },
		{ userId: USERS[0].id, repositoryId: REPOSITORIES[1].id },
		{ userId: USERS[1].id, repositoryId: REPOSITORIES[0].id },
		{ userId: USERS[2].id, repositoryId: REPOSITORIES[1].id },
	]

	await Promise.all(
		accessEntries.map((entry) =>
			prisma.userRepositoryAccess.upsert({
				where: {
					userId_repositoryId: {
						userId: entry.userId,
						repositoryId: entry.repositoryId,
					},
				},
				create: {
					id: randomUUID(),
					userId: entry.userId,
					repositoryId: entry.repositoryId,
				},
				update: {},
			}),
		),
	)
}

async function seedActivity() {
	faker.seed(42)

	const commitEvents = Array.from({ length: 36 }).map((_, index) => {
		const repo = index % 2 === 0 ? REPOSITORIES[0] : REPOSITORIES[1]
		const author = index % 3 === 0 ? USERS[2] : USERS[1]

		return {
			id: `commit-${repo.id}-${index}`,
			repositoryId: repo.id,
			sha: faker.git.commitSha(),
			authorLogin: author.email.split('@')[0],
			authorEmail: author.email,
			message: faker.git.commitMessage(),
			committedAt: daysAgo(1 + index),
		}
	})

	for (const commit of commitEvents) {
		await prisma.commitEvent.upsert({
			where: {
				repositoryId_sha: {
					repositoryId: commit.repositoryId,
					sha: commit.sha,
				},
			},
			create: commit,
			update: {
				message: commit.message,
				committedAt: commit.committedAt,
			},
		})
	}

	const pullEvents = Array.from({ length: 10 }).map((_, index) => {
		const repo = index % 2 === 0 ? REPOSITORIES[0] : REPOSITORIES[1]
		const createdAt = daysAgo(20 - index)
		const merged = index % 4 !== 0
		const closedAt = merged ? daysAgo(10 - index) : daysAgo(8 - index)

		return {
			id: `pr-${repo.id}-${index + 1}`,
			repositoryId: repo.id,
			number: index + 1,
			githubId: BigInt(9000 + index),
			title: `Seeded PR ${index + 1}`,
			state: merged ? 'closed' : 'closed',
			isMerged: merged,
			authorLogin: USERS[1].email.split('@')[0],
			createdAt,
			closedAt,
			mergedAt: merged ? closedAt : null,
			updatedAt: closedAt,
			additions: 120 + index * 7,
			deletions: 45 + index * 3,
			changedFiles: 5 + (index % 3),
		}
	})

	for (const pull of pullEvents) {
		await prisma.pullRequestEvent.upsert({
			where: {
				repositoryId_number: {
					repositoryId: pull.repositoryId,
					number: pull.number,
				},
			},
			create: pull,
			update: {
				state: pull.state,
				isMerged: pull.isMerged,
				closedAt: pull.closedAt,
				mergedAt: pull.mergedAt,
				additions: pull.additions,
				deletions: pull.deletions,
				changedFiles: pull.changedFiles,
			},
		})
	}

	const reviewEvents = Array.from({ length: 12 }).map((_, index) => {
		const repo = index % 2 === 0 ? REPOSITORIES[0] : REPOSITORIES[1]
		const state = index % 3 === 0 ? 'APPROVED' : 'COMMENTED'

		return {
			id: `review-${repo.id}-${index + 1}`,
			repositoryId: repo.id,
			pullNumber: (index % 5) + 1,
			githubId: BigInt(12000 + index),
			reviewerLogin: USERS[0].email.split('@')[0],
			state,
			submittedAt: daysAgo(5 + index),
		}
	})

	for (const review of reviewEvents) {
		await prisma.reviewEvent.upsert({
			where: {
				repositoryId_githubId: {
					repositoryId: review.repositoryId,
					githubId: review.githubId,
				},
			},
			create: review,
			update: {
				state: review.state,
				submittedAt: review.submittedAt,
			},
		})
	}
}

async function main() {
	await seedRoles()
	await seedUsers()
	await seedRepositories()
	await seedActivity()
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (error) => {
		console.error(error)
		await prisma.$disconnect()
		process.exit(1)
	})
