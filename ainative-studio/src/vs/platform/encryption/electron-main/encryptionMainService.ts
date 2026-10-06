/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { safeStorage as safeStorageElectron, app } from 'electron';
import { isMacintosh, isWindows, isLinux } from '../../../base/common/platform.js';
import { KnownStorageProvider, IEncryptionMainService, PasswordStoreCLIOption } from '../common/encryptionService.js';
import { ILogService } from '../../log/common/log.js';

// These APIs are currently only supported in our custom build of electron so
// we need to guard against them not being available.
interface ISafeStorageAdditionalAPIs {
	setUsePlainTextEncryption(usePlainText: boolean): void;
	getSelectedStorageBackend(): string;
}

const safeStorage: typeof import('electron').safeStorage & Partial<ISafeStorageAdditionalAPIs> = safeStorageElectron;

export class EncryptionMainService implements IEncryptionMainService {
	_serviceBrand: undefined;

	constructor(
		@ILogService private readonly logService: ILogService
	) {

		// If the user explicitly opted in to basic (plaintext-equivalent) encryption via the
		// password-store command line switch, honor that.
		if (app.commandLine.getSwitchValue('password-store') === PasswordStoreCLIOption.basic) {
			this.logService.trace('[EncryptionMainService] setting usePlainTextEncryption to true (explicit password-store=basic)...');
			safeStorage.setUsePlainTextEncryption?.(true);
			this.logService.trace('[EncryptionMainService] set usePlainTextEncryption to true');
			return;
		}

		// On Linux, without an explicit opt-in, let safeStorage attempt a real OS keyring
		// (libsecret/kwallet) first rather than forcing plaintext-equivalent storage by default.
		// A prior version of this code unconditionally appended `--password-store=basic` here
		// whenever no switch was set, which silently weakened every credential this app stores
		// (including AINative Cloud session tokens) to plaintext-equivalent protection with no
		// user consent and no attempt at the real keyring. If the real keyring genuinely isn't
		// available, safeStorage.isEncryptionAvailable() will reflect that and callers relying
		// on IEncryptionService.isEncryptionAvailable() can decide how to handle it (today: a
		// trace log here; a user-facing consent flow before falling back is tracked separately).
		if (isLinux && !safeStorage.isEncryptionAvailable()) {
			this.logService.warn('[EncryptionMainService] No OS keyring available on Linux and no explicit password-store switch was set; secrets will be stored without real encryption until one is configured (see --password-store).');
		}
	}

	async encrypt(value: string): Promise<string> {
		this.logService.trace('[EncryptionMainService] Encrypting value...');
		try {
			const result = JSON.stringify(safeStorage.encryptString(value));
			this.logService.trace('[EncryptionMainService] Encrypted value.');
			return result;
		} catch (e) {
			this.logService.error(e);
			throw e;
		}
	}

	async decrypt(value: string): Promise<string> {
		let parsedValue: { data: string };
		try {
			parsedValue = JSON.parse(value);
			if (!parsedValue.data) {
				throw new Error(`[EncryptionMainService] Invalid encrypted value: ${value}`);
			}
			const bufferToDecrypt = Buffer.from(parsedValue.data);

			this.logService.trace('[EncryptionMainService] Decrypting value...');
			const result = safeStorage.decryptString(bufferToDecrypt);
			this.logService.trace('[EncryptionMainService] Decrypted value.');
			return result;
		} catch (e) {
			this.logService.error(e);
			throw e;
		}
	}

	isEncryptionAvailable(): Promise<boolean> {
		this.logService.trace('[EncryptionMainService] Checking if encryption is available...');
		const result = safeStorage.isEncryptionAvailable();
		this.logService.trace('[EncryptionMainService] Encryption is available: ', result);
		return Promise.resolve(result);
	}

	getKeyStorageProvider(): Promise<KnownStorageProvider> {
		if (isWindows) {
			return Promise.resolve(KnownStorageProvider.dplib);
		}
		if (isMacintosh) {
			return Promise.resolve(KnownStorageProvider.keychainAccess);
		}
		if (safeStorage.getSelectedStorageBackend) {
			try {
				this.logService.trace('[EncryptionMainService] Getting selected storage backend...');
				const result = safeStorage.getSelectedStorageBackend() as KnownStorageProvider;
				this.logService.trace('[EncryptionMainService] Selected storage backend: ', result);
				return Promise.resolve(result);
			} catch (e) {
				this.logService.error(e);
			}
		}
		return Promise.resolve(KnownStorageProvider.unknown);
	}

	async setUsePlainTextEncryption(): Promise<void> {
		if (isWindows) {
			throw new Error('Setting plain text encryption is not supported on Windows.');
		}

		if (isMacintosh) {
			throw new Error('Setting plain text encryption is not supported on macOS.');
		}

		if (!safeStorage.setUsePlainTextEncryption) {
			throw new Error('Setting plain text encryption is not supported.');
		}

		this.logService.trace('[EncryptionMainService] Setting usePlainTextEncryption to true...');
		safeStorage.setUsePlainTextEncryption(true);
		this.logService.trace('[EncryptionMainService] Set usePlainTextEncryption to true');
	}
}
