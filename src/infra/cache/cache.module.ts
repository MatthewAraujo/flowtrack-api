import { Module } from '@nestjs/common'
import { EnvModule } from '../env/env.module'
import { CacheRepository } from './cache-repository'
import { CacheMetricsService } from './cache-metrics.service'
import { RedisCacheRepository } from './redis/redis-cache-repository'
import { RedisService } from './redis/redis.service'
@Module({
	imports: [EnvModule],
	providers: [
		RedisService,
		CacheMetricsService,
		{
			provide: CacheRepository,
			useClass: RedisCacheRepository,
		},
	],
	exports: [CacheRepository, RedisService, CacheMetricsService],
})
export class CacheModule {}
