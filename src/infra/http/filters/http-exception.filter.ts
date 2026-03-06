import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest()

		const status =
			exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

		const errorResponse = exception instanceof HttpException ? exception.getResponse() : null
		const method = request?.method
		const path = request?.originalUrl ?? request?.url
		const message =
			typeof errorResponse === 'string'
				? errorResponse
				: ((errorResponse as { message?: string })?.message ?? 'Unexpected error')

		if (exception instanceof HttpException) {
			this.logger.warn(
				JSON.stringify({
					method,
					path,
					statusCode: status,
					message,
				}),
			)
		} else if (exception instanceof Error) {
			this.logger.error(
				JSON.stringify({
					method,
					path,
					statusCode: status,
					message: exception.message,
				}),
				exception.stack,
			)
		} else {
			this.logger.error(
				JSON.stringify({
					method,
					path,
					statusCode: status,
					message: 'Unexpected error',
				}),
			)
		}

		response.status(status).json({
			statusCode: status,
			message,
			path,
			timestamp: new Date().toISOString(),
		})
	}
}
