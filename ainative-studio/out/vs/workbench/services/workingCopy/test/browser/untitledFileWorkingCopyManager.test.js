/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileWorkingCopyManager } from '../../common/fileWorkingCopyManager.js';
import { NO_TYPE_ID } from '../../common/workingCopy.js';
import { TestStoredFileWorkingCopyModelFactory } from './storedFileWorkingCopy.test.js';
import { TestUntitledFileWorkingCopyModelFactory } from './untitledFileWorkingCopy.test.js';
import { TestInMemoryFileSystemProvider, TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('UntitledFileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.fileService.registerProvider(Schemas.file, disposables.add(new TestInMemoryFileSystemProvider())));
        disposables.add(accessor.fileService.registerProvider(Schemas.vscodeRemote, disposables.add(new TestInMemoryFileSystemProvider())));
        manager = disposables.add(new FileWorkingCopyManager('testUntitledFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
    });
    teardown(() => {
        for (const workingCopy of [...manager.untitled.workingCopies, ...manager.stored.workingCopies]) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('basics', async () => {
        let createCounter = 0;
        disposables.add(manager.untitled.onDidCreate(e => {
            createCounter++;
        }));
        let disposeCounter = 0;
        disposables.add(manager.untitled.onWillDispose(e => {
            disposeCounter++;
        }));
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty(e => {
            dirtyCounter++;
        }));
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.get(URI.file('/some/invalidPath')), undefined);
        assert.strictEqual(manager.untitled.get(URI.file('/some/invalidPath').with({ scheme: Schemas.untitled })), undefined);
        const workingCopy1 = await manager.untitled.resolve();
        const workingCopy2 = await manager.untitled.resolve();
        assert.strictEqual(workingCopy1.typeId, 'testUntitledFileWorkingCopyType');
        assert.strictEqual(workingCopy1.resource.scheme, Schemas.untitled);
        assert.strictEqual(createCounter, 2);
        assert.strictEqual(manager.untitled.get(workingCopy1.resource), workingCopy1);
        assert.strictEqual(manager.untitled.get(workingCopy2.resource), workingCopy2);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 2);
        assert.strictEqual(manager.untitled.workingCopies.length, 2);
        assert.notStrictEqual(workingCopy1.resource.toString(), workingCopy2.resource.toString());
        for (const workingCopy of [workingCopy1, workingCopy2]) {
            assert.strictEqual(workingCopy.capabilities, 2 /* WorkingCopyCapabilities.Untitled */);
            assert.strictEqual(workingCopy.isDirty(), false);
            assert.strictEqual(workingCopy.isModified(), false);
            assert.ok(workingCopy.model);
        }
        workingCopy1.model?.updateContents('Hello World');
        assert.strictEqual(workingCopy1.isDirty(), true);
        assert.strictEqual(workingCopy1.isModified(), true);
        assert.strictEqual(dirtyCounter, 1);
        workingCopy1.model?.updateContents(''); // change to empty clears dirty/modified flags
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), false);
        assert.strictEqual(dirtyCounter, 2);
        workingCopy2.model?.fireContentChangeEvent({ isInitial: false });
        assert.strictEqual(workingCopy2.isDirty(), true);
        assert.strictEqual(workingCopy2.isModified(), true);
        assert.strictEqual(dirtyCounter, 3);
        workingCopy1.dispose();
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        assert.strictEqual(manager.untitled.get(workingCopy1.resource), undefined);
        workingCopy2.dispose();
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.get(workingCopy2.resource), undefined);
        assert.strictEqual(disposeCounter, 2);
    });
    test('dirty - scratchpads are never dirty', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty(e => {
            dirtyCounter++;
        }));
        const workingCopy1 = await manager.resolve({
            untitledResource: URI.from({ scheme: Schemas.untitled, path: `/myscratchpad` }),
            isScratchpad: true
        });
        assert.strictEqual(workingCopy1.resource.scheme, Schemas.untitled);
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        workingCopy1.model?.updateContents('contents');
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), true);
        workingCopy1.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), false);
        assert.strictEqual(dirtyCounter, 0);
        workingCopy1.dispose();
    });
    test('resolve - with initial value', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty(e => {
            dirtyCounter++;
        }));
        const workingCopy1 = await manager.untitled.resolve({ contents: { value: bufferToStream(VSBuffer.fromString('Hello World')) } });
        assert.strictEqual(workingCopy1.isModified(), true);
        assert.strictEqual(workingCopy1.isDirty(), true);
        assert.strictEqual(dirtyCounter, 1);
        assert.strictEqual(workingCopy1.model?.contents, 'Hello World');
        workingCopy1.dispose();
        const workingCopy2 = await manager.untitled.resolve({ contents: { value: bufferToStream(VSBuffer.fromString('Hello World')), markModified: true } });
        assert.strictEqual(workingCopy2.isModified(), true);
        assert.strictEqual(workingCopy2.isDirty(), true);
        assert.strictEqual(dirtyCounter, 2);
        assert.strictEqual(workingCopy2.model?.contents, 'Hello World');
        workingCopy2.dispose();
    });
    test('resolve - with initial value but markDirty: false', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty(e => {
            dirtyCounter++;
        }));
        const workingCopy = await manager.untitled.resolve({ contents: { value: bufferToStream(VSBuffer.fromString('Hello World')), markModified: false } });
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(dirtyCounter, 0);
        assert.strictEqual(workingCopy.model?.contents, 'Hello World');
        workingCopy.dispose();
    });
    test('resolve begins counter from 1 for disposed untitled', async () => {
        const untitled1 = await manager.untitled.resolve();
        untitled1.dispose();
        const untitled1Again = disposables.add(await manager.untitled.resolve());
        assert.strictEqual(untitled1.resource.toString(), untitled1Again.resource.toString());
    });
    test('resolve - existing', async () => {
        let createCounter = 0;
        disposables.add(manager.untitled.onDidCreate(e => {
            createCounter++;
        }));
        const workingCopy1 = await manager.untitled.resolve();
        assert.strictEqual(createCounter, 1);
        const workingCopy2 = await manager.untitled.resolve({ untitledResource: workingCopy1.resource });
        assert.strictEqual(workingCopy1, workingCopy2);
        assert.strictEqual(createCounter, 1);
        const workingCopy3 = await manager.untitled.resolve({ untitledResource: URI.file('/invalid/untitled') });
        assert.strictEqual(workingCopy3.resource.scheme, Schemas.untitled);
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('resolve - untitled resource used for new working copy', async () => {
        const invalidUntitledResource = URI.file('my/untitled.txt');
        const validUntitledResource = invalidUntitledResource.with({ scheme: Schemas.untitled });
        const workingCopy1 = await manager.untitled.resolve({ untitledResource: invalidUntitledResource });
        assert.notStrictEqual(workingCopy1.resource.toString(), invalidUntitledResource.toString());
        const workingCopy2 = await manager.untitled.resolve({ untitledResource: validUntitledResource });
        assert.strictEqual(workingCopy2.resource.toString(), validUntitledResource.toString());
        workingCopy1.dispose();
        workingCopy2.dispose();
    });
    test('resolve - with associated resource', async () => {
        const workingCopy = await manager.untitled.resolve({ associatedResource: { path: '/some/associated.txt' } });
        assert.strictEqual(workingCopy.hasAssociatedFilePath, true);
        assert.strictEqual(workingCopy.resource.path, '/some/associated.txt');
        workingCopy.dispose();
    });
    test('save - without associated resource', async () => {
        let savedEvent = undefined;
        disposables.add(manager.untitled.onDidSave(e => {
            savedEvent = e;
        }));
        const workingCopy = await manager.untitled.resolve();
        workingCopy.model?.updateContents('Simple Save');
        accessor.fileDialogService.setPickFileToSave(URI.file('simple/file.txt'));
        const result = await workingCopy.save();
        assert.ok(result);
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        assert.strictEqual(savedEvent.source.toString(), workingCopy.resource.toString());
        assert.strictEqual(savedEvent.target.toString(), URI.file('simple/file.txt').toString());
        workingCopy.dispose();
    });
    test('save - with associated resource', async () => {
        let savedEvent = undefined;
        disposables.add(manager.untitled.onDidSave(e => {
            savedEvent = e;
        }));
        const workingCopy = await manager.untitled.resolve({ associatedResource: { path: '/some/associated.txt' } });
        workingCopy.model?.updateContents('Simple Save with associated resource');
        accessor.fileService.notExistsSet.set(URI.from({ scheme: Schemas.file, path: '/some/associated.txt' }), true);
        const result = await workingCopy.save();
        assert.ok(result);
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        assert.strictEqual(savedEvent.source.toString(), workingCopy.resource.toString());
        assert.strictEqual(savedEvent.target.toString(), URI.file('/some/associated.txt').toString());
        workingCopy.dispose();
    });
    test('save - with associated resource (asks to overwrite)', async () => {
        const workingCopy = await manager.untitled.resolve({ associatedResource: { path: '/some/associated.txt' } });
        workingCopy.model?.updateContents('Simple Save with associated resource');
        let result = await workingCopy.save();
        assert.ok(!result); // not confirmed
        assert.strictEqual(manager.untitled.get(workingCopy.resource), workingCopy);
        accessor.dialogService.setConfirmResult({ confirmed: true });
        result = await workingCopy.save();
        assert.ok(result); // confirmed
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        workingCopy.dispose();
    });
    test('destroy', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        await manager.untitled.resolve();
        await manager.untitled.resolve();
        await manager.untitled.resolve();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.untitled.workingCopies.length, 3);
        await manager.untitled.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
    });
    test('manager with different types produce different URIs', async () => {
        try {
            manager = disposables.add(new FileWorkingCopyManager('someOtherUntitledTypeId', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
            const untitled1OriginalType = disposables.add(await manager.untitled.resolve());
            const untitled1OtherType = disposables.add(await manager.untitled.resolve());
            assert.notStrictEqual(untitled1OriginalType.resource.toString(), untitled1OtherType.resource.toString());
        }
        finally {
            manager.destroy();
        }
    });
    test('manager without typeId produces backwards compatible URIs', async () => {
        try {
            manager = disposables.add(new FileWorkingCopyManager(NO_TYPE_ID, new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
            const result = disposables.add(await manager.untitled.resolve());
            assert.strictEqual(result.resource.scheme, Schemas.untitled);
            assert.ok(result.resource.path.length > 0);
            assert.strictEqual(result.resource.query, '');
            assert.strictEqual(result.resource.authority, '');
            assert.strictEqual(result.resource.fragment, '');
        }
        finally {
            manager.destroy();
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci91bnRpdGxlZEZpbGVXb3JraW5nQ29weU1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQTJCLE1BQU0sd0NBQXdDLENBQUM7QUFDekcsT0FBTyxFQUFFLFVBQVUsRUFBMkIsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRixPQUFPLEVBQWtDLHFDQUFxQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEgsT0FBTyxFQUFvQyx1Q0FBdUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXZKLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFFNUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLG9CQUEyQyxDQUFDO0lBQ2hELElBQUks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