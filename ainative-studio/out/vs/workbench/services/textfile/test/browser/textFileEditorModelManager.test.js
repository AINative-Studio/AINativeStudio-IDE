/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { FileChangesEvent, FileOperationError } from '../../../../../platform/files/common/files.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
suite('Files - TextFileEditorModelManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(toDisposable(() => accessor.textFileService.files));
    });
    teardown(() => {
        disposables.clear();
    });
    test('add, remove, clear, get, getAll', function () {
        const manager = accessor.textFileService.files;
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random1.txt'), 'utf8', undefined));
        const model2 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random2.txt'), 'utf8', undefined));
        const model3 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random3.txt'), 'utf8', undefined));
        manager.add(URI.file('/test.html'), model1);
        manager.add(URI.file('/some/other.html'), model2);
        manager.add(URI.file('/some/this.txt'), model3);
        const fileUpper = URI.file('/TEST.html');
        assert(!manager.get(URI.file('foo')));
        assert.strictEqual(manager.get(URI.file('/test.html')), model1);
        assert.ok(!manager.get(fileUpper));
        let results = manager.models;
        assert.strictEqual(3, results.length);
        let result = manager.get(URI.file('/yes'));
        assert.ok(!result);
        result = manager.get(URI.file('/some/other.txt'));
        assert.ok(!result);
        result = manager.get(URI.file('/some/other.html'));
        assert.ok(result);
        result = manager.get(fileUpper);
        assert.ok(!result);
        manager.remove(URI.file(''));
        results = manager.models;
        assert.strictEqual(3, results.length);
        manager.remove(URI.file('/some/other.html'));
        results = manager.models;
        assert.strictEqual(2, results.length);
        manager.remove(fileUpper);
        results = manager.models;
        assert.strictEqual(2, results.length);
        manager.dispose();
        results = manager.models;
        assert.strictEqual(0, results.length);
    });
    test('resolve', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        const encoding = 'utf8';
        const events = [];
        disposables.add(manager.onDidCreate(model => {
            events.push(model);
        }));
        const modelPromise = manager.resolve(resource, { encoding });
        assert.ok(manager.get(resource)); // model known even before resolved()
        const model1 = await modelPromise;
        assert.ok(model1);
        assert.strictEqual(model1.getEncoding(), encoding);
        assert.strictEqual(manager.get(resource), model1);
        const model2 = await manager.resolve(resource, { encoding });
        assert.strictEqual(model2, model1);
        model1.dispose();
        const model3 = await manager.resolve(resource, { encoding });
        assert.notStrictEqual(model3, model2);
        assert.strictEqual(manager.get(resource), model3);
        model3.dispose();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].resource.toString(), model1.resource.toString());
        assert.strictEqual(events[1].resource.toString(), model2.resource.toString());
    });
    test('resolve (async)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        manager.resolve(resource, { reload: { async: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model.resource.toString() === resource.toString()) {
                didResolve = true;
            }
        }));
        await manager.resolve(resource, { reload: { async: false } });
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync) - model disposed when error and first call to resolve', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        let error = undefined;
        try {
            disposables.add(await manager.resolve(resource));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.strictEqual(manager.models.length, 0);
    });
    test('resolve (sync) - model not disposed when error and model existed before', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        let error = undefined;
        try {
            disposables.add(await manager.resolve(resource, { reload: { async: false } }));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.strictEqual(manager.models.length, 1);
    });
    test('resolve with initial contents', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        const model = disposables.add(await manager.resolve(resource, { contents: createTextBufferFactory('Hello World') }));
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello World');
        assert.strictEqual(model.isDirty(), true);
        disposables.add(await manager.resolve(resource, { contents: createTextBufferFactory('More Changes') }));
        assert.strictEqual(model.textEditorModel?.getValue(), 'More Changes');
        assert.strictEqual(model.isDirty(), true);
    });
    test('multiple resolves execute in sequence', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        let resolvedModel;
        const contents = [];
        disposables.add(manager.onDidResolve(e => {
            if (e.model.resource.toString() === resource.toString()) {
                resolvedModel = disposables.add(e.model);
                contents.push(e.model.textEditorModel.getValue());
            }
        }));
        await Promise.all([
            manager.resolve(resource),
            manager.resolve(resource, { contents: createTextBufferFactory('Hello World') }),
            manager.resolve(resource, { reload: { async: false } }),
            manager.resolve(resource, { contents: createTextBufferFactory('More Changes') })
        ]);
        assert.ok(resolvedModel instanceof TextFileEditorModel);
        assert.strictEqual(resolvedModel.textEditorModel?.getValue(), 'More Changes');
        assert.strictEqual(resolvedModel.isDirty(), true);
        assert.strictEqual(contents[0], 'Hello Html');
        assert.strictEqual(contents[1], 'Hello World');
        assert.strictEqual(contents[2], 'More Changes');
    });
    test('removed from cache when model disposed', function () {
        const manager = accessor.textFileService.files;
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random1.txt'), 'utf8', undefined));
        const model2 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random2.txt'), 'utf8', undefined));
        const model3 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random3.txt'), 'utf8', undefined));
        manager.add(URI.file('/test.html'), model1);
        manager.add(URI.file('/some/other.html'), model2);
        manager.add(URI.file('/some/this.txt'), model3);
        assert.strictEqual(manager.get(URI.file('/test.html')), model1);
        model1.dispose();
        assert(!manager.get(URI.file('/test.html')));
    });
    test('events', async function () {
        const manager = accessor.textFileService.files;
        const resource1 = toResource.call(this, '/path/index.txt');
        const resource2 = toResource.call(this, '/path/other.txt');
        let resolvedCounter = 0;
        let removedCounter = 0;
        let gotDirtyCounter = 0;
        let gotNonDirtyCounter = 0;
        let revertedCounter = 0;
        let savedCounter = 0;
        let encodingCounter = 0;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model.resource.toString() === resource1.toString()) {
                resolvedCounter++;
            }
        }));
        disposables.add(manager.onDidRemove(resource => {
            if (resource.toString() === resource1.toString() || resource.toString() === resource2.toString()) {
                removedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeDirty(model => {
            if (model.resource.toString() === resource1.toString()) {
                if (model.isDirty()) {
                    gotDirtyCounter++;
                }
                else {
                    gotNonDirtyCounter++;
                }
            }
        }));
        disposables.add(manager.onDidRevert(model => {
            if (model.resource.toString() === resource1.toString()) {
                revertedCounter++;
            }
        }));
        disposables.add(manager.onDidSave(({ model }) => {
            if (model.resource.toString() === resource1.toString()) {
                savedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeEncoding(model => {
            if (model.resource.toString() === resource1.toString()) {
                encodingCounter++;
            }
        }));
        const model1 = await manager.resolve(resource1, { encoding: 'utf8' });
        assert.strictEqual(resolvedCounter, 1);
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 2 /* FileChangeType.DELETED */ }], false));
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 1 /* FileChangeType.ADDED */ }], false));
        const model2 = await manager.resolve(resource2, { encoding: 'utf8' });
        assert.strictEqual(resolvedCounter, 2);
        model1.updateTextEditorModel(createTextBufferFactory('changed'));
        model1.updatePreferredEncoding('utf16');
        await model1.revert();
        model1.updateTextEditorModel(createTextBufferFactory('changed again'));
        await model1.save();
        model1.dispose();
        model2.dispose();
        await model1.revert();
        assert.strictEqual(removedCounter, 2);
        assert.strictEqual(gotDirtyCounter, 2);
        assert.strictEqual(gotNonDirtyCounter, 2);
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(encodingCounter, 2);
        model1.dispose();
        model2.dispose();
        assert.ok(!accessor.modelService.getModel(resource1));
        assert.ok(!accessor.modelService.getModel(resource2));
    });
    test('disposing model takes it out of the manager', async function () {
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        const model = await manager.resolve(resource, { encoding: 'utf8' });
        model.dispose();
        assert.ok(!manager.get(resource));
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('canDispose with dirty model', async function () {
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        const model = disposables.add(await manager.resolve(resource, { encoding: 'utf8' }));
        model.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const canDisposePromise = manager.canDispose(model);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        model.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = manager.canDispose(model);
        assert.strictEqual(canDispose2, true);
    });
    test('language', async function () {
        const languageId = 'text-file-model-manager-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        let model = disposables.add(await manager.resolve(resource, { languageId: languageId }));
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        model = await manager.resolve(resource, { languageId: 'text' });
        assert.strictEqual(model.textEditorModel.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    test('file change events trigger reload (on a resolved model)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('file change events trigger reload (after a model is resolved: https://github.com/microsoft/vscode/issues/132765)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        manager.resolve(resource);
        let didResolve = false;
        let resolvedCounter = 0;
        const onDidResolve = new Promise(resolve => {
            disposables.add(manager.onDidResolve(({ model }) => {
                disposables.add(model);
                if (model.resource.toString() === resource.toString()) {
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
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL3RleHRGaWxlRWRpdG9yTW9kZWxNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQW1DLE1BQU0sbURBQW1ELENBQUM7QUFDeEosT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFrQixrQkFBa0IsRUFBdUIsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxSSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFeEYsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUVoRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElBQUksb0JBQTJDLENBQUM7SUFDaEQsSUFBSSxRQUE2QixDQUFDO0lBRWxDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixv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