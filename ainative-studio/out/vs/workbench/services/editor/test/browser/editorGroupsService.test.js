/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, registerTestEditor, TestFileEditorInput, TestServiceAccessor, workbenchTeardown, createEditorParts } from '../../../../test/browser/workbenchTestServices.js';
import { isEditorGroup, IEditorGroupsService } from '../../common/editorGroupsService.js';
import { SideBySideEditor, EditorExtensions } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MockScopableContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../../base/common/event.js';
import { isEqual } from '../../../../../base/common/resources.js';
suite('EditorGroupsService', () => {
    const TEST_EDITOR_ID = 'MyFileEditorForEditorGroupService';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorGroupService';
    const disposables = new DisposableStore();
    let testLocalInstantiationService = undefined;
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(SideBySideEditorInput)], TEST_EDITOR_INPUT_ID));
    });
    teardown(async () => {
        if (testLocalInstantiationService) {
            await workbenchTeardown(testLocalInstantiationService);
            testLocalInstantiationService = undefined;
        }
        disposables.clear();
    });
    async function createParts(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        instantiationService.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const parts = await createEditorParts(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, parts);
        testLocalInstantiationService = instantiationService;
        return [parts, instantiationService];
    }
    async function createPart(instantiationService) {
        const [parts, testInstantiationService] = await createParts(instantiationService);
        return [parts.testMainPart, testInstantiationService];
    }
    function createTestFileEditorInput(resource, typeId) {
        return disposables.add(new TestFileEditorInput(resource, typeId));
    }
    test('groups basics', async function () {
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const [part] = await createPart(instantiationService);
        let activeGroupModelChangeCounter = 0;
        const activeGroupModelChangeListener = part.onDidChangeActiveGroup(() => {
            activeGroupModelChangeCounter++;
        });
        let groupAddedCounter = 0;
        const groupAddedListener = part.onDidAddGroup(() => {
            groupAddedCounter++;
        });
        let groupRemovedCounter = 0;
        const groupRemovedListener = part.onDidRemoveGroup(() => {
            groupRemovedCounter++;
        });
        let groupMovedCounter = 0;
        const groupMovedListener = part.onDidMoveGroup(() => {
            groupMovedCounter++;
        });
        // always a root group
        const rootGroup = part.groups[0];
        assert.strictEqual(isEditorGroup(rootGroup), true);
        assert.strictEqual(part.groups.length, 1);
        assert.strictEqual(part.count, 1);
        assert.strictEqual(rootGroup, part.getGroup(rootGroup.id));
        assert.ok(part.activeGroup === rootGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        let mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 1);
        assert.strictEqual(mru[0], rootGroup);
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rightGroup, part.getGroup(rightGroup.id));
        assert.strictEqual(groupAddedCounter, 1);
        assert.strictEqual(part.groups.length, 2);
        assert.strictEqual(part.count, 2);
        assert.ok(part.activeGroup === rootGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rootGroup);
        assert.strictEqual(mru[1], rightGroup);
        assert.strictEqual(activeGroupModelChangeCounter, 0);
        let rootGroupActiveChangeCounter = 0;
        const rootGroupModelChangeListener = rootGroup.onDidModelChange(e => {
            if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                rootGroupActiveChangeCounter++;
            }
        });
        let rightGroupActiveChangeCounter = 0;
        const rightGroupModelChangeListener = rightGroup.onDidModelChange(e => {
            if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                rightGroupActiveChangeCounter++;
            }
        });
        part.activateGroup(rightGroup);
        assert.ok(part.activeGroup === rightGroup);
        assert.strictEqual(activeGroupModelChangeCounter, 1);
        assert.strictEqual(rootGroupActiveChangeCounter, 1);
        assert.strictEqual(rightGroupActiveChangeCounter, 1);
        rootGroupModelChangeListener.dispose();
        rightGroupModelChangeListener.dispose();
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        let didDispose = false;
        disposables.add(downGroup.onWillDispose(() => {
            didDispose = true;
        }));
        assert.strictEqual(groupAddedCounter, 2);
        assert.strictEqual(part.groups.length, 3);
        assert.ok(part.activeGroup === rightGroup);
        assert.ok(!downGroup.activeEditorPane);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        assert.strictEqual(downGroup.label, 'Group 3');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 3);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        assert.strictEqual(mru[2], downGroup);
        const gridOrder = part.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        assert.strictEqual(gridOrder.length, 3);
        assert.strictEqual(gridOrder[0], rootGroup);
        assert.strictEqual(gridOrder[0].index, 0);
        assert.strictEqual(gridOrder[1], rightGroup);
        assert.strictEqual(gridOrder[1].index, 1);
        assert.strictEqual(gridOrder[2], downGroup);
        assert.strictEqual(gridOrder[2].index, 2);
        part.moveGroup(downGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(groupMovedCounter, 1);
        part.removeGroup(downGroup);
        assert.ok(!part.getGroup(downGroup.id));
        assert.ok(!part.hasGroup(downGroup.id));
        assert.strictEqual(didDispose, true);
        assert.strictEqual(groupRemovedCounter, 1);
        assert.strictEqual(part.groups.length, 2);
        assert.ok(part.activeGroup === rightGroup);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 2);
        assert.strictEqual(mru[0], rightGroup);
        assert.strictEqual(mru[1], rootGroup);
        const rightGroupContextKeyService = part.activeGroup.scopedContextKeyService;
        const rootGroupContextKeyService = rootGroup.scopedContextKeyService;
        assert.ok(rightGroupContextKeyService);
        assert.ok(rootGroupContextKeyService);
        assert.ok(rightGroupContextKeyService !== rootGroupContextKeyService);
        part.removeGroup(rightGroup);
        assert.strictEqual(groupRemovedCounter, 2);
        assert.strictEqual(part.groups.length, 1);
        assert.ok(part.activeGroup === rootGroup);
        mru = part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru.length, 1);
        assert.strictEqual(mru[0], rootGroup);
        part.removeGroup(rootGroup); // cannot remove root group
        assert.strictEqual(part.groups.length, 1);
        assert.strictEqual(groupRemovedCounter, 2);
        assert.ok(part.activeGroup === rootGroup);
        part.setGroupOrientation(part.orientation === 0 /* GroupOrientation.HORIZONTAL */ ? 1 /* GroupOrientation.VERTICAL */ : 0 /* GroupOrientation.HORIZONTAL */);
        activeGroupModelChangeListener.dispose();
        groupAddedListener.dispose();
        groupRemovedListener.dispose();
        groupMovedListener.dispose();
    });
    test('sideGroup', async () => {
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        await part.sideGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.count, 2);
        part.activateGroup(rootGroup);
        await part.sideGroup.openEditor(input3, { pinned: true });
        assert.strictEqual(part.count, 2);
    });
    test('save & restore state', async function () {
        const [part, instantiationService] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        const rootGroupInput = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(rootGroupInput, { pinned: true });
        const rightGroupInput = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await rightGroup.openEditor(rightGroupInput, { pinned: true });
        assert.strictEqual(part.groups.length, 3);
        part.testSaveState();
        part.dispose();
        const [restoredPart] = await createPart(instantiationService);
        assert.strictEqual(restoredPart.groups.length, 3);
        assert.ok(restoredPart.getGroup(rootGroup.id));
        assert.ok(restoredPart.hasGroup(rootGroup.id));
        assert.ok(restoredPart.getGroup(rightGroup.id));
        assert.ok(restoredPart.hasGroup(rightGroup.id));
        assert.ok(restoredPart.getGroup(downGroup.id));
        assert.ok(restoredPart.hasGroup(downGroup.id));
        restoredPart.clearState();
    });
    test('groups index / labels', async function () {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        let groupIndexChangedCounter = 0;
        const groupIndexChangedListener = part.onDidChangeGroupIndex(() => {
            groupIndexChangedCounter++;
        });
        let indexChangeCounter = 0;
        const labelChangeListener = downGroup.onDidModelChange(e => {
            if (e.kind === 1 /* GroupModelChangeKind.GROUP_INDEX */) {
                indexChangeCounter++;
            }
        });
        assert.strictEqual(rootGroup.index, 0);
        assert.strictEqual(rightGroup.index, 1);
        assert.strictEqual(downGroup.index, 2);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        assert.strictEqual(downGroup.label, 'Group 3');
        part.removeGroup(rightGroup);
        assert.strictEqual(rootGroup.index, 0);
        assert.strictEqual(downGroup.index, 1);
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(downGroup.label, 'Group 2');
        assert.strictEqual(indexChangeCounter, 1);
        assert.strictEqual(groupIndexChangedCounter, 1);
        part.moveGroup(downGroup, rootGroup, 0 /* GroupDirection.UP */);
        assert.strictEqual(downGroup.index, 0);
        assert.strictEqual(rootGroup.index, 1);
        assert.strictEqual(downGroup.label, 'Group 1');
        assert.strictEqual(rootGroup.label, 'Group 2');
        assert.strictEqual(indexChangeCounter, 2);
        assert.strictEqual(groupIndexChangedCounter, 3);
        const newFirstGroup = part.addGroup(downGroup, 0 /* GroupDirection.UP */);
        assert.strictEqual(newFirstGroup.index, 0);
        assert.strictEqual(downGroup.index, 1);
        assert.strictEqual(rootGroup.index, 2);
        assert.strictEqual(newFirstGroup.label, 'Group 1');
        assert.strictEqual(downGroup.label, 'Group 2');
        assert.strictEqual(rootGroup.label, 'Group 3');
        assert.strictEqual(indexChangeCounter, 3);
        assert.strictEqual(groupIndexChangedCounter, 6);
        labelChangeListener.dispose();
        groupIndexChangedListener.dispose();
    });
    test('groups label', async function () {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        let partLabelChangedCounter = 0;
        const groupIndexChangedListener = part.onDidChangeGroupLabel(() => {
            partLabelChangedCounter++;
        });
        let rootGroupLabelChangeCounter = 0;
        const rootGroupLabelChangeListener = rootGroup.onDidModelChange(e => {
            if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                rootGroupLabelChangeCounter++;
            }
        });
        let rightGroupLabelChangeCounter = 0;
        const rightGroupLabelChangeListener = rightGroup.onDidModelChange(e => {
            if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                rightGroupLabelChangeCounter++;
            }
        });
        assert.strictEqual(rootGroup.label, 'Group 1');
        assert.strictEqual(rightGroup.label, 'Group 2');
        part.notifyGroupsLabelChange('Window 2');
        assert.strictEqual(rootGroup.label, 'Window 2: Group 1');
        assert.strictEqual(rightGroup.label, 'Window 2: Group 2');
        assert.strictEqual(rootGroupLabelChangeCounter, 1);
        assert.strictEqual(rightGroupLabelChangeCounter, 1);
        assert.strictEqual(partLabelChangedCounter, 2);
        part.notifyGroupsLabelChange('Window 3');
        assert.strictEqual(rootGroup.label, 'Window 3: Group 1');
        assert.strictEqual(rightGroup.label, 'Window 3: Group 2');
        assert.strictEqual(rootGroupLabelChangeCounter, 2);
        assert.strictEqual(rightGroupLabelChangeCounter, 2);
        assert.strictEqual(partLabelChangedCounter, 4);
        rootGroupLabelChangeListener.dispose();
        rightGroupLabelChangeListener.dispose();
        groupIndexChangedListener.dispose();
    });
    test('copy/merge groups', async () => {
        const [part] = await createPart();
        let groupAddedCounter = 0;
        const groupAddedListener = part.onDidAddGroup(() => {
            groupAddedCounter++;
        });
        let groupRemovedCounter = 0;
        const groupRemovedListener = part.onDidRemoveGroup(() => {
            groupRemovedCounter++;
        });
        const rootGroup = part.groups[0];
        let rootGroupDisposed = false;
        const disposeListener = rootGroup.onWillDispose(() => {
            rootGroupDisposed = true;
        });
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input, { pinned: true });
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        part.activateGroup(rightGroup);
        const downGroup = part.copyGroup(rootGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(groupAddedCounter, 2);
        assert.strictEqual(downGroup.count, 1);
        assert.ok(downGroup.activeEditor instanceof TestFileEditorInput);
        let res = part.mergeGroup(rootGroup, rightGroup, { mode: 0 /* MergeGroupMode.COPY_EDITORS */ });
        assert.strictEqual(res, true);
        assert.strictEqual(rightGroup.count, 1);
        assert.ok(rightGroup.activeEditor instanceof TestFileEditorInput);
        res = part.mergeGroup(rootGroup, rightGroup, { mode: 1 /* MergeGroupMode.MOVE_EDITORS */ });
        assert.strictEqual(res, true);
        assert.strictEqual(rootGroup.count, 0);
        res = part.mergeGroup(rootGroup, downGroup);
        assert.strictEqual(res, true);
        assert.strictEqual(groupRemovedCounter, 1);
        assert.strictEqual(rootGroupDisposed, true);
        groupAddedListener.dispose();
        groupRemovedListener.dispose();
        disposeListener.dispose();
        part.dispose();
    });
    test('merge all groups', async () => {
        const [part] = await createPart();
        const rootGroup = part.groups[0];
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        await rightGroup.openEditor(input2, { pinned: true });
        const downGroup = part.copyGroup(rootGroup, rightGroup, 1 /* GroupDirection.DOWN */);
        await downGroup.openEditor(input3, { pinned: true });
        part.activateGroup(rootGroup);
        assert.strictEqual(rootGroup.count, 1);
        const result = part.mergeAllGroups(part.activeGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(rootGroup.count, 3);
        part.dispose();
    });
    test('whenReady / whenRestored', async () => {
        const [part] = await createPart();
        await part.whenReady;
        assert.strictEqual(part.isReady, true);
        await part.whenRestored;
    });
    test('options', async () => {
        const [part] = await createPart();
        let oldOptions;
        let newOptions;
        disposables.add(part.onDidChangeEditorPartOptions(event => {
            oldOptions = event.oldPartOptions;
            newOptions = event.newPartOptions;
        }));
        const currentOptions = part.partOptions;
        assert.ok(currentOptions);
        disposables.add(part.enforcePartOptions({ showTabs: 'single' }));
        assert.strictEqual(part.partOptions.showTabs, 'single');
        assert.strictEqual(newOptions.showTabs, 'single');
        assert.strictEqual(oldOptions, currentOptions);
    });
    test('editor basics', async function () {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        let activeEditorChangeCounter = 0;
        let editorDidOpenCounter = 0;
        const editorOpenEvents = [];
        let editorCloseCounter = 0;
        const editorCloseEvents = [];
        let editorPinCounter = 0;
        let editorStickyCounter = 0;
        let editorCapabilitiesCounter = 0;
        const editorGroupModelChangeListener = group.onDidModelChange(e => {
            if (e.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */) {
                assert.ok(e.editor);
                editorDidOpenCounter++;
                editorOpenEvents.push(e);
            }
            else if (e.kind === 11 /* GroupModelChangeKind.EDITOR_PIN */) {
                assert.ok(e.editor);
                editorPinCounter++;
            }
            else if (e.kind === 13 /* GroupModelChangeKind.EDITOR_STICKY */) {
                assert.ok(e.editor);
                editorStickyCounter++;
            }
            else if (e.kind === 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */) {
                assert.ok(e.editor);
                editorCapabilitiesCounter++;
            }
            else if (e.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */) {
                assert.ok(e.editor);
                editorCloseCounter++;
                editorCloseEvents.push(e);
            }
        });
        const activeEditorChangeListener = group.onDidActiveEditorChange(e => {
            assert.ok(e.editor);
            activeEditorChangeCounter++;
        });
        let editorCloseCounter1 = 0;
        const editorCloseListener = group.onDidCloseEditor(() => {
            editorCloseCounter1++;
        });
        let editorWillCloseCounter = 0;
        const editorWillCloseListener = group.onWillCloseEditor(() => {
            editorWillCloseCounter++;
        });
        let editorDidCloseCounter = 0;
        const editorDidCloseListener = group.onDidCloseEditor(() => {
            editorDidCloseCounter++;
        });
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        assert.strictEqual(group.isActive(input), true);
        assert.strictEqual(group.isActive(inputInactive), false);
        assert.strictEqual(group.contains(input), true);
        assert.strictEqual(group.contains(inputInactive), true);
        assert.strictEqual(group.isEmpty, false);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(editorCapabilitiesCounter, 0);
        assert.strictEqual(editorDidOpenCounter, 2);
        assert.strictEqual(editorOpenEvents[0].editorIndex, 0);
        assert.strictEqual(editorOpenEvents[1].editorIndex, 1);
        assert.strictEqual(editorOpenEvents[0].editor, input);
        assert.strictEqual(editorOpenEvents[1].editor, inputInactive);
        assert.strictEqual(activeEditorChangeCounter, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        assert.strictEqual(group.getIndexOfEditor(input), 0);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 1);
        assert.strictEqual(group.isFirst(input), true);
        assert.strictEqual(group.isFirst(inputInactive), false);
        assert.strictEqual(group.isLast(input), false);
        assert.strictEqual(group.isLast(inputInactive), true);
        input.capabilities = 16 /* EditorInputCapabilities.RequiresTrust */;
        assert.strictEqual(editorCapabilitiesCounter, 1);
        inputInactive.capabilities = 8 /* EditorInputCapabilities.Singleton */;
        assert.strictEqual(editorCapabilitiesCounter, 2);
        assert.strictEqual(group.previewEditor, inputInactive);
        assert.strictEqual(group.isPinned(inputInactive), false);
        group.pinEditor(inputInactive);
        assert.strictEqual(editorPinCounter, 1);
        assert.strictEqual(group.isPinned(inputInactive), true);
        assert.ok(!group.previewEditor);
        assert.strictEqual(group.activeEditor, input);
        assert.strictEqual(group.activeEditorPane?.getId(), TEST_EDITOR_ID);
        assert.strictEqual(group.count, 2);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input);
        assert.strictEqual(mru[1], inputInactive);
        await group.openEditor(inputInactive);
        assert.strictEqual(activeEditorChangeCounter, 2);
        assert.strictEqual(group.activeEditor, inputInactive);
        await group.openEditor(input);
        const closed = await group.closeEditor(inputInactive);
        assert.strictEqual(closed, true);
        assert.strictEqual(activeEditorChangeCounter, 3);
        assert.strictEqual(editorCloseCounter, 1);
        assert.strictEqual(editorCloseEvents[0].editorIndex, 1);
        assert.strictEqual(editorCloseEvents[0].editor, inputInactive);
        assert.strictEqual(editorCloseCounter1, 1);
        assert.strictEqual(editorWillCloseCounter, 1);
        assert.strictEqual(editorDidCloseCounter, 1);
        assert.ok(inputInactive.gotDisposed);
        assert.strictEqual(group.activeEditor, input);
        assert.strictEqual(editorStickyCounter, 0);
        group.stickEditor(input);
        assert.strictEqual(editorStickyCounter, 1);
        group.unstickEditor(input);
        assert.strictEqual(editorStickyCounter, 2);
        editorCloseListener.dispose();
        editorWillCloseListener.dispose();
        editorDidCloseListener.dispose();
        activeEditorChangeListener.dispose();
        editorGroupModelChangeListener.dispose();
    });
    test('openEditors / closeEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive }
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        await group.closeEditors([input, inputInactive]);
        assert.ok(input.gotDisposed);
        assert.ok(inputInactive.gotDisposed);
        assert.strictEqual(group.isEmpty, true);
    });
    test('closeEditor - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        input.dirty = true;
        await group.openEditor(input);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        let closed = await group.closeEditor(input);
        assert.strictEqual(closed, false);
        assert.ok(!input.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closed = await group.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(input.gotDisposed);
    });
    test('closeEditor (one, opened in multiple groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        await rightGroup.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        let closed = await rightGroup.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(!input.gotDisposed);
        closed = await group.closeEditor(input);
        assert.strictEqual(closed, true);
        assert.ok(input.gotDisposed);
    });
    test('closeEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        let closeResult = false;
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        await group.openEditor(input2);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        closeResult = await group.closeEditors([input1, input2]);
        assert.strictEqual(closeResult, false);
        assert.ok(!input1.gotDisposed);
        assert.ok(!input2.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closeResult = await group.closeEditors([input1, input2]);
        assert.strictEqual(closeResult, true);
        assert.ok(input1.gotDisposed);
        assert.ok(input2.gotDisposed);
    });
    test('closeEditors (except one)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ except: input2 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input2);
    });
    test('closeEditors (except one, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ except: input2, excludeSticky: true });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        await group.closeEditors({ except: input2 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditorByIndex(0), input2);
    });
    test('closeEditors (saved only)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ savedOnly: true });
        assert.strictEqual(group.count, 0);
    });
    test('closeEditors (saved only, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ savedOnly: true, excludeSticky: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        await group.closeEditors({ savedOnly: true });
        assert.strictEqual(group.count, 0);
    });
    test('closeEditors (direction: right)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
    });
    test('closeEditors (direction: right, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: input2, excludeSticky: true });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
    });
    test('closeEditors (direction: left)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input2);
        assert.strictEqual(group.getEditorByIndex(1), input3);
    });
    test('closeEditors (direction: left, sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input1, options: { pinned: true, sticky: true } },
            { editor: input2, options: { pinned: true } },
            { editor: input3 }
        ]);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: input2, excludeSticky: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        await group.closeEditors({ direction: 0 /* CloseDirection.LEFT */, except: input2 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input2);
        assert.strictEqual(group.getEditorByIndex(1), input3);
    });
    test('closeAllEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true } },
            { editor: inputInactive }
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        await group.closeAllEditors();
        assert.strictEqual(group.isEmpty, true);
    });
    test('closeAllEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        let closeResult = true;
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        await group.openEditor(input2);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        closeResult = await group.closeAllEditors();
        assert.strictEqual(closeResult, false);
        assert.ok(!input1.gotDisposed);
        assert.ok(!input2.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        closeResult = await group.closeAllEditors();
        assert.strictEqual(closeResult, true);
        assert.ok(input1.gotDisposed);
        assert.ok(input2.gotDisposed);
    });
    test('closeAllEditors (sticky editor)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([
            { editor: input, options: { pinned: true, sticky: true } },
            { editor: inputInactive }
        ]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 1);
        await group.closeAllEditors({ excludeSticky: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.closeAllEditors();
        assert.strictEqual(group.isEmpty, true);
    });
    test('moveEditor (same group)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const moveEvents = [];
        const editorGroupModelChangeListener = group.onDidModelChange(e => {
            if (e.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */) {
                assert.ok(e.editor);
                moveEvents.push(e);
            }
        });
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.moveEditor(inputInactive, group, { index: 0 });
        assert.strictEqual(moveEvents.length, 1);
        assert.strictEqual(moveEvents[0].editorIndex, 0);
        assert.strictEqual(moveEvents[0].oldEditorIndex, 1);
        assert.strictEqual(moveEvents[0].editor, inputInactive);
        assert.strictEqual(group.getEditorByIndex(0), inputInactive);
        assert.strictEqual(group.getEditorByIndex(1), input);
        const res = group.moveEditors([{ editor: inputInactive, options: { index: 1 } }], group);
        assert.strictEqual(res, true);
        assert.strictEqual(moveEvents.length, 2);
        assert.strictEqual(moveEvents[1].editorIndex, 1);
        assert.strictEqual(moveEvents[1].oldEditorIndex, 0);
        assert.strictEqual(moveEvents[1].editor, inputInactive);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        editorGroupModelChangeListener.dispose();
    });
    test('moveEditor (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.moveEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(rightGroup.count, 1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), inputInactive);
    });
    test('moveEditors (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input1, options: { pinned: true } }, { editor: input2, options: { pinned: true } }, { editor: input3, options: { pinned: true } }]);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        group.moveEditors([{ editor: input2 }, { editor: input3 }], rightGroup);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(rightGroup.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), input2);
        assert.strictEqual(rightGroup.getEditorByIndex(1), input3);
    });
    test('copyEditor (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        group.copyEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.getEditorByIndex(0), input);
        assert.strictEqual(group.getEditorByIndex(1), inputInactive);
        assert.strictEqual(rightGroup.count, 1);
        assert.strictEqual(rightGroup.getEditorByIndex(0), inputInactive);
    });
    test('copyEditors (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input1, options: { pinned: true } }, { editor: input2, options: { pinned: true } }, { editor: input3, options: { pinned: true } }]);
        assert.strictEqual(group.getEditorByIndex(0), input1);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input3);
        group.copyEditors([{ editor: input1 }, { editor: input2 }, { editor: input3 }], rightGroup);
        [group, rightGroup].forEach(group => {
            assert.strictEqual(group.getEditorByIndex(0), input1);
            assert.strictEqual(group.getEditorByIndex(1), input2);
            assert.strictEqual(group.getEditorByIndex(2), input3);
        });
    });
    test('replaceEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.replaceEditors([{ editor: input, replacement: inputInactive }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), inputInactive);
    });
    test('replaceEditors - dirty editor handling', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        await group.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(group.activeEditor, input1);
        assert.ok(!input1.gotDisposed);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        await group.replaceEditors([{ editor: input1, replacement: input2 }]);
        assert.strictEqual(group.activeEditor, input2);
        assert.ok(input1.gotDisposed);
    });
    test('replaceEditors - forceReplaceDirty flag', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input1.dirty = true;
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        await group.replaceEditors([{ editor: input1, replacement: input2, forceReplaceDirty: false }]);
        assert.strictEqual(group.activeEditor, input1);
        assert.ok(!input1.gotDisposed);
        await group.replaceEditors([{ editor: input1, replacement: input2, forceReplaceDirty: true }]);
        assert.strictEqual(group.activeEditor, input2);
        assert.ok(input1.gotDisposed);
    });
    test('replaceEditors - proper index handling', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.file('foo/bar4'), TEST_EDITOR_INPUT_ID);
        const input5 = createTestFileEditorInput(URI.file('foo/bar5'), TEST_EDITOR_INPUT_ID);
        const input6 = createTestFileEditorInput(URI.file('foo/bar6'), TEST_EDITOR_INPUT_ID);
        const input7 = createTestFileEditorInput(URI.file('foo/bar7'), TEST_EDITOR_INPUT_ID);
        const input8 = createTestFileEditorInput(URI.file('foo/bar8'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input1, { pinned: true });
        await group.openEditor(input2, { pinned: true });
        await group.openEditor(input3, { pinned: true });
        await group.openEditor(input4, { pinned: true });
        await group.openEditor(input5, { pinned: true });
        await group.replaceEditors([
            { editor: input1, replacement: input6 },
            { editor: input3, replacement: input7 },
            { editor: input5, replacement: input8 }
        ]);
        assert.strictEqual(group.getEditorByIndex(0), input6);
        assert.strictEqual(group.getEditorByIndex(1), input2);
        assert.strictEqual(group.getEditorByIndex(2), input7);
        assert.strictEqual(group.getEditorByIndex(3), input4);
        assert.strictEqual(group.getEditorByIndex(4), input8);
    });
    test('replaceEditors - should be able to replace when side by side editor is involved with same input side by side', async () => {
        const [part, instantiationService] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input, input);
        await group.openEditor(input);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
        await group.replaceEditors([{ editor: input, replacement: sideBySideInput }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), sideBySideInput);
        await group.replaceEditors([{ editor: sideBySideInput, replacement: input }]);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditorByIndex(0), input);
    });
    test('find editors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const group2 = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(group.isEmpty, true);
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar1'), `${TEST_EDITOR_INPUT_ID}-1`);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const input4 = createTestFileEditorInput(URI.file('foo/bar4'), TEST_EDITOR_INPUT_ID);
        const input5 = createTestFileEditorInput(URI.file('foo/bar4'), `${TEST_EDITOR_INPUT_ID}-1`);
        await group.openEditor(input1, { pinned: true });
        await group.openEditor(input2, { pinned: true });
        await group.openEditor(input3, { pinned: true });
        await group.openEditor(input4, { pinned: true });
        await group2.openEditor(input5, { pinned: true });
        let foundEditors = group.findEditors(URI.file('foo/bar1'));
        assert.strictEqual(foundEditors.length, 2);
        foundEditors = group2.findEditors(URI.file('foo/bar4'));
        assert.strictEqual(foundEditors.length, 1);
    });
    test('find editors (side by side support)', async () => {
        const [part, instantiationService] = await createPart();
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const secondaryInput = createTestFileEditorInput(URI.file('foo/bar-secondary'), TEST_EDITOR_INPUT_ID);
        const primaryInput = createTestFileEditorInput(URI.file('foo/bar-primary'), `${TEST_EDITOR_INPUT_ID}-1`);
        const sideBySideEditor = new SideBySideEditorInput(undefined, undefined, secondaryInput, primaryInput, accessor.editorService);
        await group.openEditor(sideBySideEditor, { pinned: true });
        let foundEditors = group.findEditors(URI.file('foo/bar-secondary'));
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), { supportSideBySide: SideBySideEditor.PRIMARY });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), { supportSideBySide: SideBySideEditor.PRIMARY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), { supportSideBySide: SideBySideEditor.SECONDARY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), { supportSideBySide: SideBySideEditor.SECONDARY });
        assert.strictEqual(foundEditors.length, 0);
        foundEditors = group.findEditors(URI.file('foo/bar-secondary'), { supportSideBySide: SideBySideEditor.ANY });
        assert.strictEqual(foundEditors.length, 1);
        foundEditors = group.findEditors(URI.file('foo/bar-primary'), { supportSideBySide: SideBySideEditor.ANY });
        assert.strictEqual(foundEditors.length, 1);
    });
    test('find neighbour group (left/right)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rightGroup, part.findGroup({ direction: 3 /* GroupDirection.RIGHT */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ direction: 2 /* GroupDirection.LEFT */ }, rightGroup));
    });
    test('find neighbour group (up/down)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const downGroup = part.addGroup(rootGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(downGroup, part.findGroup({ direction: 1 /* GroupDirection.DOWN */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ direction: 0 /* GroupDirection.UP */ }, downGroup));
    });
    test('find group by location (left/right)', async function () {
        const [part] = await createPart();
        const rootGroup = part.activeGroup;
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const downGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        assert.strictEqual(rootGroup, part.findGroup({ location: 0 /* GroupLocation.FIRST */ }));
        assert.strictEqual(downGroup, part.findGroup({ location: 1 /* GroupLocation.LAST */ }));
        assert.strictEqual(rightGroup, part.findGroup({ location: 2 /* GroupLocation.NEXT */ }, rootGroup));
        assert.strictEqual(rootGroup, part.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, rightGroup));
        assert.strictEqual(downGroup, part.findGroup({ location: 2 /* GroupLocation.NEXT */ }, rightGroup));
        assert.strictEqual(rightGroup, part.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, downGroup));
    });
    test('applyLayout (2x2)', async function () {
        const [part] = await createPart();
        part.applyLayout({ groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
        assert.strictEqual(part.groups.length, 4);
    });
    test('getLayout', async function () {
        const [part] = await createPart();
        // 2x2
        part.applyLayout({ groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
        let layout = part.getLayout();
        assert.strictEqual(layout.orientation, 0 /* GroupOrientation.HORIZONTAL */);
        assert.strictEqual(layout.groups.length, 2);
        assert.strictEqual(layout.groups[0].groups.length, 2);
        assert.strictEqual(layout.groups[1].groups.length, 2);
        // 3 columns
        part.applyLayout({ groups: [{}, {}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
        layout = part.getLayout();
        assert.strictEqual(layout.orientation, 1 /* GroupOrientation.VERTICAL */);
        assert.strictEqual(layout.groups.length, 3);
        assert.ok(typeof layout.groups[0].size === 'number');
        assert.ok(typeof layout.groups[1].size === 'number');
        assert.ok(typeof layout.groups[2].size === 'number');
    });
    test('centeredLayout', async function () {
        const [part] = await createPart();
        part.centerLayout(true);
        assert.strictEqual(part.isLayoutCentered(), true);
    });
    test('sticky editors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 0);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        group.stickEditor(input);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input), true);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 1);
        group.unstickEditor(input);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), false);
        assert.strictEqual(group.getIndexOfEditor(input), 0);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        let editorMoveCounter = 0;
        const editorGroupModelChangeListener = group.onDidModelChange(e => {
            if (e.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */) {
                assert.ok(e.editor);
                editorMoveCounter++;
            }
        });
        group.stickEditor(inputInactive);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.getIndexOfEditor(input), 1);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(editorMoveCounter, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 1);
        const inputSticky = createTestFileEditorInput(URI.file('foo/bar/sticky'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(inputSticky, { sticky: true });
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input), false);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 1);
        assert.strictEqual(group.getIndexOfEditor(input), 2);
        await group.openEditor(input, { sticky: true });
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input), true);
        assert.strictEqual(group.isSticky(inputInactive), true);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 0);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 1);
        assert.strictEqual(group.getIndexOfEditor(input), 2);
        editorGroupModelChangeListener.dispose();
    });
    test('sticky: true wins over index', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.stickyCount, 0);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const inputSticky = createTestFileEditorInput(URI.file('foo/bar/sticky'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputInactive, { inactive: true });
        await group.openEditor(inputSticky, { sticky: true, index: 2 });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(inputSticky), true);
        assert.strictEqual(group.getIndexOfEditor(input), 1);
        assert.strictEqual(group.getIndexOfEditor(inputInactive), 2);
        assert.strictEqual(group.getIndexOfEditor(inputSticky), 0);
    });
    test('selection: setSelection, isSelected, selectedEditors', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        function isSelection(inputs) {
            for (const input of inputs) {
                if (group.selectedEditors.indexOf(input) === -1) {
                    return false;
                }
            }
            return inputs.length === group.selectedEditors.length;
        }
        // Active: input1, Selected: input1
        await group.openEditors([input1, input2, input3].map(editor => ({ editor, options: { pinned: true } })));
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), false);
        assert.strictEqual(isSelection([input1]), true);
        // Active: input1, Selected: input1, input3
        await group.setSelection(input1, [input3]);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), true);
        assert.strictEqual(isSelection([input1, input3]), true);
        // Active: input2, Selected: input1, input3
        await group.setSelection(input2, [input1, input3]);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isActive(input2), true);
        assert.strictEqual(group.isSelected(input2), true);
        assert.strictEqual(group.isSelected(input3), true);
        assert.strictEqual(isSelection([input1, input2, input3]), true);
        await group.setSelection(input1, []);
        // Selected: input3
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), false);
        assert.strictEqual(isSelection([input1]), true);
    });
    test('moveEditor with context (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        let leftFiredCount = 0;
        const leftGroupListener = group.onWillMoveEditor(() => {
            leftFiredCount++;
        });
        let rightFiredCount = 0;
        const rightGroupListener = rightGroup.onWillMoveEditor(() => {
            rightFiredCount++;
        });
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }, { editor: thirdInput }]);
        assert.strictEqual(leftFiredCount, 0);
        assert.strictEqual(rightFiredCount, 0);
        let result = group.moveEditor(input, rightGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 0);
        result = group.moveEditor(inputInactive, rightGroup);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 0);
        result = rightGroup.moveEditor(inputInactive, group);
        assert.strictEqual(result, true);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 1);
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('moveEditor disabled', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }, { editor: thirdInput }]);
        input.setMoveDisabled('disabled');
        const result = group.moveEditor(input, rightGroup);
        assert.strictEqual(result, false);
        assert.strictEqual(group.count, 3);
    });
    test('onWillOpenEditor', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const secondInput = createTestFileEditorInput(URI.file('foo/bar/second'), TEST_EDITOR_INPUT_ID);
        const thirdInput = createTestFileEditorInput(URI.file('foo/bar/third'), TEST_EDITOR_INPUT_ID);
        let leftFiredCount = 0;
        const leftGroupListener = group.onWillOpenEditor(() => {
            leftFiredCount++;
        });
        let rightFiredCount = 0;
        const rightGroupListener = rightGroup.onWillOpenEditor(() => {
            rightFiredCount++;
        });
        await group.openEditor(input);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 0);
        rightGroup.openEditor(secondInput);
        assert.strictEqual(leftFiredCount, 1);
        assert.strictEqual(rightFiredCount, 1);
        group.openEditor(thirdInput);
        assert.strictEqual(leftFiredCount, 2);
        assert.strictEqual(rightFiredCount, 1);
        // Ensure move fires the open event too
        rightGroup.moveEditor(secondInput, group);
        assert.strictEqual(leftFiredCount, 3);
        assert.strictEqual(rightFiredCount, 1);
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('copyEditor with context (across groups)', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        let firedCount = 0;
        const moveListener = group.onWillMoveEditor(() => firedCount++);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputInactive = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditors([{ editor: input, options: { pinned: true } }, { editor: inputInactive }]);
        assert.strictEqual(firedCount, 0);
        group.copyEditor(inputInactive, rightGroup, { index: 0 });
        assert.strictEqual(firedCount, 0);
        moveListener.dispose();
    });
    test('locked groups - basics', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        let leftFiredCountFromPart = 0;
        let rightFiredCountFromPart = 0;
        const partListener = part.onDidChangeGroupLocked(g => {
            if (g === group) {
                leftFiredCountFromPart++;
            }
            else if (g === rightGroup) {
                rightFiredCountFromPart++;
            }
        });
        let leftFiredCountFromGroup = 0;
        const leftGroupListener = group.onDidModelChange(e => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                leftFiredCountFromGroup++;
            }
        });
        let rightFiredCountFromGroup = 0;
        const rightGroupListener = rightGroup.onDidModelChange(e => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                rightFiredCountFromGroup++;
            }
        });
        rightGroup.lock(true);
        rightGroup.lock(true);
        assert.strictEqual(leftFiredCountFromGroup, 0);
        assert.strictEqual(leftFiredCountFromPart, 0);
        assert.strictEqual(rightFiredCountFromGroup, 1);
        assert.strictEqual(rightFiredCountFromPart, 1);
        rightGroup.lock(false);
        rightGroup.lock(false);
        assert.strictEqual(leftFiredCountFromGroup, 0);
        assert.strictEqual(leftFiredCountFromPart, 0);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        group.lock(true);
        group.lock(true);
        assert.strictEqual(leftFiredCountFromGroup, 1);
        assert.strictEqual(leftFiredCountFromPart, 1);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        group.lock(false);
        group.lock(false);
        assert.strictEqual(leftFiredCountFromGroup, 2);
        assert.strictEqual(leftFiredCountFromPart, 2);
        assert.strictEqual(rightFiredCountFromGroup, 2);
        assert.strictEqual(rightFiredCountFromPart, 2);
        partListener.dispose();
        leftGroupListener.dispose();
        rightGroupListener.dispose();
    });
    test('locked groups - single group is can be locked', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        group.lock(true);
        assert.strictEqual(group.isLocked, true);
        const rightGroup = part.addGroup(group, 3 /* GroupDirection.RIGHT */);
        rightGroup.lock(true);
        assert.strictEqual(rightGroup.isLocked, true);
        part.removeGroup(group);
        assert.strictEqual(rightGroup.isLocked, true);
        const rightGroup2 = part.addGroup(rightGroup, 3 /* GroupDirection.RIGHT */);
        rightGroup.lock(true);
        rightGroup2.lock(true);
        assert.strictEqual(rightGroup.isLocked, true);
        assert.strictEqual(rightGroup2.isLocked, true);
        part.removeGroup(rightGroup2);
        assert.strictEqual(rightGroup.isLocked, true);
    });
    test('locked groups - auto locking via setting', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', { 'editor': { 'autoLockGroups': { 'testEditorInputForEditorGroupService': true } } });
        instantiationService.stub(IConfigurationService, configurationService);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        let rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        let input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        let input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        // First editor opens in right group: Locked=true
        await rightGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(rightGroup.isLocked, true);
        // Second editors opens in now unlocked right group: Locked=false
        rightGroup.lock(false);
        await rightGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(rightGroup.isLocked, false);
        //First editor opens in root group without other groups being opened: Locked=false
        await rightGroup.closeAllEditors();
        part.removeGroup(rightGroup);
        await rootGroup.closeAllEditors();
        input1 = createTestFileEditorInput(URI.file('foo/bar1'), TEST_EDITOR_INPUT_ID);
        input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await rootGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(rootGroup.isLocked, false);
        rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        assert.strictEqual(rootGroup.isLocked, false);
        const leftGroup = part.addGroup(rootGroup, 2 /* GroupDirection.LEFT */);
        assert.strictEqual(rootGroup.isLocked, false);
        part.removeGroup(leftGroup);
        assert.strictEqual(rootGroup.isLocked, false);
    });
    test('maximize editor group', async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [part] = await createPart(instantiationService);
        const rootGroup = part.activeGroup;
        const editorPartSize = part.getSize(rootGroup);
        // If there is only one group, it should not be considered maximized
        assert.strictEqual(part.hasMaximizedGroup(), false);
        const rightGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        const rightBottomGroup = part.addGroup(rightGroup, 1 /* GroupDirection.DOWN */);
        const sizeRootGroup = part.getSize(rootGroup);
        const sizeRightGroup = part.getSize(rightGroup);
        const sizeRightBottomGroup = part.getSize(rightBottomGroup);
        let maximizedValue;
        const maxiizeGroupEventDisposable = part.onDidChangeGroupMaximized((maximized) => {
            maximizedValue = maximized;
        });
        assert.strictEqual(part.hasMaximizedGroup(), false);
        part.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */, rootGroup);
        assert.strictEqual(part.hasMaximizedGroup(), true);
        // getSize()
        assert.deepStrictEqual(part.getSize(rootGroup), editorPartSize);
        assert.deepStrictEqual(part.getSize(rightGroup), { width: 0, height: 0 });
        assert.deepStrictEqual(part.getSize(rightBottomGroup), { width: 0, height: 0 });
        assert.deepStrictEqual(maximizedValue, true);
        part.toggleMaximizeGroup();
        assert.strictEqual(part.hasMaximizedGroup(), false);
        // Size is restored
        assert.deepStrictEqual(part.getSize(rootGroup), sizeRootGroup);
        assert.deepStrictEqual(part.getSize(rightGroup), sizeRightGroup);
        assert.deepStrictEqual(part.getSize(rightBottomGroup), sizeRightBottomGroup);
        assert.deepStrictEqual(maximizedValue, false);
        maxiizeGroupEventDisposable.dispose();
    });
    test('transient editors - basics', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputTransient = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(input), false);
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(inputTransient, { transient: false });
        assert.strictEqual(group.isTransient(inputTransient), false);
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(inputTransient), false); // cannot make a non-transient editor transient when already opened
    });
    test('transient editors - pinning clears transient', async () => {
        const [part] = await createPart();
        const group = part.activeGroup;
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const inputTransient = createTestFileEditorInput(URI.file('foo/bar/inactive'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { transient: true });
        assert.strictEqual(group.isTransient(input), false);
        assert.strictEqual(group.isTransient(inputTransient), true);
        await group.openEditor(input, { pinned: true });
        await group.openEditor(inputTransient, { pinned: true, transient: true });
        assert.strictEqual(group.isTransient(inputTransient), false);
    });
    test('transient editors - overrides enablePreview setting', async function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('workbench', { 'editor': { 'enablePreview': false } });
        instantiationService.stub(IConfigurationService, configurationService);
        const [part] = await createPart(instantiationService);
        const group = part.activeGroup;
        assert.strictEqual(group.isEmpty, true);
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        await group.openEditor(input, { pinned: false });
        assert.strictEqual(group.isPinned(input), true);
        await group.openEditor(input2, { transient: true });
        assert.strictEqual(group.isPinned(input2), false);
        group.focus();
        assert.strictEqual(group.isPinned(input2), true);
    });
    test('working sets - create / apply state', async function () {
        const [part] = await createPart();
        const input = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const pane1 = await part.activeGroup.openEditor(input, { pinned: true });
        const pane2 = await part.sideGroup.openEditor(input2, { pinned: true });
        const state = part.createState();
        await pane2?.group.closeAllEditors();
        await pane1?.group.closeAllEditors();
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.activeGroup.isEmpty, true);
        await part.applyState(state);
        assert.strictEqual(part.count, 2);
        assert.strictEqual(part.groups[0].contains(input), true);
        assert.strictEqual(part.groups[1].contains(input2), true);
        for (const group of part.groups) {
            await group.closeAllEditors();
        }
        const emptyState = part.createState();
        await part.applyState(emptyState);
        assert.strictEqual(part.count, 1);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        input3.dirty = true;
        await part.activeGroup.openEditor(input3, { pinned: true });
        await part.applyState(emptyState);
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.groups[0].contains(input3), true); // dirty editors enforce to be there even when state is empty
        await part.applyState('empty');
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.groups[0].contains(input3), true); // dirty editors enforce to be there even when state is empty
        input3.dirty = false;
        await part.applyState('empty');
        assert.strictEqual(part.count, 1);
        assert.strictEqual(part.activeGroup.isEmpty, true);
    });
    test('context key provider', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const [parts] = await createParts(instantiationService);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const input3 = createTestFileEditorInput(URI.file('foo/bar3'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        const group2 = parts.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        await group2.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        const rawContextKey = new RawContextKey('testContextKey', parts.activeGroup.id);
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.id
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: group1 is active
        assert.strictEqual(parts.activeGroup.id, group1.id);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        let group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        // Make group2 active and ensure both gloabal and local context key values are updated
        parts.activateGroup(group2);
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group2.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        // Add a new group and ensure both gloabal and local context key values are updated
        // Group 3 will be active
        const group3 = parts.addGroup(group2, 3 /* GroupDirection.RIGHT */);
        await group3.openEditor(input3, { pinned: true });
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        const group3ContextKeyValue = group3.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group3.id);
        assert.strictEqual(group1ContextKeyValue, group1.id);
        assert.strictEqual(group2ContextKeyValue, group2.id);
        assert.strictEqual(group3ContextKeyValue, group3.id);
        disposables.dispose();
    });
    test('context key provider: onDidChange', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const parts = await createEditorParts(instantiationService, disposables);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        const group2 = parts.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        await group2.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        let offset = 0;
        const _onDidChange = new Emitter();
        const rawContextKey = new RawContextKey('testContextKey', parts.activeGroup.id);
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.id + offset,
            onDidChange: _onDidChange.event
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: group1 is active
        assert.strictEqual(parts.activeGroup.id, group1.id);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        let group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id + offset);
        assert.strictEqual(group1ContextKeyValue, group1.id + offset);
        assert.strictEqual(group2ContextKeyValue, group2.id + offset);
        // Make a change to the context key provider and fire onDidChange such that all context key values are updated
        offset = 10;
        _onDidChange.fire();
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        group2ContextKeyValue = group2.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, group1.id + offset);
        assert.strictEqual(group1ContextKeyValue, group1.id + offset);
        assert.strictEqual(group2ContextKeyValue, group2.id + offset);
        disposables.dispose();
    });
    test('context key provider: active editor change', async function () {
        const disposables = new DisposableStore();
        // Instantiate workbench and setup initial state
        const instantiationService = workbenchInstantiationService({ contextKeyService: instantiationService => instantiationService.createInstance(MockScopableContextKeyService) }, disposables);
        const rootContextKeyService = instantiationService.get(IContextKeyService);
        const parts = await createEditorParts(instantiationService, disposables);
        const input1 = createTestFileEditorInput(URI.file('foo/bar'), TEST_EDITOR_INPUT_ID);
        const input2 = createTestFileEditorInput(URI.file('foo/bar2'), TEST_EDITOR_INPUT_ID);
        const group1 = parts.activeGroup;
        await group1.openEditor(input2, { pinned: true });
        await group1.openEditor(input1, { pinned: true });
        // Create context key provider
        const rawContextKey = new RawContextKey('testContextKey', input1.resource.toString());
        const contextKeyProvider = {
            contextKey: rawContextKey,
            getGroupContextKeyValue: (group) => group.activeEditor?.resource?.toString() ?? '',
        };
        disposables.add(parts.registerContextKeyProvider(contextKeyProvider));
        // Initial state: input1 is active
        assert.strictEqual(isEqual(group1.activeEditor?.resource, input1.resource), true);
        let globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        let group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, input1.resource.toString());
        assert.strictEqual(group1ContextKeyValue, input1.resource.toString());
        // Make input2 active and ensure both gloabal and local context key values are updated
        await group1.openEditor(input2);
        globalContextKeyValue = rootContextKeyService.getContextKeyValue(rawContextKey.key);
        group1ContextKeyValue = group1.scopedContextKeyService.getContextKeyValue(rawContextKey.key);
        assert.strictEqual(globalContextKeyValue, input2.resource.toString());
        assert.strictEqual(group1ContextKeyValue, input2.resource.toString());
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvdGVzdC9icm93c2VyL2VkaXRvckdyb3Vwc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLDZCQUE2QixFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFrQixtQkFBbUIsRUFBNkIsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQW1CLE1BQU0sbURBQW1ELENBQUM7QUFDbFEsT0FBTyxFQUFnRixhQUFhLEVBQUUsb0JBQW9CLEVBQXFELE1BQU0scUNBQXFDLENBQUM7QUFDM04sT0FBTyxFQUFtRyxnQkFBZ0IsRUFBMEIsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzTSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUV4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUczRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENB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dEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMscUNBQTZCLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFVBQVUsOEJBQXNCLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FB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QztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV0RCxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxTQUFTLDZCQUFxQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV0RCxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxTQUFTLDZCQUFxQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFB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QkFBbUIsRUFBRSxLQUFLO1FBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLFVBQVUsRUFBRSxDQUFDO1FBRWxDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLHFDQUE2QixFQUFFLENBQUMsQ0FBQztRQUVySCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLO1FBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLFVBQVUsRUFBRSxDQUFDO1FBRWxDLE1BQU07UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxxQ0FBNkIsRUFBRSxDQUFDLENBQUM7UUFDckgsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsc0NBQThCLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1B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QUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhELDJDQUEyQztRQUMzQyxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4RCwyQ0FBMkM7UUFDM0MsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFD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