import type { CacheRepository } from '@/infra/cache/cache-repository'

export async function getCachedJson<T>(
	cacheRepository: CacheRepository,
	cacheKey: string,
): Promise<T | null> {
	const cached = await cacheRepository.get(cacheKey)
	if (!cached) {
		return null
	}

	return JSON.parse(cached) as T
}

export async function setCachedJson(
	cacheRepository: CacheRepository,
	cacheKey: string,
	value: unknown,
	ttlSeconds: number,
): Promise<void> {
	await cacheRepository.set(cacheKey, JSON.stringify(value), ttlSeconds)
}
