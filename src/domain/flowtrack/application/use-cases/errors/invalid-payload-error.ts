import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidPayloadError extends Error implements UseCaseError {
	constructor(message: string) {
		super(message)
		this.name = 'InvalidPayloadError'
	}
}

