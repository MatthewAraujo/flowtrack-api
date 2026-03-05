import type { HttpException } from '@nestjs/common'

type ErrorConstructor<T extends Error = Error> = new (...args: never[]) => T

export function throwUseCaseError(
	error: Error,
	mappings: Array<[ErrorConstructor, (error: Error) => HttpException]>,
	defaultFactory: (error: Error) => HttpException,
): never {
	for (const [ctor, factory] of mappings) {
		if (error.constructor === ctor) {
			throw factory(error)
		}
	}

	throw defaultFactory(error)
}
