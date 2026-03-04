export interface GitHubRequestParams {
  url: string
  headers?: Record<string, string>
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

export interface GitHubResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export abstract class GitHubClient {
  abstract request<T = unknown>(
    params: GitHubRequestParams,
  ): Promise<GitHubResponse<T>>
}

