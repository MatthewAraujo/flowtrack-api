import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'
import { ConsoleLogger } from '@nestjs/common'
import { json } from 'express'
import { HttpExceptionFilter } from './http/filters/http-exception.filter'

async function bootstrap() {
	const bootstrapLogger = new ConsoleLogger('Bootstrap')
	const httpLogger = new ConsoleLogger('HTTP')
	const app = await NestFactory.create(AppModule, {
		logger: bootstrapLogger,
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

	app.use((req, res, next) => {
		const start = Date.now()
		res.on('finish', () => {
			httpLogger.log(
				JSON.stringify({
					method: req.method,
					path: req.originalUrl ?? req.url,
					statusCode: res.statusCode,
					durationMs: Date.now() - start,
				}),
			)
		})
		next()
	})

	app.useGlobalFilters(new HttpExceptionFilter())

	await app.listen(port)
}
bootstrap()
