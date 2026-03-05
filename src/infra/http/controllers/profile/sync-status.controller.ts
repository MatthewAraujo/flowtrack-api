import { CurrentUser } from '@/infra/auth/current-user-decorator'
import { Roles } from '@/infra/authorization/roles'
import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

@Controller('/profile/sync/status')
@Roles('ENGINEERING_MANAGER', 'TECH_LEAD', 'DEVELOPER')
export class ProfileSyncStatusController {
	constructor(private prisma: PrismaService) {}

	@Get()
	async handle(@CurrentUser() user: { sub: string }) {
		const githubAccount = await this.prisma.gitHubAccount.findFirst({
			where: { userId: user.sub, provider: 'github' },
		})

		const lastDaily = githubAccount?.lastDailySyncAt ?? null
		const lastSync = lastDaily ? lastDaily.toISOString() : null
		const nextAllowed = lastDaily
			? new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000).toISOString()
			: null

		return {
			last_synced_at: lastSync,
			window_days: 1,
			next_sync_at: nextAllowed,
		}
	}
}
