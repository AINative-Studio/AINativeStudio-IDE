/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { TextFileEditorModel } from '../../../textfile/common/textFileEditorModel.js';
import { snapshotToString } from '../../../textfile/common/textfiles.js';
import { Event } from '../../../../../base/common/event.js';
import { timeout } from '../../../../../base/common/async.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Workbench - TextModelResolverService', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('resolve resource', async () => {
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async function (resource) {
                if (resource.scheme === 'test') {
                    const modelContent = 'Hello Test';
                    const languageSelection = accessor.languageService.createById('json');
                    return accessor.modelService.createModel(modelContent, languageSelection, resource);
                }
                return null;
            }
        }));
        const resource = URI.from({ scheme: 'test', authority: null, path: 'thePath' });
        const input = instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined);
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(snapshotToString((model.createSnapshot())), 'Hello Test');
        let disposed = false;
        const disposedPromise = new Promise(resolve => {
            Event.once(model.onWillDispose)(() => {
                disposed = true;
                resolve();
            });
        });
        input.dispose();
        await disposedPromise;
        assert.strictEqual(disposed, true);
    });
    test('resolve file', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        const ref = await accessor.textModelResolverService.createModelReference(textModel.resource);
        const model = ref.object;
        const editorModel = model.textEditorModel;
        assert.ok(editorModel);
        assert.strictEqual(editorModel.getValue(), 'Hello Html');
        let disposed = false;
        Event.once(model.onWillDispose)(() => {
            disposed = true;
        });
        ref.dispose();
        await timeout(0); // due to the reference resolving the model first which is async
        assert.strictEqual(disposed, true);
    });
    test('resolved dirty file eventually disposes', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        textModel.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const ref = await accessor.textModelResolverService.createModelReference(textModel.resource);
        let disposed = false;
        Event.once(textModel.onWillDispose)(() => {
            disposed = true;
        });
        ref.dispose();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because model still dirty
        textModel.revert();
        await timeout(0);
        assert.strictEqual(disposed, true); // now disposed because model got reverted
    });
    test('resolved dirty file does not dispose when new reference created', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        textModel.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const ref1 = await accessor.textModelResolverService.createModelReference(textModel.resource);
        let disposed = false;
        Event.once(textModel.onWillDispose)(() => {
            disposed = true;
        });
        ref1.dispose();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because model still dirty
        const ref2 = await accessor.textModelResolverService.createModelReference(textModel.resource);
        textModel.revert();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because we got another ref meanwhile
        ref2.dispose();
        await timeout(0);
        assert.strictEqual(disposed, true); // now disposed because last ref got disposed
    });
    test('resolve untitled', async () => {
        const service = accessor.untitledTextEditorService;
        const untitledModel = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, untitledModel));
        await input.resolve();
        const ref = await accessor.textModelResolverService.createModelReference(input.resource);
        const model = ref.object;
        assert.strictEqual(untitledModel, model);
        const editorModel = model.textEditorModel;
        assert.ok(editorModel);
        ref.dispose();
        input.dispose();
        model.dispose();
    });
    test('even loading documents should be refcounted', async () => {
        let resolveModel;
        const waitForIt = new Promise(resolve => resolveModel = resolve);
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async (resource) => {
                await waitForIt;
                const modelContent = 'Hello Test';
                const languageSelection = accessor.languageService.createById('json');
                return disposables.add(accessor.modelService.createModel(modelContent, languageSelection, resource));
            }
        }));
        const uri = URI.from({ scheme: 'test', authority: null, path: 'thePath' });
        const modelRefPromise1 = accessor.textModelResolverService.createModelReference(uri);
        const modelRefPromise2 = accessor.textModelResolverService.createModelReference(uri);
        resolveModel();
        const modelRef1 = await modelRefPromise1;
        const model1 = modelRef1.object;
        const modelRef2 = await modelRefPromise2;
        const model2 = modelRef2.object;
        const textModel = model1.textEditorModel;
        assert.strictEqual(model1, model2, 'they are the same model');
        assert(!textModel.isDisposed(), 'the text model should not be disposed');
        modelRef1.dispose();
        assert(!textModel.isDisposed(), 'the text model should still not be disposed');
        const p1 = new Promise(resolve => disposables.add(textModel.onWillDispose(resolve)));
        modelRef2.dispose();
        await p1;
        assert(textModel.isDisposed(), 'the text model should finally be disposed');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRtb2RlbFJlc29sdmVyL3Rlc3QvYnJvd3Nlci90ZXh0TW9kZWxSZXNvbHZlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRy9GLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBbUMsTUFBTSxtREFBbUQsQ0FBQztBQUN4SixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUVsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElB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