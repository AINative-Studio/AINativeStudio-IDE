/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource } from '../../../../../base/test/common/utils.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestFileEditorInput, registerTestEditor, createEditorPart, registerTestFileEditor, TestServiceAccessor, workbenchTeardown, registerTestSideBySideEditor } from '../../../../test/browser/workbenchTestServices.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorNavigationStack, HistoryService } from '../../browser/historyService.js';
import { IEditorService, SIDE_GROUP } from '../../../editor/common/editorService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IHistoryService } from '../../common/history.js';
import { DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { isResourceEditorInput } from '../../../../common/editor.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { FileChangesEvent, FileOperationEvent } from '../../../../../platform/files/common/files.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
suite('HistoryService', function () {
    const TEST_EDITOR_ID = 'MyTestEditorForEditorHistory';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForHistoyService';
    async function createServices(scope = 0 /* GoScope.DEFAULT */, configureSearchExclude = false) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const configurationService = new TestConfigurationService();
        if (scope === 1 /* GoScope.EDITOR_GROUP */) {
            configurationService.setUserConfiguration('workbench.editor.navigationScope', 'editorGroup');
        }
        else if (scope === 2 /* GoScope.EDITOR */) {
            configurationService.setUserConfiguration('workbench.editor.navigationScope', 'editor');
        }
        if (configureSearchExclude) {
            configurationService.setUserConfiguration('search', { exclude: { "**/node_modules/**": true } });
        }
        instantiationService.stub(IConfigurationService, configurationService);
        const historyService = disposables.add(instantiationService.createInstance(HistoryService));
        instantiationService.stub(IHistoryService, historyService);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        return [part, historyService, editorService, accessor.textFileService, instantiationService, configurationService];
    }
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)]));
        disposables.add(registerTestSideBySideEditor());
        disposables.add(registerTestFileEditor());
    });
    teardown(() => {
        disposables.clear();
    });
    test('back / forward: basics', async () => {
        const [part, historyService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input2);
    });
    test('back / forward: is editor group aware', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/other.html');
        const pane1 = await editorService.openEditor({ resource, options: { pinned: true } });
        const pane2 = await editorService.openEditor({ resource, options: { pinned: true } }, SIDE_GROUP);
        // [index.txt] | [>index.txt<]
        assert.notStrictEqual(pane1, pane2);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } }, pane2?.group);
        // [index.txt] | [index.txt] [>other.html<]
        await historyService.goBack();
        // [index.txt] | [>index.txt<] [other.html]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goBack();
        // [>index.txt<] | [index.txt] [other.html]
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goForward();
        // [index.txt] | [>index.txt<] [other.html]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource.toString());
        await historyService.goForward();
        // [index.txt] | [index.txt] [>other.html<]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), otherResource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (user)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(1, 2, 1, 2));
        await setTextSelection(historyService, pane, new Selection(15, 1, 15, 1)); // will be merged and dropped
        await setTextSelection(historyService, pane, new Selection(16, 1, 16, 1)); // will be merged and dropped
        await setTextSelection(historyService, pane, new Selection(17, 1, 17, 1));
        await setTextSelection(historyService, pane, new Selection(30, 5, 30, 8));
        await setTextSelection(historyService, pane, new Selection(40, 1, 40, 1));
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(30, 5, 30, 8), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(17, 1, 17, 1), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(1, 2, 1, 2), pane);
        await historyService.goForward(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(17, 1, 17, 1), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (navigation)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10)); // this is our starting point
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */); // this is our first target definition
        await setTextSelection(historyService, pane, new Selection(120, 8, 120, 18), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */); // this is our second target definition
        await setTextSelection(historyService, pane, new Selection(300, 3, 300, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(500, 3, 500, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await historyService.goBack(2 /* GoFilter.NAVIGATION */); // this should reveal the last navigation entry because we are not at it currently
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: in-editor text selection changes (jump)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10), 2 /* EditorPaneSelectionChangeReason.USER */);
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await setTextSelection(historyService, pane, new Selection(120, 8, 120, 18), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goLast(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
        assertTextSelection(new Selection(120, 8, 120, 18), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: selection changes with JUMP or NAVIGATION source are not merged (#143833)', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10), 2 /* EditorPaneSelectionChangeReason.USER */);
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 5 /* EditorPaneSelectionChangeReason.JUMP */);
        await setTextSelection(historyService, pane, new Selection(6, 3, 6, 20), 4 /* EditorPaneSelectionChangeReason.NAVIGATION */);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(0 /* GoFilter.NONE */);
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: edit selection changes', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10));
        await setTextSelection(historyService, pane, new Selection(50, 3, 50, 20), 3 /* EditorPaneSelectionChangeReason.EDIT */);
        await setTextSelection(historyService, pane, new Selection(300, 3, 300, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(500, 3, 500, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await setTextSelection(historyService, pane, new Selection(5, 3, 5, 20), 3 /* EditorPaneSelectionChangeReason.EDIT */);
        await setTextSelection(historyService, pane, new Selection(200, 3, 200, 20)); // unrelated user navigation
        await historyService.goBack(1 /* GoFilter.EDITS */); // this should reveal the last navigation entry because we are not at it currently
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        await historyService.goBack(1 /* GoFilter.EDITS */);
        assertTextSelection(new Selection(50, 3, 50, 20), pane);
        await historyService.goForward(1 /* GoFilter.EDITS */);
        assertTextSelection(new Selection(5, 3, 5, 20), pane);
        return workbenchTeardown(instantiationService);
    });
    async function setTextSelection(historyService, pane, selection, reason = 2 /* EditorPaneSelectionChangeReason.USER */) {
        const promise = Event.toPromise(historyService.onDidChangeEditorNavigationStack);
        pane.setSelection(selection, reason);
        await promise;
    }
    function assertTextSelection(expected, pane) {
        const options = pane.options;
        if (!options) {
            assert.fail('EditorPane has no selection');
        }
        assert.strictEqual(options.selection?.startLineNumber, expected.startLineNumber);
        assert.strictEqual(options.selection?.startColumn, expected.startColumn);
        assert.strictEqual(options.selection?.endLineNumber, expected.endLineNumber);
        assert.strictEqual(options.selection?.endColumn, expected.endColumn);
    }
    test('back / forward: tracks editor moves across groups', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        // [one.txt] [>two.html<]
        const sideGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        // [one.txt] [>two.html<] | <empty>
        const editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        pane1?.group.moveEditor(pane1.input, sideGroup);
        await editorChangePromise;
        // [one.txt] | [>two.html<]
        await historyService.goBack();
        // [>one.txt<] | [two.html]
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: tracks group removals', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        const pane2 = await editorService.openEditor({ resource: resource2, options: { pinned: true } }, SIDE_GROUP);
        // [one.txt] | [>two.html<]
        assert.notStrictEqual(pane1, pane2);
        await pane1?.group.closeAllEditors();
        // [>two.html<]
        await historyService.goBack();
        // [>two.html<]
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource2.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor navigation stack - navigation', async function () {
        const [, , editorService, , instantiationService] = await createServices();
        const stack = instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, 0 /* GoScope.DEFAULT */);
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        let changed = false;
        disposables.add(stack.onDidChange(() => changed = true));
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), false);
        assert.strictEqual(stack.canGoLast(), false);
        // Opening our first editor emits change event
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(changed, true);
        changed = false;
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoLast(), true);
        // Opening same editor is not treated as new history stop
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(stack.canGoBack(), false);
        // Opening different editor allows to go back
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane, { reason: 2 /* EditorPaneSelectionChangeReason.USER */ });
        assert.strictEqual(changed, true);
        changed = false;
        assert.strictEqual(stack.canGoBack(), true);
        await stack.goBack();
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), true);
        assert.strictEqual(stack.canGoLast(), true);
        await stack.goForward();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        await stack.goPrevious();
        assert.strictEqual(stack.canGoBack(), false);
        assert.strictEqual(stack.canGoForward(), true);
        await stack.goPrevious();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        await stack.goBack();
        await stack.goLast();
        assert.strictEqual(stack.canGoBack(), true);
        assert.strictEqual(stack.canGoForward(), false);
        stack.dispose();
        assert.strictEqual(stack.canGoBack(), false);
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor navigation stack - mutations', async function () {
        const [, , editorService, , instantiationService] = await createServices();
        const stack = disposables.add(instantiationService.createInstance(EditorNavigationStack, 0 /* GoFilter.NONE */, 0 /* GoScope.DEFAULT */));
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        const unrelatedResource = toResource.call(this, '/path/unrelated.html');
        const pane = await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Clear
        assert.strictEqual(stack.canGoBack(), true);
        stack.clear();
        assert.strictEqual(stack.canGoBack(), false);
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove unrelated resource does not cause any harm (via internal event)
        await stack.goBack();
        assert.strictEqual(stack.canGoForward(), true);
        stack.remove(new FileOperationEvent(unrelatedResource, 1 /* FileOperation.DELETE */));
        assert.strictEqual(stack.canGoForward(), true);
        // Remove (via internal event)
        await stack.goForward();
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(new FileOperationEvent(resource, 1 /* FileOperation.DELETE */));
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via external event)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], !isLinux));
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via editor)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(pane.input);
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Remove (via group)
        assert.strictEqual(stack.canGoBack(), true);
        stack.remove(pane.group.id);
        assert.strictEqual(stack.canGoBack(), false);
        stack.clear();
        await editorService.openEditor({ resource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        await editorService.openEditor({ resource: otherResource, options: { pinned: true } });
        stack.notifyNavigation(pane);
        // Move
        const stat = {
            ctime: 0,
            etag: '',
            mtime: 0,
            isDirectory: false,
            isFile: true,
            isSymbolicLink: false,
            name: 'other.txt',
            readonly: false,
            locked: false,
            size: 0,
            resource: toResource.call(this, '/path/other.txt'),
            children: undefined
        };
        stack.move(new FileOperationEvent(resource, 2 /* FileOperation.MOVE */, stat));
        await stack.goBack();
        assert.strictEqual(pane?.input?.resource?.toString(), stat.resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor group scope', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices(1 /* GoScope.EDITOR_GROUP */);
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const resource3 = toResource.call(this, '/path/three.html');
        const pane1 = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await editorService.openEditor({ resource: resource3, options: { pinned: true } });
        // [one.txt] [two.html] [>three.html<]
        const sideGroup = part.addGroup(part.activeGroup, 3 /* GroupDirection.RIGHT */);
        // [one.txt] [two.html] [>three.html<] | <empty>
        const pane2 = await editorService.openEditor({ resource: resource1, options: { pinned: true } }, sideGroup);
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await editorService.openEditor({ resource: resource3, options: { pinned: true } });
        // [one.txt] [two.html] [>three.html<] | [one.txt] [two.html] [>three.html<]
        await historyService.goBack();
        await historyService.goBack();
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.id, pane2?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        // [one.txt] [two.html] [>three.html<] | [>one.txt<] [two.html] [three.html]
        await editorService.openEditor({ resource: resource3, options: { pinned: true } }, pane1?.group);
        await historyService.goBack();
        await historyService.goBack();
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.id, pane1?.group.id);
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('back / forward: editor  scope', async function () {
        const [part, historyService, editorService, , instantiationService] = await createServices(2 /* GoScope.EDITOR */);
        const resource1 = toResource.call(this, '/path/one.txt');
        const resource2 = toResource.call(this, '/path/two.html');
        const pane = await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(2, 2, 2, 10));
        await setTextSelection(historyService, pane, new Selection(50, 3, 50, 20));
        await editorService.openEditor({ resource: resource2, options: { pinned: true } });
        await setTextSelection(historyService, pane, new Selection(12, 2, 12, 10));
        await setTextSelection(historyService, pane, new Selection(150, 3, 150, 20));
        await historyService.goBack();
        assertTextSelection(new Selection(12, 2, 12, 10), pane);
        await historyService.goBack();
        assertTextSelection(new Selection(12, 2, 12, 10), pane); // no change
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource2.toString());
        await editorService.openEditor({ resource: resource1, options: { pinned: true } });
        await historyService.goBack();
        assertTextSelection(new Selection(2, 2, 2, 10), pane);
        await historyService.goBack();
        assertTextSelection(new Selection(2, 2, 2, 10), pane); // no change
        assert.strictEqual(part.activeGroup.activeEditor?.resource?.toString(), resource1.toString());
        return workbenchTeardown(instantiationService);
    });
    test('go to last edit location', async function () {
        const [, historyService, editorService, textFileService, instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const otherResource = toResource.call(this, '/path/index.html');
        await editorService.openEditor({ resource });
        const model = await textFileService.files.resolve(resource);
        model.textEditorModel.setValue('Hello World');
        await timeout(10); // history debounces change events
        await editorService.openEditor({ resource: otherResource });
        const onDidActiveEditorChange = new DeferredPromise();
        disposables.add(editorService.onDidActiveEditorChange(e => {
            onDidActiveEditorChange.complete(e);
        }));
        historyService.goLast(1 /* GoFilter.EDITS */);
        await onDidActiveEditorChange.p;
        assert.strictEqual(editorService.activeEditor?.resource?.toString(), resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('reopen closed editor', async function () {
        const [, historyService, editorService, , instantiationService] = await createServices();
        const resource = toResource.call(this, '/path/index.txt');
        const pane = await editorService.openEditor({ resource });
        await pane?.group.closeAllEditors();
        const onDidActiveEditorChange = new DeferredPromise();
        disposables.add(editorService.onDidActiveEditorChange(e => {
            onDidActiveEditorChange.complete(e);
        }));
        historyService.reopenLastClosedEditor();
        await onDidActiveEditorChange.p;
        assert.strictEqual(editorService.activeEditor?.resource?.toString(), resource.toString());
        return workbenchTeardown(instantiationService);
    });
    test('getHistory', async () => {
        class TestFileEditorInputWithUntyped extends TestFileEditorInput {
            toUntyped() {
                return {
                    resource: this.resource,
                    options: {
                        override: 'testOverride'
                    }
                };
            }
        }
        const [part, historyService, editorService, , instantiationService] = await createServices(undefined, true);
        let history = historyService.getHistory();
        assert.strictEqual(history.length, 0);
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1/node_modules/test.txt'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        const input3 = disposables.add(new TestFileEditorInputWithUntyped(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input3, { pinned: true });
        const input4 = disposables.add(new TestFileEditorInputWithUntyped(URI.file('bar4'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input4, { pinned: true });
        history = historyService.getHistory();
        assert.strictEqual(history.length, 4);
        // first entry is untyped because it implements `toUntyped` and has a supported scheme
        assert.strictEqual(isResourceEditorInput(history[0]) && !(history[0] instanceof EditorInput), true);
        assert.strictEqual(history[0].options?.override, 'testOverride');
        // second entry is not untyped even though it implements `toUntyped` but has unsupported scheme
        assert.strictEqual(history[1] instanceof EditorInput, true);
        assert.strictEqual(history[2] instanceof EditorInput, true);
        assert.strictEqual(history[3] instanceof EditorInput, true);
        historyService.removeFromHistory(input2);
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3);
        assert.strictEqual(history[0].resource?.toString(), input4.resource.toString());
        input1.dispose(); // disposing the editor will apply `search.exclude` rules
        history = historyService.getHistory();
        assert.strictEqual(history.length, 2);
        // side by side
        const input5 = disposables.add(new TestFileEditorInputWithUntyped(URI.parse('file://bar5'), TEST_EDITOR_INPUT_ID));
        const input6 = disposables.add(new TestFileEditorInputWithUntyped(URI.file('file://bar1/node_modules/test.txt'), TEST_EDITOR_INPUT_ID));
        const input7 = new SideBySideEditorInput(undefined, undefined, input6, input5, editorService);
        await part.activeGroup.openEditor(input7, { pinned: true });
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3);
        input7.dispose();
        history = historyService.getHistory();
        assert.strictEqual(history.length, 3); // only input5 survived, input6 is excluded via search.exclude
        return workbenchTeardown(instantiationService);
    });
    test('getLastActiveFile', async () => {
        const [part, historyService] = await createServices();
        assert.ok(!historyService.getLastActiveFile('foo'));
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(historyService.getLastActiveFile('foo')?.toString(), input2.resource.toString());
        assert.strictEqual(historyService.getLastActiveFile('foo', 'bar2')?.toString(), input2.resource.toString());
        assert.strictEqual(historyService.getLastActiveFile('foo', 'bar1')?.toString(), input1.resource.toString());
    });
    test('open next/previous recently used editor (single group)', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await part.activeGroup.openEditor(input2, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor(part.activeGroup.id);
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor(part.activeGroup.id);
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        return workbenchTeardown(instantiationService);
    });
    test('open next/previous recently used editor (multi group)', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const rootGroup = part.activeGroup;
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const sideGroup = part.addGroup(rootGroup, 3 /* GroupDirection.RIGHT */);
        await rootGroup.openEditor(input1, { pinned: true });
        await sideGroup.openEditor(input2, { pinned: true });
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup, rootGroup);
        assert.strictEqual(rootGroup.activeEditor, input1);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup, sideGroup);
        assert.strictEqual(sideGroup.activeEditor, input2);
        return workbenchTeardown(instantiationService);
    });
    test('open next/previous recently is reset when other input opens', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        await part.activeGroup.openEditor(input1, { pinned: true });
        await part.activeGroup.openEditor(input2, { pinned: true });
        await part.activeGroup.openEditor(input3, { pinned: true });
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await timeout(0);
        await part.activeGroup.openEditor(input4, { pinned: true });
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openPreviouslyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        historyService.openNextRecentlyUsedEditor();
        await editorChangePromise;
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        return workbenchTeardown(instantiationService);
    });
    test('transient editors suspends editor change tracking', async () => {
        const [part, historyService, editorService, , instantiationService] = await createServices();
        const input1 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar1'), TEST_EDITOR_INPUT_ID));
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar2'), TEST_EDITOR_INPUT_ID));
        const input3 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar3'), TEST_EDITOR_INPUT_ID));
        const input4 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar4'), TEST_EDITOR_INPUT_ID));
        const input5 = disposables.add(new TestFileEditorInput(URI.parse('foo://bar5'), TEST_EDITOR_INPUT_ID));
        let editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange);
        await part.activeGroup.openEditor(input1, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await editorChangePromise;
        await part.activeGroup.openEditor(input2, { transient: true });
        assert.strictEqual(part.activeGroup.activeEditor, input2);
        await part.activeGroup.openEditor(input3, { transient: true });
        assert.strictEqual(part.activeGroup.activeEditor, input3);
        editorChangePromise = Event.toPromise(editorService.onDidActiveEditorChange)
            .then(() => Event.toPromise(editorService.onDidActiveEditorChange));
        await part.activeGroup.openEditor(input4, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await part.activeGroup.openEditor(input5, { pinned: true });
        assert.strictEqual(part.activeGroup.activeEditor, input5);
        // stack should be [input1, input4, input5]
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goBack();
        assert.strictEqual(part.activeGroup.activeEditor, input1);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input4);
        await historyService.goForward();
        assert.strictEqual(part.activeGroup.activeEditor, input5);
        return workbenchTeardown(instantiationService);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaGlzdG9yeS90ZXN0L2Jyb3dzZXIvaGlzdG9yeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQXNCLGlCQUFpQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFL1EsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBa0IsTUFBTSwrQ0FBK0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsZUFBZSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsS0FB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QUFJLENBQUMsQ0FBQztRQUNsQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBRWhCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTVDLE1BQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTVDLE1BQU0sS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWhELE1BQU0sS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRS9DLE1BQU0sS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWhELE1BQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE1BQU0sS0FBSyxDQUFD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QVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUxRCxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDakYsY0FBYyxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDMUMsTUFBTSxtQkFBbUIsQ0FBQztRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTFELG1CQUFtQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDN0UsY0FBYyxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDNUMsTUFBTSxtQkFBbUIsQ0FBQztRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTFELG1CQUFtQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDN0UsY0FBYyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0QsTUFBTSxtQkFBbUIsQ0FBQztRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTFELG1CQUFtQixHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDN0UsY0FBYyxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxtQkFBbUIsQ0FBQztRQUMx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