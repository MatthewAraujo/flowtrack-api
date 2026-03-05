import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NestInterceptor,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { NotAllowedError } from '@/core/errors/errors/not-allowed-error'
import { NotFoundError } from '@/domain/flowtrack/application/use-cases/errors/not-found-error'
import { WrongCredentialsError } from '@/domain/flowtrack/application/use-cases/errors/wrong-credentials-error'
import { UserAlreadyExistsError } from '@/domain/flowtrack/application/use-cases/errors/user-already-exists-error'

type EitherResult = {
	isLeft: () => boolean
	isRight: () => boolean
	value: unknown
}

function isEither(value: unknown): value is EitherResult {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as EitherResult).isLeft === 'function' &&
		typeof (value as EitherResult).isRight === 'function' &&
		'value' in (value as EitherResult)
	)
}

@Injectable()
export class UseCaseResultInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((value) => {
				if (!isEither(value)) {
					return value
				}

				if (value.isRight()) {
					return value.value
				}

				const error = value.value
				if (error instanceof NotAllowedError) {
					throw new ForbiddenException('Forbidden')
				}
				if (error instanceof NotFoundError) {
					throw new NotFoundException(error.message)
				}
				if (error instanceof WrongCredentialsError) {
					throw new UnauthorizedException(error.message)
				}
				if (error instanceof UserAlreadyExistsError) {
					throw new ConflictException(error.message)
				}

				const message = error instanceof Error ? error.message : 'Unexpected error'
				throw new BadRequestException(message)
			}),
		)
	}
}
