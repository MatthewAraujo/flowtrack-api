import { Controller, Get } from '@nestjs/common'
import { Public } from '@/infra/auth/public'

@Controller('/health')
export class HealthController {
	@Get()
	@Public()
	health() {
		return { status: 'ok' }
	}
}
