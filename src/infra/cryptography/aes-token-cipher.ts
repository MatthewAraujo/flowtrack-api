import { TokenCipher } from '@/domain/flowtrack/application/cryptography/token-cipher'
import { Injectable } from '@nestjs/common'
import { EnvService } from '@/infra/env/env.service'
import crypto from 'crypto'

@Injectable()
export class AesTokenCipher implements TokenCipher {
	constructor(private envService: EnvService) {}

	async encrypt(plain: string): Promise<string> {
		const key = this.getKey()
		const iv = crypto.randomBytes(12)
		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
		const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
		const tag = cipher.getAuthTag()
		return Buffer.concat([iv, tag, encrypted]).toString('base64')
	}

	async decrypt(ciphertext: string): Promise<string> {
		const key = this.getKey()
		const buffer = Buffer.from(ciphertext, 'base64')
		const iv = buffer.subarray(0, 12)
		const tag = buffer.subarray(12, 28)
		const data = buffer.subarray(28)
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
		decipher.setAuthTag(tag)
		const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
		return decrypted.toString('utf8')
	}

	private getKey() {
		const raw = this.envService.get('TOKEN_ENCRYPTION_KEY')
		const key = Buffer.from(raw, 'base64')
		if (key.length !== 32) {
			throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes base64')
		}
		return key
	}
}
