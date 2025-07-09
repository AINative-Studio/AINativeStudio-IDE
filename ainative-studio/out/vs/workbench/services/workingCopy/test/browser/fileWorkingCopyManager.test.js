/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, TestInMemoryFileSystemProvider } from '../../../../test/browser/workbenchTestServices.js';
import { StoredFileWorkingCopy } from '../../common/storedFileWorkingCopy.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { TestStoredFileWorkingCopyModelFactory } from './storedFileWorkingCopy.test.js';
import { Schemas } from '../../../../../base/common/network.js';
import { FileWorkingCopyManager } from '../../common/fileWorkingCopyManager.js';
import { TestUntitledFileWorkingCopyModelFactory } from './untitledFileWorkingCopy.test.js';
import { UntitledFileWorkingCopy } from '../../common/untitledFileWorkingCopy.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('FileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileService.registerProvider(Schemas.file, new TestInMemoryFileSystemProvider());
        accessor.fileService.registerProvider(Schemas.vscodeRemote, new TestInMemoryFileSystemProvider());
        manager = disposables.add(new FileWorkingCopyManager('testFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
    });
    teardown(() => {
        disposables.clear();
    });
    test('onDidCreate, get, workingCopies', async () => {
        let createCounter = 0;
        disposables.add(manager.onDidCreate(e => {
            createCounter++;
        }));
        const fileUri = URI.file('/test.html');
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(manager.get(fileUri), undefined);
        const fileWorkingCopy = await manager.resolve(fileUri);
        const untitledFileWorkingCopy = await manager.resolve();
        assert.strictEqual(manager.workingCopies.length, 2);
        assert.strictEqual(createCounter, 2);
        assert.strictEqual(manager.get(fileWorkingCopy.resource), fileWorkingCopy);
        assert.strictEqual(manager.get(untitledFileWorkingCopy.resource), untitledFileWorkingCopy);
        const sameFileWorkingCopy = disposables.add(await manager.resolve(fileUri));
        const sameUntitledFileWorkingCopy = disposables.add(await manager.resolve({ untitledResource: untitledFileWorkingCopy.resource }));
        assert.strictEqual(sameFileWorkingCopy, fileWorkingCopy);
        assert.strictEqual(sameUntitledFileWorkingCopy, untitledFileWorkingCopy);
        assert.strictEqual(manager.workingCopies.length, 2);
        assert.strictEqual(createCounter, 2);
    });
    test('resolve', async () => {
        const fileWorkingCopy = disposables.add(await manager.resolve(URI.file('/test.html')));
        assert.ok(fileWorkingCopy instanceof StoredFileWorkingCopy);
        assert.strictEqual(await manager.stored.resolve(fileWorkingCopy.resource), fileWorkingCopy);
        const untitledFileWorkingCopy = disposables.add(await manager.resolve());
        assert.ok(untitledFileWorkingCopy instanceof UntitledFileWorkingCopy);
        assert.strictEqual(await manager.untitled.resolve({ untitledResource: untitledFileWorkingCopy.resource }), untitledFileWorkingCopy);
        assert.strictEqual(await manager.resolve(untitledFileWorkingCopy.resource), untitledFileWorkingCopy);
    });
    test('destroy', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        await manager.resolve(URI.file('/test.html'));
        await manager.resolve({ contents: { value: bufferToStream(VSBuffer.fromString('Hello Untitled')) } });
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 2);
        assert.strictEqual(manager.stored.workingCopies.length, 1);
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.stored.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
    });
    test('saveAs - file (same target, unresolved source, unresolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, false, false);
    });
    test('saveAs - file (same target, different case, unresolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, false, false);
    });
    test('saveAs - file (different target, unresolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, false, false);
    });
    test('saveAs - file (same target, resolved source, unresolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, true, false);
    });
    test('saveAs - file (same target, different case, resolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, true, false);
    });
    test('saveAs - file (different target, resolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, true, false);
    });
    test('saveAs - file (same target, unresolved source, resolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, false, true);
    });
    test('saveAs - file (same target, different case, unresolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, false, true);
    });
    test('saveAs - file (different target, unresolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, false, true);
    });
    test('saveAs - file (same target, resolved source, resolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, true, true);
    });
    test('saveAs - file (different target, resolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, true, true);
    });
    async function testSaveAsFile(source, target, resolveSource, resolveTarget) {
        let sourceWorkingCopy = undefined;
        if (resolveSource) {
            sourceWorkingCopy = disposables.add(await manager.resolve(source));
            sourceWorkingCopy.model?.updateContents('hello world');
            assert.ok(sourceWorkingCopy.isDirty());
        }
        let targetWorkingCopy = undefined;
        if (resolveTarget) {
            targetWorkingCopy = disposables.add(await manager.resolve(target));
            targetWorkingCopy.model?.updateContents('hello world');
            assert.ok(targetWorkingCopy.isDirty());
        }
        const result = await manager.saveAs(source, target);
        if (accessor.uriIdentityService.extUri.isEqual(source, target) && resolveSource) {
            // if the uris are considered equal (different case on macOS/Windows)
            // and the source is to be resolved, the resulting working copy resource
            // will be the source resource because we consider file working copies
            // the same in that case
            assert.strictEqual(source.toString(), result?.resource.toString());
        }
        else {
            if (resolveSource || resolveTarget) {
                assert.strictEqual(target.toString(), result?.resource.toString());
            }
            else {
                if (accessor.uriIdentityService.extUri.isEqual(source, target)) {
                    assert.strictEqual(undefined, result);
                }
                else {
                    assert.strictEqual(target.toString(), result?.resource.toString());
                }
            }
        }
        if (resolveSource) {
            assert.strictEqual(sourceWorkingCopy?.isDirty(), false);
        }
        if (resolveTarget) {
            assert.strictEqual(targetWorkingCopy?.isDirty(), false);
        }
        result?.dispose();
    }
    test('saveAs - untitled (without associated resource)', async () => {
        const workingCopy = disposables.add(await manager.resolve());
        workingCopy.model?.updateContents('Simple Save As');
        const target = URI.file('simple/file.txt');
        accessor.fileDialogService.setPickFileToSave(target);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result?.resource.toString(), target.toString());
        assert.strictEqual((result?.model).contents, 'Simple Save As');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    test('saveAs - untitled (with associated resource)', async () => {
        const workingCopy = disposables.add(await manager.resolve({ associatedResource: { path: '/some/associated.txt' } }));
        workingCopy.model?.updateContents('Simple Save As with associated resource');
        const target = URI.from({ scheme: Schemas.file, path: '/some/associated.txt' });
        accessor.fileService.notExistsSet.set(target, true);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result?.resource.toString(), target.toString());
        assert.strictEqual((result?.model).contents, 'Simple Save As with associated resource');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    test('saveAs - untitled (target exists and is resolved)', async () => {
        const workingCopy = disposables.add(await manager.resolve());
        workingCopy.model?.updateContents('Simple Save As');
        const target = URI.file('simple/file.txt');
        const targetFileWorkingCopy = await manager.resolve(target);
        accessor.fileDialogService.setPickFileToSave(target);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result, targetFileWorkingCopy);
        assert.strictEqual((result?.model).contents, 'Simple Save As');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvZmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkosT0FBTyxFQUFFLHFCQUFxQixFQUEwQixNQUFNLHVDQUF1QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFrQyxxQ0FBcUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQTJCLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekcsT0FBTyxFQUFvQyx1Q0FBdUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBRXBDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFD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