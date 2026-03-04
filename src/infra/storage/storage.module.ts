import { Uploader } from '@/domain/flowtrack/application/storage/uploader'
import { Module } from '@nestjs/common'
import { EnvModule } from '../env/env.module'
// import { R2Storage } from './r2-storage'

@Module({
	imports: [EnvModule],
	providers: [

	],
	exports: [],
})
export class StorageModule { }
