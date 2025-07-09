/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { readFileSync, promises } from 'fs';
import { tmpdir } from 'os';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { join } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { Promises, writeFileSync } from '../../../../base/node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { FileService } from '../../../files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../files/node/diskFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import { FileStorage } from '../../node/stateService.js';
flakySuite('StateService', () => {
    let testDir;
    let fileService;
    let logService;
    let diskFileSystemProvider;
    const disposables = new DisposableStore();
    setup(() => {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'statemainservice');
        logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        diskFileSystemProvider = disposables.add(new DiskFileSystemProvider(logService));
        disposables.add(fileService.registerProvider(Schemas.file, diskFileSystemProvider));
        return promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        disposables.clear();
        return Promises.rm(testDir);
    });
    test('Basics (delayed strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key', 'some.value');
        assert.strictEqual(service.getItem('some.key'), 'some.value');
        service.removeItem('some.key');
        assert.strictEqual(service.getItem('some.key', 'some.default'), 'some.default');
        assert.ok(!service.getItem('some.unknonw.key'));
        service.setItem('some.other.key', 'some.other.value');
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.other.key', 'some.other.value');
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.undefined.key', undefined);
        assert.strictEqual(service.getItem('some.undefined.key', 'some.default'), 'some.default');
        service.setItem('some.null.key', null);
        assert.strictEqual(service.getItem('some.null.key', 'some.default'), 'some.default');
        service.setItems([
            { key: 'some.setItems.key1', data: 'some.value' },
            { key: 'some.setItems.key2', data: 0 },
            { key: 'some.setItems.key3', data: true },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined }
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), 'some.value');
        assert.strictEqual(service.getItem('some.setItems.key2'), 0);
        assert.strictEqual(service.getItem('some.setItems.key3'), true);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        service.setItems([
            { key: 'some.setItems.key1', data: undefined },
            { key: 'some.setItems.key2', data: undefined },
            { key: 'some.setItems.key3', data: undefined },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined }
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key2'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key3'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        return service.close();
    });
    test('Basics (immediate strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        service.setItem('some.key', 'some.value');
        assert.strictEqual(service.getItem('some.key'), 'some.value');
        service.removeItem('some.key');
        assert.strictEqual(service.getItem('some.key', 'some.default'), 'some.default');
        assert.ok(!service.getItem('some.unknonw.key'));
        service.setItem('some.other.key', 'some.other.value');
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.other.key', 'some.other.value');
        assert.strictEqual(service.getItem('some.other.key'), 'some.other.value');
        service.setItem('some.undefined.key', undefined);
        assert.strictEqual(service.getItem('some.undefined.key', 'some.default'), 'some.default');
        service.setItem('some.null.key', null);
        assert.strictEqual(service.getItem('some.null.key', 'some.default'), 'some.default');
        service.setItems([
            { key: 'some.setItems.key1', data: 'some.value' },
            { key: 'some.setItems.key2', data: 0 },
            { key: 'some.setItems.key3', data: true },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined }
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), 'some.value');
        assert.strictEqual(service.getItem('some.setItems.key2'), 0);
        assert.strictEqual(service.getItem('some.setItems.key3'), true);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        service.setItems([
            { key: 'some.setItems.key1', data: undefined },
            { key: 'some.setItems.key2', data: undefined },
            { key: 'some.setItems.key3', data: undefined },
            { key: 'some.setItems.key4', data: null },
            { key: 'some.setItems.key5', data: undefined }
        ]);
        assert.strictEqual(service.getItem('some.setItems.key1'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key2'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key3'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key4'), undefined);
        assert.strictEqual(service.getItem('some.setItems.key5'), undefined);
        return service.close();
    });
    test('Multiple ops are buffered and applied', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Multiple ops (Immediate Strategy)', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        let service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.close();
        service = disposables.add(new FileStorage(URI.file(storageFile), 0 /* SaveStrategy.IMMEDIATE */, logService, fileService));
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Used before init', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        service.removeItem('some.key4');
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        await service.init();
        assert.strictEqual(service.getItem('some.key1'), 'some.value1');
        assert.strictEqual(service.getItem('some.key2'), 'some.value2');
        assert.strictEqual(service.getItem('some.key3'), 'some.value3');
        assert.strictEqual(service.getItem('some.key4'), undefined);
        return service.close();
    });
    test('Used after close', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        await service.init();
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        await service.close();
        service.setItem('some.key5', 'some.marker');
        const contents = readFileSync(storageFile).toString();
        assert.ok(contents.includes('some.value1'));
        assert.ok(!contents.includes('some.marker'));
        return service.close();
    });
    test('Closed before init', async function () {
        const storageFile = join(testDir, 'storage.json');
        writeFileSync(storageFile, '');
        const service = disposables.add(new FileStorage(URI.file(storageFile), 1 /* SaveStrategy.DELAYED */, logService, fileService));
        service.setItem('some.key1', 'some.value1');
        service.setItem('some.key2', 'some.value2');
        service.setItem('some.key3', 'some.value3');
        service.setItem('some.key4', 'some.value4');
        await service.close();
        const contents = readFileSync(storageFile).toString();
        assert.strictEqual(contents.length, 0);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdGF0ZS90ZXN0L25vZGUvc3RhdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFnQixNQUFNLDRCQUE0QixDQUFDO0FBRXZFLFVBQVUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBRS9CLElBQUksT0FBZSxDQUFDO0lBQ3BCLElBQUks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