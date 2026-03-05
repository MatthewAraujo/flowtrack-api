import { Module } from '@nestjs/common'
import { EnvModule } from '../env/env.module'

import { Encrypter } from '@/domain/flowtrack/application/cryptography/encrypter'
import { HashComparer } from '@/domain/flowtrack/application/cryptography/hash-comparer'
import { HashGenerator } from '@/domain/flowtrack/application/cryptography/hash-generator'
import { TokenCipher } from '@/domain/flowtrack/application/cryptography/token-cipher'

import { AesTokenCipher } from './aes-token-cipher'
import { BcryptHasher } from './bcrypt-hasher'
import { JwtEncrypter } from './jwt-encrypter'

@Module({
	imports: [EnvModule],
	providers: [
		{ provide: Encrypter, useClass: JwtEncrypter },
		{ provide: HashComparer, useClass: BcryptHasher },
		{ provide: HashGenerator, useClass: BcryptHasher },
		{ provide: TokenCipher, useClass: AesTokenCipher },
	],
	exports: [Encrypter, HashComparer, HashGenerator, TokenCipher],
})
export class CryptographyModule {}
