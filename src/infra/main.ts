import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'
import { ConsoleLogger } from '@nestjs/common'
import { json } from 'express'

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: new ConsoleLogger('Bootstrap', {
		}),
		rawBody: true,
	})

	const configService = app.get(EnvService)
	const port = configService.get('PORT')

	// Configure JSON parser to preserve raw body for webhook signature verification
	app.use(
		json({
			verify: (req: any, res, buf) => {
				req.rawBody = buf
			},
		}),
	)

	await app.listen(port)
}
bootstrap()
