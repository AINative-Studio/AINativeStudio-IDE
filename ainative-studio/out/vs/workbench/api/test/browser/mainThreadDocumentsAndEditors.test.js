/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadDocumentsAndEditors } from '../../browser/mainThreadDocumentsAndEditors.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { TestCodeEditorService } from '../../../../editor/test/browser/editorTestServices.js';
import { createTestCodeEditor } from '../../../../editor/test/browser/testCodeEditor.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestEditorService, TestEditorGroupsService, TestEnvironmentService, TestPathService } from '../../../test/browser/workbenchTestServices.js';
import { Event } from '../../../../base/common/event.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
import { UndoRedoService } from '../../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { TestTextResourcePropertiesService, TestWorkingCopyFileService } from '../../../test/common/workbenchTestServices.js';
import { UriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentityService.js';
import { TextModel } from '../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
suite('MainThreadDocumentsAndEditors', () => {
    let disposables;
    let modelService;
    let codeEditorService;
    let textFileService;
    const deltas = [];
    function myCreateTestCodeEditor(model) {
        return createTestCodeEditor(model, {
            hasTextFocus: false,
            serviceCollection: new ServiceCollection([ICodeEditorService, codeEditorService])
        });
    }
    setup(() => {
        disposables = new DisposableStore();
        deltas.length = 0;
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('editor', { 'detectIndentation': false });
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        const themeService = new TestThemeService();
        const instantiationService = new TestInstantiationService();
        instantiationService.set(ILanguageService, disposables.add(new LanguageService()));
        instantiationService.set(ILanguageConfigurationService, new TestLanguageConfigurationService());
        instantiationService.set(IUndoRedoService, undoRedoService);
        modelService = new ModelService(configService, new TestTextResourcePropertiesService(configService), undoRedoService, instantiationService);
        codeEditorService = new TestCodeEditorService(themeService);
        textFileService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.files = {
                    onDidSave: Event.None,
                    onDidRevert: Event.None,
                    onDidChangeDirty: Event.None,
                    onDidChangeEncoding: Event.None
                };
                this.untitled = {
                    onDidChangeEncoding: Event.None
                };
            }
            isDirty() { return false; }
            getEncoding() { return 'utf8'; }
        };
        const workbenchEditorService = disposables.add(new TestEditorService());
        const editorGroupService = new TestEditorGroupsService();
        const fileService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRunOperation = Event.None;
                this.onDidChangeFileSystemProviderCapabilities = Event.None;
                this.onDidChangeFileSystemProviderRegistrations = Event.None;
            }
        };
        new MainThreadDocumentsAndEditors(SingleProxyRPCProtocol({
            $acceptDocumentsAndEditorsDelta: (delta) => { deltas.push(delta); },
            $acceptEditorDiffInformation: (id, diffInformation) => { }
        }), modelService, textFileService, workbenchEditorService, codeEditorService, fileService, null, editorGroupService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidPaneCompositeOpen = Event.None;
                this.onDidPaneCompositeClose = Event.None;
            }
            getActivePaneComposite() {
                return undefined;
            }
        }, TestEnvironmentService, new TestWorkingCopyFileService(), new UriIdentityService(fileService), new class extends mock() {
            readText() {
                return Promise.resolve('clipboard_contents');
            }
        }, new TestPathService(), new TestConfigurationService(), new class extends mock() {
            createQuickDiffModelReference() {
                return undefined;
            }
        });
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Model#add', () => {
        deltas.length = 0;
        disposables.add(modelService.createModel('farboo', null));
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.addedDocuments.length, 1);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
        assert.strictEqual(delta.newActiveEditor, undefined);
    });
    test('ignore huge model', function () {
        const oldLimit = TextModel._MODEL_SYNC_LIMIT;
        try {
            const largeModelString = 'abc'.repeat(1024);
            TextModel._MODEL_SYNC_LIMIT = largeModelString.length / 2;
            const model = modelService.createModel(largeModelString, null);
            disposables.add(model);
            assert.ok(model.isTooLargeForSyncing());
            assert.strictEqual(deltas.length, 1);
            const [delta] = deltas;
            assert.strictEqual(delta.newActiveEditor, null);
            assert.strictEqual(delta.addedDocuments, undefined);
            assert.strictEqual(delta.removedDocuments, undefined);
            assert.strictEqual(delta.addedEditors, undefined);
            assert.strictEqual(delta.removedEditors, undefined);
        }
        finally {
            TextModel._MODEL_SYNC_LIMIT = oldLimit;
        }
    });
    test('ignore huge model from editor', function () {
        const oldLimit = TextModel._MODEL_SYNC_LIMIT;
        try {
            const largeModelString = 'abc'.repeat(1024);
            TextModel._MODEL_SYNC_LIMIT = largeModelString.length / 2;
            const model = modelService.createModel(largeModelString, null);
            const editor = myCreateTestCodeEditor(model);
            assert.strictEqual(deltas.length, 1);
            deltas.length = 0;
            assert.strictEqual(deltas.length, 0);
            editor.dispose();
            model.dispose();
        }
        finally {
            TextModel._MODEL_SYNC_LIMIT = oldLimit;
        }
    });
    test('ignore simple widget model', function () {
        this.timeout(1000 * 60); // increase timeout for this one test
        const model = modelService.createModel('test', null, undefined, true);
        disposables.add(model);
        assert.ok(model.isForSimpleWidget);
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.newActiveEditor, null);
        assert.strictEqual(delta.addedDocuments, undefined);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
    });
    test('ignore editor w/o model', () => {
        const editor = myCreateTestCodeEditor(undefined);
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.newActiveEditor, null);
        assert.strictEqual(delta.addedDocuments, undefined);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
        editor.dispose();
    });
    test('editor with model', () => {
        deltas.length = 0;
        const model = modelService.createModel('farboo', null);
        const editor = myCreateTestCodeEditor(model);
        assert.strictEqual(deltas.length, 2);
        const [first, second] = deltas;
        assert.strictEqual(first.addedDocuments.length, 1);
        assert.strictEqual(first.newActiveEditor, undefined);
        assert.strictEqual(first.removedDocuments, undefined);
        assert.strictEqual(first.addedEditors, undefined);
        assert.strictEqual(first.removedEditors, undefined);
        assert.strictEqual(second.addedEditors.length, 1);
        assert.strictEqual(second.addedDocuments, undefined);
        assert.strictEqual(second.removedDocuments, undefined);
        assert.strictEqual(second.removedEditors, undefined);
        assert.strictEqual(second.newActiveEditor, undefined);
        editor.dispose();
        model.dispose();
    });
    test('editor with dispos-ed/-ing model', () => {
        const model = modelService.createModel('farboo', null);
        const editor = myCreateTestCodeEditor(model);
        // ignore things until now
        deltas.length = 0;
        modelService.destroyModel(model.uri);
        assert.strictEqual(deltas.length, 1);
        const [first] = deltas;
        assert.strictEqual(first.newActiveEditor, undefined);
        assert.strictEqual(first.removedEditors.length, 1);
        assert.strictEqual(first.removedDocuments.length, 1);
        assert.strictEqual(first.addedDocuments, undefined);
        assert.strictEqual(first.addedEditors, undefined);
        editor.dispose();
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRzQW5kRWRpdG9ycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHOUYsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLG1EQUFtRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDckosT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FB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