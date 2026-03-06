import { Injectable } from '@nestjs/common'

import { RedisService } from '@/infra/cache/redis/redis.service'

@Injectable()
export class RateLimitService {
	constructor(private redis: RedisService) {}

	async consume(key: string, limit: number, windowSeconds: number) {
		const count = await this.redis.incr(key)

		if (count === 1) {
			await this.redis.expire(key, windowSeconds)
		}

		const ttl = await this.redis.ttl(key)
		const resetAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null

		return {
			allowed: count <= limit,
			remaining: Math.max(0, limit - count),
			resetAt,
			count,
		}
	}
}
