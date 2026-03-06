import { Module } from '@nestjs/common'

import { CacheModule } from '@/infra/cache/cache.module'
import { RateLimitService } from './rate-limit.service'

@Module({
	imports: [CacheModule],
	providers: [RateLimitService],
	exports: [RateLimitService],
})
export class RateLimitModule {}
