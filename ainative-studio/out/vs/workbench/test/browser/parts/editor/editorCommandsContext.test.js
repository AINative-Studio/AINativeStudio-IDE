/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor, registerTestEditor, registerTestFileEditor, registerTestResourceEditor, TestFileEditorInput, createEditorPart, registerTestSideBySideEditor, TestEditorInput } from '../../workbenchTestServices.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { URI } from '../../../../../base/common/uri.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
class TestListService {
    constructor() {
        this.lastFocusedList = undefined;
    }
}
suite('Resolving Editor Commands Context', () => {
    const disposables = new DisposableStore();
    const TEST_EDITOR_ID = 'MyTestEditorForEditors';
    let instantiationService;
    let accessor;
    const testListService = new TestListService();
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
        disposables.add(registerTestFileEditor());
        disposables.add(registerTestSideBySideEditor());
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)]));
    });
    teardown(() => {
        disposables.clear();
    });
    let index = 0;
    function input(id = String(index++)) {
        return disposables.add(new TestEditorInput(URI.parse(`file://${id}`), 'testInput'));
    }
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return instantiationService.createInstance(TestServiceAccessor);
    }
    test('use editor group selection', async () => {
        const accessor = await createServices();
        const activeGroup = accessor.editorGroupService.activeGroup;
        const input1 = input();
        const input2 = input();
        const input3 = input();
        activeGroup.openEditor(input1, { pinned: true });
        activeGroup.openEditor(input2, { pinned: true });
        activeGroup.openEditor(input3, { pinned: true });
        activeGroup.setSelection(input1, [input2]);
        // use editor commands context
        const editorCommandContext = { groupId: activeGroup.id, editorIndex: activeGroup.getIndexOfEditor(input1), preserveFocus: true };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[1], input2);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use URI
        const resolvedContext2 = resolveCommandsContext([input2.resource], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[0], input2);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[1], input1);
        assert.strictEqual(resolvedContext2.preserveFocus, false);
        // use URI and commandContext
        const editor1CommandContext = { groupId: activeGroup.id, editorIndex: activeGroup.getIndexOfEditor(input1), preserveFocus: true };
        const resolvedContext3 = resolveCommandsContext([editor1CommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext3.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext3.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors.length, 2);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors[0], input1);
        assert.strictEqual(resolvedContext3.groupedEditors[0].editors[1], input2);
        assert.strictEqual(resolvedContext3.preserveFocus, true);
    });
    test('don\'t use editor group selection', async () => {
        const accessor = await createServices();
        const activeGroup = accessor.editorGroupService.activeGroup;
        const input1 = input();
        const input2 = input();
        const input3 = input();
        activeGroup.openEditor(input1, { pinned: true });
        activeGroup.openEditor(input2, { pinned: true });
        activeGroup.openEditor(input3, { pinned: true });
        activeGroup.setSelection(input1, [input2]);
        // use editor commands context
        const editorCommandContext = { groupId: activeGroup.id, editorIndex: activeGroup.getIndexOfEditor(input3), preserveFocus: true };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input3);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use URI
        const resolvedContext2 = resolveCommandsContext([input3.resource], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, activeGroup.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors[0], input3);
        assert.strictEqual(resolvedContext2.preserveFocus, false);
    });
    test('inactive edior group command context', async () => {
        const accessor = await createServices();
        const editorGroupService = accessor.editorGroupService;
        const group1 = editorGroupService.activeGroup;
        const group2 = editorGroupService.addGroup(group1, 3 /* GroupDirection.RIGHT */);
        const input11 = input();
        const input12 = input();
        group1.openEditor(input11, { pinned: true });
        group1.openEditor(input12, { pinned: true });
        const input21 = input();
        group2.openEditor(input21, { pinned: true });
        editorGroupService.activateGroup(group1);
        group1.setSelection(input11, [input12]);
        // use editor commands context of inactive group with editor index
        const editorCommandContext1 = { groupId: group2.id, editorIndex: group2.getIndexOfEditor(input21), preserveFocus: true };
        const resolvedContext1 = resolveCommandsContext([editorCommandContext1], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext1.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].group.id, group2.id);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input21);
        assert.strictEqual(resolvedContext1.preserveFocus, true);
        // use editor commands context of inactive group without editor index
        const editorCommandContext2 = { groupId: group2.id, preserveFocus: true };
        const resolvedContext2 = resolveCommandsContext([editorCommandContext2], accessor.editorService, accessor.editorGroupService, testListService);
        assert.strictEqual(resolvedContext2.groupedEditors.length, 1);
        assert.strictEqual(resolvedContext2.groupedEditors[0].group.id, group2.id);
        assert.strictEqual(resolvedContext2.groupedEditors[0].editors.length, 1);
        assert.strictEqual(resolvedContext1.groupedEditors[0].editors[0], input21);
        assert.strictEqual(resolvedContext2.preserveFocus, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQ29tbWFuZHNDb250ZXh0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSw0QkFBNEIsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsUSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBa0Isb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXJGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUluRyxNQUFNLGVBQWU7SUFBckI7UUFFVSxvQkFBZSxHQUFvQyxTQUFTLENBQUM7SUFDdkUsQ0FBQztDQUFBO0FBRUQsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUUvQyxNQUFNLFdBQVcsR0FBRyxJQUFJ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