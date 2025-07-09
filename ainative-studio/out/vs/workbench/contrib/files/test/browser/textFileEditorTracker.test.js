/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { TextFileEditorTracker } from '../../browser/editors/textFileEditorTracker.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { workbenchInstantiationService, TestServiceAccessor, TestFilesConfigurationService, registerTestFileEditor, registerTestResourceEditor, createEditorPart, TestEnvironmentService, TestFileService, workbenchTeardown, TestTextResourceConfigurationService } from '../../../../test/browser/workbenchTestServices.js';
import { snapshotToString } from '../../../../services/textfile/common/textfiles.js';
import { FileChangesEvent, FileOperationError } from '../../../../../platform/files/common/files.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { FILE_EDITOR_INPUT_ID } from '../../common/files.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestContextService, TestMarkerService } from '../../../../test/common/workbenchTestServices.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
suite('Files - TextFileEditorTracker', () => {
    const disposables = new DisposableStore();
    class TestTextFileEditorTracker extends TextFileEditorTracker {
        getDirtyTextFileTrackerDelay() {
            return 5; // encapsulated in a method for tests to override
        }
    }
    setup(() => {
        disposables.add(registerTestFileEditor());
        disposables.add(registerTestResourceEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    async function createTracker(autoSaveEnabled = false) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        if (autoSaveEnabled) {
            configurationService.setUserConfiguration('files', { autoSave: 'afterDelay', autoSaveDelay: 1 });
        }
        else {
            configurationService.setUserConfiguration('files', { autoSave: 'off', autoSaveDelay: 1 });
        }
        instantiationService.stub(IConfigurationService, configurationService);
        const fileService = disposables.add(new TestFileService());
        instantiationService.stub(IFilesConfigurationService, disposables.add(new TestFilesConfigurationService(instantiationService.createInstance(MockContextKeyService), configurationService, new TestContextService(TestWorkspace), TestEnvironmentService, disposables.add(new UriIdentityService(fileService)), fileService, new TestMarkerService(), new TestTextResourceConfigurationService(configurationService))));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        disposables.add(editorService);
        instantiationService.stub(IEditorService, editorService);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
        disposables.add(instantiationService.createInstance(TestTextFileEditorTracker));
        const cleanup = async () => {
            await workbenchTeardown(instantiationService);
            part.dispose();
        };
        return { accessor, cleanup };
    }
    test('file change event updates model', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        const model = await accessor.textFileService.files.resolve(resource);
        disposables.add(model);
        model.textEditorModel.setValue('Super Good');
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'Super Good');
        await model.save();
        // change event (watcher)
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await timeout(0); // due to event updating model async
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'Hello Html');
        await cleanup();
    });
    test('dirty text file model opens as editor', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, false, false);
    });
    test('dirty text file model does not open as editor if autosave is ON', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, true, false);
    });
    test('dirty text file model opens as editor when save fails', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, false, true);
    });
    test('dirty text file model opens as editor when save fails if autosave is ON', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, true, true);
    });
    async function testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, autoSave, error) {
        const { accessor, cleanup } = await createTracker(autoSave);
        assert.ok(!accessor.editorService.isOpened({ resource, typeId: FILE_EDITOR_INPUT_ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id }));
        if (error) {
            accessor.textFileService.setWriteErrorOnce(new FileOperationError('fail to write', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        }
        const model = await accessor.textFileService.files.resolve(resource);
        disposables.add(model);
        model.textEditorModel.setValue('Super Good');
        if (autoSave) {
            await model.save();
            await timeout(10);
            if (error) {
                assert.ok(accessor.editorService.isOpened({ resource, typeId: FILE_EDITOR_INPUT_ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id }));
            }
            else {
                assert.ok(!accessor.editorService.isOpened({ resource, typeId: FILE_EDITOR_INPUT_ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id }));
            }
        }
        else {
            await awaitEditorOpening(accessor.editorService);
            assert.ok(accessor.editorService.isOpened({ resource, typeId: FILE_EDITOR_INPUT_ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id }));
        }
        await cleanup();
    }
    test('dirty untitled text file model opens as editor', function () {
        return testUntitledEditor(false);
    });
    test('dirty untitled text file model opens as editor - autosave ON', function () {
        return testUntitledEditor(true);
    });
    async function testUntitledEditor(autoSaveEnabled) {
        const { accessor, cleanup } = await createTracker(autoSaveEnabled);
        const untitledTextEditor = await accessor.textEditorService.resolveTextEditor({ resource: undefined, forceUntitled: true });
        const model = disposables.add(await untitledTextEditor.resolve());
        assert.ok(!accessor.editorService.isOpened(untitledTextEditor));
        model.textEditorModel?.setValue('Super Good');
        await awaitEditorOpening(accessor.editorService);
        assert.ok(accessor.editorService.isOpened(untitledTextEditor));
        await cleanup();
    }
    function awaitEditorOpening(editorService) {
        return Event.toPromise(Event.once(editorService.onDidActiveEditorChange));
    }
    test('non-dirty files reload on window focus', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor(await accessor.textEditorService.resolveTextEditor({ resource, options: { override: DEFAULT_EDITOR_ASSOCIATION.id } }));
        accessor.hostService.setFocus(false);
        accessor.hostService.setFocus(true);
        await awaitModelResolveEvent(accessor.textFileService, resource);
        await cleanup();
    });
    function awaitModelResolveEvent(textFileService, resource) {
        return new Promise(resolve => {
            const listener = textFileService.files.onDidResolve(e => {
                if (isEqual(e.model.resource, resource)) {
                    listener.dispose();
                    resolve();
                }
            });
        });
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL3RleHRGaWxlRWRpdG9yVHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsNkJBQTZCLEVBQUUsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLG9DQUFvQyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOVQsT0FBTyxFQUFnQyxnQkFBZ0IsRUFBb0IsTUFBTSxtREFBbUQsQ0FBQztBQUNySSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWtCLGtCQUFrQixFQUF1QixNQUFNLCtDQUErQyxDQUFDO0FBQzFJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFD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