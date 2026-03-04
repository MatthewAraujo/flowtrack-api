import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_PUBLIC_KEY } from './public'
import { IS_WEBHOOK_KEY } from './webhook'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor(private reflector: Reflector) {
		super()
	}

	canActivate(context: ExecutionContext) {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		const isWebhook = this.reflector.getAllAndOverride<boolean>(IS_WEBHOOK_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (isPublic || isWebhook) {
			return true
		}

		return super.canActivate(context)
	}
}
