export abstract class InstallationTokenGenerator {
	abstract generate(installationId: bigint): Promise<string>
}

