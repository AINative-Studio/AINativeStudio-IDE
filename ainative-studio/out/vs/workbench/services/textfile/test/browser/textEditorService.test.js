/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { isResourceDiffEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput } from '../../../../common/editor.js';
import { workbenchInstantiationService, registerTestEditor, TestFileEditorInput, registerTestResourceEditor, registerTestSideBySideEditor } from '../../../../test/browser/workbenchTestServices.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { FileEditorInput } from '../../../../contrib/files/browser/editors/fileEditorInput.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { NullFileSystemProvider } from '../../../../../platform/files/test/common/nullFileSystemProvider.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { TextEditorService } from '../../common/textEditorService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
suite('TextEditorService', () => {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorService';
    let FileServiceProvider = class FileServiceProvider extends Disposable {
        constructor(scheme, fileService) {
            super();
            this._register(fileService.registerProvider(scheme, new NullFileSystemProvider()));
        }
    };
    FileServiceProvider = __decorate([
        __param(1, IFileService)
    ], FileServiceProvider);
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)], TEST_EDITOR_INPUT_ID));
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestSideBySideEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    test('createTextEditor - basics', async function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const languageService = instantiationService.get(ILanguageService);
        const service = disposables.add(instantiationService.createInstance(TextEditorService));
        const languageId = 'create-input-test';
        disposables.add(languageService.registerLanguage({
            id: languageId,
        }));
        // Untyped Input (file)
        let input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html'), options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof FileEditorInput);
        let contentInput = input;
        assert.strictEqual(contentInput.resource.fsPath, toResource.call(this, '/index.html').fsPath);
        // Untyped Input (file casing)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html') }));
        const inputDifferentCase = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/INDEX.html') }));
        if (!isLinux) {
            assert.strictEqual(input, inputDifferentCase);
            assert.strictEqual(input.resource?.toString(), inputDifferentCase.resource?.toString());
        }
        else {
            assert.notStrictEqual(input, inputDifferentCase);
            assert.notStrictEqual(input.resource?.toString(), inputDifferentCase.resource?.toString());
        }
        // Typed Input
        assert.strictEqual(disposables.add(service.createTextEditor(input)), input);
        // Untyped Input (file, encoding)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html'), encoding: 'utf16le', options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredEncoding(), 'utf16le');
        // Untyped Input (file, language)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html'), languageId: languageId }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredLanguageId(), languageId);
        let fileModel = disposables.add(await contentInput.resolve());
        assert.strictEqual(fileModel.textEditorModel?.getLanguageId(), languageId);
        // Untyped Input (file, contents)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html'), contents: 'My contents' }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        fileModel = disposables.add(await contentInput.resolve());
        assert.strictEqual(fileModel.textEditorModel?.getValue(), 'My contents');
        assert.strictEqual(fileModel.isDirty(), true);
        // Untyped Input (file, different language)
        input = disposables.add(service.createTextEditor({ resource: toResource.call(this, '/index.html'), languageId: 'text' }));
        assert(input instanceof FileEditorInput);
        contentInput = input;
        assert.strictEqual(contentInput.getPreferredLanguageId(), 'text');
        // Untyped Input (untitled)
        input = disposables.add(service.createTextEditor({ resource: undefined, options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof UntitledTextEditorInput);
        // Untyped Input (untitled with contents)
        let untypedInput = { contents: 'Hello Untitled', options: { selection: { startLineNumber: 1, startColumn: 1 } } };
        input = disposables.add(service.createTextEditor(untypedInput));
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        let model = disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello Untitled');
        // Untyped Input (untitled with language id)
        input = disposables.add(service.createTextEditor({ resource: undefined, languageId: languageId, options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof UntitledTextEditorInput);
        model = disposables.add(await input.resolve());
        assert.strictEqual(model.getLanguageId(), languageId);
        // Untyped Input (untitled with file path)
        input = disposables.add(service.createTextEditor({ resource: URI.file('/some/path.txt'), forceUntitled: true, options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(input.hasAssociatedFilePath);
        // Untyped Input (untitled with untitled resource)
        untypedInput = { resource: URI.parse('untitled://Untitled-1'), forceUntitled: true, options: { selection: { startLineNumber: 1, startColumn: 1 } } };
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        input = disposables.add(service.createTextEditor(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(!input.hasAssociatedFilePath);
        // Untyped input (untitled with custom resource, but forceUntitled)
        untypedInput = { resource: URI.file('/fake'), forceUntitled: true };
        assert.ok(isUntitledResourceEditorInput(untypedInput));
        input = disposables.add(service.createTextEditor(untypedInput));
        assert(input instanceof UntitledTextEditorInput);
        // Untyped Input (untitled with custom resource)
        const provider = disposables.add(instantiationService.createInstance(FileServiceProvider, 'untitled-custom'));
        input = disposables.add(service.createTextEditor({ resource: URI.parse('untitled-custom://some/path'), forceUntitled: true, options: { selection: { startLineNumber: 1, startColumn: 1 } } }));
        assert(input instanceof UntitledTextEditorInput);
        assert.ok(input.hasAssociatedFilePath);
        provider.dispose();
        // Untyped Input (resource)
        input = disposables.add(service.createTextEditor({ resource: URI.parse('custom:resource') }));
        assert(input instanceof TextResourceEditorInput);
        // Untyped Input (diff)
        const resourceDiffInput = {
            modified: { resource: toResource.call(this, '/modified.html') },
            original: { resource: toResource.call(this, '/original.html') }
        };
        assert.strictEqual(isResourceDiffEditorInput(resourceDiffInput), true);
        input = disposables.add(service.createTextEditor(resourceDiffInput));
        assert(input instanceof DiffEditorInput);
        disposables.add(input.modified);
        disposables.add(input.original);
        assert.strictEqual(input.original.resource?.toString(), resourceDiffInput.original.resource.toString());
        assert.strictEqual(input.modified.resource?.toString(), resourceDiffInput.modified.resource.toString());
        const untypedDiffInput = input.toUntyped();
        assert.strictEqual(untypedDiffInput.original.resource?.toString(), resourceDiffInput.original.resource.toString());
        assert.strictEqual(untypedDiffInput.modified.resource?.toString(), resourceDiffInput.modified.resource.toString());
        // Untyped Input (side by side)
        const sideBySideResourceInput = {
            primary: { resource: toResource.call(this, '/primary.html') },
            secondary: { resource: toResource.call(this, '/secondary.html') }
        };
        assert.strictEqual(isResourceSideBySideEditorInput(sideBySideResourceInput), true);
        input = disposables.add(service.createTextEditor(sideBySideResourceInput));
        assert(input instanceof SideBySideEditorInput);
        disposables.add(input.primary);
        disposables.add(input.secondary);
        assert.strictEqual(input.primary.resource?.toString(), sideBySideResourceInput.primary.resource.toString());
        assert.strictEqual(input.secondary.resource?.toString(), sideBySideResourceInput.secondary.resource.toString());
        const untypedSideBySideInput = input.toUntyped();
        assert.strictEqual(untypedSideBySideInput.primary.resource?.toString(), sideBySideResourceInput.primary.resource.toString());
        assert.strictEqual(untypedSideBySideInput.secondary.resource?.toString(), sideBySideResourceInput.secondary.resource.toString());
    });
    test('createTextEditor- caching', function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const service = disposables.add(instantiationService.createInstance(TextEditorService));
        // Cached Input (Files)
        const fileResource1 = toResource.call(this, '/foo/bar/cache1.js');
        const fileEditorInput1 = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.ok(fileEditorInput1);
        const fileResource2 = toResource.call(this, '/foo/bar/cache2.js');
        const fileEditorInput2 = disposables.add(service.createTextEditor({ resource: fileResource2 }));
        assert.ok(fileEditorInput2);
        assert.notStrictEqual(fileEditorInput1, fileEditorInput2);
        const fileEditorInput1Again = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.strictEqual(fileEditorInput1Again, fileEditorInput1);
        fileEditorInput1Again.dispose();
        assert.ok(fileEditorInput1.isDisposed());
        const fileEditorInput1AgainAndAgain = disposables.add(service.createTextEditor({ resource: fileResource1 }));
        assert.notStrictEqual(fileEditorInput1AgainAndAgain, fileEditorInput1);
        assert.ok(!fileEditorInput1AgainAndAgain.isDisposed());
        // Cached Input (Resource)
        const resource1 = URI.from({ scheme: 'custom', path: '/foo/bar/cache1.js' });
        const input1 = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.ok(input1);
        const resource2 = URI.from({ scheme: 'custom', path: '/foo/bar/cache2.js' });
        const input2 = disposables.add(service.createTextEditor({ resource: resource2 }));
        assert.ok(input2);
        assert.notStrictEqual(input1, input2);
        const input1Again = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.strictEqual(input1Again, input1);
        input1Again.dispose();
        assert.ok(input1.isDisposed());
        const input1AgainAndAgain = disposables.add(service.createTextEditor({ resource: resource1 }));
        assert.notStrictEqual(input1AgainAndAgain, input1);
        assert.ok(!input1AgainAndAgain.isDisposed());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL3RleHRFZGl0b3JTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQTRELHlCQUF5QixFQUFFLCtCQUErQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbk0sT0FBTyxFQUFFLDZCQUE2QixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLDBCQUEwQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDck0sT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhD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