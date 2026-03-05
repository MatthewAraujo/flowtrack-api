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
		const lastManual = githubAccount?.lastManualSyncAt ?? null
		const lastSyncTime = Math.max(
			lastDaily ? lastDaily.getTime() : 0,
			lastManual ? lastManual.getTime() : 0,
		)

		const lastSync = lastSyncTime > 0 ? new Date(lastSyncTime).toISOString() : null
		const nextAllowed =
			lastSyncTime > 0 ? new Date(lastSyncTime + 24 * 60 * 60 * 1000).toISOString() : null

		return {
			last_synced_at: lastSync,
			window_days: 1,
			next_sync_at: nextAllowed,
		}
	}
}
