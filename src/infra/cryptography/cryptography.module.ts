import { Module } from '@nestjs/common'

import { Encrypter } from '@/domain/assistent/application/cryptography/encrypter'
import { HashComparer } from '@/domain/assistent/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/assistent/application/cryptography/hash-generator'
import { TokenCipher } from '@/domain/assistent/application/cryptography/token-cipher'

import { BcryptHasher } from './bcrypt-hasher'
import { JwtEncrypter } from './jwt-encrypter'
import { AesTokenCipher } from './aes-token-cipher'

@Module({
	providers: [
		{ provide: Encrypter, useClass: JwtEncrypter },
		{ provide: HashComparer, useClass: BcryptHasher },
		{ provide: HashGenerator, useClass: BcryptHasher },
		{ provide: TokenCipher, useClass: AesTokenCipher },
	],
	exports: [Encrypter, HashComparer, HashGenerator, TokenCipher],
})
export class CryptographyModule { }
