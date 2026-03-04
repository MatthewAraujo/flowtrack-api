export abstract class TokenCipher {
	abstract encrypt(plain: string): Promise<string>
	abstract decrypt(ciphertext: string): Promise<string>
}
