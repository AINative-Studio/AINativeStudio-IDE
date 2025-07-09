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
        // Void added this as a nice default for linux so you don't need to specify encryption provider
        if (isLinux && !app.commandLine.getSwitchValue('password-store')) {
            this.logService.trace('[EncryptionMainService] No password-store switch, defaulting to basic...');
            app.commandLine.appendSwitch('password-store', "basic" /* PasswordStoreCLIOption.basic */);
        }
        // if this commandLine switch is set, the user has opted in to using basic text encryption
        if (app.commandLine.getSwitchValue('password-store') === "basic" /* PasswordStoreCLIOption.basic */) {
            this.logService.trace('[EncryptionMainService] setting usePlainTextEncryption to true...');
            safeStorage.setUsePlainTextEncryption?.(true);
            this.logService.trace('[EncryptionMainService] set usePlainTextEncryption to true');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvbk1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2VuY3J5cHRpb24vZWxlY3Ryb24tbWFpbi9lbmNyeXB0aW9uTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsSUFBSSxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBU3RELE1BQU0sV0FBVyxHQUFnRixtQkFBbUIsQ0FBQztBQUU5RyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUdqQyxZQUMrQixVQUF1QjtRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBR3JELCtGQUErRjtRQUMvRixJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO1lBQ2xHLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLGdCQUFnQiw2Q0FBK0IsQ0FBQztRQUM5RSxDQUFDO1FBRUQsMEZBQTBGO1FBQzFGLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsK0NBQWlDLEVBQUUsQ0FBQztZQUN2RixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO1lBQzNGLFdBQVcsQ0FBQyx5QkFBeUIs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