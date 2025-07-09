/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { join } from '../../../../../base/common/path.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../../../test/browser/workbenchTestServices.js';
import { snapshotToString } from '../../../textfile/common/textfiles.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { UntitledTextEditorInput } from '../../common/untitledTextEditorInput.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isReadable, isReadableStream } from '../../../../../base/common/stream.js';
import { readableToBuffer, streamToBuffer } from '../../../../../base/common/buffer.js';
import { LanguageDetectionLanguageEventSource } from '../../../languageDetection/common/languageDetectionWorkerService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { timeout } from '../../../../../base/common/async.js';
suite('Untitled text editors', () => {
    class TestUntitledTextEditorInput extends UntitledTextEditorInput {
        getModel() { return this.model; }
    }
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const events = [];
        disposables.add(service.onDidCreate(model => {
            events.push(model);
        }));
        const input1 = instantiationService.createInstance(TestUntitledTextEditorInput, service.create());
        await input1.resolve();
        assert.strictEqual(service.get(input1.resource), input1.getModel());
        assert.ok(!accessor.untitledTextEditorService.isUntitledWithAssociatedResource(input1.resource));
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].resource.toString(), input1.getModel().resource.toString());
        assert.ok(service.get(input1.resource));
        assert.ok(!service.get(URI.file('testing')));
        assert.ok(input1.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input1.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input1.isReadonly());
        assert.ok(!input1.hasCapability(8 /* EditorInputCapabilities.Singleton */));
        assert.ok(!input1.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */));
        assert.ok(!input1.hasCapability(512 /* EditorInputCapabilities.Scratchpad */));
        const input2 = instantiationService.createInstance(TestUntitledTextEditorInput, service.create());
        assert.strictEqual(service.get(input2.resource), input2.getModel());
        // toUntyped()
        const untypedInput = input1.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.forceUntitled, true);
        // get()
        assert.strictEqual(service.get(input1.resource), input1.getModel());
        assert.strictEqual(service.get(input2.resource), input2.getModel());
        // revert()
        await input1.revert(0);
        assert.ok(input1.isDisposed());
        assert.ok(!service.get(input1.resource));
        // dirty
        const model = await input2.resolve();
        assert.strictEqual(await service.resolve({ untitledResource: input2.resource }), model);
        assert.ok(service.get(model.resource));
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1].resource.toString(), input2.resource.toString());
        assert.ok(!input2.isDirty());
        const resourcePromise = awaitDidChangeDirty(accessor.untitledTextEditorService);
        model.textEditorModel?.setValue('foo bar');
        const resource = await resourcePromise;
        assert.strictEqual(resource.toString(), input2.resource.toString());
        assert.ok(input2.isDirty());
        const dirtyUntypedInput = input2.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(dirtyUntypedInput.contents, 'foo bar');
        assert.strictEqual(dirtyUntypedInput.resource, undefined);
        const dirtyUntypedInputWithResource = input2.toUntyped({ preserveViewState: 0, preserveResource: true });
        assert.strictEqual(dirtyUntypedInputWithResource.contents, 'foo bar');
        assert.strictEqual(dirtyUntypedInputWithResource?.resource?.toString(), input2.resource.toString());
        const dirtyUntypedInputWithoutContent = input2.toUntyped();
        assert.strictEqual(dirtyUntypedInputWithoutContent.resource?.toString(), input2.resource.toString());
        assert.strictEqual(dirtyUntypedInputWithoutContent.contents, undefined);
        assert.ok(workingCopyService.isDirty(input2.resource));
        assert.strictEqual(workingCopyService.dirtyCount, 1);
        await input1.revert(0);
        await input2.revert(0);
        assert.ok(!service.get(input1.resource));
        assert.ok(!service.get(input2.resource));
        assert.ok(!input2.isDirty());
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyService.isDirty(input2.resource));
        assert.strictEqual(workingCopyService.dirtyCount, 0);
        await input1.revert(0);
        assert.ok(input1.isDisposed());
        assert.ok(!service.get(input1.resource));
        input2.dispose();
        assert.ok(!service.get(input2.resource));
    });
    function awaitDidChangeDirty(service) {
        return new Promise(resolve => {
            const listener = service.onDidChangeDirty(async (model) => {
                listener.dispose();
                resolve(model.resource);
            });
        });
    }
    test('associated resource is dirty', async () => {
        const service = accessor.untitledTextEditorService;
        const file = URI.file(join('C:\\', '/foo/file.txt'));
        let onDidChangeDirtyModel = undefined;
        disposables.add(service.onDidChangeDirty(model => {
            onDidChangeDirtyModel = model;
        }));
        const model = disposables.add(service.create({ associatedResource: file }));
        assert.ok(accessor.untitledTextEditorService.isUntitledWithAssociatedResource(model.resource));
        const untitled = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        assert.ok(untitled.isDirty());
        assert.strictEqual(model, onDidChangeDirtyModel);
        const resolvedModel = await untitled.resolve();
        assert.ok(resolvedModel.hasAssociatedFilePath);
        assert.strictEqual(untitled.isDirty(), true);
    });
    test('no longer dirty when content gets empty (not with associated resource)', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        // dirty
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo bar');
        assert.ok(model.isDirty());
        assert.ok(workingCopyService.isDirty(model.resource, model.typeId));
        model.textEditorModel?.setValue('');
        assert.ok(!model.isDirty());
        assert.ok(!workingCopyService.isDirty(model.resource, model.typeId));
    });
    test('via create options', async () => {
        const service = accessor.untitledTextEditorService;
        const input1 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model1 = disposables.add(await input1.resolve());
        model1.textEditorModel.setValue('foo bar');
        assert.ok(model1.isDirty());
        model1.textEditorModel.setValue('');
        assert.ok(!model1.isDirty());
        const input2 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ initialValue: 'Hello World' })));
        const model2 = disposables.add(await input2.resolve());
        assert.strictEqual(snapshotToString(model2.createSnapshot()), 'Hello World');
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, disposables.add(service.create())));
        const input3 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ untitledResource: input.resource })));
        const model3 = disposables.add(await input3.resolve());
        assert.strictEqual(model3.resource.toString(), input.resource.toString());
        const file = URI.file(join('C:\\', '/foo/file44.txt'));
        const input4 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ associatedResource: file })));
        const model4 = disposables.add(await input4.resolve());
        assert.ok(model4.hasAssociatedFilePath);
        assert.ok(model4.isDirty());
    });
    test('associated path remains dirty when content gets empty', async () => {
        const service = accessor.untitledTextEditorService;
        const file = URI.file(join('C:\\', '/foo/file.txt'));
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ associatedResource: file })));
        // dirty
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo bar');
        assert.ok(model.isDirty());
        model.textEditorModel?.setValue('');
        assert.ok(model.isDirty());
    });
    test('initial content is dirty', async () => {
        const service = accessor.untitledTextEditorService;
        const workingCopyService = accessor.workingCopyService;
        const untitled = disposables.add(instantiationService.createInstance(TestUntitledTextEditorInput, service.create({ initialValue: 'Hello World' })));
        assert.ok(untitled.isDirty());
        const backup = (await untitled.getModel().backup(CancellationToken.None)).content;
        if (isReadableStream(backup)) {
            const value = await streamToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello World');
        }
        else if (isReadable(backup)) {
            const value = readableToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello World');
        }
        else {
            assert.fail('Missing untitled backup');
        }
        // dirty
        const model = disposables.add(await untitled.resolve());
        assert.ok(model.isDirty());
        assert.strictEqual(workingCopyService.dirtyCount, 1);
    });
    test('created with files.defaultLanguage setting', () => {
        const defaultLanguage = 'javascript';
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { 'defaultLanguage': defaultLanguage });
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(service.create());
        assert.strictEqual(input.getLanguageId(), defaultLanguage);
        config.setUserConfiguration('files', { 'defaultLanguage': undefined });
    });
    test('created with files.defaultLanguage setting (${activeEditorLanguage})', async () => {
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { 'defaultLanguage': '${activeEditorLanguage}' });
        accessor.editorService.activeTextEditorLanguageId = 'typescript';
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        assert.strictEqual(model.getLanguageId(), 'typescript');
        config.setUserConfiguration('files', { 'defaultLanguage': undefined });
        accessor.editorService.activeTextEditorLanguageId = undefined;
    });
    test('created with language overrides files.defaultLanguage setting', () => {
        const language = 'typescript';
        const defaultLanguage = 'javascript';
        const config = accessor.testConfigurationService;
        config.setUserConfiguration('files', { 'defaultLanguage': defaultLanguage });
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(service.create({ languageId: language }));
        assert.strictEqual(input.getLanguageId(), language);
        config.setUserConfiguration('files', { 'defaultLanguage': undefined });
    });
    test('can change language afterwards', async () => {
        const languageId = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ languageId: languageId })));
        assert.strictEqual(input.getLanguageId(), languageId);
        const model = disposables.add(await input.resolve());
        assert.strictEqual(model.getLanguageId(), languageId);
        input.setLanguageId(PLAINTEXT_LANGUAGE_ID);
        assert.strictEqual(input.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    test('remembers that language was set explicitly', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        assert.ok(!input.hasLanguageSetExplicitly);
        input.setLanguageId(PLAINTEXT_LANGUAGE_ID);
        assert.ok(input.hasLanguageSetExplicitly);
        assert.strictEqual(input.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    // Issue #159202
    test('remembers that language was set explicitly if set by another source (i.e. ModelService)', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        disposables.add(await input.resolve());
        assert.ok(!input.hasLanguageSetExplicitly);
        model.textEditorModel.setLanguage(accessor.languageService.createById(language));
        assert.ok(input.hasLanguageSetExplicitly);
        assert.strictEqual(model.getLanguageId(), language);
    });
    test('Language is not set explicitly if set by language detection source', async () => {
        const language = 'untitled-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: language,
        }));
        const service = accessor.untitledTextEditorService;
        const model = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, model));
        await input.resolve();
        assert.ok(!input.hasLanguageSetExplicitly);
        model.textEditorModel.setLanguage(accessor.languageService.createById(language), 
        // This is really what this is testing
        LanguageDetectionLanguageEventSource);
        assert.ok(!input.hasLanguageSetExplicitly);
        assert.strictEqual(model.getLanguageId(), language);
    });
    test('service#onDidChangeEncoding', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onDidChangeEncoding(model => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        // encoding
        const model = disposables.add(await input.resolve());
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1);
    });
    test('service#onDidChangeLabel', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onDidChangeLabel(model => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        // label
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('Foo Bar');
        assert.strictEqual(counter, 1);
    });
    test('service#onWillDispose', async () => {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        disposables.add(service.onWillDispose(model => {
            counter++;
            assert.strictEqual(model.resource.toString(), input.resource.toString());
        }));
        const model = disposables.add(await input.resolve());
        assert.strictEqual(counter, 0);
        model.dispose();
        assert.strictEqual(counter, 1);
    });
    test('service#getValue', async () => {
        const service = accessor.untitledTextEditorService;
        const input1 = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model1 = disposables.add(await input1.resolve());
        model1.textEditorModel.setValue('foo bar');
        assert.strictEqual(service.getValue(model1.resource), 'foo bar');
        model1.dispose();
        // When a model doesn't exist, it should return undefined
        assert.strictEqual(service.getValue(URI.parse('https://www.microsoft.com')), undefined);
    });
    test('model#onDidChangeContent', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeContent(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(counter, 2, 'Content change when dirty should trigger event');
        model.textEditorModel?.setValue('');
        assert.strictEqual(counter, 3, 'Manual revert should trigger event');
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 4, 'Dirty model should trigger event');
    });
    test('model#onDidRevert and input disposed when reverted', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidRevert(() => counter++));
        model.textEditorModel?.setValue('foo');
        await model.revert();
        assert.ok(input.isDisposed());
        assert.ok(counter === 1);
    });
    test('model#onDidChangeName and input name', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        let model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeName(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(input.getName(), 'foo');
        assert.strictEqual(model.name, 'foo');
        assert.strictEqual(counter, 1);
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(input.getName(), 'bar');
        assert.strictEqual(model.name, 'bar');
        assert.strictEqual(counter, 2);
        model.textEditorModel?.setValue('');
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('        ');
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('([]}'); // require actual words
        assert.strictEqual(input.getName(), 'Untitled-1');
        assert.strictEqual(model.name, 'Untitled-1');
        model.textEditorModel?.setValue('([]}hello   '); // require actual words
        assert.strictEqual(input.getName(), '([]}hello');
        assert.strictEqual(model.name, '([]}hello');
        model.textEditorModel?.setValue('12345678901234567890123456789012345678901234567890'); // trimmed at 40chars max
        assert.strictEqual(input.getName(), '1234567890123456789012345678901234567890');
        assert.strictEqual(model.name, '1234567890123456789012345678901234567890');
        model.textEditorModel?.setValue('123456789012345678901234567890123456789🌞'); // do not break grapehems (#111235)
        assert.strictEqual(input.getName(), '123456789012345678901234567890123456789');
        assert.strictEqual(model.name, '123456789012345678901234567890123456789');
        model.textEditorModel?.setValue('hello\u202Eworld'); // do not allow RTL in names (#190133)
        assert.strictEqual(input.getName(), 'helloworld');
        assert.strictEqual(model.name, 'helloworld');
        assert.strictEqual(counter, 7);
        model.textEditorModel?.setValue('Hello\nWorld');
        assert.strictEqual(counter, 8);
        function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
            const range = new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn);
            return {
                range,
                text,
                forceMoveMarkers: false
            };
        }
        model.textEditorModel?.applyEdits([createSingleEditOp('hello', 2, 2)]);
        assert.strictEqual(counter, 8); // change was not on first line
        input.dispose();
        model.dispose();
        const inputWithContents = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create({ initialValue: 'Foo' })));
        model = disposables.add(await inputWithContents.resolve());
        assert.strictEqual(inputWithContents.getName(), 'Foo');
    });
    test('model#onDidChangeDirty', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeDirty(() => counter++));
        model.textEditorModel?.setValue('foo');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        model.textEditorModel?.setValue('bar');
        assert.strictEqual(counter, 1, 'Another change does not fire event');
    });
    test('model#onDidChangeEncoding', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        let counter = 0;
        const model = disposables.add(await input.resolve());
        disposables.add(model.onDidChangeEncoding(() => counter++));
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1, 'Dirty model should trigger event');
        await model.setEncoding('utf16');
        assert.strictEqual(counter, 1, 'Another change to same encoding does not fire event');
    });
    test('canDispose with dirty model', async function () {
        const service = accessor.untitledTextEditorService;
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const model = disposables.add(await input.resolve());
        model.textEditorModel?.setValue('foo');
        const canDisposePromise = service.canDispose(model);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        model.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = service.canDispose(model);
        assert.strictEqual(canDispose2, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VudGl0bGVkL3Rlc3QvYnJvd3Nlci91bnRpdGxlZFRleHRFZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUcxRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUE0QyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzNILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9B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