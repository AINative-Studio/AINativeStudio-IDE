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
var McpRegistryInputStorage_1;
import { Sequencer } from '../../../../base/common/async.js';
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
const MCP_ENCRYPTION_KEY_NAME = 'mcpEncryptionKey';
const MCP_ENCRYPTION_KEY_ALGORITHM = 'AES-GCM';
const MCP_ENCRYPTION_KEY_LEN = 256;
const MCP_ENCRYPTION_IV_LENGTH = 12; // 96 bits
const MCP_DATA_STORED_VERSION = 1;
const MCP_DATA_STORED_KEY = 'mcpInputs';
let McpRegistryInputStorage = class McpRegistryInputStorage extends Disposable {
    static { McpRegistryInputStorage_1 = this; }
    static { this.secretSequencer = new Sequencer(); }
    constructor(_scope, _target, _storageService, _secretStorageService, _logService) {
        super();
        this._scope = _scope;
        this._storageService = _storageService;
        this._secretStorageService = _secretStorageService;
        this._logService = _logService;
        this._secretsSealerSequencer = new Sequencer();
        this._getEncryptionKey = new Lazy(() => {
            return McpRegistryInputStorage_1.secretSequencer.queue(async () => {
                const existing = await this._secretStorageService.get(MCP_ENCRYPTION_KEY_NAME);
                if (existing) {
                    try {
                        const parsed = JSON.parse(existing);
                        return await crypto.subtle.importKey('jwk', parsed, MCP_ENCRYPTION_KEY_ALGORITHM, false, ['encrypt', 'decrypt']);
                    }
                    catch {
                        // fall through
                    }
                }
                const key = await crypto.subtle.generateKey({ name: MCP_ENCRYPTION_KEY_ALGORITHM, length: MCP_ENCRYPTION_KEY_LEN }, true, ['encrypt', 'decrypt']);
                const exported = await crypto.subtle.exportKey('jwk', key);
                await this._secretStorageService.set(MCP_ENCRYPTION_KEY_NAME, JSON.stringify(exported));
                return key;
            });
        });
        this._didChange = false;
        this._record = new Lazy(() => {
            const stored = this._storageService.getObject(MCP_DATA_STORED_KEY, this._scope);
            return stored?.version === MCP_DATA_STORED_VERSION ? { ...stored } : { version: MCP_DATA_STORED_VERSION, values: {} };
        });
        this._register(_storageService.onWillSaveState(() => {
            if (this._didChange) {
                this._storageService.store(MCP_DATA_STORED_KEY, {
                    version: MCP_DATA_STORED_VERSION,
                    values: this._record.value.values,
                    secrets: this._record.value.secrets,
                }, this._scope, _target);
                this._didChange = false;
            }
        }));
    }
    /** Deletes all collection data from storage. */
    clearAll() {
        this._record.value.values = {};
        this._record.value.secrets = undefined;
        this._record.value.unsealedSecrets = undefined;
        this._didChange = true;
    }
    /** Delete a single collection data from the storage. */
    async clear(inputKey) {
        const secrets = await this._unsealSecrets();
        delete this._record.value.values[inputKey];
        this._didChange = true;
        if (secrets.hasOwnProperty(inputKey)) {
            delete secrets[inputKey];
            await this._sealSecrets();
        }
    }
    /** Gets a mapping of saved input data. */
    async getMap() {
        const secrets = await this._unsealSecrets();
        return { ...this._record.value.values, ...secrets };
    }
    /** Updates the input data mapping. */
    async setPlainText(values) {
        Object.assign(this._record.value.values, values);
        this._didChange = true;
    }
    /** Updates the input secrets mapping. */
    async setSecrets(values) {
        const unsealed = await this._unsealSecrets();
        Object.assign(unsealed, values);
        await this._sealSecrets();
    }
    async _sealSecrets() {
        const key = await this._getEncryptionKey.value;
        return this._secretsSealerSequencer.queue(async () => {
            if (!this._record.value.unsealedSecrets || isEmptyObject(this._record.value.unsealedSecrets)) {
                this._record.value.secrets = undefined;
                return;
            }
            const toSeal = JSON.stringify(this._record.value.unsealedSecrets);
            const iv = crypto.getRandomValues(new Uint8Array(MCP_ENCRYPTION_IV_LENGTH));
            const encrypted = await crypto.subtle.encrypt({ name: MCP_ENCRYPTION_KEY_ALGORITHM, iv: iv.buffer }, key, new TextEncoder().encode(toSeal).buffer);
            const enc = encodeBase64(VSBuffer.wrap(new Uint8Array(encrypted)));
            this._record.value.secrets = { iv: encodeBase64(VSBuffer.wrap(iv)), value: enc };
            this._didChange = true;
        });
    }
    async _unsealSecrets() {
        if (!this._record.value.secrets) {
            return this._record.value.unsealedSecrets ??= {};
        }
        if (this._record.value.unsealedSecrets) {
            return this._record.value.unsealedSecrets;
        }
        try {
            const key = await this._getEncryptionKey.value;
            const iv = decodeBase64(this._record.value.secrets.iv);
            const encrypted = decodeBase64(this._record.value.secrets.value);
            const decrypted = await crypto.subtle.decrypt({ name: MCP_ENCRYPTION_KEY_ALGORITHM, iv: iv.buffer }, key, encrypted.buffer);
            const unsealedSecrets = JSON.parse(new TextDecoder().decode(decrypted));
            this._record.value.unsealedSecrets = unsealedSecrets;
            return unsealedSecrets;
        }
        catch (e) {
            this._logService.warn('Error unsealing MCP secrets', e);
            this._record.value.secrets = undefined;
        }
        return {};
    }
};
McpRegistryInputStorage = McpRegistryInputStorage_1 = __decorate([
    __param(2, IStorageService),
    __param(3, ISecretStorageService),
    __param(4, ILogService)
], McpRegistryInputStorage);
export { McpRegistryInputStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BSZWdpc3RyeUlucHV0U3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRzlHLE1BQU0sdUJBQXVCLEdBQUcsa0JBQWtCLENBQUM7QUFDbkQsTUFBTSw0QkFBNEIsR0FBRyxTQUFTLENBQUM7QUFDL0MsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUM7QUFDbkMsTUFBTSx3QkFBd0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxVQUFVO0FBQy9DLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDO0FBWWpDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTs7YUFDdkMsb0JBQWUsR0FBRyxJQUFJLFNBQVMs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