import { Module } from '@nestjs/common'
import { CacheModule } from '@/infra/cache/cache.module'
import { DatabaseModule } from '@/infra/database/database.module'
import { MetricsService } from './metrics.service'

@Module({
	imports: [DatabaseModule, CacheModule],
	providers: [MetricsService],
	exports: [MetricsService],
})
export class MetricsModule {}
