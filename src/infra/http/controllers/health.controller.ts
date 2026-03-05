import { Public } from '@/infra/auth/public'
import { Controller, Get } from '@nestjs/common'

@Controller('/health')
export class HealthController {
	@Get()
	@Public()
	health() {
		return { status: 'ok' }
	}
}
