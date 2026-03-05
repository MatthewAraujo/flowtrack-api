import { ConsoleLogger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { json } from 'express'
import { AppModule } from './app.module'
import { EnvService } from './env/env.service'
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
	const uiRedirectUrl = configService.get('GITHUB_OAUTH_UI_REDIRECT_URL')
	const corsOriginsRaw = configService.get('CORS_ORIGINS')
	const defaultOrigins = new Set<string>([
		new URL(uiRedirectUrl).origin,
		'http://localhost:3000',
	])
	const allowedOrigins = new Set(defaultOrigins)
	if (corsOriginsRaw) {
		const extraOrigins = corsOriginsRaw
			.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean)
		for (const origin of extraOrigins) {
			allowedOrigins.add(origin)
		}
	}

	app.enableCors({
		origin: (origin, callback) => {
			if (!origin) {
				return callback(null, true)
			}
			if (allowedOrigins.has(origin)) {
				return callback(null, true)
			}
			return callback(new Error(`CORS blocked for origin: ${origin}`), false)
		},
		credentials: true,
	})

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
