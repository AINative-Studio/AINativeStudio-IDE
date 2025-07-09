/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, TestWillShutdownEvent } from '../../../../test/browser/workbenchTestServices.js';
import { StoredFileWorkingCopyManager } from '../../common/storedFileWorkingCopyManager.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { FileChangesEvent, FileOperationError } from '../../../../../platform/files/common/files.js';
import { timeout } from '../../../../../base/common/async.js';
import { TestStoredFileWorkingCopyModelFactory } from './storedFileWorkingCopy.test.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('StoredFileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        manager = disposables.add(new StoredFileWorkingCopyManager('testStoredFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService));
    });
    teardown(() => {
        for (const workingCopy of manager.workingCopies) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('resolve', async () => {
        const resource = URI.file('/test.html');
        const events = [];
        const listener = manager.onDidCreate(workingCopy => {
            events.push(workingCopy);
        });
        const resolvePromise = manager.resolve(resource);
        assert.ok(manager.get(resource)); // working copy known even before resolved()
        assert.strictEqual(manager.workingCopies.length, 1);
        const workingCopy1 = await resolvePromise;
        assert.ok(workingCopy1);
        assert.ok(workingCopy1.model);
        assert.strictEqual(workingCopy1.typeId, 'testStoredFileWorkingCopyType');
        assert.strictEqual(workingCopy1.resource.toString(), resource.toString());
        assert.strictEqual(manager.get(resource), workingCopy1);
        const workingCopy2 = await manager.resolve(resource);
        assert.strictEqual(workingCopy2, workingCopy1);
        assert.strictEqual(manager.workingCopies.length, 1);
        workingCopy1.dispose();
        const workingCopy3 = await manager.resolve(resource);
        assert.notStrictEqual(workingCopy3, workingCopy2);
        assert.strictEqual(manager.workingCopies.length, 1);
        assert.strictEqual(manager.get(resource), workingCopy3);
        workingCopy3.dispose();
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].resource.toString(), workingCopy1.resource.toString());
        assert.strictEqual(events[1].resource.toString(), workingCopy2.resource.toString());
        listener.dispose();
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('resolve (async)', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        let onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        const resolve = manager.resolve(resource, { reload: { async: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
        didResolve = false;
        onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        manager.resolve(resource, { reload: { async: true, force: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
        disposables.add(await resolve);
    });
    test('resolve (sync)', async () => {
        const resource = URI.file('/path/index.txt');
        await manager.resolve(resource);
        let didResolve = false;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model?.resource.toString() === resource.toString()) {
                didResolve = true;
            }
        }));
        disposables.add(await manager.resolve(resource, { reload: { async: false } }));
        assert.strictEqual(didResolve, true);
        didResolve = false;
        disposables.add(await manager.resolve(resource, { reload: { async: false, force: true } }));
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync) - model disposed when error and first call to resolve', async () => {
        const resource = URI.file('/path/index.txt');
        accessor.fileService.readShouldThrowError = new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        try {
            let error = undefined;
            try {
                await manager.resolve(resource);
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(manager.workingCopies.length, 0);
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
    });
    test('resolve (sync) - model not disposed when error and model existed before', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        accessor.fileService.readShouldThrowError = new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        try {
            let error = undefined;
            try {
                await manager.resolve(resource, { reload: { async: false } });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(manager.workingCopies.length, 1);
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
    });
    test('resolve with initial contents', async () => {
        const resource = URI.file('/test.html');
        const workingCopy = await manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('Hello World')) });
        assert.strictEqual(workingCopy.model?.contents, 'Hello World');
        assert.strictEqual(workingCopy.isDirty(), true);
        await manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('More Changes')) });
        assert.strictEqual(workingCopy.model?.contents, 'More Changes');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.dispose();
    });
    test('multiple resolves execute in sequence (same resources)', async () => {
        const resource = URI.file('/test.html');
        const firstPromise = manager.resolve(resource);
        const secondPromise = manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('Hello World')) });
        const thirdPromise = manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('More Changes')) });
        await firstPromise;
        await secondPromise;
        const workingCopy = await thirdPromise;
        assert.strictEqual(workingCopy.model?.contents, 'More Changes');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.dispose();
    });
    test('multiple resolves execute in parallel (different resources)', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        const [workingCopy1, workingCopy2, workingCopy3] = await Promise.all([firstPromise, secondPromise, thirdPromise]);
        assert.strictEqual(manager.workingCopies.length, 3);
        assert.strictEqual(workingCopy1.resource.toString(), resource1.toString());
        assert.strictEqual(workingCopy2.resource.toString(), resource2.toString());
        assert.strictEqual(workingCopy3.resource.toString(), resource3.toString());
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('removed from cache when working copy or model gets disposed', async () => {
        const resource = URI.file('/test.html');
        let workingCopy = await manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('Hello World')) });
        assert.strictEqual(manager.get(URI.file('/test.html')), workingCopy);
        workingCopy.dispose();
        assert(!manager.get(URI.file('/test.html')));
        workingCopy = await manager.resolve(resource, { contents: bufferToStream(VSBuffer.fromString('Hello World')) });
        assert.strictEqual(manager.get(URI.file('/test.html')), workingCopy);
        workingCopy.model?.dispose();
        assert(!manager.get(URI.file('/test.html')));
    });
    test('events', async () => {
        const resource1 = URI.file('/path/index.txt');
        const resource2 = URI.file('/path/other.txt');
        let createdCounter = 0;
        let resolvedCounter = 0;
        let removedCounter = 0;
        let gotDirtyCounter = 0;
        let gotNonDirtyCounter = 0;
        let revertedCounter = 0;
        let savedCounter = 0;
        let saveErrorCounter = 0;
        disposables.add(manager.onDidCreate(() => {
            createdCounter++;
        }));
        disposables.add(manager.onDidRemove(resource => {
            if (resource.toString() === resource1.toString() || resource.toString() === resource2.toString()) {
                removedCounter++;
            }
        }));
        disposables.add(manager.onDidResolve(workingCopy => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                resolvedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeDirty(workingCopy => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                if (workingCopy.isDirty()) {
                    gotDirtyCounter++;
                }
                else {
                    gotNonDirtyCounter++;
                }
            }
        }));
        disposables.add(manager.onDidRevert(workingCopy => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                revertedCounter++;
            }
        }));
        let lastSaveEvent = undefined;
        disposables.add(manager.onDidSave((e) => {
            if (e.workingCopy.resource.toString() === resource1.toString()) {
                lastSaveEvent = e;
                savedCounter++;
            }
        }));
        disposables.add(manager.onDidSaveError(workingCopy => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                saveErrorCounter++;
            }
        }));
        const workingCopy1 = disposables.add(await manager.resolve(resource1));
        assert.strictEqual(resolvedCounter, 1);
        assert.strictEqual(createdCounter, 1);
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 2 /* FileChangeType.DELETED */ }], false));
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 1 /* FileChangeType.ADDED */ }], false));
        const workingCopy2 = disposables.add(await manager.resolve(resource2));
        assert.strictEqual(resolvedCounter, 2);
        assert.strictEqual(createdCounter, 2);
        workingCopy1.model?.updateContents('changed');
        await workingCopy1.revert();
        workingCopy1.model?.updateContents('changed again');
        await workingCopy1.save();
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy1.save({ force: true });
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        workingCopy1.dispose();
        workingCopy2.dispose();
        await workingCopy1.revert();
        assert.strictEqual(removedCounter, 2);
        assert.strictEqual(gotDirtyCounter, 3);
        assert.strictEqual(gotNonDirtyCounter, 2);
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(lastSaveEvent.workingCopy, workingCopy1);
        assert.ok(lastSaveEvent.stat);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(createdCounter, 2);
        workingCopy1.dispose();
        workingCopy2.dispose();
    });
    test('resolve registers as working copy and dispose clears', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        await Promise.all([firstPromise, secondPromise, thirdPromise]);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.workingCopies.length, 3);
        manager.dispose();
        assert.strictEqual(manager.workingCopies.length, 0);
        // dispose does not remove from working copy service, only `destroy` should
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        disposables.add(await firstPromise);
        disposables.add(await secondPromise);
        disposables.add(await thirdPromise);
    });
    test('destroy', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        await Promise.all([firstPromise, secondPromise, thirdPromise]);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.workingCopies.length, 3);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
    });
    test('destroy saves dirty working copies', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        let saved = false;
        disposables.add(workingCopy.onDidSave(() => {
            saved = true;
        }));
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        assert.strictEqual(manager.workingCopies.length, 1);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(saved, true);
    });
    test('destroy falls back to using backup when save fails', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.setThrowOnSnapshot();
        let unexpectedSave = false;
        disposables.add(workingCopy.onDidSave(() => {
            unexpectedSave = true;
        }));
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        assert.strictEqual(manager.workingCopies.length, 1);
        assert.strictEqual(accessor.workingCopyBackupService.resolved.has(workingCopy), true);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(unexpectedSave, false);
    });
    test('file change event triggers working copy resolve', async () => {
        const resource = URI.file('/path/index.txt');
        await manager.resolve(resource);
        let didResolve = false;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('file change event triggers working copy resolve (when working copy is pending to resolve)', async () => {
        const resource = URI.file('/path/index.txt');
        manager.resolve(resource);
        let didResolve = false;
        let resolvedCounter = 0;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    resolvedCounter++;
                    if (resolvedCounter === 2) {
                        didResolve = true;
                        resolve();
                    }
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('file system provider change triggers working copy resolve', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileSystemProviderCapabilitiesChangeEvent({ provider: disposables.add(new InMemoryFileSystemProvider()), scheme: resource.scheme });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('working copy file event handling: create', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        await accessor.workingCopyFileService.create([{ resource }], CancellationToken.None);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('working copy file event handling: move', () => {
        return testMoveCopyFileWorkingCopy(true);
    });
    test('working copy file event handling: copy', () => {
        return testMoveCopyFileWorkingCopy(false);
    });
    async function testMoveCopyFileWorkingCopy(move) {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/other.txt');
        const sourceWorkingCopy = await manager.resolve(source);
        sourceWorkingCopy.model?.updateContents('hello move or copy');
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        if (move) {
            await accessor.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy([{ file: { source, target } }], CancellationToken.None);
        }
        const targetWorkingCopy = await manager.resolve(target);
        assert.strictEqual(targetWorkingCopy.isDirty(), true);
        assert.strictEqual(targetWorkingCopy.model?.contents, 'hello move or copy');
    }
    test('working copy file event handling: delete', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('hello delete');
        assert.strictEqual(workingCopy.isDirty(), true);
        await accessor.workingCopyFileService.delete([{ resource }], CancellationToken.None);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('working copy file event handling: move to same resource', async () => {
        const source = URI.file('/path/source.txt');
        const sourceWorkingCopy = await manager.resolve(source);
        sourceWorkingCopy.model?.updateContents('hello move');
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        await accessor.workingCopyFileService.move([{ file: { source, target: source } }], CancellationToken.None);
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        assert.strictEqual(sourceWorkingCopy.model?.contents, 'hello move');
    });
    test('canDispose with dirty working copy', async () => {
        const resource = URI.file('/path/index_something.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('make dirty');
        const canDisposePromise = manager.canDispose(workingCopy);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        workingCopy.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = manager.canDispose(workingCopy);
        assert.strictEqual(canDispose2, true);
    });
    (isWeb ? test.skip : test)('pending saves join on shutdown', async () => {
        const resource1 = URI.file('/path/index_something1.txt');
        const resource2 = URI.file('/path/index_something2.txt');
        const workingCopy1 = disposables.add(await manager.resolve(resource1));
        workingCopy1.model?.updateContents('make dirty');
        const workingCopy2 = disposables.add(await manager.resolve(resource2));
        workingCopy2.model?.updateContents('make dirty');
        let saved1 = false;
        workingCopy1.save().then(() => {
            saved1 = true;
        });
        let saved2 = false;
        workingCopy2.save().then(() => {
            saved2 = true;
        });
        const event = new TestWillShutdownEvent();
        accessor.lifecycleService.fireWillShutdown(event);
        assert.ok(event.value.length > 0);
        await Promise.all(event.value);
        assert.strictEqual(saved1, true);
        assert.strictEqual(saved2, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvc3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUksT0FBTyxFQUFFLDRCQUE0QixFQUFrRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTVKLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFrQixrQkFBa0IsRUFBdUIsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFrQyxxQ0FBcUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFD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