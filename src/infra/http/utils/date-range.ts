import { BadRequestException } from '@nestjs/common'

export function parseDateRange(params: { from: string; to: string }) {
	const from = new Date(params.from)
	const to = new Date(params.to)

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
		throw new BadRequestException('Invalid date range')
	}

	return { from, to }
}
