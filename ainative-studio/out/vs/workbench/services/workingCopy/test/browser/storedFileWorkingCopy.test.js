/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { StoredFileWorkingCopy, isStoredFileWorkingCopySaveEvent } from '../../common/storedFileWorkingCopy.js';
import { bufferToStream, newWriteableBufferStream, streamToBuffer, VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getLastResolvedFileStat, TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { basename } from '../../../../../base/common/resources.js';
import { FileChangesEvent, FileOperationError, NotModifiedSinceFileOperationError } from '../../../../../platform/files/common/files.js';
import { SaveSourceRegistry } from '../../../../common/editor.js';
import { Promises, timeout } from '../../../../../base/common/async.js';
import { consumeReadable, consumeStream, isReadableStream } from '../../../../../base/common/stream.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
export class TestStoredFileWorkingCopyModel extends Disposable {
    constructor(resource, contents) {
        super();
        this.resource = resource;
        this.contents = contents;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.throwOnSnapshot = false;
        this.versionId = 0;
        this.pushedStackElement = false;
    }
    fireContentChangeEvent(event) {
        this._onDidChangeContent.fire(event);
    }
    updateContents(newContents) {
        this.doUpdate(newContents);
    }
    setThrowOnSnapshot() {
        this.throwOnSnapshot = true;
    }
    async snapshot(context, token) {
        if (this.throwOnSnapshot) {
            throw new Error('Fail');
        }
        const stream = newWriteableBufferStream();
        stream.end(VSBuffer.fromString(this.contents));
        return stream;
    }
    async update(contents, token) {
        this.doUpdate((await streamToBuffer(contents)).toString());
    }
    doUpdate(newContents) {
        this.contents = newContents;
        this.versionId++;
        this._onDidChangeContent.fire({ isRedoing: false, isUndoing: false });
    }
    pushStackElement() {
        this.pushedStackElement = true;
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSave extends TestStoredFileWorkingCopyModel {
    constructor() {
        super(...arguments);
        this.saveCounter = 0;
        this.throwOnSave = false;
        this.saveOperation = undefined;
    }
    async save(options, token) {
        if (this.throwOnSave) {
            throw new Error('Fail');
        }
        if (this.saveOperation) {
            await this.saveOperation;
        }
        if (token.isCancellationRequested) {
            throw new Error('Canceled');
        }
        this.saveCounter++;
        return {
            resource: this.resource,
            ctime: 0,
            etag: '',
            isDirectory: false,
            isFile: true,
            mtime: 0,
            name: 'resource2',
            size: 0,
            isSymbolicLink: false,
            readonly: false,
            locked: false,
            children: undefined
        };
    }
}
export class TestStoredFileWorkingCopyModelFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModel(resource, (await streamToBuffer(contents)).toString());
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSaveFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModelWithCustomSave(resource, (await streamToBuffer(contents)).toString());
    }
}
suite('StoredFileWorkingCopy (with custom save)', function () {
    const factory = new TestStoredFileWorkingCopyModelWithCustomSaveFactory();
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let workingCopy;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const resource = URI.file('test/resource');
        workingCopy = disposables.add(new StoredFileWorkingCopy('testStoredFileWorkingCopyType', resource, basename(resource), factory, options => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService));
    });
    teardown(() => {
        disposables.clear();
    });
    test('save (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
        // error
        workingCopy.model?.updateContents('hello save error');
        workingCopy.model.throwOnSave = true;
        await workingCopy.save();
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
    });
    test('save cancelled (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        let resolve;
        workingCopy.model.saveOperation = new Promise(r => resolve = r);
        workingCopy.model?.updateContents('first');
        const firstSave = workingCopy.save();
        // cancel the first save by requesting a second while it is still mid operation
        workingCopy.model?.updateContents('second');
        const secondSave = workingCopy.save();
        resolve();
        await firstSave;
        await secondSave;
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('StoredFileWorkingCopy', function () {
    const factory = new TestStoredFileWorkingCopyModelFactory();
    const disposables = new DisposableStore();
    const resource = URI.file('test/resource');
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource) {
        const workingCopy = new StoredFileWorkingCopy('testStoredFileWorkingCopyType', uri, basename(uri), factory, options => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService);
        return workingCopy;
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        workingCopy.dispose();
        for (const workingCopy of accessor.workingCopyService.workingCopies) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('registers with working copy service', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        workingCopy.dispose();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
    });
    test('orphaned tracking', async () => {
        return runWithFakedTimers({}, async () => {
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            let onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.delete(resource);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 1 /* FileChangeType.ADDED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('dirty / modified', async () => {
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        let changeDirtyCounter = 0;
        disposables.add(workingCopy.onDidChangeDirty(() => {
            changeDirtyCounter++;
        }));
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(() => {
            savedCounter++;
        }));
        // Dirty from: Model content change
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(contentChangeCounter, 1);
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 1);
        await workingCopy.save();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 2);
        assert.strictEqual(savedCounter, 1);
        // Dirty from: Initial contents
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello dirty stream')) });
        assert.strictEqual(contentChangeCounter, 2); // content of model did not change
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 3);
        await workingCopy.revert({ soft: true });
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 4);
        // Modified from: API
        workingCopy.markModified();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 5);
        await workingCopy.revert();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 6);
    });
    test('dirty - working copy marks non-dirty when undo reaches saved version ID', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello saved state');
        await workingCopy.save();
        assert.strictEqual(workingCopy.isDirty(), false);
        workingCopy.model?.updateContents('changing content once');
        assert.strictEqual(workingCopy.isDirty(), true);
        // Simulate an undo that goes back to the last (saved) version ID
        workingCopy.model.versionId--;
        workingCopy.model?.fireContentChangeEvent({ isRedoing: false, isUndoing: true });
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('resolve (without backup)', async () => {
        let onDidResolveCounter = 0;
        disposables.add(workingCopy.onDidResolve(() => {
            onDidResolveCounter++;
        }));
        // resolve from file
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // dirty resolve returns early
        workingCopy.model?.updateContents('hello resolve');
        assert.strictEqual(workingCopy.isDirty(), true);
        await workingCopy.resolve();
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello resolve');
        // dirty resolve with contents updates contents
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello initial contents')) });
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // resolve with pending save returns directly
        const pendingSave = workingCopy.save();
        await workingCopy.resolve();
        await pendingSave;
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // disposed resolve is not throwing an error
        workingCopy.dispose();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(onDidResolveCounter, 2);
    });
    test('resolve (with backup)', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
        const backup = await workingCopy.backup(CancellationToken.None);
        await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
        workingCopy.dispose();
        // first resolve loads from backup
        workingCopy = createWorkingCopy();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello backup');
        workingCopy.model.updateContents('hello updated');
        await workingCopy.save();
        // subsequent resolve ignores any backups
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (with backup, preserves metadata and orphaned state)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup = await workingCopy.backup(CancellationToken.None);
            await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
            assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
            workingCopy.dispose();
            workingCopy = createWorkingCopy();
            await workingCopy.resolve();
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup2 = await workingCopy.backup(CancellationToken.None);
            assert.deepStrictEqual(backup.meta, backup2.meta);
        });
    });
    test('resolve (updates orphaned state accordingly)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve();
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            // resolving clears orphaned state when successful
            accessor.fileService.notExistsSet.delete(resource);
            await workingCopy.resolve({ forceReadFromFile: true });
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            // resolving adds orphaned state when fail to read
            try {
                accessor.fileService.readShouldThrowError = new FileOperationError('file not found', 1 /* FileOperationResult.FILE_NOT_FOUND */);
                await workingCopy.resolve();
                assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            }
            finally {
                accessor.fileService.readShouldThrowError = undefined;
            }
        });
    });
    test('stat.readonly and stat.locked can change when decreased mtime is ignored', async function () {
        await workingCopy.resolve();
        const stat = assertIsDefined(getLastResolvedFileStat(workingCopy));
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('error', { ...stat, mtime: stat.mtime - 1, readonly: !stat.readonly, locked: !stat.locked });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(getLastResolvedFileStat(workingCopy)?.mtime, stat.mtime, 'mtime should not decrease');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.readonly, stat.readonly, 'readonly should have changed despite simultaneous attempt to decrease mtime');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.locked, stat.locked, 'locked should have changed despite simultaneous attempt to decrease mtime');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE can be handled for resolved working copies)', async () => {
        await workingCopy.resolve();
        try {
            accessor.fileService.readShouldThrowError = new FileOperationError('file not modified since', 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */);
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE still updates readonly state)', async () => {
        let readonlyChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeReadonly(() => readonlyChangeCounter++));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        const stat = await accessor.fileService.resolve(workingCopy.resource, { resolveMetadata: true });
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: true });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        assert.strictEqual(readonlyChangeCounter, 1);
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: false });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyChangeCounter, 2);
    });
    test('resolve does not alter content when model content changed in parallel', async () => {
        await workingCopy.resolve();
        const resolvePromise = workingCopy.resolve();
        workingCopy.model?.updateContents('changed content');
        await resolvePromise;
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'changed content');
    });
    test('backup', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        assert.ok(backup.meta);
        let backupContents = undefined;
        if (backup.content instanceof VSBuffer) {
            backupContents = backup.content.toString();
        }
        else if (isReadableStream(backup.content)) {
            backupContents = (await consumeStream(backup.content, chunks => VSBuffer.concat(chunks))).toString();
        }
        else if (backup.content) {
            backupContents = consumeReadable(backup.content, chunks => VSBuffer.concat(chunks)).toString();
        }
        assert.strictEqual(backupContents, 'hello backup');
    });
    test('save (no errors) - simple', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
    });
    test('save (no errors) - save reason', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save reason
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const source = SaveSourceRegistry.registerSource('testSource', 'Hello Save');
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */, source });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 2 /* SaveReason.AUTO */);
        assert.strictEqual(lastSaveEvent.source, source);
    });
    test('save (no errors) - multiple', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in a single save when content does not change
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await Promises.settled([
            workingCopy.save({ reason: 2 /* SaveReason.AUTO */ }),
            workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ }),
            workingCopy.save({ reason: 4 /* SaveReason.WINDOW_CHANGE */ })
        ]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - multiple, cancellation', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in just one save operation (the second one
        // cancels the first)
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const firstSave = workingCopy.save();
        workingCopy.model?.updateContents('hello save more');
        const secondSave = workingCopy.save();
        await Promises.settled([firstSave, secondSave]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - not forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // no save when not forced and not dirty
        await workingCopy.resolve();
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save when forced even when not dirty
        await workingCopy.resolve();
        await workingCopy.save({ force: true });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - save clears orphaned', async () => {
        return runWithFakedTimers({}, async () => {
            let savedCounter = 0;
            disposables.add(workingCopy.onDidSave(e => {
                savedCounter++;
            }));
            let saveErrorCounter = 0;
            disposables.add(workingCopy.onDidSaveError(() => {
                saveErrorCounter++;
            }));
            await workingCopy.resolve();
            // save clears orphaned
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            await workingCopy.save({ force: true });
            assert.strictEqual(savedCounter, 1);
            assert.strictEqual(saveErrorCounter, 0);
            assert.strictEqual(workingCopy.isDirty(), false);
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('save (errors)', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(reason => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        // save error: any error marks working copy dirty
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true });
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save is a no-op unless forced when in error case
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */ });
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        // save error: conflict
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error conflict', 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
            await workingCopy.save({ force: true });
        }
        catch (error) {
            // error is expected
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 2);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (errors, bubbles up with `ignoreErrorHandler`)', async () => {
        await workingCopy.resolve();
        let error = undefined;
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true, ignoreErrorHandler: true });
        }
        catch (e) {
            error = e;
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.ok(error);
    });
    test('save - returns false when save fails', async function () {
        await workingCopy.resolve();
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            const res = await workingCopy.save({ force: true });
            assert.strictEqual(res, false);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        const res = await workingCopy.save({ force: true });
        assert.strictEqual(res, true);
    });
    test('save participant', async () => {
        await workingCopy.resolve();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let participationCounter = 0;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc) => {
                if (workingCopy === wc) {
                    participationCounter++;
                }
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
        await workingCopy.save({ force: true, skipSaveParticipants: true });
        assert.strictEqual(participationCounter, 1);
        disposable.dispose();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, true);
    });
    async function testSaveFromSaveParticipant(workingCopy, async) {
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                if (async) {
                    await timeout(10);
                }
                await workingCopy.save({ force: true });
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        disposable.dispose();
    }
    test('Save Participant carries context', async function () {
        await workingCopy.resolve();
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let e = undefined;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                try {
                    assert.strictEqual(context.reason, 1 /* SaveReason.EXPLICIT */);
                    assert.strictEqual(context.savedFrom?.toString(), from.toString());
                }
                catch (error) {
                    e = error;
                }
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        if (e) {
            throw e;
        }
        disposable.dispose();
    });
    test('revert', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello revert');
        let revertedCounter = 0;
        disposables.add(workingCopy.onDidRevert(() => {
            revertedCounter++;
        }));
        // revert: soft
        await workingCopy.revert({ soft: true });
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: not forced
        await workingCopy.revert();
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: forced
        await workingCopy.revert({ force: true });
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // revert: forced, error
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.isDirty(), true);
        // revert: forced, file not found error is ignored
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 1 /* FileOperationResult.FILE_NOT_FOUND */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 3);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('state', async () => {
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        const savePromise = workingCopy.save();
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await savePromise;
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('joinState', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        workingCopy.save();
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await workingCopy.joinState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('isReadonly, isResolved, dispose, isDisposed', async () => {
        assert.strictEqual(workingCopy.isResolved(), false);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        await workingCopy.resolve();
        assert.ok(workingCopy.model);
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        let disposedEvent = false;
        disposables.add(workingCopy.onWillDispose(() => {
            disposedEvent = true;
        }));
        let disposedModelEvent = false;
        disposables.add(workingCopy.model.onWillDispose(() => {
            disposedModelEvent = true;
        }));
        workingCopy.dispose();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(disposedEvent, true);
        assert.strictEqual(disposedModelEvent, true);
    });
    test('readonly change event', async () => {
        accessor.fileService.readonly = true;
        await workingCopy.resolve();
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        accessor.fileService.readonly = false;
        let readonlyEvent = false;
        disposables.add(workingCopy.onDidChangeReadonly(() => {
            readonlyEvent = true;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyEvent, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3N0b3JlZEZpbGVXb3JraW5nQ29weS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQStJLGdDQUFnQyxFQUFtQyxNQUFNLHVDQUF1QyxDQUFDO0FBQzlSLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBMEIsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsSixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWhKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWtCLGtCQUFrQixFQUFpRSxrQ0FBa0MsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3hOLE9BQU8sRUFBYyxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7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