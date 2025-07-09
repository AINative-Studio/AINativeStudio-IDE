/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorCloseContext, isEditorInputWithOptions, SideBySideEditor, isEditorInput } from '../../../../common/editor.js';
import { workbenchInstantiationService, TestServiceAccessor, registerTestEditor, TestFileEditorInput, registerTestResourceEditor, registerTestSideBySideEditor, createEditorPart, registerTestFileEditor, TestTextFileEditor, TestSingletonFileEditorInput, workbenchTeardown } from '../../../../test/browser/workbenchTestServices.js';
import { EditorService } from '../../browser/editorService.js';
import { IEditorGroupsService } from '../../common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../common/editorService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { FileEditorInput } from '../../../../contrib/files/browser/editors/fileEditorInput.js';
import { timeout } from '../../../../../base/common/async.js';
import { FileOperationEvent } from '../../../../../platform/files/common/files.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MockScopableContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { RegisteredEditorPriority } from '../../common/editorResolverService.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { ErrorPlaceholderEditor } from '../../../../browser/parts/editor/editorPlaceholder.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorService', () => {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorService';
    const disposables = new DisposableStore();
    let testLocalInstantiationService = undefined;
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(TestSingletonFileEditorInput)], TEST_EDITOR_INPUT_ID));
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestSideBySideEditor());
    });
    teardown(async () => {
        if (testLocalInstantiationService) {
            await workbenchTeardown(testLocalInstantiationService);
            testLocalInstantiationService = undefined;
        }
        disposables.clear();
    });
    async function createEditorService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        testLocalInstantiationService = instantiationService;
        return [part, editorService, instantiationService.createInstance(TestServiceAccessor)];
    }
    function createTestFileEditorInput(resource, typeId) {
        return disposables.add(new TestFileEditorInput(resource, typeId));
    }
    test('openEditor() - basics', async () => {
        const [, service, accessor] = await createEditorService();
        await testOpenBasics(service, accessor.editorPaneService);
    });
    test('openEditor() - basics (scoped)', async () => {
        const [part, service, accessor] = await createEditorService();
        const scoped = service.createScoped('main', disposables);
        await part.whenReady;
        await testOpenBasics(scoped, accessor.editorPaneService);
    });
    async function testOpenBasics(editorService, editorPaneService) {
        let input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventCounter = 0;
        disposables.add(editorService.onDidActiveEditorChange(() => {
            activeEditorChangeEventCounter++;
        }));
        let visibleEditorChangeEventCounter = 0;
        disposables.add(editorService.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventCounter++;
        }));
        let willOpenEditorListenerCounter = 0;
        disposables.add(editorService.onWillOpenEditor(() => {
            willOpenEditorListenerCounter++;
        }));
        let didCloseEditorListenerCounter = 0;
        disposables.add(editorService.onDidCloseEditor(() => {
            didCloseEditorListenerCounter++;
        }));
        let willInstantiateEditorPaneListenerCounter = 0;
        disposables.add(editorPaneService.onWillInstantiateEditorPane(e => {
            if (e.typeId === TEST_EDITOR_ID) {
                willInstantiateEditorPaneListenerCounter++;
            }
        }));
        // Open input
        let editor = await editorService.openEditor(input, { pinned: true });
        assert.strictEqual(editor?.getId(), TEST_EDITOR_ID);
        assert.strictEqual(editor, editorService.activeEditorPane);
        assert.strictEqual(1, editorService.count);
        assert.strictEqual(input, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].editor);
        assert.strictEqual(input, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].editor);
        assert.strictEqual(input, editorService.activeEditor);
        assert.strictEqual(editorService.visibleEditorPanes.length, 1);
        assert.strictEqual(editorService.visibleEditorPanes[0], editor);
        assert.ok(!editorService.activeTextEditorControl);
        assert.ok(!editorService.activeTextEditorLanguageId);
        assert.strictEqual(editorService.visibleTextEditorControls.length, 0);
        assert.strictEqual(editorService.getVisibleTextEditorControls(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(editorService.isOpened(input), true);
        assert.strictEqual(editorService.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), true);
        assert.strictEqual(editorService.isOpened({ resource: input.resource, typeId: input.typeId, editorId: 'unknownTypeId' }), false);
        assert.strictEqual(editorService.isOpened({ resource: input.resource, typeId: 'unknownTypeId', editorId: input.editorId }), false);
        assert.strictEqual(editorService.isOpened({ resource: input.resource, typeId: 'unknownTypeId', editorId: 'unknownTypeId' }), false);
        assert.strictEqual(editorService.isVisible(input), true);
        assert.strictEqual(editorService.isVisible(otherInput), false);
        assert.strictEqual(willOpenEditorListenerCounter, 1);
        assert.strictEqual(activeEditorChangeEventCounter, 1);
        assert.strictEqual(visibleEditorChangeEventCounter, 1);
        assert.ok(editorPaneService.didInstantiateEditorPane(TEST_EDITOR_ID));
        assert.strictEqual(willInstantiateEditorPaneListenerCounter, 1);
        // Close input
        await editor?.group.closeEditor(input);
        assert.strictEqual(0, editorService.count);
        assert.strictEqual(0, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length);
        assert.strictEqual(0, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length);
        assert.strictEqual(didCloseEditorListenerCounter, 1);
        assert.strictEqual(activeEditorChangeEventCounter, 2);
        assert.strictEqual(visibleEditorChangeEventCounter, 2);
        assert.ok(input.gotDisposed);
        // Open again 2 inputs (disposed editors are ignored!)
        await editorService.openEditor(input, { pinned: true });
        assert.strictEqual(0, editorService.count);
        // Open again 2 inputs (recreate because disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        await editorService.openEditor(input, { pinned: true });
        editor = await editorService.openEditor(otherInput, { pinned: true });
        assert.strictEqual(2, editorService.count);
        assert.strictEqual(otherInput, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].editor);
        assert.strictEqual(input, editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].editor);
        assert.strictEqual(input, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].editor);
        assert.strictEqual(otherInput, editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1].editor);
        assert.strictEqual(editorService.visibleEditorPanes.length, 1);
        assert.strictEqual(editorService.isOpened(input), true);
        assert.strictEqual(editorService.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), true);
        assert.strictEqual(editorService.isOpened(otherInput), true);
        assert.strictEqual(editorService.isOpened({ resource: otherInput.resource, typeId: otherInput.typeId, editorId: otherInput.editorId }), true);
        assert.strictEqual(activeEditorChangeEventCounter, 4);
        assert.strictEqual(willOpenEditorListenerCounter, 3);
        assert.strictEqual(visibleEditorChangeEventCounter, 4);
        const stickyInput = createTestFileEditorInput(URI.parse('my://resource3-basics'), TEST_EDITOR_INPUT_ID);
        await editorService.openEditor(stickyInput, { sticky: true });
        assert.strictEqual(3, editorService.count);
        const allSequentialEditors = editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(allSequentialEditors.length, 3);
        assert.strictEqual(stickyInput, allSequentialEditors[0].editor);
        assert.strictEqual(input, allSequentialEditors[1].editor);
        assert.strictEqual(otherInput, allSequentialEditors[2].editor);
        const sequentialEditorsExcludingSticky = editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 2);
        assert.strictEqual(input, sequentialEditorsExcludingSticky[0].editor);
        assert.strictEqual(otherInput, sequentialEditorsExcludingSticky[1].editor);
        const mruEditorsExcludingSticky = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true });
        assert.strictEqual(mruEditorsExcludingSticky.length, 2);
        assert.strictEqual(input, sequentialEditorsExcludingSticky[0].editor);
        assert.strictEqual(otherInput, sequentialEditorsExcludingSticky[1].editor);
    }
    test('openEditor() - multiple calls are cancelled and indicated as such', async () => {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-basics'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventCounter = 0;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEventCounter++;
        });
        let visibleEditorChangeEventCounter = 0;
        const visibleEditorChangeListener = service.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventCounter++;
        });
        const editorP1 = service.openEditor(input, { pinned: true });
        const editorP2 = service.openEditor(otherInput, { pinned: true });
        const editor1 = await editorP1;
        assert.strictEqual(editor1, undefined);
        const editor2 = await editorP2;
        assert.strictEqual(editor2?.input, otherInput);
        assert.strictEqual(activeEditorChangeEventCounter, 1);
        assert.strictEqual(visibleEditorChangeEventCounter, 1);
        activeEditorChangeListener.dispose();
        visibleEditorChangeListener.dispose();
    });
    test('openEditor() - same input does not cancel previous one - https://github.com/microsoft/vscode/issues/136684', async () => {
        const [, service] = await createEditorService();
        let input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        let editorP1 = service.openEditor(input, { pinned: true });
        let editorP2 = service.openEditor(input, { pinned: true });
        let editor1 = await editorP1;
        assert.strictEqual(editor1?.input, input);
        let editor2 = await editorP2;
        assert.strictEqual(editor2?.input, input);
        assert.ok(editor2.group);
        await editor2.group.closeAllEditors();
        input = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        const inputSame = createTestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID);
        editorP1 = service.openEditor(input, { pinned: true });
        editorP2 = service.openEditor(inputSame, { pinned: true });
        editor1 = await editorP1;
        assert.strictEqual(editor1?.input, input);
        editor2 = await editorP2;
        assert.strictEqual(editor2?.input, input);
    });
    test('openEditor() - singleton typed editors reveal instead of split', async () => {
        const [part, service] = await createEditorService();
        const input1 = disposables.add(new TestSingletonFileEditorInput(URI.parse('my://resource-basics1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestSingletonFileEditorInput(URI.parse('my://resource-basics2'), TEST_EDITOR_INPUT_ID));
        const input1Group = (await service.openEditor(input1, { pinned: true }))?.group;
        const input2Group = (await service.openEditor(input2, { pinned: true }, SIDE_GROUP))?.group;
        assert.strictEqual(part.activeGroup, input2Group);
        await service.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup, input1Group);
    });
    test('openEditor() - locked groups', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => ({ editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) })
        }));
        const input1 = { resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input2 = { resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input3 = { resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input4 = { resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input5 = { resource: URI.parse('file://resource5-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input6 = { resource: URI.parse('file://resource6-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input7 = { resource: URI.parse('file://resource7-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const editor1 = await service.openEditor(input1, { pinned: true });
        const editor2 = await service.openEditor(input2, { pinned: true }, SIDE_GROUP);
        const group1 = editor1?.group;
        assert.strictEqual(group1?.count, 1);
        const group2 = editor2?.group;
        assert.strictEqual(group2?.count, 1);
        group2.lock(true);
        part.activateGroup(group2.id);
        // Will open in group 1 because group 2 is locked
        await service.openEditor(input3, { pinned: true });
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group1.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(group2.count, 1);
        // Will open in group 2 because group was provided
        await service.openEditor(input3, { pinned: true }, group2.id);
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group2.count, 2);
        assert.strictEqual(group2.activeEditor?.resource?.toString(), input3.resource.toString());
        // Will reveal editor in group 2 because it is contained
        await service.openEditor(input2, { pinned: true }, group2);
        await service.openEditor(input2, { pinned: true }, ACTIVE_GROUP);
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group2.count, 2);
        assert.strictEqual(group2.activeEditor?.resource?.toString(), input2.resource.toString());
        // Will open a new group because side group is locked
        part.activateGroup(group1.id);
        const editor3 = await service.openEditor(input4, { pinned: true }, SIDE_GROUP);
        assert.strictEqual(part.count, 3);
        const group3 = editor3?.group;
        assert.strictEqual(group3?.count, 1);
        // Will reveal editor in group 2 because it is contained
        await service.openEditor(input3, { pinned: true }, group2);
        part.activateGroup(group1.id);
        await service.openEditor(input3, { pinned: true }, SIDE_GROUP);
        assert.strictEqual(part.count, 3);
        // Will open a new group if all groups are locked
        group1.lock(true);
        group2.lock(true);
        group3.lock(true);
        part.activateGroup(group1.id);
        const editor5 = await service.openEditor(input5, { pinned: true });
        const group4 = editor5?.group;
        assert.strictEqual(group4?.count, 1);
        assert.strictEqual(group4.activeEditor?.resource?.toString(), input5.resource.toString());
        assert.strictEqual(part.count, 4);
        // Will open editor in most recently non-locked group
        group1.lock(false);
        group2.lock(false);
        group3.lock(false);
        group4.lock(false);
        part.activateGroup(group3.id);
        part.activateGroup(group2.id);
        part.activateGroup(group4.id);
        group4.lock(true);
        group2.lock(true);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        // Will find the right group where editor is already opened in when all groups are locked
        group1.lock(true);
        group2.lock(true);
        group3.lock(true);
        group4.lock(true);
        part.activateGroup(group1.id);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        part.activateGroup(group1.id);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
        // Will reveal an opened editor in the active locked group
        await service.openEditor(input7, { pinned: true }, group3);
        await service.openEditor(input6, { pinned: true });
        assert.strictEqual(part.count, 4);
        assert.strictEqual(part.activeGroup, group3);
        assert.strictEqual(group3.activeEditor?.resource?.toString(), input6.resource.toString());
    });
    test('locked groups - workbench.editor.revealIfOpen', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', { 'editor': { 'revealIfOpen': true } });
        instantiationService.stub(IConfigurationService, configurationService);
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService(instantiationService);
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => ({ editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) })
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = { resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input2 = { resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input3 = { resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input4 = { resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor(input1);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input1.resource.toString());
        await service.openEditor(input3);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('locked groups - revealIfVisible', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => ({ editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) })
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = { resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input2 = { resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input3 = { resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input4 = { resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor({ ...input2, options: { ...input2.options, revealIfVisible: true } });
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input2.resource.toString());
        await service.openEditor({ ...input4, options: { ...input4.options, revealIfVisible: true } });
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input4.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('locked groups - revealIfOpened', async () => {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-locked-group-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => ({ editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) })
        }));
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rootGroup);
        const input1 = { resource: URI.parse('file://resource-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input2 = { resource: URI.parse('file://resource2-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input3 = { resource: URI.parse('file://resource3-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        const input4 = { resource: URI.parse('file://resource4-basics.editor-service-locked-group-tests'), options: { pinned: true } };
        await service.openEditor(input1, rootGroup.id);
        await service.openEditor(input2, rootGroup.id);
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        await service.openEditor(input3, rightGroup.id);
        await service.openEditor(input4, rightGroup.id);
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        rootGroup.lock(true);
        rightGroup.lock(true);
        await service.openEditor({ ...input1, options: { ...input1.options, revealIfOpened: true } });
        assert.strictEqual(part.activeGroup.id, rootGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input1.resource.toString());
        await service.openEditor({ ...input3, options: { ...input3.options, revealIfOpened: true } });
        assert.strictEqual(part.activeGroup.id, rightGroup.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), input3.resource.toString());
        assert.strictEqual(part.groups.length, 2);
    });
    test('openEditor() - untyped, typed', () => {
        return testOpenEditors(false);
    });
    test('openEditors() - untyped, typed', () => {
        return testOpenEditors(true);
    });
    async function testOpenEditors(useOpenEditors) {
        disposables.add(registerTestFileEditor());
        const [part, service, accessor] = await createEditorService();
        let rootGroup = part.activeGroup;
        let editorFactoryCalled = 0;
        let untitledEditorFactoryCalled = 0;
        let diffEditorFactoryCalled = 0;
        let lastEditorFactoryEditor = undefined;
        let lastUntitledEditorFactoryEditor = undefined;
        let lastDiffEditorFactoryEditor = undefined;
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-override-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => {
                editorFactoryCalled++;
                lastEditorFactoryEditor = editor;
                return { editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) };
            },
            createUntitledEditorInput: untitledEditor => {
                untitledEditorFactoryCalled++;
                lastUntitledEditorFactoryEditor = untitledEditor;
                return { editor: createTestFileEditorInput(untitledEditor.resource ?? URI.parse(`untitled://my-untitled-editor-${untitledEditorFactoryCalled}`), TEST_EDITOR_INPUT_ID) };
            },
            createDiffEditorInput: diffEditor => {
                diffEditorFactoryCalled++;
                lastDiffEditorFactoryEditor = diffEditor;
                return { editor: createTestFileEditorInput(URI.file(`diff-editor-${diffEditorFactoryCalled}`), TEST_EDITOR_INPUT_ID) };
            }
        }));
        async function resetTestState() {
            editorFactoryCalled = 0;
            untitledEditorFactoryCalled = 0;
            diffEditorFactoryCalled = 0;
            lastEditorFactoryEditor = undefined;
            lastUntitledEditorFactoryEditor = undefined;
            lastDiffEditorFactoryEditor = undefined;
            await workbenchTeardown(accessor.instantiationService);
            rootGroup = part.activeGroup;
        }
        async function openEditor(editor, group) {
            if (useOpenEditors) {
                // The type safety isn't super good here, so we assist with runtime checks
                // Open editors expects untyped or editor input with options, you cannot pass a typed editor input
                // without options
                if (!isEditorInputWithOptions(editor) && isEditorInput(editor)) {
                    editor = { editor: editor, options: {} };
                }
                const panes = await service.openEditors([editor], group);
                return panes[0];
            }
            if (isEditorInputWithOptions(editor)) {
                return service.openEditor(editor.editor, editor.options, group);
            }
            return service.openEditor(editor, group);
        }
        // untyped
        {
            // untyped resource editor, no options, no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests') };
                const pane = await openEditor(untypedEditor);
                let typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                // replaceEditors should work too
                const untypedEditorReplacement = { resource: URI.file('file-replaced.editor-service-override-tests') };
                await service.replaceEditors([{
                        editor: typedEditor,
                        replacement: untypedEditorReplacement
                    }], rootGroup);
                typedEditor = rootGroup.activeEditor;
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor?.resource?.toString(), untypedEditorReplacement.resource.toString());
                assert.strictEqual(editorFactoryCalled, 3);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditorReplacement);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { override: DEFAULT_EDITOR_ASSOCIATION.id } };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof FileEditorInput);
                assert.strictEqual(typedEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text, sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { sticky: true, preserveFocus: true, override: DEFAULT_EDITOR_ASSOCIATION.id } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, options (override default), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { override: DEFAULT_EDITOR_ASSOCIATION.id } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override: TEST_EDITOR_INPUT_ID), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { override: TEST_EDITOR_INPUT_ID } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { sticky: true, preserveFocus: true } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(lastEditorFactoryEditor.options?.preserveFocus, true);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, options (override: TEST_EDITOR_INPUT_ID, sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(lastEditorFactoryEditor.options?.preserveFocus, true);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // untyped resource editor, no options, SIDE_GROUP
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests') };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 1);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.strictEqual(lastEditorFactoryEditor, untypedEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped resource editor, options (override text), SIDE_GROUP
            {
                const untypedEditor = { resource: URI.file('file.editor-service-override-tests'), options: { override: DEFAULT_EDITOR_ASSOCIATION.id } };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof FileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), untypedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Typed
        {
            // typed editor, no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                let typedInput = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditor.resource.toString());
                // It's a typed editor input so the resolver should not have been called
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(typedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedInput);
                // replaceEditors should work too
                const typedEditorReplacement = createTestFileEditorInput(URI.file('file-replaced.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                await service.replaceEditors([{
                        editor: typedEditor,
                        replacement: typedEditorReplacement
                    }], rootGroup);
                typedInput = rootGroup.activeEditor;
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditorReplacement.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                const typedInput = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedInput instanceof TestFileEditorInput);
                assert.strictEqual(typedInput.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(typedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // typed editor, options (no override, sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor, options: { sticky: true, preserveFocus: true } });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, options (override default), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor, options: { override: DEFAULT_EDITOR_ASSOCIATION.id } });
                assert.strictEqual(pane?.group, rootGroup);
                // We shouldn't have resolved because it is a typed editor, even though we have an override specified
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (override: TEST_EDITOR_INPUT_ID), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor, options: { override: TEST_EDITOR_INPUT_ID } });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor, options: { sticky: true, preserveFocus: true } });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, options (override: TEST_EDITOR_INPUT_ID, sticky: true, preserveFocus: true), no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor, options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID } });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
                await part.activeGroup.closeEditor(pane.input);
            }
            // typed editor, no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // typed editor, options (no override), SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.editor-service-override-tests'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.toString(), typedEditor.resource.toString());
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Untyped untitled
        {
            // untyped untitled editor, no options, no group
            {
                const untypedEditor = { resource: undefined, options: { override: TEST_EDITOR_INPUT_ID } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped untitled editor, no options, SIDE_GROUP
            {
                const untypedEditor = { resource: undefined, options: { override: TEST_EDITOR_INPUT_ID } };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // untyped untitled editor with associated resource, no options, no group
            {
                const untypedEditor = { resource: URI.file('file-original.editor-service-override-tests').with({ scheme: 'untitled' }) };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(typedEditor.resource.scheme, 'untitled');
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                // opening the same editor should not create
                // a new editor input
                await openEditor(untypedEditor);
                assert.strictEqual(pane?.group.activeEditor, typedEditor);
                await resetTestState();
            }
            // untyped untitled editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = { resource: undefined, options: { sticky: true, preserveFocus: true, override: TEST_EDITOR_INPUT_ID } };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input.resource.scheme, 'untitled');
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 1);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor, untypedEditor);
                assert.strictEqual(lastUntitledEditorFactoryEditor.options?.preserveFocus, true);
                assert.strictEqual(lastUntitledEditorFactoryEditor.options?.sticky, true);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // Untyped diff
        {
            // untyped diff editor, no options, no group
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: { override: TEST_EDITOR_INPUT_ID }
                };
                const pane = await openEditor(untypedEditor);
                const typedEditor = pane?.input;
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(typedEditor instanceof TestFileEditorInput);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                await resetTestState();
            }
            // untyped diff editor, no options, SIDE_GROUP
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: { override: TEST_EDITOR_INPUT_ID }
                };
                const pane = await openEditor(untypedEditor, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                await resetTestState();
            }
            // untyped diff editor, options (sticky: true, preserveFocus: true), no group
            {
                const untypedEditor = {
                    original: { resource: URI.file('file-original.editor-service-override-tests') },
                    modified: { resource: URI.file('file-modified.editor-service-override-tests') },
                    options: {
                        override: TEST_EDITOR_INPUT_ID, sticky: true, preserveFocus: true
                    }
                };
                const pane = await openEditor(untypedEditor);
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.group.isSticky(pane.input), true);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 1);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor, untypedEditor);
                assert.strictEqual(lastDiffEditorFactoryEditor.options?.preserveFocus, true);
                assert.strictEqual(lastDiffEditorFactoryEditor.options?.sticky, true);
                await resetTestState();
            }
        }
        // typed editor, not registered
        {
            // no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // typed editor, not supporting `toUntyped`
        {
            // no options, no group
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                typedEditor.disableToUntyped = true;
                const pane = await openEditor({ editor: typedEditor });
                assert.strictEqual(pane?.group, rootGroup);
                assert.ok(pane.input instanceof TestFileEditorInput);
                assert.strictEqual(pane.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
            // no options, SIDE_GROUP
            {
                const typedEditor = createTestFileEditorInput(URI.file('file.something'), TEST_EDITOR_INPUT_ID);
                typedEditor.disableToUntyped = true;
                const pane = await openEditor({ editor: typedEditor }, SIDE_GROUP);
                assert.strictEqual(accessor.editorGroupService.groups.length, 2);
                assert.notStrictEqual(pane?.group, rootGroup);
                assert.ok(pane?.input instanceof TestFileEditorInput);
                assert.strictEqual(pane?.input, typedEditor);
                assert.strictEqual(editorFactoryCalled, 0);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(!lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // openEditors with >1 editor
        if (useOpenEditors) {
            // mix of untyped and typed editors
            {
                const untypedEditor1 = { resource: URI.file('file1.editor-service-override-tests') };
                const untypedEditor2 = { resource: URI.file('file2.editor-service-override-tests') };
                const untypedEditor3 = { editor: createTestFileEditorInput(URI.file('file3.editor-service-override-tests'), TEST_EDITOR_INPUT_ID) };
                const untypedEditor4 = { editor: createTestFileEditorInput(URI.file('file4.editor-service-override-tests'), TEST_EDITOR_INPUT_ID) };
                const untypedEditor5 = { resource: URI.file('file5.editor-service-override-tests') };
                const pane = (await service.openEditors([untypedEditor1, untypedEditor2, untypedEditor3, untypedEditor4, untypedEditor5]))[0];
                assert.strictEqual(pane?.group, rootGroup);
                assert.strictEqual(pane?.group.count, 5);
                // Only the untyped editors should have had factories called (3 untyped editors)
                assert.strictEqual(editorFactoryCalled, 3);
                assert.strictEqual(untitledEditorFactoryCalled, 0);
                assert.strictEqual(diffEditorFactoryCalled, 0);
                assert.ok(lastEditorFactoryEditor);
                assert.ok(!lastUntitledEditorFactoryEditor);
                assert.ok(!lastDiffEditorFactoryEditor);
                await resetTestState();
            }
        }
        // untyped default editor
        {
            // untyped default editor, options: revealIfVisible
            {
                const untypedEditor1 = { resource: URI.file('file-1'), options: { revealIfVisible: true, pinned: true } };
                const untypedEditor2 = { resource: URI.file('file-2'), options: { pinned: true } };
                const rootPane = await openEditor(untypedEditor1);
                const sidePane = await openEditor(untypedEditor2, SIDE_GROUP);
                assert.strictEqual(rootPane?.group.count, 1);
                assert.strictEqual(sidePane?.group.count, 1);
                accessor.editorGroupService.activateGroup(sidePane.group);
                await openEditor(untypedEditor1);
                assert.strictEqual(rootPane?.group.count, 1);
                assert.strictEqual(sidePane?.group.count, 1);
                await resetTestState();
            }
            // untyped default editor, options: revealIfOpened
            {
                const untypedEditor1 = { resource: URI.file('file-1'), options: { revealIfOpened: true, pinned: true } };
                const untypedEditor2 = { resource: URI.file('file-2'), options: { pinned: true } };
                const rootPane = await openEditor(untypedEditor1);
                await openEditor(untypedEditor2);
                assert.strictEqual(rootPane?.group.activeEditor?.resource?.toString(), untypedEditor2.resource.toString());
                const sidePane = await openEditor(untypedEditor2, SIDE_GROUP);
                assert.strictEqual(rootPane?.group.count, 2);
                assert.strictEqual(sidePane?.group.count, 1);
                accessor.editorGroupService.activateGroup(sidePane.group);
                await openEditor(untypedEditor1);
                assert.strictEqual(rootPane?.group.count, 2);
                assert.strictEqual(sidePane?.group.count, 1);
                await resetTestState();
            }
        }
    }
    test('openEditor() applies options if editor already opened', async () => {
        disposables.add(registerTestFileEditor());
        const [, service, accessor] = await createEditorService();
        disposables.add(accessor.editorResolverService.registerEditor('*.editor-service-override-tests', { id: TEST_EDITOR_INPUT_ID, label: 'Label', priority: RegisteredEditorPriority.exclusive }, {}, {
            createEditorInput: editor => ({ editor: createTestFileEditorInput(editor.resource, TEST_EDITOR_INPUT_ID) })
        }));
        // Typed editor
        let pane = await service.openEditor(createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID));
        pane = await service.openEditor(createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID), { sticky: true, preserveFocus: true });
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
        await pane.group.closeAllEditors();
        // Untyped editor (without registered editor)
        pane = await service.openEditor({ resource: URI.file('resource-openEditors') });
        pane = await service.openEditor({ resource: URI.file('resource-openEditors'), options: { sticky: true, preserveFocus: true } });
        assert.ok(pane instanceof TestTextFileEditor);
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
        // Untyped editor (with registered editor)
        pane = await service.openEditor({ resource: URI.file('file.editor-service-override-tests') });
        pane = await service.openEditor({ resource: URI.file('file.editor-service-override-tests'), options: { sticky: true, preserveFocus: true } });
        assert.strictEqual(pane?.options?.sticky, true);
        assert.strictEqual(pane?.options?.preserveFocus, true);
    });
    test('isOpen() with side by side editor', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('sideBySide', '', input, otherInput, service);
        const editor1 = await service.openEditor(sideBySideInput, { pinned: true });
        assert.strictEqual(part.activeGroup.count, 1);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), false);
        assert.strictEqual(service.isOpened({ resource: otherInput.resource, typeId: otherInput.typeId, editorId: otherInput.editorId }), true);
        const editor2 = await service.openEditor(input, { pinned: true });
        assert.strictEqual(part.activeGroup.count, 2);
        assert.strictEqual(service.isOpened(input), true);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), true);
        assert.strictEqual(service.isOpened({ resource: otherInput.resource, typeId: otherInput.typeId, editorId: otherInput.editorId }), true);
        await editor2?.group.closeEditor(input);
        assert.strictEqual(part.activeGroup.count, 1);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), true);
        assert.strictEqual(service.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), false);
        assert.strictEqual(service.isOpened({ resource: otherInput.resource, typeId: otherInput.typeId, editorId: otherInput.editorId }), true);
        await editor1?.group.closeEditor(sideBySideInput);
        assert.strictEqual(service.isOpened(input), false);
        assert.strictEqual(service.isOpened(otherInput), false);
        assert.strictEqual(service.isOpened({ resource: input.resource, typeId: input.typeId, editorId: input.editorId }), false);
        assert.strictEqual(service.isOpened({ resource: otherInput.resource, typeId: otherInput.typeId, editorId: otherInput.editorId }), false);
    });
    test('openEditors() / replaceEditors()', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const replaceInput = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Replace editors
        await service.replaceEditors([{ editor: input, replacement: replaceInput }], part.activeGroup);
        assert.strictEqual(part.activeGroup.count, 2);
        assert.strictEqual(part.activeGroup.getIndexOfEditor(replaceInput), 0);
    });
    test('openEditors() handles workspace trust (typed editors)', async () => {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openEditors'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.parse('my://resource4-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('side by side', undefined, input3, input4, service);
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            // Trust: cancel
            let trustEditorUris = [];
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => {
                trustEditorUris = uris;
                return 3 /* WorkspaceTrustUriResponse.Cancel */;
            };
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 0);
            assert.strictEqual(trustEditorUris.length, 4);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === input1.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === input2.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === input3.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === input4.resource.toString()), true);
            // Trust: open in new window
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */;
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 0);
            // Trust: allow
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 1 /* WorkspaceTrustUriResponse.Open */;
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }], undefined, { validateTrust: true });
            assert.strictEqual(part.activeGroup.count, 3);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('openEditors() ignores trust when `validateTrust: false', async () => {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openEditors'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.parse('my://resource3-openEditors'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.parse('my://resource4-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput('side by side', undefined, input3, input4, service);
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            // Trust: cancel
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => 3 /* WorkspaceTrustUriResponse.Cancel */;
            await service.openEditors([{ editor: input1 }, { editor: input2 }, { editor: sideBySideInput }]);
            assert.strictEqual(part.activeGroup.count, 3);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('openEditors() extracts proper resources from untyped editors for workspace trust', async () => {
        const [, service, accessor] = await createEditorService();
        const input = { resource: URI.file('resource-openEditors') };
        const otherInput = {
            original: { resource: URI.parse('my://resource2-openEditors') },
            modified: { resource: URI.parse('my://resource3-openEditors') }
        };
        const oldHandler = accessor.workspaceTrustRequestService.requestOpenUrisHandler;
        try {
            let trustEditorUris = [];
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = async (uris) => {
                trustEditorUris = uris;
                return oldHandler(uris);
            };
            await service.openEditors([input, otherInput], undefined, { validateTrust: true });
            assert.strictEqual(trustEditorUris.length, 3);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === input.resource.toString()), true);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === otherInput.original.resource?.toString()), true);
            assert.strictEqual(trustEditorUris.some(uri => uri.toString() === otherInput.modified.resource?.toString()), true);
        }
        finally {
            accessor.workspaceTrustRequestService.requestOpenUrisHandler = oldHandler;
        }
    });
    test('close editor does not dispose when editor opened in other group', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-close1'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        // Open input
        await service.openEditor(input, { pinned: true });
        await service.openEditor(input, { pinned: true }, rightGroup);
        const editors = service.editors;
        assert.strictEqual(editors.length, 2);
        assert.strictEqual(editors[0], input);
        assert.strictEqual(editors[1], input);
        // Close input
        await rootGroup.closeEditor(input);
        assert.strictEqual(input.isDisposed(), false);
        await rightGroup.closeEditor(input);
        assert.strictEqual(input.isDisposed(), true);
    });
    test('open to the side', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        let editor = await service.openEditor(input1, { pinned: true, preserveFocus: true }, SIDE_GROUP);
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(editor?.group, part.groups[1]);
        assert.strictEqual(service.isVisible(input1), true);
        assert.strictEqual(service.isOpened(input1), true);
        // Open to the side uses existing neighbour group if any
        editor = await service.openEditor(input2, { pinned: true, preserveFocus: true }, SIDE_GROUP);
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(editor?.group, part.groups[1]);
        assert.strictEqual(service.isVisible(input2), true);
        assert.strictEqual(service.isOpened(input2), true);
    });
    test('editor group activation', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        let editor = await service.openEditor(input2, { pinned: true, preserveFocus: true, activation: EditorActivation.ACTIVATE }, SIDE_GROUP);
        const sideGroup = editor?.group;
        assert.strictEqual(part.activeGroup, sideGroup);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.PRESERVE }, rootGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.ACTIVATE }, rootGroup);
        assert.strictEqual(part.activeGroup, rootGroup);
        editor = await service.openEditor(input2, { pinned: true, activation: EditorActivation.PRESERVE }, sideGroup);
        assert.strictEqual(part.activeGroup, rootGroup);
        editor = await service.openEditor(input2, { pinned: true, activation: EditorActivation.ACTIVATE }, sideGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
        part.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
        editor = await service.openEditor(input1, { pinned: true, preserveFocus: true, activation: EditorActivation.RESTORE }, rootGroup);
        assert.strictEqual(part.activeGroup, sideGroup);
    });
    test('inactive editor group does not activate when closing editor (#117686)', async () => {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1-openside'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource2-openside'), TEST_EDITOR_INPUT_ID);
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true }, rootGroup);
        await service.openEditor(input2, { pinned: true }, rootGroup);
        const sideGroup = (await service.openEditor(input2, { pinned: true }, SIDE_GROUP))?.group;
        assert.strictEqual(part.activeGroup, sideGroup);
        assert.notStrictEqual(rootGroup, sideGroup);
        part.arrangeGroups(1 /* GroupsArrangement.EXPAND */, part.activeGroup);
        await rootGroup.closeEditor(input2);
        assert.strictEqual(part.activeGroup, sideGroup);
        assert(!part.isGroupExpanded(rootGroup));
        assert(part.isGroupExpanded(part.activeGroup));
    });
    test('active editor change / visible editor change events', async function () {
        const [part, service] = await createEditorService();
        let input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEventFired = false;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEventFired = true;
        });
        let visibleEditorChangeEventFired = false;
        const visibleEditorChangeListener = service.onDidVisibleEditorsChange(() => {
            visibleEditorChangeEventFired = true;
        });
        function assertActiveEditorChangedEvent(expected) {
            assert.strictEqual(activeEditorChangeEventFired, expected, `Unexpected active editor change state (got ${activeEditorChangeEventFired}, expected ${expected})`);
            activeEditorChangeEventFired = false;
        }
        function assertVisibleEditorsChangedEvent(expected) {
            assert.strictEqual(visibleEditorChangeEventFired, expected, `Unexpected visible editors change state (got ${visibleEditorChangeEventFired}, expected ${expected})`);
            visibleEditorChangeEventFired = false;
        }
        async function closeEditorAndWaitForNextToOpen(group, input) {
            await group.closeEditor(input);
            await timeout(0); // closing an editor will not immediately open the next one, so we need to wait
        }
        // 1.) open, open same, open other, close
        let editor = await service.openEditor(input, { pinned: true });
        const group = editor?.group;
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(input);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        editor = await service.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, input);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 2.) open, open same (forced open) (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(input, { forceReload: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(group, input);
        // 3.) open, open inactive, close (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { inactive: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 4.) open, open inactive, close inactive (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { inactive: true });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(group, otherInput);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 5.) add group, remove group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        let rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        rightGroup.focus();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        part.removeGroup(rightGroup);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 6.) open editor in inactive group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(rightGroup, otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 7.) activate group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        group.focus();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(false);
        await closeEditorAndWaitForNextToOpen(rightGroup, otherInput);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(true);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 8.) move editor (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        editor = await service.openEditor(otherInput, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        group.moveEditor(otherInput, group, { index: 0 });
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await group.closeAllEditors();
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        // 9.) close editor in inactive group (recreate inputs that got disposed)
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        editor = await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(false);
        await rightGroup.openEditor(otherInput);
        assertActiveEditorChangedEvent(true);
        assertVisibleEditorsChangedEvent(true);
        await closeEditorAndWaitForNextToOpen(group, input);
        assertActiveEditorChangedEvent(false);
        assertVisibleEditorsChangedEvent(true);
        // cleanup
        activeEditorChangeListener.dispose();
        visibleEditorChangeListener.dispose();
    });
    test('editors change event', async function () {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        let input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        let editorsChangeEventCounter = 0;
        async function assertEditorsChangeEvent(fn, expected) {
            const p = Event.toPromise(service.onDidEditorsChange);
            await fn();
            await p;
            editorsChangeEventCounter++;
            assert.strictEqual(editorsChangeEventCounter, expected);
        }
        // open
        await assertEditorsChangeEvent(() => service.openEditor(input, { pinned: true }), 1);
        // open (other)
        await assertEditorsChangeEvent(() => service.openEditor(otherInput, { pinned: true }), 2);
        // close (inactive)
        await assertEditorsChangeEvent(() => rootGroup.closeEditor(input), 3);
        // close (active)
        await assertEditorsChangeEvent(() => rootGroup.closeEditor(otherInput), 4);
        input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        otherInput = createTestFileEditorInput(URI.parse('my://resource2-active'), TEST_EDITOR_INPUT_ID);
        // open editors
        await assertEditorsChangeEvent(() => service.openEditors([{ editor: input, options: { pinned: true } }, { editor: otherInput, options: { pinned: true } }]), 5);
        // active editor change
        await assertEditorsChangeEvent(() => service.openEditor(otherInput), 6);
        // move editor (in group)
        await assertEditorsChangeEvent(() => service.openEditor(input, { pinned: true, index: 1 }), 7);
        const rightGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        await assertEditorsChangeEvent(async () => rootGroup.moveEditor(input, rightGroup), 8);
        // move group
        await assertEditorsChangeEvent(async () => part.moveGroup(rightGroup, rootGroup, 2 /* GroupDirection.LEFT */), 9);
    });
    test('two active editor change events when opening editor to the side', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        let activeEditorChangeEvents = 0;
        const activeEditorChangeListener = service.onDidActiveEditorChange(() => {
            activeEditorChangeEvents++;
        });
        function assertActiveEditorChangedEvent(expected) {
            assert.strictEqual(activeEditorChangeEvents, expected, `Unexpected active editor change state (got ${activeEditorChangeEvents}, expected ${expected})`);
            activeEditorChangeEvents = 0;
        }
        await service.openEditor(input, { pinned: true });
        assertActiveEditorChangedEvent(1);
        await service.openEditor(input, { pinned: true }, SIDE_GROUP);
        // we expect 2 active editor change events: one for the fact that the
        // active editor is now in the side group but also one for when the
        // editor has finished loading. we used to ignore that second change
        // event, however many listeners are interested on the active editor
        // when it has fully loaded (e.g. a model is set). as such, we cannot
        // simply ignore that second event from the editor service, even though
        // the actual editor input is the same
        assertActiveEditorChangedEvent(2);
        // cleanup
        activeEditorChangeListener.dispose();
    });
    test('activeTextEditorControl / activeTextEditorMode', async () => {
        const [, service] = await createEditorService();
        // Open untitled input
        const editor = await service.openEditor({ resource: undefined });
        assert.strictEqual(service.activeEditorPane, editor);
        assert.strictEqual(service.activeTextEditorControl, editor?.getControl());
        assert.strictEqual(service.activeTextEditorLanguageId, PLAINTEXT_LANGUAGE_ID);
    });
    test('openEditor returns undefined when inactive', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-inactive'), TEST_EDITOR_INPUT_ID);
        const editor = await service.openEditor(input, { pinned: true });
        assert.ok(editor);
        const otherEditor = await service.openEditor(otherInput, { inactive: true });
        assert.ok(!otherEditor);
    });
    test('openEditor shows placeholder when opening fails', async function () {
        const [, service] = await createEditorService();
        const failingInput = createTestFileEditorInput(URI.parse('my://resource-failing'), TEST_EDITOR_INPUT_ID);
        failingInput.setFailToOpen();
        const failingEditor = await service.openEditor(failingInput);
        assert.ok(failingEditor instanceof ErrorPlaceholderEditor);
    });
    test('openEditor shows placeholder when restoring fails', async function () {
        const [, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-active'), TEST_EDITOR_INPUT_ID);
        const failingInput = createTestFileEditorInput(URI.parse('my://resource-failing'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input, { pinned: true });
        await service.openEditor(failingInput, { inactive: true });
        failingInput.setFailToOpen();
        const failingEditor = await service.openEditor(failingInput);
        assert.ok(failingEditor instanceof ErrorPlaceholderEditor);
    });
    test('save, saveAll, revertAll', async function () {
        const [part, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = true;
        const sameInput1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        sameInput1.dirty = true;
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        await service.openEditor(sameInput1, { pinned: true }, SIDE_GROUP);
        const res1 = await service.save({ groupId: rootGroup.id, editor: input1 });
        assert.strictEqual(res1.success, true);
        assert.strictEqual(res1.editors[0], input1);
        assert.strictEqual(input1.gotSaved, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const res2 = await service.save({ groupId: rootGroup.id, editor: input1 }, { saveAs: true });
        assert.strictEqual(res2.success, true);
        assert.strictEqual(res2.editors[0], input1);
        assert.strictEqual(input1.gotSavedAs, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const revertRes = await service.revertAll();
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const res3 = await service.saveAll();
        assert.strictEqual(res3.success, true);
        assert.strictEqual(res3.editors.length, 2);
        assert.strictEqual(input1.gotSaved, true);
        assert.strictEqual(input2.gotSaved, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        input2.gotSaved = false;
        input2.gotSavedAs = false;
        input2.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        await service.saveAll({ saveAs: true });
        assert.strictEqual(input1.gotSavedAs, true);
        assert.strictEqual(input2.gotSavedAs, true);
        // services dedupes inputs automatically
        assert.strictEqual(sameInput1.gotSaved, false);
        assert.strictEqual(sameInput1.gotSavedAs, false);
        assert.strictEqual(sameInput1.gotReverted, false);
    });
    test('saveAll, revertAll (sticky editor)', async function () {
        const [, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = true;
        const sameInput1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        sameInput1.dirty = true;
        await service.openEditor(input1, { pinned: true, sticky: true });
        await service.openEditor(input2, { pinned: true });
        await service.openEditor(sameInput1, { pinned: true }, SIDE_GROUP);
        const revertRes = await service.revertAll({ excludeSticky: true });
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, false);
        assert.strictEqual(sameInput1.gotReverted, true);
        input1.gotSaved = false;
        input1.gotSavedAs = false;
        input1.gotReverted = false;
        sameInput1.gotSaved = false;
        sameInput1.gotSavedAs = false;
        sameInput1.gotReverted = false;
        input1.dirty = true;
        input2.dirty = true;
        sameInput1.dirty = true;
        const saveRes = await service.saveAll({ excludeSticky: true });
        assert.strictEqual(saveRes.success, true);
        assert.strictEqual(saveRes.editors.length, 2);
        assert.strictEqual(input1.gotSaved, false);
        assert.strictEqual(input2.gotSaved, true);
        assert.strictEqual(sameInput1.gotSaved, true);
    });
    test('saveAll, revertAll untitled (exclude untitled)', async function () {
        await testSaveRevertUntitled({}, false, false);
        await testSaveRevertUntitled({ includeUntitled: false }, false, false);
    });
    test('saveAll, revertAll untitled (include untitled)', async function () {
        await testSaveRevertUntitled({ includeUntitled: true }, true, false);
        await testSaveRevertUntitled({ includeUntitled: { includeScratchpad: false } }, true, false);
    });
    test('saveAll, revertAll untitled (include scratchpad)', async function () {
        await testSaveRevertUntitled({ includeUntitled: { includeScratchpad: true } }, true, true);
    });
    async function testSaveRevertUntitled(options, expectUntitled, expectScratchpad) {
        const [, service] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const untitledInput = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        untitledInput.dirty = true;
        untitledInput.capabilities = 4 /* EditorInputCapabilities.Untitled */;
        const scratchpadInput = createTestFileEditorInput(URI.parse('my://resource3'), TEST_EDITOR_INPUT_ID);
        scratchpadInput.modified = true;
        scratchpadInput.capabilities = 512 /* EditorInputCapabilities.Scratchpad */ | 4 /* EditorInputCapabilities.Untitled */;
        await service.openEditor(input1, { pinned: true, sticky: true });
        await service.openEditor(untitledInput, { pinned: true });
        await service.openEditor(scratchpadInput, { pinned: true });
        const revertRes = await service.revertAll(options);
        assert.strictEqual(revertRes, true);
        assert.strictEqual(input1.gotReverted, true);
        assert.strictEqual(untitledInput.gotReverted, expectUntitled);
        assert.strictEqual(scratchpadInput.gotReverted, expectScratchpad);
        input1.gotSaved = false;
        untitledInput.gotSavedAs = false;
        scratchpadInput.gotReverted = false;
        input1.gotSaved = false;
        untitledInput.gotSavedAs = false;
        scratchpadInput.gotReverted = false;
        input1.dirty = true;
        untitledInput.dirty = true;
        scratchpadInput.modified = true;
        const saveRes = await service.saveAll(options);
        assert.strictEqual(saveRes.success, true);
        assert.strictEqual(saveRes.editors.length, expectScratchpad ? 3 : expectUntitled ? 2 : 1);
        assert.strictEqual(input1.gotSaved, true);
        assert.strictEqual(untitledInput.gotSaved, expectUntitled);
        assert.strictEqual(scratchpadInput.gotSaved, expectScratchpad);
    }
    test('file delete closes editor', async function () {
        return testFileDeleteEditorClose(false);
    });
    test('file delete leaves dirty editors open', function () {
        return testFileDeleteEditorClose(true);
    });
    async function testFileDeleteEditorClose(dirty) {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = dirty;
        const input2 = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input2.dirty = dirty;
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        assert.strictEqual(rootGroup.activeEditor, input2);
        const activeEditorChangePromise = awaitActiveEditorChange(service);
        accessor.fileService.fireAfterOperation(new FileOperationEvent(input2.resource, 1 /* FileOperation.DELETE */));
        if (!dirty) {
            await activeEditorChangePromise;
        }
        if (dirty) {
            assert.strictEqual(rootGroup.activeEditor, input2);
        }
        else {
            assert.strictEqual(rootGroup.activeEditor, input1);
        }
    }
    test('file move asks input to move', async function () {
        const [part, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('my://resource1'), TEST_EDITOR_INPUT_ID);
        const movedInput = createTestFileEditorInput(URI.parse('my://resource2'), TEST_EDITOR_INPUT_ID);
        input1.movedEditor = { editor: movedInput };
        const rootGroup = part.activeGroup;
        await service.openEditor(input1, { pinned: true });
        const activeEditorChangePromise = awaitActiveEditorChange(service);
        accessor.fileService.fireAfterOperation(new FileOperationEvent(input1.resource, 2 /* FileOperation.MOVE */, {
            resource: movedInput.resource,
            ctime: 0,
            etag: '',
            isDirectory: false,
            isFile: true,
            mtime: 0,
            name: 'resource2',
            size: 0,
            isSymbolicLink: false,
            readonly: false,
            locked: false,
            children: undefined
        }));
        await activeEditorChangePromise;
        assert.strictEqual(rootGroup.activeEditor, movedInput);
    });
    function awaitActiveEditorChange(editorService) {
        return Event.toPromise(Event.once(editorService.onDidActiveEditorChange));
    }
    test('file watcher gets installed for out of workspace files', async function () {
        const [, service, accessor] = await createEditorService();
        const input1 = createTestFileEditorInput(URI.parse('file://resource1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('file://resource2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        assert.strictEqual(accessor.fileService.watches.length, 1);
        assert.strictEqual(accessor.fileService.watches[0].toString(), input1.resource.toString());
        const editor = await service.openEditor(input2, { pinned: true });
        assert.strictEqual(accessor.fileService.watches.length, 1);
        assert.strictEqual(accessor.fileService.watches[0].toString(), input2.resource.toString());
        await editor?.group.closeAllEditors();
        assert.strictEqual(accessor.fileService.watches.length, 0);
    });
    test('activeEditorPane scopedContextKeyService', async function () {
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const [part, service] = await createEditorService(instantiationService);
        const input1 = createTestFileEditorInput(URI.parse('file://resource1'), TEST_EDITOR_INPUT_ID);
        createTestFileEditorInput(URI.parse('file://resource2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        const editorContextKeyService = service.activeEditorPane?.scopedContextKeyService;
        assert.ok(!!editorContextKeyService);
        assert.strictEqual(editorContextKeyService, part.activeGroup.activeEditorPane?.scopedContextKeyService);
    });
    test('editorResolverService - openEditor', async function () {
        const [, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return ({ editor: textEditorService.createTextEditor(editorInput) });
            },
            createDiffEditorInput: diffEditor => ({ editor: textEditorService.createTextEditor(diffEditor) })
        });
        assert.strictEqual(editorCount, 0);
        const input1 = { resource: URI.parse('file://test/path/resource1.txt') };
        const input2 = { resource: URI.parse('file://test/path/resource1.md') };
        // Open editor input 1 and it shouln't trigger override as the glob doesn't match
        await service.openEditor(input1);
        assert.strictEqual(editorCount, 0);
        // Open editor input 2 and it should trigger override as the glob doesn match
        await service.openEditor(input2);
        assert.strictEqual(editorCount, 1);
        // Because we specify an override we shouldn't see it triggered even if it matches
        await service.openEditor({ ...input2, options: { override: 'default' } });
        assert.strictEqual(editorCount, 1);
        registrationDisposable.dispose();
    });
    test('editorResolverService - openEditors', async function () {
        const [, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return ({ editor: textEditorService.createTextEditor(editorInput) });
            },
            createDiffEditorInput: diffEditor => ({ editor: textEditorService.createTextEditor(diffEditor) })
        });
        assert.strictEqual(editorCount, 0);
        const input1 = createTestFileEditorInput(URI.parse('file://test/path/resource1.txt'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input2 = createTestFileEditorInput(URI.parse('file://test/path/resource2.txt'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input3 = createTestFileEditorInput(URI.parse('file://test/path/resource3.md'), TEST_EDITOR_INPUT_ID).toUntyped();
        const input4 = createTestFileEditorInput(URI.parse('file://test/path/resource4.md'), TEST_EDITOR_INPUT_ID).toUntyped();
        assert.ok(input1);
        assert.ok(input2);
        assert.ok(input3);
        assert.ok(input4);
        // Open editor inputs
        await service.openEditors([input1, input2, input3, input4]);
        // Only two matched the factory glob
        assert.strictEqual(editorCount, 2);
        registrationDisposable.dispose();
    });
    test('editorResolverService - replaceEditors', async function () {
        const [part, service, accessor] = await createEditorService();
        const editorResolverService = accessor.editorResolverService;
        const textEditorService = accessor.textEditorService;
        let editorCount = 0;
        const registrationDisposable = editorResolverService.registerEditor('*.md', {
            id: 'TestEditor',
            label: 'Test Editor',
            detail: 'Test Editor Provider',
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createEditorInput: (editorInput) => {
                editorCount++;
                return ({ editor: textEditorService.createTextEditor(editorInput) });
            },
            createDiffEditorInput: diffEditor => ({ editor: textEditorService.createTextEditor(diffEditor) })
        });
        assert.strictEqual(editorCount, 0);
        const input1 = createTestFileEditorInput(URI.parse('file://test/path/resource2.md'), TEST_EDITOR_INPUT_ID);
        const untypedInput1 = input1.toUntyped();
        assert.ok(untypedInput1);
        // Open editor input 1 and it shouldn't trigger because typed inputs aren't overriden
        await service.openEditor(input1);
        assert.strictEqual(editorCount, 0);
        await service.replaceEditors([{
                editor: input1,
                replacement: untypedInput1,
            }], part.activeGroup);
        assert.strictEqual(editorCount, 1);
        registrationDisposable.dispose();
    });
    test('closeEditor', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Close editor
        await service.closeEditor({ editor: input, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 1);
        await service.closeEditor({ editor: input, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 1);
        await service.closeEditor({ editor: otherInput, groupId: part.activeGroup.id });
        assert.strictEqual(part.activeGroup.count, 0);
        await service.closeEditor({ editor: otherInput, groupId: 999 });
        assert.strictEqual(part.activeGroup.count, 0);
    });
    test('closeEditors', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Close editors
        await service.closeEditors([{ editor: input, groupId: part.activeGroup.id }, { editor: otherInput, groupId: part.activeGroup.id }]);
        assert.strictEqual(part.activeGroup.count, 0);
    });
    test('findEditors (in group)', async () => {
        const [part, service] = await createEditorService();
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        assert.strictEqual(part.activeGroup.count, 2);
        // Try using find editors for opened editors
        {
            const found1 = service.findEditors(input.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0], input);
            const found2 = service.findEditors(input, undefined, part.activeGroup);
            assert.strictEqual(found2, input);
        }
        {
            const found1 = service.findEditors(otherInput.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0], otherInput);
            const found2 = service.findEditors(otherInput, undefined, part.activeGroup);
            assert.strictEqual(found2, otherInput);
        }
        // Make sure we don't find non-opened editors
        {
            const found1 = service.findEditors(URI.parse('my://no-such-resource'), undefined, part.activeGroup);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors({ resource: URI.parse('my://no-such-resource'), typeId: '', editorId: TEST_EDITOR_INPUT_ID }, undefined, part.activeGroup);
            assert.strictEqual(found2, undefined);
        }
        // Make sure we don't find editors across groups
        {
            const newEditor = await service.openEditor(createTestFileEditorInput(URI.parse('my://other-group-resource'), TEST_EDITOR_INPUT_ID), { pinned: true, preserveFocus: true }, SIDE_GROUP);
            const found1 = service.findEditors(input.resource, undefined, newEditor.group.id);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input, undefined, newEditor.group.id);
            assert.strictEqual(found2, undefined);
        }
        // Check we don't find editors after closing them
        await part.activeGroup.closeAllEditors();
        {
            const found1 = service.findEditors(input.resource, undefined, part.activeGroup);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input, undefined, part.activeGroup);
            assert.strictEqual(found2, undefined);
        }
    });
    test('findEditors (across groups)', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        // Open editors
        await service.openEditors([{ editor: input }, { editor: otherInput }]);
        const sideEditor = await service.openEditor(input, { pinned: true }, SIDE_GROUP);
        // Try using find editors for opened editors
        {
            const found1 = service.findEditors(input.resource);
            assert.strictEqual(found1.length, 2);
            assert.strictEqual(found1[0].editor, input);
            assert.strictEqual(found1[0].groupId, sideEditor?.group.id);
            assert.strictEqual(found1[1].editor, input);
            assert.strictEqual(found1[1].groupId, rootGroup.id);
            const found2 = service.findEditors(input);
            assert.strictEqual(found2.length, 2);
            assert.strictEqual(found2[0].editor, input);
            assert.strictEqual(found2[0].groupId, sideEditor?.group.id);
            assert.strictEqual(found2[1].editor, input);
            assert.strictEqual(found2[1].groupId, rootGroup.id);
        }
        {
            const found1 = service.findEditors(otherInput.resource);
            assert.strictEqual(found1.length, 1);
            assert.strictEqual(found1[0].editor, otherInput);
            assert.strictEqual(found1[0].groupId, rootGroup.id);
            const found2 = service.findEditors(otherInput);
            assert.strictEqual(found2.length, 1);
            assert.strictEqual(found2[0].editor, otherInput);
            assert.strictEqual(found2[0].groupId, rootGroup.id);
        }
        // Make sure we don't find non-opened editors
        {
            const found1 = service.findEditors(URI.parse('my://no-such-resource'));
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors({ resource: URI.parse('my://no-such-resource'), typeId: '', editorId: TEST_EDITOR_INPUT_ID });
            assert.strictEqual(found2.length, 0);
        }
        // Check we don't find editors after closing them
        await rootGroup.closeAllEditors();
        await sideEditor?.group.closeAllEditors();
        {
            const found1 = service.findEditors(input.resource);
            assert.strictEqual(found1.length, 0);
            const found2 = service.findEditors(input);
            assert.strictEqual(found2.length, 0);
        }
    });
    test('findEditors (support side by side via options)', async () => {
        const [, service] = await createEditorService();
        const secondaryInput = createTestFileEditorInput(URI.parse('my://resource-findEditors-secondary'), TEST_EDITOR_INPUT_ID);
        const primaryInput = createTestFileEditorInput(URI.parse('my://resource-findEditors-primary'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput(undefined, undefined, secondaryInput, primaryInput, service);
        await service.openEditor(sideBySideInput, { pinned: true });
        let foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'));
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), { supportSideBySide: SideBySideEditor.PRIMARY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), { supportSideBySide: SideBySideEditor.PRIMARY });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), { supportSideBySide: SideBySideEditor.SECONDARY });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), { supportSideBySide: SideBySideEditor.SECONDARY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-primary'), { supportSideBySide: SideBySideEditor.ANY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = service.findEditors(URI.parse('my://resource-findEditors-secondary'), { supportSideBySide: SideBySideEditor.ANY });
        assert.strictEqual(foundEditors.length, 1);
    });
    test('side by side editor is not matching all other editors (https://github.com/microsoft/vscode/issues/132859)', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input = createTestFileEditorInput(URI.parse('my://resource-openEditors'), TEST_EDITOR_INPUT_ID);
        const otherInput = createTestFileEditorInput(URI.parse('my://resource2-openEditors'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = new SideBySideEditorInput(undefined, undefined, input, input, service);
        const otherSideBySideInput = new SideBySideEditorInput(undefined, undefined, otherInput, otherInput, service);
        await service.openEditor(sideBySideInput, undefined, SIDE_GROUP);
        part.activateGroup(rootGroup);
        await service.openEditor(otherSideBySideInput, { revealIfOpened: true, revealIfVisible: true });
        assert.strictEqual(rootGroup.count, 1);
    });
    test('onDidCloseEditor indicates proper context when moving editor across groups', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        await service.openEditor(input2, { pinned: true });
        const sidegroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const events = [];
        disposables.add(service.onDidCloseEditor(e => {
            events.push(e);
        }));
        rootGroup.moveEditor(input1, sidegroup);
        assert.strictEqual(events[0].context, EditorCloseContext.MOVE);
        await sidegroup.closeEditor(input1);
        assert.strictEqual(events[1].context, EditorCloseContext.UNKNOWN);
    });
    test('onDidCloseEditor indicates proper context when replacing an editor', async () => {
        const [part, service] = await createEditorService();
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.parse('my://resource-onDidCloseEditor2'), TEST_EDITOR_INPUT_ID);
        await service.openEditor(input1, { pinned: true });
        const events = [];
        disposables.add(service.onDidCloseEditor(e => {
            events.push(e);
        }));
        await rootGroup.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(events[0].context, EditorCloseContext.REPLACE);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvdGVzdC9icm93c2VyL2VkaXRvclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLGlEQUFpRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGtCQUFrQixFQUFrRyx3QkFBd0IsRUFBeUQsZ0JBQWdCLEVBQUUsYUFBYSxFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBQ3pVLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBNkIsMEJBQTBCLEVBQUUsNEJBQTRCLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsNEJBQTRCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwVyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0QsT0FBTyxFQUFnQixvQkFBb0IsRUFBcUMsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1SCxPQUFPLEVBQUUsWUFBWSxFQUFtQyxjQUFjLEVBQWtCLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOERBQThELENB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QUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLFVBQVUsMkNBQW1DLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLFVBQVUsMkNBQW1DLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0gsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5SSxNQUFNLENBQUMsV0FBVyxDQUFDLDhCQUE4QixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV2RCxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RyxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTNDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLFVBQVUsaUNBQXlCLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFL0QsTUFBTSxnQ0FBZ0MsR0FBRyxhQUFhLENBQUMsVUFBVSxrQ0FBMEIsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwSCxNQUFNLENBQUMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUzRSxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FBQyxVQUFVLDRDQUFvQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxJQUFJLENBQUMsbUVBQW1FLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEYsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO1FBRWhELE1BQU0sS0FBSyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRXZHLElBQUksOEJBQThCLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2RSw4QkFBOEIsRUFBRSxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSwrQkFBK0IsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSwyQkFBMkIsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFO1lBQzFFLCtCQUErQixFQUFFLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUM7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUM7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV2RCwwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNyQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0R0FBNEcsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3SCxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7UUFFaEQsSUFBSSxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFL0YsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRCxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTNELElBQUksT0FBTyxHQUFHLE1BQU0sUUFBUSxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyxJQUFJLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXRDLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUMzRixNQUFNLFNBQVMsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUVyRyxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN2RCxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUzRCxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUM7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTFDLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQztRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakYsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7UUFFcEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDM0gsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFFM0gsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7UUFDaEYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO1FBRTVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVsRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztRQUU5RCxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVELHFDQUFxQyxFQUNyQyxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsRUFDMUYsRUFBRSxFQUNGO1lBQ0MsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1NBQzNHLENBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMERBQTBELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNwSixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3JKLE1BQU0sTUFBTSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDckosTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNySixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3JKLE1BQU0sTUFBTSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDckosTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUVySixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkUsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUvRSxNQUFNLE1BQU0sR0FBRyxPQUFPLEVBQUUsS0FBSyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyQyxNQUFNLE1BQU0sR0FBRyxPQUFPLEVBQUUsS0FBSyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTlCLGlEQUFpRDtRQUNqRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwQyxrREFBa0Q7UUFDbEQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUUxRix3REFBd0Q7UUFDeEQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRWpFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFMUYscURBQXFEO1FBQ3JELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxDLE1BQU0sTUFBTSxHQUFHLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJDLHdEQUF3RDtRQUN4RCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxDLGlEQUFpRDtRQUNqRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsQixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkUsTUFBTSxNQUFNLEdBQUcsT0FBTyxFQUFFLEtBQUssQ0FBQztRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDMUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxDLHFEQUFxRDtRQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5CLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsQixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUUxRix5RkFBeUY7UUFDekYsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsQixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUU5QixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUUxRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFMUYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFOUIsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFMUYsMERBQTBEO1FBQzFELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0QsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDM0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbkYsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDNUQsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRXZFLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVsRixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVELHFDQUFxQyxFQUNyQyxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsRUFDMUYsRUFBRSxFQUNGO1lBQ0MsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1NBQzNHLENBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsK0JBQXVCLENBQUM7UUFFbEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywwREFBMEQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3BKLE1BQU0sTUFBTSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDckosTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNySixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBRXJKLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXRELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXBHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFcEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRCxXQUFXLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUUxQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7UUFFOUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1RCxxQ0FBcUMsRUFDckMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsd0JBQXdCLENBQUMsU0FBUyxFQUFFLEVBQzFGLEVBQUUsRUFDRjtZQUNDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztTQUMzRyxDQUNELENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLCtCQUF1QixDQUFDO1FBRWxFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFOUIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMERBQTBELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNwSixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3JKLE1BQU0sTUFBTSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDckosTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUVySixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV0RCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV2RCxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEIsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXBHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRS9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUVwRyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pELFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztRQUU5RCxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVELHFDQUFxQyxFQUNyQyxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsRUFDMUYsRUFBRSxFQUNGO1lBQ0MsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1NBQzNHLENBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsK0JBQXVCLENBQUM7UUFFbEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUU5QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywwREFBMEQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3BKLE1BQU0sTUFBTSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDckosTUFBTSxNQUFNLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNySixNQUFNLE1BQU0sR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBRXJKLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXRELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU5RixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFcEcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXBHLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssVUFBVSxlQUFlLENBQUMsY0FBdUI7UUFDckQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO1FBRTlELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFFakMsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7UUFDNUIsSUFBSSwyQkFBMkIsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSx1QkFBdUIsR0FBRyxDQUFDLENBQUM7UUFFaEMsSUFBSSx1QkFBdUIsR0FBcUMsU0FBUyxDQUFDO1FBQzFFLElBQUksK0JBQStCLEdBQWlELFNBQVMsQ0FBQztRQUM5RixJQUFJLDJCQUEyQixHQUF5QyxTQUFTLENBQUM7UUFFbEYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1RCxpQ0FBaUMsRUFDakMsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsd0JBQXdCLENBQUMsU0FBUyxFQUFFLEVBQzFGLEVBQUUsRUFDRjtZQUNDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUMzQixtQkFBbUIsRUFBRSxDQUFDO2dCQUN0Qix1QkFBdUIsR0FBRyxNQUFNLENBQUM7Z0JBRWpDLE9BQU8sRUFBRSxNQUFNLEVBQUUseUJBQXlCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDckYsQ0FBQztZQUNELHlCQUF5QixFQUFFLGNBQWMsQ0FBQyxFQUFFO2dCQUMzQywyQkFBMkIsRUFBRSxDQUFDO2dCQUM5QiwrQkFBK0IsR0FBRyxjQUFjLENBQUM7Z0JBRWpELE9BQU8sRUFBRSxNQUFNLEVBQUUseUJBQXlCLENBQUMsY0FBYyxDQUFDLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLGlDQUFpQywyQkFBMkIsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQzFLLENBQUM7WUFDRCxxQkFBcUIsRUFBRSxVQUFVLENBQUMsRUFBRTtnQkFDbkMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDMUIsMkJBQTJCLEdBQUcsVUFBVSxDQUFDO2dCQUV6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSx1QkFBdUIsRUFBRSxDQUFDLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQ3hILENBQUM7U0FDRCxDQUNELENBQUMsQ0FBQztRQUVILEtBQUssVUFBVSxjQUFjO1lBQzVCLG1CQUFtQixHQUFHLENBQUMsQ0FBQztZQUN4QiwyQkFBMkIsR0FBRyxDQUFDLENBQUM7WUFDaEMsdUJBQXVCLEdBQUcsQ0FBQyxDQUFDO1lBRTVCLHVCQUF1QixHQUFHLFNBQVMsQ0FBQztZQUNwQywrQkFBK0IsR0FBRyxTQUFTLENBQUM7WUFDNUMsMkJBQTJCLEdBQUcsU0FBUyxDQUFDO1lBRXhDLE1BQU0saUJBQWlCLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFFdkQsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDOUIsQ0FBQztRQUVELEtBQUssVUFBVSxVQUFVLENBQUMsTUFBb0QsRUFBRSxLQUFzQjtZQUNyRyxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQiwwRUFBMEU7Z0JBQzFFLGtHQUFrRztnQkFDbEcsa0JBQWtCO2dCQUNsQixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ2hFLE1BQU0sR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUMxQyxDQUFDO2dCQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN6RCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixDQUFDO1lBRUQsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2pFLENBQUM7WUFFRCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxVQUFVO1FBQ1YsQ0FBQztZQUNBLGdEQUFnRDtZQUNoRCxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQztnQkFDekcsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzdDLElBQUksV0FBVyxHQUFHLElBQUksRUFBRSxLQUFLLENBQUM7Z0JBRTlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4Qyw0Q0FBNEM7Z0JBQzVDLHFCQUFxQjtnQkFDckIsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRTFELGlDQUFpQztnQkFDakMsTUFBTSx3QkFBd0IsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdILE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUM3QixNQUFNLEVBQUUsV0FBVzt3QkFDbkIsV0FBVyxFQUFFLHdCQUF3QjtxQkFDckMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVmLFdBQVcsR0FBRyxTQUFTLENBQUMsWUFBYSxDQUFDO2dCQUV0QyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBRXBHLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztnQkFDdEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCw2REFBNkQ7WUFDN0QsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUMvSixNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQztnQkFFaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxlQUFlLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsNENBQTRDO2dCQUM1QyxxQkFBcUI7Z0JBQ3JCLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxnR0FBZ0c7WUFDaEcsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsMEJBQTBCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDbE0sTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLGVBQWUsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCxnRUFBZ0U7WUFDaEUsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUMvSixNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFFN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksZUFBZSxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUV0RixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCw4RUFBOEU7WUFDOUUsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLENBQUM7Z0JBQ3RKLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxpRkFBaUY7WUFDakYsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ3pKLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxXQUFXLENBQUUsdUJBQWdELENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDN0gsTUFBTSxDQUFDLFdBQVcsQ0FBRSx1QkFBZ0QsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNuRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCxpSEFBaUg7WUFDakgsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO2dCQUN6TCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFFN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFFLHVCQUFnRCxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQzdILE1BQU0sQ0FBQyxXQUFXLENBQUUsdUJBQWdELENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO2dCQUN2QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBRUQsa0RBQWtEO1lBQ2xELENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXlCLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDO2dCQUN6RyxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUV2RixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7WUFDeEIsQ0FBQztZQUVELCtEQUErRDtZQUMvRCxDQUFDO2dCQUNBLE1BQU0sYUFBYSxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQy9KLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDakUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksZUFBZSxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUV0RixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsUUFBUTtRQUNSLENBQUM7WUFDQSxxQ0FBcUM7WUFDckMsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDcEgsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxVQUFVLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQztnQkFFN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUVwRix3RUFBd0U7Z0JBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFekQsaUNBQWlDO2dCQUNqQyxNQUFNLHNCQUFzQixHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUN4SSxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFDN0IsTUFBTSxFQUFFLFdBQVc7d0JBQ25CLFdBQVcsRUFBRSxzQkFBc0I7cUJBQ25DLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFZixVQUFVLEdBQUcsU0FBUyxDQUFDLFlBQWEsQ0FBQztnQkFFckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUUvRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7WUFDeEIsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNwSCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsS0FBSyxDQUFDO2dCQUUvQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBRXBGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQsbUZBQW1GO1lBQ25GLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3BILE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRXZHLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUVELHFEQUFxRDtZQUNyRCxDQUFDO2dCQUNBLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNwSCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFN0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxxR0FBcUc7Z0JBQ3JHLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQsbUVBQW1FO1lBQ25FLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3BILE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRXBHLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUVwRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxzRUFBc0U7WUFDdEUsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDcEgsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFdkcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO2dCQUN2QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBRUQsc0dBQXNHO1lBQ3RHLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3BILE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUV2SSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCx1Q0FBdUM7WUFDdkMsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDcEgsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRW5FLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUVyRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDcEgsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRW5FLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUVwRixNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLENBQUM7WUFDQSxnREFBZ0Q7WUFDaEQsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBcUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLENBQUM7Z0JBQzdILE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsK0JBQStCLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBcUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLENBQUM7Z0JBQzdILE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDakUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRTVELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQseUVBQXlFO1lBQ3pFLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMzSixNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQztnQkFFaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUU1RCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQywrQkFBK0IsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLDRDQUE0QztnQkFDNUMscUJBQXFCO2dCQUNyQixNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQsaUZBQWlGO1lBQ2pGLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQXFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQztnQkFDaEssTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsK0JBQStCLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUUsK0JBQW9FLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdkgsTUFBTSxDQUFDLFdBQVcsQ0FBRSwrQkFBb0UsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNoSCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELGVBQWU7UUFDZixDQUFDO1lBQ0EsNENBQTRDO1lBQzVDLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQTZCO29CQUMvQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFO29CQUMvRSxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFO29CQUMvRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUU7aUJBQzNDLENBQUM7Z0JBQ0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzdDLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxLQUFLLENBQUM7Z0JBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUUvRCxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCw4Q0FBOEM7WUFDOUMsQ0FBQztnQkFDQSxNQUFNLGFBQWEsR0FBNkI7b0JBQy9DLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLEVBQUU7b0JBQy9FLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRTtpQkFDM0MsQ0FBQztnQkFDRixNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFFL0QsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQsNkVBQTZFO1lBQzdFLENBQUM7Z0JBQ0EsTUFBTSxhQUFhLEdBQTZCO29CQUMvQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFO29CQUMvRSxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFO29CQUMvRSxPQUFPLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUk7cUJBQ2pFO2lCQUNELENBQUM7Z0JBQ0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUUsMkJBQWdFLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbkgsTUFBTSxDQUFDLFdBQVcsQ0FBRSwyQkFBZ0UsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUU1RyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLENBQUM7WUFFQSx1QkFBdUI7WUFDdkIsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDaEcsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFFdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksbUJBQW1CLENBQUMsQ0FBQztnQkFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUU1QyxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUUvQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCx5QkFBeUI7WUFDekIsQ0FBQztnQkFDQSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztnQkFDaEcsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBRW5FLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFFN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxDQUFDO1lBRUEsdUJBQXVCO1lBQ3ZCLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2hHLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7Z0JBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBRXZELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxjQUFjLEVBQUUsQ0FBQztZQUN4QixDQUFDO1lBRUQseUJBQXlCO1lBQ3pCLENBQUM7Z0JBQ0EsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2hHLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7Z0JBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBRXhDLE1BQU0sY0FBYyxFQUFFLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUVwQixtQ0FBbUM7WUFDbkMsQ0FBQztnQkFDQSxNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNHLE1BQU0sY0FBYyxHQUF5QixFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0csTUFBTSxjQUFjLEdBQTJCLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7Z0JBQzVKLE1BQU0sY0FBYyxHQUEyQixFQUFFLE1BQU0sRUFBRSx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUM1SixNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNHLE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFOUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUV6QyxnRkFBZ0Y7Z0JBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRS9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLENBQUM7WUFDQSxtREFBbUQ7WUFDbkQsQ0FBQztnQkFDQSxNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNoSSxNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFFekcsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sVUFBVSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFN0MsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTFELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUVqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUU3QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7WUFFRCxrREFBa0Q7WUFDbEQsQ0FBQztnQkFDQSxNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUMvSCxNQUFNLGNBQWMsR0FBeUIsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFFekcsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQzNHLE1BQU0sUUFBUSxHQUFHLE1BQU0sVUFBVSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFN0MsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTFELE1BQU0sVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUVqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUU3QyxNQUFNLGNBQWMsRUFBRSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyx1REFBdUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RSxXQUFXLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUUxQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO1FBRTFELFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDNUQsaUNBQWlDLEVBQ2pDLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxFQUMxRixFQUFFLEVBQ0Y7WUFDQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUseUJBQXlCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7U0FDM0csQ0FDRCxDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsSUFBSSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDN0gsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFaEssTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXZELE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUVuQyw2Q0FBNkM7UUFDN0MsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVoSSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksWUFBWSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV2RCwwQ0FBMEM7UUFDMUMsSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU5SSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEQsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLG1CQUFtQixFQUFFLENBQUM7UUFFcEQsTUFBTSxLQUFLLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEcsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDNUcsTUFBTSxlQUFlLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFaEcsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXhJLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pILE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFB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QU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFM0IsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFeEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFNUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFM0IsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsVUFBVSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFeEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBRTNCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLFVBQVUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRXhCLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDM0IsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFM0IsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDcEIsVUFBVSxDQUFDLEtBQUssR0FB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Q0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFDRCxDQUFDO1lBQ0EsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXBELE1BQU0sTUFB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QUMsQ0FBQztRQUUzQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3RJLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3hJLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2hJLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xJLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1B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