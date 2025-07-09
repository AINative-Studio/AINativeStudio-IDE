/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { newWriteableBufferStream, VSBuffer, streamToBuffer, bufferToStream, readableToBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename } from '../../../../../base/common/resources.js';
import { consumeReadable, consumeStream, isReadable, isReadableStream } from '../../../../../base/common/stream.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UntitledFileWorkingCopy } from '../../common/untitledFileWorkingCopy.js';
import { TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
export class TestUntitledFileWorkingCopyModel extends Disposable {
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
        this._onDidChangeContent.fire({ isInitial: newContents.length === 0 });
    }
    pushStackElement() {
        this.pushedStackElement = true;
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
export class TestUntitledFileWorkingCopyModelFactory {
    async createModel(resource, contents, token) {
        return new TestUntitledFileWorkingCopyModel(resource, (await streamToBuffer(contents)).toString());
    }
}
suite('UntitledFileWorkingCopy', () => {
    const factory = new TestUntitledFileWorkingCopyModelFactory();
    const disposables = new DisposableStore();
    const resource = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource, hasAssociatedFilePath = false, initialValue = '') {
        return disposables.add(new UntitledFileWorkingCopy('testUntitledWorkingCopyType', uri, basename(uri), hasAssociatedFilePath, false, initialValue.length > 0 ? { value: bufferToStream(VSBuffer.fromString(initialValue)) } : undefined, factory, async (workingCopy) => { await workingCopy.revert(); return true; }, accessor.workingCopyService, accessor.workingCopyBackupService, accessor.logService));
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        disposables.clear();
    });
    test('registers with working copy service', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        workingCopy.dispose();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
    });
    test('dirty', async () => {
        assert.strictEqual(workingCopy.isDirty(), false);
        let changeDirtyCounter = 0;
        disposables.add(workingCopy.onDidChangeDirty(() => {
            changeDirtyCounter++;
        }));
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        // Dirty from: Model content change
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(contentChangeCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(changeDirtyCounter, 1);
        await workingCopy.save();
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(changeDirtyCounter, 2);
    });
    test('dirty - cleared when content event signals isEmpty', async () => {
        assert.strictEqual(workingCopy.isDirty(), false);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('dirty - not cleared when content event signals isEmpty when associated resource', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, true);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy.isDirty(), true);
    });
    test('revert', async () => {
        let revertCounter = 0;
        disposables.add(workingCopy.onDidRevert(() => {
            revertCounter++;
        }));
        let disposeCounter = 0;
        disposables.add(workingCopy.onWillDispose(() => {
            disposeCounter++;
        }));
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(workingCopy.isDirty(), true);
        await workingCopy.revert();
        assert.strictEqual(revertCounter, 1);
        assert.strictEqual(disposeCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('dispose', async () => {
        let disposeCounter = 0;
        disposables.add(workingCopy.onWillDispose(() => {
            disposeCounter++;
        }));
        await workingCopy.resolve();
        workingCopy.dispose();
        assert.strictEqual(disposeCounter, 1);
    });
    test('backup', async () => {
        assert.strictEqual((await workingCopy.backup(CancellationToken.None)).content, undefined);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('Hello Backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        let backupContents = undefined;
        if (isReadableStream(backup.content)) {
            backupContents = (await consumeStream(backup.content, chunks => VSBuffer.concat(chunks))).toString();
        }
        else if (backup.content) {
            backupContents = consumeReadable(backup.content, chunks => VSBuffer.concat(chunks)).toString();
        }
        assert.strictEqual(backupContents, 'Hello Backup');
    });
    test('resolve - without contents', async () => {
        assert.strictEqual(workingCopy.isResolved(), false);
        assert.strictEqual(workingCopy.hasAssociatedFilePath, false);
        assert.strictEqual(workingCopy.model, undefined);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.ok(workingCopy.model);
    });
    test('resolve - with initial contents', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, false, 'Hello Initial');
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        assert.strictEqual(workingCopy.isDirty(), true);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Initial');
        assert.strictEqual(contentChangeCounter, 1);
        workingCopy.model.updateContents('Changed contents');
        await workingCopy.resolve(); // second resolve should be ignored
        assert.strictEqual(workingCopy.model?.contents, 'Changed contents');
    });
    test('backup - with initial contents uses those even if unresolved', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, false, 'Hello Initial');
        assert.strictEqual(workingCopy.isDirty(), true);
        const backup = (await workingCopy.backup(CancellationToken.None)).content;
        if (isReadableStream(backup)) {
            const value = await streamToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello Initial');
        }
        else if (isReadable(backup)) {
            const value = readableToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello Initial');
        }
        else {
            assert.fail('Missing untitled backup');
        }
    });
    test('resolve - with associated resource', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, true);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasAssociatedFilePath, true);
    });
    test('resolve - with backup', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('Hello Backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
        workingCopy.dispose();
        workingCopy = createWorkingCopy();
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Backup');
        assert.strictEqual(contentChangeCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3VudGl0bGVkRmlsZVdvcmtpbmdDb3B5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDdEwsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUF5SCx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pNLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXZILE1BQU0sT0FBTyxnQ0FBaUMs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