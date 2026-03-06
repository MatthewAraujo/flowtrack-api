import { Injectable } from '@nestjs/common'

import { RedisService } from '@/infra/cache/redis/redis.service'

@Injectable()
export class CacheMetricsService {
	constructor(private redis: RedisService) {}

	async recordHit(metricKey: string) {
		await this.redis.incr(`cache:${metricKey}:hit`)
	}

	async recordMiss(metricKey: string) {
		await this.redis.incr(`cache:${metricKey}:miss`)
	}
}
