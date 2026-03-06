import { AppModule } from '@/infra/app.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { hash } from 'bcryptjs'
import request from 'supertest'
import { randomUUID } from 'node:crypto'
import { UserFactory } from 'test/factories/make-user'

describe('Workspace flow (E2E)', () => {
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

	test('manager invites developer who joins workspace', async () => {
		const managerEmail = `manager-${randomUUID()}@example.com`
		const devEmail = `dev-${randomUUID()}@example.com`

		await userFactory.makePrismaUser({
			email: managerEmail,
			password: await hash('123456', 8),
		})
		const developer = await userFactory.makePrismaUser({
			email: devEmail,
			password: await hash('123456', 8),
		})

		const managerSession = await request(app.getHttpServer()).post('/sessions').send({
			email: managerEmail,
			password: '123456',
		})
		const managerToken = managerSession.body.access_token

		const createWorkspace = await request(app.getHttpServer())
			.post('/workspaces')
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ name: 'Atlas' })

		expect(createWorkspace.statusCode).toBeGreaterThanOrEqual(200)
		const workspaceId = createWorkspace.body.id

		const inviteResponse = await request(app.getHttpServer())
			.post(`/workspaces/${workspaceId}/invites`)
			.set('Authorization', `Bearer ${managerToken}`)
			.send({ email: devEmail, role: 'DEVELOPER' })

		expect(inviteResponse.statusCode).toBeGreaterThanOrEqual(200)
		const acceptUrl = inviteResponse.body.accept_url as string
		const token = acceptUrl.split('token=')[1]

		const devSession = await request(app.getHttpServer()).post('/sessions').send({
			email: devEmail,
			password: '123456',
		})
		const devToken = devSession.body.access_token

		const acceptInvite = await request(app.getHttpServer())
			.post(`/invites/${token}/accept`)
			.set('Authorization', `Bearer ${devToken}`)

		expect(acceptInvite.statusCode).toBeGreaterThanOrEqual(200)

		const members = await request(app.getHttpServer())
			.get(`/workspaces/${workspaceId}/members`)
			.set('Authorization', `Bearer ${managerToken}`)

		expect(members.statusCode).toBe(200)
		const memberIds = members.body.items.map((member: { user_id: string }) => member.user_id)
		expect(memberIds).toContain(developer.id.toString())

		const dashboard = await request(app.getHttpServer())
			.get(`/workspaces/${workspaceId}/dashboard?window=7d`)
			.set('Authorization', `Bearer ${managerToken}`)

		expect(dashboard.statusCode).toBe(200)
		expect(dashboard.body.window).toBe('7d')
	})
})
