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
import { SequencerByKey } from '../../../base/common/async.js';
import { IEncryptionService } from '../../encryption/common/encryptionService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IStorageService, InMemoryStorageService } from '../../storage/common/storage.js';
import { Emitter } from '../../../base/common/event.js';
import { ILogService } from '../../log/common/log.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Lazy } from '../../../base/common/lazy.js';
export const ISecretStorageService = createDecorator('secretStorageService');
let BaseSecretStorageService = class BaseSecretStorageService extends Disposable {
    constructor(_useInMemoryStorage, _storageService, _encryptionService, _logService) {
        super();
        this._useInMemoryStorage = _useInMemoryStorage;
        this._storageService = _storageService;
        this._encryptionService = _encryptionService;
        this._logService = _logService;
        this._storagePrefix = 'secret://';
        this.onDidChangeSecretEmitter = this._register(new Emitter());
        this.onDidChangeSecret = this.onDidChangeSecretEmitter.event;
        this._sequencer = new SequencerByKey();
        this._type = 'unknown';
        this._onDidChangeValueDisposable = this._register(new DisposableStore());
        this._lazyStorageService = new Lazy(() => this.initialize());
    }
    /**
     * @Note initialize must be called first so that this can be resolved properly
     * otherwise it will return 'unknown'.
     */
    get type() {
        return this._type;
    }
    get resolvedStorageService() {
        return this._lazyStorageService.value;
    }
    get(key) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] getting secret for key:', fullKey);
            const encrypted = storageService.get(fullKey, -1 /* StorageScope.APPLICATION */);
            if (!encrypted) {
                this._logService.trace('[secrets] no secret found for key:', fullKey);
                return undefined;
            }
            try {
                this._logService.trace('[secrets] decrypting gotten secret for key:', fullKey);
                // If the storage service is in-memory, we don't need to decrypt
                const result = this._type === 'in-memory'
                    ? encrypted
                    : await this._encryptionService.decrypt(encrypted);
                this._logService.trace('[secrets] decrypted secret for key:', fullKey);
                return result;
            }
            catch (e) {
                this._logService.error(e);
                this.delete(key);
                return undefined;
            }
        });
    }
    set(key, value) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            this._logService.trace('[secrets] encrypting secret for key:', key);
            let encrypted;
            try {
                // If the storage service is in-memory, we don't need to encrypt
                encrypted = this._type === 'in-memory'
                    ? value
                    : await this._encryptionService.encrypt(value);
            }
            catch (e) {
                this._logService.error(e);
                throw e;
            }
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] storing encrypted secret for key:', fullKey);
            storageService.store(fullKey, encrypted, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this._logService.trace('[secrets] stored encrypted secret for key:', fullKey);
        });
    }
    delete(key) {
        return this._sequencer.queue(key, async () => {
            const storageService = await this.resolvedStorageService;
            const fullKey = this.getKey(key);
            this._logService.trace('[secrets] deleting secret for key:', fullKey);
            storageService.remove(fullKey, -1 /* StorageScope.APPLICATION */);
            this._logService.trace('[secrets] deleted secret for key:', fullKey);
        });
    }
    async initialize() {
        let storageService;
        if (!this._useInMemoryStorage && await this._encryptionService.isEncryptionAvailable()) {
            this._logService.trace(`[SecretStorageService] Encryption is available, using persisted storage`);
            this._type = 'persisted';
            storageService = this._storageService;
        }
        else {
            // If we already have an in-memory storage service, we don't need to recreate it
            if (this._type === 'in-memory') {
                return this._storageService;
            }
            this._logService.trace('[SecretStorageService] Encryption is not available, falling back to in-memory storage');
            this._type = 'in-memory';
            storageService = this._register(new InMemoryStorageService());
        }
        this._onDidChangeValueDisposable.clear();
        this._onDidChangeValueDisposable.add(storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, undefined, this._onDidChangeValueDisposable)(e => {
            this.onDidChangeValue(e.key);
        }));
        return storageService;
    }
    reinitialize() {
        this._lazyStorageService = new Lazy(() => this.initialize());
    }
    onDidChangeValue(key) {
        if (!key.startsWith(this._storagePrefix)) {
            return;
        }
        const secretKey = key.slice(this._storagePrefix.length);
        this._logService.trace(`[SecretStorageService] Notifying change in value for secret: ${secretKey}`);
        this.onDidChangeSecretEmitter.fire(secretKey);
    }
    getKey(key) {
        return `${this._storagePrefix}${key}`;
    }
};
BaseSecretStorageService = __decorate([
    __param(1, IStorageService),
    __param(2, IEncryptionService),
    __param(3, ILogService)
], BaseSecretStorageService);
export { BaseSecretStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NlY3JldHMvY29tbW9uL3NlY3JldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixFQUErQixNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBYzdGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQWN2RCxZQUNrQixtQkFBNEIsRUFDNUIsZUFBd0MsRUFDckMsa0JBQWdELEVBQ3ZELFdBQTJDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBTFMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFTO1FBQ3BCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUMzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBZnhDLG1CQUFjLEdBQUcsV0FB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