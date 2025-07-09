/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { TestFilesConfigurationService, workbenchInstantiationService, TestServiceAccessor, registerTestFileEditor, createEditorPart, TestEnvironmentService, TestFileService, TestTextResourceConfigurationService } from '../../../../test/browser/workbenchTestServices.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { EditorAutoSave } from '../../../../browser/parts/editor/editorAutoSave.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestContextService, TestMarkerService } from '../../../../test/common/workbenchTestServices.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
suite('EditorAutoSave', () => {
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestFileEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    async function createEditorAutoSave(autoSaveConfig) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        configurationService.setUserConfiguration('files', autoSaveConfig);
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IAccessibilitySignalService, {
            playSignal: async () => { },
            isSoundEnabled(signal) { return false; },
        });
        instantiationService.stub(IFilesConfigurationService, disposables.add(new TestFilesConfigurationService(instantiationService.createInstance(MockContextKeyService), configurationService, new TestContextService(TestWorkspace), TestEnvironmentService, disposables.add(new UriIdentityService(disposables.add(new TestFileService()))), disposables.add(new TestFileService()), new TestMarkerService(), new TestTextResourceConfigurationService(configurationService))));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
        disposables.add(instantiationService.createInstance(EditorAutoSave));
        return accessor;
    }
    test('editor auto saves after short delay if configured', async function () {
        const accessor = await createEditorAutoSave({ autoSave: 'afterDelay', autoSaveDelay: 1 });
        const resource = toResource.call(this, '/path/index.txt');
        const model = disposables.add(await accessor.textFileService.files.resolve(resource));
        model.textEditorModel?.setValue('Super Good');
        assert.ok(model.isDirty());
        await awaitModelSaved(model);
        assert.strictEqual(model.isDirty(), false);
    });
    test('editor auto saves on focus change if configured', async function () {
        const accessor = await createEditorAutoSave({ autoSave: 'onFocusChange' });
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { override: DEFAULT_EDITOR_ASSOCIATION.id } });
        const model = disposables.add(await accessor.textFileService.files.resolve(resource));
        model.textEditorModel?.setValue('Super Good');
        assert.ok(model.isDirty());
        const editorPane = await accessor.editorService.openEditor({ resource: toResource.call(this, '/path/index_other.txt') });
        await awaitModelSaved(model);
        assert.strictEqual(model.isDirty(), false);
        await editorPane?.group.closeAllEditors();
    });
    function awaitModelSaved(model) {
        return Event.toPromise(Event.once(model.onDidChangeDirty));
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQXV0b1NhdmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy90ZXN0L2Jyb3dzZXIvZWRpdG9yQXV0b1NhdmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9RLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBRXpILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9B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