import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest()

		const status =
			exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

		const errorResponse = exception instanceof HttpException ? exception.getResponse() : null

		response.status(status).json({
			statusCode: status,
			message:
				typeof errorResponse === 'string'
					? errorResponse
					: ((errorResponse as { message?: string })?.message ?? 'Unexpected error'),
			path: request?.url,
			timestamp: new Date().toISOString(),
		})
	}
}
