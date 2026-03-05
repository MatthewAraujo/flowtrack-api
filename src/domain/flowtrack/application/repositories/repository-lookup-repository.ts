export abstract class RepositoryLookupRepository {
	abstract findById(id: string): Promise<{ id: string } | null>
}
