import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { UserFactory } from 'test/factories/make-user'

describe('List Repos (E2E)', () => {
	let app: INestApplication
	let userFactory: UserFactory
	let prisma: PrismaService

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule, DatabaseModule],
			providers: [UserFactory],
		}).compile()

		app = moduleRef.createNestApplication()
		userFactory = moduleRef.get(UserFactory)
		prisma = moduleRef.get(PrismaService)

		await app.init()
	})

	test('[GET] /repos returns paginated results and orgs', async () => {
		const user = await userFactory.makePrismaUser({
			email: 'repos@example.com',
			password: await hash('123456', 8),
		})

		const repo = await prisma.repository.create({
			data: {
				id: randomUUID(),
				provider: 'github',
				providerRepoId: '1001',
				name: 'alpha',
				fullName: 'acme/alpha',
				isPrivate: false,
				ownerLogin: 'acme',
				defaultBranch: 'main',
			},
		})

		await prisma.userRepositoryAccess.create({
			data: {
				id: randomUUID(),
				userId: user.id.toString(),
				repositoryId: repo.id,
			},
		})

		const session = await request(app.getHttpServer()).post('/sessions').send({
			email: 'repos@example.com',
			password: '123456',
		})

		const token = session.body.access_token

		const response = await request(app.getHttpServer())
			.get('/repos?page=1&pageSize=10')
			.set('Authorization', `Bearer ${token}`)

		expect(response.statusCode).toBe(200)
		expect(response.body.meta).toEqual({
			total: 1,
			page: 1,
			pageSize: 10,
		})
		expect(response.body.items).toHaveLength(1)
		expect(response.body.items[0].full_name).toBe('acme/alpha')
		expect(response.body.orgs).toContain('acme')
	})

	test('[GET] /repos supports owner filtering', async () => {
		const user = await userFactory.makePrismaUser({
			email: 'repos-filter@example.com',
			password: await hash('123456', 8),
		})

		const repoA = await prisma.repository.create({
			data: {
				id: randomUUID(),
				provider: 'github',
				providerRepoId: '2001',
				name: 'alpha',
				fullName: 'acme/alpha',
				isPrivate: false,
				ownerLogin: 'acme',
				defaultBranch: 'main',
			},
		})

		const repoB = await prisma.repository.create({
			data: {
				id: randomUUID(),
				provider: 'github',
				providerRepoId: '2002',
				name: 'bravo',
				fullName: 'beta/bravo',
				isPrivate: false,
				ownerLogin: 'beta',
				defaultBranch: 'main',
			},
		})

		await prisma.userRepositoryAccess.createMany({
			data: [
				{
					id: randomUUID(),
					userId: user.id.toString(),
					repositoryId: repoA.id,
				},
				{
					id: randomUUID(),
					userId: user.id.toString(),
					repositoryId: repoB.id,
				},
			],
		})

		const session = await request(app.getHttpServer()).post('/sessions').send({
			email: 'repos-filter@example.com',
			password: '123456',
		})

		const token = session.body.access_token

		const response = await request(app.getHttpServer())
			.get('/repos?owner=acme&page=1&pageSize=10')
			.set('Authorization', `Bearer ${token}`)

		expect(response.statusCode).toBe(200)
		expect(response.body.items).toHaveLength(1)
		expect(response.body.items[0].full_name).toBe('acme/alpha')
		expect(response.body.meta.total).toBe(1)
	})
})
