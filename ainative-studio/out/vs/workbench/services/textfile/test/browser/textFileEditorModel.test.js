/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { snapshotToString, isTextFileEditorModel } from '../../common/textfiles.js';
import { createFileEditorInput, workbenchInstantiationService, TestServiceAccessor, TestReadonlyTextFileEditorModel, getLastResolvedFileStat } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { FileOperationError, NotModifiedSinceFileOperationError } from '../../../../../platform/files/common/files.js';
import { DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { SaveSourceRegistry } from '../../../../common/editor.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { UTF16be } from '../../common/encoding.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
suite('Files - TextFileEditorModel', () => {
    function getLastModifiedTime(model) {
        const stat = getLastResolvedFileStat(model);
        return stat ? stat.mtime : -1;
    }
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let content;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        content = accessor.fileService.getContent();
        disposables.add(accessor.textFileService.files);
        disposables.add(toDisposable(() => accessor.fileService.setContent(content)));
    });
    teardown(async () => {
        for (const textFileEditorModel of accessor.textFileService.files.models) {
            textFileEditorModel.dispose();
        }
        disposables.clear();
    });
    test('basic events', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        let onDidResolveCounter = 0;
        disposables.add(model.onDidResolve(() => onDidResolveCounter++));
        await model.resolve();
        assert.strictEqual(onDidResolveCounter, 1);
        let onDidChangeContentCounter = 0;
        disposables.add(model.onDidChangeContent(() => onDidChangeContentCounter++));
        let onDidChangeDirtyCounter = 0;
        disposables.add(model.onDidChangeDirty(() => onDidChangeDirtyCounter++));
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.strictEqual(onDidChangeContentCounter, 1);
        assert.strictEqual(onDidChangeDirtyCounter, 1);
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.strictEqual(onDidChangeContentCounter, 2);
        assert.strictEqual(onDidChangeDirtyCounter, 1);
        await model.revert();
        assert.strictEqual(onDidChangeDirtyCounter, 2);
    });
    test('isTextFileEditorModel', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        assert.strictEqual(isTextFileEditorModel(model), true);
        model.dispose();
    });
    test('save', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        let savedEvent = undefined;
        disposables.add(model.onDidSave(e => savedEvent = e));
        await model.save();
        assert.ok(!savedEvent);
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.ok(getLastModifiedTime(model) <= Date.now());
        assert.ok(model.hasState(1 /* TextFileEditorModelState.DIRTY */));
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        const source = SaveSourceRegistry.registerSource('testSource', 'Hello Save');
        const pendingSave = model.save({ reason: 2 /* SaveReason.AUTO */, source });
        assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
        await Promise.all([pendingSave, model.joinState(2 /* TextFileEditorModelState.PENDING_SAVE */)]);
        assert.ok(model.hasState(0 /* TextFileEditorModelState.SAVED */));
        assert.ok(!model.isDirty());
        assert.ok(!model.isModified());
        assert.ok(savedEvent);
        assert.ok(savedEvent.stat);
        assert.strictEqual(savedEvent.reason, 2 /* SaveReason.AUTO */);
        assert.strictEqual(savedEvent.source, source);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
        savedEvent = undefined;
        await model.save({ force: true });
        assert.ok(savedEvent);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - touching also emits saved event', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        let savedEvent = false;
        disposables.add(model.onDidSave(() => savedEvent = true));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.save({ force: true });
        assert.ok(savedEvent);
        assert.ok(!workingCopyEvent);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - touching with error turns model dirty', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => saveErrorEvent = true));
        let savedEvent = false;
        disposables.add(model.onDidSave(() => savedEvent = true));
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            await model.save({ force: true });
            assert.ok(model.hasState(5 /* TextFileEditorModelState.ERROR */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        await model.save({ force: true });
        assert.ok(savedEvent);
        assert.strictEqual(model.isDirty(), false);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save - returns false when save fails', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            const res = await model.save({ force: true });
            assert.strictEqual(res, false);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        const res = await model.save({ force: true });
        assert.strictEqual(res, true);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('save error (generic)', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => saveErrorEvent = true));
        accessor.fileService.writeShouldThrowError = new Error('failed to write');
        try {
            const pendingSave = model.save();
            assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
            await pendingSave;
            assert.ok(model.hasState(5 /* TextFileEditorModelState.ERROR */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
            model.dispose();
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
    });
    test('save error (conflict)', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        let saveErrorEvent = false;
        disposables.add(model.onDidSaveError(() => saveErrorEvent = true));
        accessor.fileService.writeShouldThrowError = new FileOperationError('save conflict', 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
        try {
            const pendingSave = model.save();
            assert.ok(model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */));
            await pendingSave;
            assert.ok(model.hasState(3 /* TextFileEditorModelState.CONFLICT */));
            assert.ok(model.isDirty());
            assert.ok(model.isModified());
            assert.ok(saveErrorEvent);
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
            model.dispose();
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
    });
    test('setEncoding - encode', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        let encodingEvent = false;
        disposables.add(model.onDidChangeEncoding(() => encodingEvent = true));
        await model.setEncoding('utf8', 0 /* EncodingMode.Encode */); // no-op
        assert.strictEqual(getLastModifiedTime(model), -1);
        assert.ok(!encodingEvent);
        await model.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.ok(encodingEvent);
        assert.ok(getLastModifiedTime(model) <= Date.now()); // indicates model was saved due to encoding change
    });
    test('setEncoding - decode', async function () {
        let model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.setEncoding('utf16', 1 /* EncodingMode.Decode */);
        // we have to get the model again from working copy service
        // because `setEncoding` will resolve it again through the
        // text file service which is outside our scope
        model = accessor.workingCopyService.get(model);
        assert.ok(model.isResolved()); // model got resolved due to decoding
    });
    test('setEncoding - decode dirty file saves first', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('bar'));
        assert.strictEqual(model.isDirty(), true);
        await model.setEncoding('utf16', 1 /* EncodingMode.Decode */);
        assert.strictEqual(model.isDirty(), false);
    });
    test('encoding updates with language based configuration', async function () {
        const languageId = 'text-file-model-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        accessor.testConfigurationService.setOverrideIdentifiers('files.encoding', [languageId]);
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.resolve();
        const deferredPromise = new DeferredPromise();
        // We use this listener as a way to figure out that the working
        // copy was resolved again as part of the language change
        disposables.add(accessor.workingCopyService.onDidRegister(e => {
            if (isEqual(e.resource, model.resource)) {
                deferredPromise.complete(model);
            }
        }));
        accessor.testConfigurationService.setUserConfiguration('files.encoding', UTF16be);
        model.setLanguageId(languageId);
        await deferredPromise.p; // this asserts that the model was reloaded due to the language change
    });
    test('create with language', async function () {
        const languageId = 'text-file-model-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', languageId);
        await model.resolve();
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('disposes when underlying model is destroyed', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve();
        model.textEditorModel.dispose();
        assert.ok(model.isDisposed());
    });
    test('Resolve does not trigger save', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index.txt'), 'utf8', undefined);
        assert.ok(model.hasState(0 /* TextFileEditorModelState.SAVED */));
        disposables.add(model.onDidSave(() => assert.fail()));
        disposables.add(model.onDidChangeDirty(() => assert.fail()));
        await model.resolve();
        assert.ok(model.isResolved());
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('Resolve returns dirty model as long as model is dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.hasState(1 /* TextFileEditorModelState.DIRTY */));
        await model.resolve();
        assert.ok(model.isDirty());
    });
    test('Resolve with contents', async function () {
        const model = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined);
        await model.resolve({ contents: createTextBufferFactory('Hello World') });
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello World');
        assert.strictEqual(model.isDirty(), true);
        await model.resolve({ contents: createTextBufferFactory('Hello Changes') });
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello Changes');
        assert.strictEqual(model.isDirty(), true);
        // verify that we do not mark the model as saved when undoing once because
        // we never really had a saved state
        await model.textEditorModel.undo();
        assert.ok(model.isDirty());
        model.dispose();
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('Revert', async function () {
        let eventCounter = 0;
        let model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidRevert(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        accessor.workingCopyService.testUnregisterWorkingCopy(model); // causes issues with subsequent resolves otherwise
        await model.revert();
        // we have to get the model again from working copy service
        // because `setEncoding` will resolve it again through the
        // text file service which is outside our scope
        model = accessor.workingCopyService.get(model);
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(model.isModified(), false);
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
    });
    test('Revert (soft)', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidRevert(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        assert.ok(model.isModified());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
        await model.revert({ soft: true });
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(model.isModified(), false);
        assert.strictEqual(model.textEditorModel.getValue(), 'foo');
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), false);
    });
    test('Undo to saved state turns model non-dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('Hello Text'));
        assert.ok(model.isDirty());
        await model.textEditorModel.undo();
        assert.ok(!model.isDirty());
    });
    test('Resolve and undo turns model dirty', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        accessor.fileService.setContent('Hello Change');
        await model.resolve();
        await model.textEditorModel.undo();
        assert.ok(model.isDirty());
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(accessor.workingCopyService.isDirty(model.resource, model.typeId), true);
    });
    test('Update Dirty', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        model.setDirty(true);
        assert.ok(!model.isDirty()); // needs to be resolved
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        await model.revert({ soft: true });
        assert.strictEqual(model.isDirty(), false);
        disposables.add(model.onDidChangeDirty(() => eventCounter++));
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        model.setDirty(true);
        assert.ok(model.isDirty());
        assert.strictEqual(eventCounter, 1);
        assert.ok(workingCopyEvent);
        model.setDirty(false);
        assert.strictEqual(model.isDirty(), false);
        assert.strictEqual(eventCounter, 2);
    });
    test('No Dirty or saving for readonly models', async function () {
        let workingCopyEvent = false;
        disposables.add(accessor.workingCopyService.onDidChangeDirty(e => {
            if (e.resource.toString() === model.resource.toString()) {
                workingCopyEvent = true;
            }
        }));
        const model = disposables.add(instantiationService.createInstance(TestReadonlyTextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        let saveEvent = false;
        disposables.add(model.onDidSave(() => {
            saveEvent = true;
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(!model.isDirty());
        await model.save({ force: true });
        assert.strictEqual(saveEvent, false);
        await model.revert({ soft: true });
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyEvent);
    });
    test('File not modified error is handled gracefully', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        const mtime = getLastModifiedTime(model);
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('error', 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */));
        await model.resolve();
        assert.ok(model);
        assert.strictEqual(getLastModifiedTime(model), mtime);
    });
    test('stat.readonly and stat.locked can change when decreased mtime is ignored', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        const stat = assertIsDefined(getLastResolvedFileStat(model));
        accessor.textFileService.setReadStreamErrorOnce(new NotModifiedSinceFileOperationError('error', { ...stat, mtime: stat.mtime - 1, readonly: !stat.readonly, locked: !stat.locked }));
        await model.resolve();
        assert.ok(model);
        assert.strictEqual(getLastModifiedTime(model), stat.mtime, 'mtime should not decrease');
        assert.notStrictEqual(getLastResolvedFileStat(model)?.readonly, stat.readonly, 'readonly should have changed despite simultaneous attempt to decrease mtime');
        assert.notStrictEqual(getLastResolvedFileStat(model)?.locked, stat.locked, 'locked should have changed despite simultaneous attempt to decrease mtime');
    });
    test('Resolve error is handled gracefully if model already exists', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('error', 1 /* FileOperationResult.FILE_NOT_FOUND */));
        await model.resolve();
        assert.ok(model);
    });
    test('save() and isDirty() - proper with check for mtimes', async function () {
        const input1 = disposables.add(createFileEditorInput(instantiationService, toResource.call(this, '/path/index_async2.txt')));
        const input2 = disposables.add(createFileEditorInput(instantiationService, toResource.call(this, '/path/index_async.txt')));
        const model1 = disposables.add(await input1.resolve());
        const model2 = disposables.add(await input2.resolve());
        model1.updateTextEditorModel(createTextBufferFactory('foo'));
        const m1Mtime = assertIsDefined(getLastResolvedFileStat(model1)).mtime;
        const m2Mtime = assertIsDefined(getLastResolvedFileStat(model2)).mtime;
        assert.ok(m1Mtime > 0);
        assert.ok(m2Mtime > 0);
        assert.ok(accessor.textFileService.isDirty(toResource.call(this, '/path/index_async2.txt')));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        model2.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        await timeout(10);
        await accessor.textFileService.save(toResource.call(this, '/path/index_async.txt'));
        await accessor.textFileService.save(toResource.call(this, '/path/index_async2.txt'));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async.txt')));
        assert.ok(!accessor.textFileService.isDirty(toResource.call(this, '/path/index_async2.txt')));
        if (isWeb) {
            // web tests does not ensure timeouts are respected at all, so we cannot
            // really assert the mtime to be different, only that it is equal or greater.
            // https://github.com/microsoft/vscode/issues/161886
            assert.ok(assertIsDefined(getLastResolvedFileStat(model1)).mtime >= m1Mtime);
            assert.ok(assertIsDefined(getLastResolvedFileStat(model2)).mtime >= m2Mtime);
        }
        else {
            // on desktop we want to assert this condition more strictly though
            assert.ok(assertIsDefined(getLastResolvedFileStat(model1)).mtime > m1Mtime);
            assert.ok(assertIsDefined(getLastResolvedFileStat(model2)).mtime > m2Mtime);
        }
    });
    test('Save Participant', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidSave(() => {
            assert.strictEqual(snapshotToString(model.createSnapshot()), eventCounter === 1 ? 'bar' : 'foobar');
            assert.ok(!model.isDirty());
            eventCounter++;
        }));
        const participant = accessor.textFileService.files.addSaveParticipant({
            participate: async (model) => {
                assert.ok(model.isDirty());
                model.updateTextEditorModel(createTextBufferFactory('bar'));
                assert.ok(model.isDirty());
                eventCounter++;
            }
        });
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        assert.ok(model.isDirty());
        await model.save();
        assert.strictEqual(eventCounter, 2);
        participant.dispose();
        model.updateTextEditorModel(createTextBufferFactory('foobar'));
        assert.ok(model.isDirty());
        await model.save();
        assert.strictEqual(eventCounter, 3);
    });
    test('Save Participant - skip', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                eventCounter++;
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save({ skipSaveParticipants: true });
        assert.strictEqual(eventCounter, 0);
    });
    test('Save Participant, async participant', async function () {
        let eventCounter = 0;
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(model.onDidSave(() => {
            assert.ok(!model.isDirty());
            eventCounter++;
        }));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: model => {
                assert.ok(model.isDirty());
                model.updateTextEditorModel(createTextBufferFactory('bar'));
                assert.ok(model.isDirty());
                eventCounter++;
                return timeout(10);
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const now = Date.now();
        await model.save();
        assert.strictEqual(eventCounter, 2);
        assert.ok(Date.now() - now >= 10);
    });
    test('Save Participant, bad participant', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                new Error('boom');
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save();
    });
    test('Save Participant, participant cancelled when saved again', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        const participations = [];
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async (model, context, progress, token) => {
                await timeout(10);
                if (!token.isCancellationRequested) {
                    participations.push(true);
                }
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const p1 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 1'));
        const p2 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 2'));
        const p3 = model.save();
        model.updateTextEditorModel(createTextBufferFactory('foo 3'));
        const p4 = model.save();
        await Promise.all([p1, p2, p3, p4]);
        assert.strictEqual(participations.length, 1);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save, no model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, false, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save, no model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, true, false, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save, model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, true, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save, model change)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, true, true, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (force)', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await testSaveFromSaveParticipant(model, false, false, true);
    });
    async function testSaveFromSaveParticipant(model, async, modelChange, force) {
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async () => {
                if (async) {
                    await timeout(10);
                }
                if (modelChange) {
                    model.updateTextEditorModel(createTextBufferFactory('bar'));
                    const newSavePromise = model.save(force ? { force } : undefined);
                    // assert that this is not the same promise as the outer one
                    assert.notStrictEqual(savePromise, newSavePromise);
                    await newSavePromise;
                }
                else {
                    const newSavePromise = model.save(force ? { force } : undefined);
                    // assert that this is the same promise as the outer one
                    assert.strictEqual(savePromise, newSavePromise);
                    await savePromise;
                }
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        const savePromise = model.save(force ? { force } : undefined);
        await savePromise;
    }
    test('Save Participant carries context', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        const from = URI.file('testFrom');
        let e = undefined;
        disposables.add(accessor.textFileService.files.addSaveParticipant({
            participate: async (wc, context) => {
                try {
                    assert.strictEqual(context.reason, 1 /* SaveReason.EXPLICIT */);
                    assert.strictEqual(context.savedFrom?.toString(), from.toString());
                }
                catch (error) {
                    e = error;
                }
            }
        }));
        await model.resolve();
        model.updateTextEditorModel(createTextBufferFactory('foo'));
        await model.save({ force: true, from });
        if (e) {
            throw e;
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L2Jyb3dzZXIvdGV4dEZpbGVFZGl0b3JNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQTBDLGdCQUFnQixFQUFFLHFCQUFxQixFQUFpQyxNQUFNLDJCQUEyQixDQUFDO0FBQzNKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSwrQkFBK0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hNLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUvRyxPQUFPLEVBQXVCLGtCQUFrQixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUksT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RixPQUFPLEVBQWMsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFB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