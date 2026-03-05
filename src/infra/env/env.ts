import { z } from 'zod'

export const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),
	REDIS_HOST: z.string().optional().default('127.0.0.1'),
	REDIS_PORT: z.coerce.number().optional().default(6379),
	REDIS_DB: z.coerce.number().optional().default(0),
	PORT: z.coerce.number().optional().default(3333),
	GITHUB_CLIENT_ID: z.string(),
	GITHUB_CLIENT_SECRET: z.string(),
	GITHUB_OAUTH_CALLBACK_URL: z.string().url(),
	GITHUB_OAUTH_UI_REDIRECT_URL: z.string().url(),
	CORS_ORIGINS: z.string().optional(),
	TOKEN_ENCRYPTION_KEY: z.string(),
})

export type Env = z.infer<typeof envSchema>
