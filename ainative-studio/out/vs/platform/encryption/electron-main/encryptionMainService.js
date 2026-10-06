/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { safeStorage as safeStorageElectron, app } from 'electron';
import { isMacintosh, isWindows, isLinux } from '../../../base/common/platform.js';
import { ILogService } from '../../log/common/log.js';
const safeStorage = safeStorageElectron;
let EncryptionMainService = class EncryptionMainService {
    constructor(logService) {
        this.logService = logService;
        // If the user explicitly opted in to basic (plaintext-equivalent) encryption via the
        // password-store command line switch, honor that.
        if (app.commandLine.getSwitchValue('password-store') === "basic" /* PasswordStoreCLIOption.basic */) {
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
    async encrypt(value) {
        this.logService.trace('[EncryptionMainService] Encrypting value...');
        try {
            const result = JSON.stringify(safeStorage.encryptString(value));
            this.logService.trace('[EncryptionMainService] Encrypted value.');
            return result;
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    async decrypt(value) {
        let parsedValue;
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
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    isEncryptionAvailable() {
        this.logService.trace('[EncryptionMainService] Checking if encryption is available...');
        const result = safeStorage.isEncryptionAvailable();
        this.logService.trace('[EncryptionMainService] Encryption is available: ', result);
        return Promise.resolve(result);
    }
    getKeyStorageProvider() {
        if (isWindows) {
            return Promise.resolve("dpapi" /* KnownStorageProvider.dplib */);
        }
        if (isMacintosh) {
            return Promise.resolve("keychain_access" /* KnownStorageProvider.keychainAccess */);
        }
        if (safeStorage.getSelectedStorageBackend) {
            try {
                this.logService.trace('[EncryptionMainService] Getting selected storage backend...');
                const result = safeStorage.getSelectedStorageBackend();
                this.logService.trace('[EncryptionMainService] Selected storage backend: ', result);
                return Promise.resolve(result);
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        return Promise.resolve("unknown" /* KnownStorageProvider.unknown */);
    }
    async setUsePlainTextEncryption() {
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
};
EncryptionMainService = __decorate([
    __param(0, ILogService)
], EncryptionMainService);
export { EncryptionMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvbk1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbmNyeXB0aW9uL2VsZWN0cm9uLW1haW4vZW5jcnlwdGlvbk1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLElBQUksbUJBQW1CLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQVN0RCxNQUFNLFdBQVcsR0FBZ0YsbUJBQW1CLENBQUM7QUFFOUcsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFHakMsWUFDK0IsVUFBdUI7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUdyRCxxRkFBcUY7UUFDckYsa0RBQWtEO1FBQ2xELElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsK0NBQWlDLEVBQUUsQ0FBQztZQUN2RixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxtR0FBbUcsQ0FBQyxDQUFDO1lBQzNILFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7WUFDcEYsT0FBTztRQUNSLENBQUM7UUFFRCxrRkFBa0Y7UUFDbEYseUZBQXlGO1FBQ3pGLHNGQUFzRjtRQUN0Rix1RkFBdUY7UUFDdkYsdUZBQXVGO1FBQ3ZGLHVGQUF1RjtRQUN2Rix1RkFBdUY7UUFDdkYs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