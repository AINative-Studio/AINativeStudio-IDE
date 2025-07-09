/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { FileEditorInput } from '../../browser/editors/fileEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor, getLastResolvedFileStat } from '../../../../test/browser/workbenchTestServices.js';
import { EditorExtensions } from '../../../../common/editor.js';
import { TextFileOperationError } from '../../../../services/textfile/common/textfiles.js';
import { NotModifiedSinceFileOperationError, TooLargeFileOperationError } from '../../../../../platform/files/common/files.js';
import { TextFileEditorModel } from '../../../../services/textfile/common/textFileEditorModel.js';
import { timeout } from '../../../../../base/common/async.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { FileEditorInputSerializer } from '../../browser/editors/fileEditorHandler.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TextEditorService } from '../../../../services/textfile/common/textEditorService.js';
suite('Files - FileEditorInput', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    function createFileInput(resource, preferredResource, preferredLanguageId, preferredName, preferredDescription, preferredContents) {
        return disposables.add(instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, undefined, preferredLanguageId, preferredContents));
    }
    class TestTextEditorService extends TextEditorService {
        createTextEditor(input) {
            return createFileInput(input.resource);
        }
        async resolveTextEditor(input) {
            return createFileInput(input.resource);
        }
    }
    setup(() => {
        instantiationService = workbenchInstantiationService({
            textEditorService: instantiationService => instantiationService.createInstance(TestTextEditorService)
        }, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('Basics', async function () {
        let input = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        const otherInput = createFileInput(toResource.call(this, 'foo/bar/otherfile.js'));
        const otherInputSame = createFileInput(toResource.call(this, 'foo/bar/file.js'));
        assert(input.matches(input));
        assert(input.matches(otherInputSame));
        assert(!input.matches(otherInput));
        assert.ok(input.getName());
        assert.ok(input.getDescription());
        assert.ok(input.getTitle(0 /* Verbosity.SHORT */));
        assert.ok(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input.isReadonly());
        assert.ok(!input.hasCapability(8 /* EditorInputCapabilities.Singleton */));
        assert.ok(!input.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */));
        const untypedInput = input.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.resource.toString(), input.resource.toString());
        assert.strictEqual('file.js', input.getName());
        assert.strictEqual(toResource.call(this, '/foo/bar/file.js').fsPath, input.resource.fsPath);
        assert(input.resource instanceof URI);
        input = createFileInput(toResource.call(this, '/foo/bar.html'));
        const inputToResolve = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        const sameOtherInput = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        let resolved = await inputToResolve.resolve();
        assert.ok(inputToResolve.isResolved());
        const resolvedModelA = resolved;
        resolved = await inputToResolve.resolve();
        assert(resolvedModelA === resolved); // OK: Resolved Model cached globally per input
        try {
            DisposableStore.DISABLE_DISPOSED_WARNING = true; // prevent unwanted warning output from occurring
            const otherResolved = await sameOtherInput.resolve();
            assert(otherResolved === resolvedModelA); // OK: Resolved Model cached globally per input
            inputToResolve.dispose();
            resolved = await inputToResolve.resolve();
            assert(resolvedModelA === resolved); // Model is still the same because we had 2 clients
            inputToResolve.dispose();
            sameOtherInput.dispose();
            resolvedModelA.dispose();
            resolved = await inputToResolve.resolve();
            assert(resolvedModelA !== resolved); // Different instance, because input got disposed
            const stat = getLastResolvedFileStat(resolved);
            resolved = await inputToResolve.resolve();
            await timeout(0);
            assert(stat !== getLastResolvedFileStat(resolved)); // Different stat, because resolve always goes to the server for refresh
        }
        finally {
            DisposableStore.DISABLE_DISPOSED_WARNING = false;
        }
    });
    test('reports as untitled without supported file scheme', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js').with({ scheme: 'someTestingScheme' }));
        assert.ok(input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(!input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(!input.isReadonly());
    });
    test('reports as readonly with readonly file scheme', async function () {
        const inMemoryFilesystemProvider = disposables.add(new InMemoryFileSystemProvider());
        inMemoryFilesystemProvider.setReadOnly(true);
        disposables.add(accessor.fileService.registerProvider('someTestingReadonlyScheme', inMemoryFilesystemProvider));
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js').with({ scheme: 'someTestingReadonlyScheme' }));
        assert.ok(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        assert.ok(input.hasCapability(2 /* EditorInputCapabilities.Readonly */));
        assert.ok(input.isReadonly());
    });
    test('preferred resource', function () {
        const resource = toResource.call(this, '/foo/bar/updatefile.js');
        const preferredResource = toResource.call(this, '/foo/bar/UPDATEFILE.js');
        const inputWithoutPreferredResource = createFileInput(resource);
        assert.strictEqual(inputWithoutPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithoutPreferredResource.preferredResource.toString(), resource.toString());
        const inputWithPreferredResource = createFileInput(resource, preferredResource);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), preferredResource.toString());
        let didChangeLabel = false;
        disposables.add(inputWithPreferredResource.onDidChangeLabel(e => {
            didChangeLabel = true;
        }));
        assert.strictEqual(inputWithPreferredResource.getName(), 'UPDATEFILE.js');
        const otherPreferredResource = toResource.call(this, '/FOO/BAR/updateFILE.js');
        inputWithPreferredResource.setPreferredResource(otherPreferredResource);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), otherPreferredResource.toString());
        assert.strictEqual(inputWithPreferredResource.getName(), 'updateFILE.js');
        assert.strictEqual(didChangeLabel, true);
    });
    test('preferred language', async function () {
        const languageId = 'file-input-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js'), undefined, languageId);
        assert.strictEqual(input.getPreferredLanguageId(), languageId);
        const model = disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        input.setLanguageId('text');
        assert.strictEqual(input.getPreferredLanguageId(), 'text');
        assert.strictEqual(model.textEditorModel.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        const input2 = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        input2.setPreferredLanguageId(languageId);
        const model2 = disposables.add(await input2.resolve());
        assert.strictEqual(model2.textEditorModel.getLanguageId(), languageId);
    });
    test('preferred contents', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/file.js'), undefined, undefined, undefined, undefined, 'My contents');
        const model = disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel.getValue(), 'My contents');
        assert.strictEqual(input.isDirty(), true);
        const untypedInput = input.toUntyped({ preserveViewState: 0 });
        assert.strictEqual(untypedInput.contents, 'My contents');
        const untypedInputWithoutContents = input.toUntyped();
        assert.strictEqual(untypedInputWithoutContents.contents, undefined);
        input.setPreferredContents('Other contents');
        await input.resolve();
        assert.strictEqual(model.textEditorModel.getValue(), 'Other contents');
        model.textEditorModel?.setValue('Changed contents');
        await input.resolve();
        assert.strictEqual(model.textEditorModel.getValue(), 'Changed contents'); // preferred contents only used once
        const input2 = createFileInput(toResource.call(this, '/foo/bar/file.js'));
        input2.setPreferredContents('My contents');
        const model2 = await input2.resolve();
        assert.strictEqual(model2.textEditorModel.getValue(), 'My contents');
        assert.strictEqual(input2.isDirty(), true);
    });
    test('matches', function () {
        const input1 = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const input2 = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const input3 = createFileInput(toResource.call(this, '/foo/bar/other.js'));
        const input2Upper = createFileInput(toResource.call(this, '/foo/bar/UPDATEFILE.js'));
        assert.strictEqual(input1.matches(input1), true);
        assert.strictEqual(input1.matches(input2), true);
        assert.strictEqual(input1.matches(input3), false);
        assert.strictEqual(input1.matches(input2Upper), false);
    });
    test('getEncoding/setEncoding', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        await input.setEncoding('utf16', 0 /* EncodingMode.Encode */);
        assert.strictEqual(input.getEncoding(), 'utf16');
        const resolved = disposables.add(await input.resolve());
        assert.strictEqual(input.getEncoding(), resolved.getEncoding());
    });
    test('save', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const resolved = disposables.add(await input.resolve());
        resolved.textEditorModel.setValue('changed');
        assert.ok(input.isDirty());
        assert.ok(input.isModified());
        await input.save(0);
        assert.ok(!input.isDirty());
        assert.ok(!input.isModified());
    });
    test('revert', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        const resolved = disposables.add(await input.resolve());
        resolved.textEditorModel.setValue('changed');
        assert.ok(input.isDirty());
        assert.ok(input.isModified());
        await input.revert(0);
        assert.ok(!input.isDirty());
        assert.ok(!input.isModified());
        input.dispose();
        assert.ok(input.isDisposed());
    });
    test('resolve handles binary files', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        accessor.textFileService.setReadStreamErrorOnce(new TextFileOperationError('error', 0 /* TextFileOperationResult.FILE_IS_BINARY */));
        const resolved = disposables.add(await input.resolve());
        assert.ok(resolved);
    });
    test('resolve throws for too large files', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let e = undefined;
        accessor.textFileService.setReadStreamErrorOnce(new TooLargeFileOperationError('error', 7 /* FileOperationResult.FILE_TOO_LARGE */, 1000));
        try {
            await input.resolve();
        }
        catch (error) {
            e = error;
        }
        assert.ok(e);
    });
    test('attaches to model when created and reports dirty', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let listenerCount = 0;
        disposables.add(input.onDidChangeDirty(() => {
            listenerCount++;
        }));
        // instead of going through file input resolve method
        // we resolve the model directly through the service
        const model = disposables.add(await accessor.textFileService.files.resolve(input.resource));
        model.textEditorModel?.setValue('hello world');
        assert.strictEqual(listenerCount, 1);
        assert.ok(input.isDirty());
    });
    test('force open text/binary', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        input.setForceOpenAsBinary();
        let resolved = disposables.add(await input.resolve());
        assert.ok(resolved instanceof BinaryEditorModel);
        input.setForceOpenAsText();
        resolved = disposables.add(await input.resolve());
        assert.ok(resolved instanceof TextFileEditorModel);
    });
    test('file editor serializer', async function () {
        instantiationService.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer('workbench.editors.files.fileEditorInput', FileEditorInputSerializer));
        const editorSerializer = Registry.as(EditorExtensions.EditorFactory).getEditorSerializer(input.typeId);
        if (!editorSerializer) {
            assert.fail('File Editor Input Serializer missing');
        }
        assert.strictEqual(editorSerializer.canSerialize(input), true);
        const inputSerialized = editorSerializer.serialize(input);
        if (!inputSerialized) {
            assert.fail('Unexpected serialized file input');
        }
        const inputDeserialized = editorSerializer.deserialize(instantiationService, inputSerialized);
        assert.strictEqual(inputDeserialized ? input.matches(inputDeserialized) : false, true);
        const preferredResource = toResource.call(this, '/foo/bar/UPDATEfile.js');
        const inputWithPreferredResource = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'), preferredResource);
        const inputWithPreferredResourceSerialized = editorSerializer.serialize(inputWithPreferredResource);
        if (!inputWithPreferredResourceSerialized) {
            assert.fail('Unexpected serialized file input');
        }
        const inputWithPreferredResourceDeserialized = editorSerializer.deserialize(instantiationService, inputWithPreferredResourceSerialized);
        assert.strictEqual(inputWithPreferredResource.resource.toString(), inputWithPreferredResourceDeserialized.resource.toString());
        assert.strictEqual(inputWithPreferredResource.preferredResource.toString(), inputWithPreferredResourceDeserialized.preferredResource.toString());
    });
    test('preferred name/description', async function () {
        // Works with custom file input
        const customFileInput = createFileInput(toResource.call(this, '/foo/bar/updatefile.js').with({ scheme: 'test-custom' }), undefined, undefined, 'My Name', 'My Description');
        let didChangeLabelCounter = 0;
        disposables.add(customFileInput.onDidChangeLabel(() => {
            didChangeLabelCounter++;
        }));
        assert.strictEqual(customFileInput.getName(), 'My Name');
        assert.strictEqual(customFileInput.getDescription(), 'My Description');
        customFileInput.setPreferredName('My Name 2');
        customFileInput.setPreferredDescription('My Description 2');
        assert.strictEqual(customFileInput.getName(), 'My Name 2');
        assert.strictEqual(customFileInput.getDescription(), 'My Description 2');
        assert.strictEqual(didChangeLabelCounter, 2);
        customFileInput.dispose();
        // Disallowed with local file input
        const fileInput = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'), undefined, undefined, 'My Name', 'My Description');
        didChangeLabelCounter = 0;
        disposables.add(fileInput.onDidChangeLabel(() => {
            didChangeLabelCounter++;
        }));
        assert.notStrictEqual(fileInput.getName(), 'My Name');
        assert.notStrictEqual(fileInput.getDescription(), 'My Description');
        fileInput.setPreferredName('My Name 2');
        fileInput.setPreferredDescription('My Description 2');
        assert.notStrictEqual(fileInput.getName(), 'My Name 2');
        assert.notStrictEqual(fileInput.getDescription(), 'My Description 2');
        assert.strictEqual(didChangeLabelCounter, 0);
    });
    test('reports readonly changes', async function () {
        const input = createFileInput(toResource.call(this, '/foo/bar/updatefile.js'));
        let listenerCount = 0;
        disposables.add(input.onDidChangeCapabilities(() => {
            listenerCount++;
        }));
        const model = disposables.add(await accessor.textFileService.files.resolve(input.resource));
        assert.strictEqual(model.isReadonly(), false);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        const stat = await accessor.fileService.resolve(input.resource, { resolveMetadata: true });
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: true });
            await input.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(!!model.isReadonly(), true);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), true);
        assert.strictEqual(!!input.isReadonly(), true);
        assert.strictEqual(listenerCount, 1);
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: false });
            await input.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(model.isReadonly(), false);
        assert.strictEqual(input.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(input.isReadonly(), false);
        assert.strictEqual(listenerCount, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2ZpbGVFZGl0b3JJbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVoSixPQUFPLEVBQXFDLGdCQUFnQixFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBQzVILE9BQU8sRUFBZ0Isc0JBQXNCLEVBQTJCLE1BQU0sbURBQW1ELENBQUM7QUFDbEksT0FBTyxFQUF1QixrQ0FBa0MsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3BKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FB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