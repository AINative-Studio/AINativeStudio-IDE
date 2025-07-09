/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { BaseSecretStorageService } from '../../common/secrets.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
class TestEncryptionService {
    constructor() {
        this.encryptedPrefix = 'encrypted+'; // prefix to simulate encryption
    }
    setUsePlainTextEncryption() {
        return Promise.resolve();
    }
    getKeyStorageProvider() {
        return Promise.resolve("basic_text" /* KnownStorageProvider.basicText */);
    }
    encrypt(value) {
        return Promise.resolve(this.encryptedPrefix + value);
    }
    decrypt(value) {
        return Promise.resolve(value.substring(this.encryptedPrefix.length));
    }
    isEncryptionAvailable() {
        return Promise.resolve(true);
    }
}
class TestNoEncryptionService {
    setUsePlainTextEncryption() {
        throw new Error('Method not implemented.');
    }
    getKeyStorageProvider() {
        throw new Error('Method not implemented.');
    }
    encrypt(value) {
        throw new Error('Method not implemented.');
    }
    decrypt(value) {
        throw new Error('Method not implemented.');
    }
    isEncryptionAvailable() {
        return Promise.resolve(false);
    }
}
suite('secrets', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('BaseSecretStorageService useInMemoryStorage=true', () => {
        let service;
        let spyEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyEncryptionService = sandbox.spy(new TestEncryptionService());
            service = store.add(new BaseSecretStorageService(true, store.add(new InMemoryStorageService()), spyEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'in-memory');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyEncryptionService.encrypt.callCount, 0);
            assert.strictEqual(spyEncryptionService.decrypt.callCount, 0);
        });
        test('delete', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            await service.delete(key);
            const result = await service.get(key);
            assert.strictEqual(result, undefined);
        });
        test('onDidChangeSecret', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            let eventFired = false;
            store.add(service.onDidChangeSecret((changedKey) => {
                assert.strictEqual(changedKey, key);
                eventFired = true;
            }));
            await service.set(key, value);
            assert.strictEqual(eventFired, true);
        });
    });
    suite('BaseSecretStorageService useInMemoryStorage=false', () => {
        let service;
        let spyEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyEncryptionService = sandbox.spy(new TestEncryptionService());
            service = store.add(new BaseSecretStorageService(false, store.add(new InMemoryStorageService()), spyEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'persisted');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyEncryptionService.encrypt.callCount, 1);
            assert.strictEqual(spyEncryptionService.decrypt.callCount, 1);
        });
        test('delete', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            await service.delete(key);
            const result = await service.get(key);
            assert.strictEqual(result, undefined);
        });
        test('onDidChangeSecret', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            let eventFired = false;
            store.add(service.onDidChangeSecret((changedKey) => {
                assert.strictEqual(changedKey, key);
                eventFired = true;
            }));
            await service.set(key, value);
            assert.strictEqual(eventFired, true);
        });
    });
    suite('BaseSecretStorageService useInMemoryStorage=false, encryption not available', () => {
        let service;
        let spyNoEncryptionService;
        let sandbox;
        setup(() => {
            sandbox = sinon.createSandbox();
            spyNoEncryptionService = sandbox.spy(new TestNoEncryptionService());
            service = store.add(new BaseSecretStorageService(false, store.add(new InMemoryStorageService()), spyNoEncryptionService, store.add(new NullLogService())));
        });
        teardown(() => {
            sandbox.restore();
        });
        test('type', async () => {
            assert.strictEqual(service.type, 'unknown');
            // trigger lazy initialization
            await service.set('my-secret', 'my-secret-value');
            assert.strictEqual(service.type, 'in-memory');
        });
        test('set and get', async () => {
            const key = 'my-secret';
            const value = 'my-secret-value';
            await service.set(key, value);
            const result = await service.get(key);
            assert.strictEqual(result, value);
            // Additionally ensure the encryptionservice was not used
            assert.strictEqual(spyNoEncryptionService.encrypt.callCount, 0);
            assert.strictEqual(spyNoEncryptionService.decrypt.callCount, 0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NlY3JldHMvdGVzdC9jb21tb24vc2VjcmV0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUUsTUFBTSxxQkFBcUI7SUFBM0I7UUFFUyxvQkFBZSxHQUFHLFlBQVksQ0FBQyxDQUFDLGdDQUFnQztJQWdCekUsQ0FBQztJQWZBLHlCQUF5QjtRQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBQ0QscUJBQXFCO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sbURBQWdDLENBQUM7SUFDeEQsQ0FBQztJQUNELE9BQU8sQ0FBQyxLQUFhO1FBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFDRCxPQUFPLENBQUMsS0FBYTtRQUNwQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUNELHFCQUFxQjtRQUNwQixPQUFPLE9B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