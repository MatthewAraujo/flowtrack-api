import { CacheRepository } from '@/infra/cache/cache-repository'

export class InMemoryCacheRepository implements CacheRepository {

	public items: Record<string, string> = {}
	async delete(key: string): Promise<void> {
		delete this.items[key]
	}

	async set(key: string, value: string, ttl?: number): Promise<void> {
		this.items[key] = value
	}

	async get(key: string): Promise<string | null> {
		return this.items[key] || null
	}
}
