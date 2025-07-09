/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../workbenchTestServices.js';
import { snapshotToString } from '../../../../services/textfile/common/textfiles.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('TextResourceEditorInput', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(snapshotToString((model.createSnapshot())), 'function test() {}');
    });
    test('preferred language (via ctor)', async () => {
        const registration = accessor.languageService.registerLanguage({
            id: 'resource-input-test',
        });
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', 'resource-input-test', undefined));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getLanguageId(), 'resource-input-test');
        input.setLanguageId('text');
        assert.strictEqual(model.textEditorModel?.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        registration.dispose();
    });
    test('preferred language (via setPreferredLanguageId)', async () => {
        const registration = accessor.languageService.registerLanguage({
            id: 'resource-input-test',
        });
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        input.setPreferredLanguageId('resource-input-test');
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getLanguageId(), 'resource-input-test');
        registration.dispose();
    });
    test('preferred contents (via ctor)', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, 'My Resource Input Contents'));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getValue(), 'My Resource Input Contents');
        model.textEditorModel.setValue('Some other contents');
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents');
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents'); // preferred contents only used once
    });
    test('preferred contents (via setPreferredContents)', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        input.setPreferredContents('My Resource Input Contents');
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getValue(), 'My Resource Input Contents');
        model.textEditorModel.setValue('Some other contents');
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents');
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents'); // preferred contents only used once
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci90ZXh0UmVzb3VyY2VFZGl0b3JJbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHL0YsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFFckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUUxQyxJQUFJLG9CQUEyQyxDQUFDO0lBQ2hELElBQUksUUFBNkIsQ0FBQztJQUVsQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzdFLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEs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