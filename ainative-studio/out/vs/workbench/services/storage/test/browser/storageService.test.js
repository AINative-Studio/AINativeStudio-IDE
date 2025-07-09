/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { Storage } from '../../../../../base/parts/storage/common/storage.js';
import { flakySuite } from '../../../../../base/test/common/testUtils.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { createSuite } from '../../../../../platform/storage/test/common/storageService.test.js';
import { BrowserStorageService, IndexedDBStorageDatabase } from '../../browser/storageService.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
async function createStorageService() {
    const disposables = new DisposableStore();
    const logService = new NullLogService();
    const fileService = disposables.add(new FileService(logService));
    const userDataProvider = disposables.add(new InMemoryFileSystemProvider());
    disposables.add(fileService.registerProvider(Schemas.vscodeUserData, userDataProvider));
    const profilesRoot = URI.file('/profiles').with({ scheme: Schemas.inMemory });
    const inMemoryExtraProfileRoot = joinPath(profilesRoot, 'extra');
    const inMemoryExtraProfile = {
        id: 'id',
        name: 'inMemory',
        isDefault: false,
        location: inMemoryExtraProfileRoot,
        globalStorageHome: joinPath(inMemoryExtraProfileRoot, 'globalStorageHome'),
        settingsResource: joinPath(inMemoryExtraProfileRoot, 'settingsResource'),
        keybindingsResource: joinPath(inMemoryExtraProfileRoot, 'keybindingsResource'),
        tasksResource: joinPath(inMemoryExtraProfileRoot, 'tasksResource'),
        snippetsHome: joinPath(inMemoryExtraProfileRoot, 'snippetsHome'),
        promptsHome: joinPath(inMemoryExtraProfileRoot, 'promptsHome'),
        extensionsResource: joinPath(inMemoryExtraProfileRoot, 'extensionsResource'),
        cacheHome: joinPath(inMemoryExtraProfileRoot, 'cache')
    };
    const storageService = disposables.add(new BrowserStorageService({ id: 'workspace-storage-test' }, disposables.add(new UserDataProfileService(inMemoryExtraProfile)), logService));
    await storageService.initialize();
    return [disposables, storageService];
}
flakySuite('StorageService (browser)', function () {
    const disposables = new DisposableStore();
    let storageService;
    createSuite({
        setup: async () => {
            const res = await createStorageService();
            disposables.add(res[0]);
            storageService = res[1];
            return storageService;
        },
        teardown: async () => {
            await storageService.clear();
            disposables.clear();
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
flakySuite('StorageService (browser specific)', () => {
    const disposables = new DisposableStore();
    let storageService;
    setup(async () => {
        const res = await createStorageService();
        disposables.add(res[0]);
        storageService = res[1];
    });
    teardown(async () => {
        await storageService.clear();
        disposables.clear();
    });
    test.skip('clear', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            storageService.store('bar', 'foo', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store('bar', 'foo', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            storageService.store('bar', 'foo', 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            storageService.store('bar', 3, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            await storageService.clear();
            for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
                for (const target of [0 /* StorageTarget.USER */, 1 /* StorageTarget.MACHINE */]) {
                    strictEqual(storageService.get('bar', scope), undefined);
                    strictEqual(storageService.keys(scope, target).length, 0);
                }
            }
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
flakySuite('IndexDBStorageDatabase (browser)', () => {
    const id = 'workspace-storage-db-test';
    const logService = new NullLogService();
    const disposables = new DisposableStore();
    teardown(async () => {
        const storage = disposables.add(await IndexedDBStorageDatabase.create({ id }, logService));
        await storage.clear();
        disposables.clear();
    });
    test('Basics', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Insert initial data
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        storage.set('barUndefined', undefined);
        storage.set('barNull', null);
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Check initial data still there
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        // Update data
        storage.set('bar', 'foo2');
        storage.set('barNumber', 552);
        strictEqual(storage.get('bar'), 'foo2');
        strictEqual(storage.get('barNumber'), '552');
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        // Check initial data still there
        strictEqual(storage.get('bar'), 'foo2');
        strictEqual(storage.get('barNumber'), '552');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.get('barUndefined'), undefined);
        strictEqual(storage.get('barNull'), undefined);
        strictEqual(storage.size, 3);
        strictEqual(storage.items.size, 3);
        // Delete data
        storage.delete('bar');
        storage.delete('barNumber');
        storage.delete('barBoolean');
        strictEqual(storage.get('bar', 'undefined'), 'undefined');
        strictEqual(storage.get('barNumber', 'undefinedNumber'), 'undefinedNumber');
        strictEqual(storage.get('barBoolean', 'undefinedBoolean'), 'undefinedBoolean');
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar', 'undefined'), 'undefined');
        strictEqual(storage.get('barNumber', 'undefinedNumber'), 'undefinedNumber');
        strictEqual(storage.get('barBoolean', 'undefinedBoolean'), 'undefinedBoolean');
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
    });
    test('Clear', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        await storage.close();
        const db = disposables.add(await IndexedDBStorageDatabase.create({ id }, logService));
        storage = disposables.add(new Storage(db));
        await storage.init();
        await db.clear();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar'), undefined);
        strictEqual(storage.get('barNumber'), undefined);
        strictEqual(storage.get('barBoolean'), undefined);
        strictEqual(storage.size, 0);
        strictEqual(storage.items.size, 0);
    });
    test('Inserts and Deletes at the same time', async () => {
        let storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foo');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        storage.set('bar', 'foobar');
        const largeItem = JSON.stringify({ largeItem: 'Hello World'.repeat(1000) });
        storage.set('largeItem', largeItem);
        storage.delete('barNumber');
        storage.delete('barBoolean');
        await storage.close();
        storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        await storage.init();
        strictEqual(storage.get('bar'), 'foobar');
        strictEqual(storage.get('largeItem'), largeItem);
        strictEqual(storage.get('barNumber'), undefined);
        strictEqual(storage.get('barBoolean'), undefined);
    });
    test('Storage change event', async () => {
        const storage = disposables.add(new Storage(disposables.add(await IndexedDBStorageDatabase.create({ id }, logService))));
        let storageChangeEvents = [];
        disposables.add(storage.onDidChangeStorage(e => storageChangeEvents.push(e)));
        await storage.init();
        storage.set('notExternal', 42);
        let storageValueChangeEvent = storageChangeEvents.find(e => e.key === 'notExternal');
        strictEqual(storageValueChangeEvent?.external, false);
        storageChangeEvents = [];
        storage.set('isExternal', 42, true);
        storageValueChangeEvent = storageChangeEvents.find(e => e.key === 'isExternal');
        strictEqual(storageValueChangeEvent?.external, true);
        storage.delete('notExternal');
        storageValueChangeEvent = storageChangeEvents.find(e => e.key === 'notExternal');
        strictEqual(storageValueChangeEvent?.external, false);
        storage.delete('isExternal', true);
        storageValueChangeEvent = storageChangeEvents.find(e => e.key === 'isExternal');
        strictEqual(storageValueChangeEvent?.external, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3RvcmFnZS90ZXN0L2Jyb3dzZXIvc3RvcmFnZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQXVCLE9BQU8sRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUVqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFB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