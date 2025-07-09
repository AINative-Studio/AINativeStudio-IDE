/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorGroupModel, isGroupEditorChangeEvent, isGroupEditorCloseEvent, isGroupEditorMoveEvent, isGroupEditorOpenEvent } from '../../../../common/editor/editorGroupModel.js';
import { EditorExtensions, SideBySideEditor, EditorCloseContext } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestLifecycleService, workbenchInstantiationService } from '../../workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { TestContextService, TestStorageService } from '../../../common/workbenchTestServices.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorGroupModel', () => {
    let testInstService;
    suiteTeardown(() => {
        testInstService?.dispose();
        testInstService = undefined;
    });
    function inst() {
        if (!testInstService) {
            testInstService = new TestInstantiationService();
        }
        const inst = testInstService;
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right', focusRecentEditorAfterClose: true } });
        inst.stub(IConfigurationService, config);
        return inst;
    }
    function createEditorGroupModel(serialized) {
        const group = disposables.add(inst().createInstance(EditorGroupModel, serialized));
        disposables.add(toDisposable(() => {
            for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                group.closeEditor(editor);
            }
        }));
        return group;
    }
    function closeAllEditors(group) {
        for (const editor of group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)) {
            group.closeEditor(editor, undefined, false);
        }
    }
    function closeEditors(group, except, direction) {
        const index = group.indexOf(except);
        if (index === -1) {
            return; // not found
        }
        // Close to the left
        if (direction === 0 /* CloseDirection.LEFT */) {
            for (let i = index - 1; i >= 0; i--) {
                group.closeEditor(group.getEditorByIndex(i));
            }
        }
        // Close to the right
        else if (direction === 1 /* CloseDirection.RIGHT */) {
            for (let i = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length - 1; i > index; i--) {
                group.closeEditor(group.getEditorByIndex(i));
            }
        }
        // Both directions
        else {
            group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).filter(editor => !editor.matches(except)).forEach(editor => group.closeEditor(editor));
        }
    }
    function groupListener(group) {
        const groupEvents = {
            active: [],
            index: [],
            label: [],
            locked: [],
            opened: [],
            closed: [],
            activated: [],
            pinned: [],
            unpinned: [],
            sticky: [],
            unsticky: [],
            transient: [],
            moved: [],
            disposed: []
        };
        disposables.add(group.onDidModelChange(e => {
            if (e.kind === 3 /* GroupModelChangeKind.GROUP_LOCKED */) {
                groupEvents.locked.push(group.id);
                return;
            }
            else if (e.kind === 0 /* GroupModelChangeKind.GROUP_ACTIVE */) {
                groupEvents.active.push(group.id);
                return;
            }
            else if (e.kind === 1 /* GroupModelChangeKind.GROUP_INDEX */) {
                groupEvents.index.push(group.id);
                return;
            }
            else if (e.kind === 2 /* GroupModelChangeKind.GROUP_LABEL */) {
                groupEvents.label.push(group.id);
                return;
            }
            if (!e.editor) {
                return;
            }
            switch (e.kind) {
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                    if (isGroupEditorOpenEvent(e)) {
                        groupEvents.opened.push(e);
                    }
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    if (isGroupEditorCloseEvent(e)) {
                        groupEvents.closed.push(e);
                    }
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.activated.push(e);
                    }
                    break;
                case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    if (isGroupEditorChangeEvent(e)) {
                        group.isPinned(e.editor) ? groupEvents.pinned.push(e) : groupEvents.unpinned.push(e);
                    }
                    break;
                case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    if (isGroupEditorChangeEvent(e)) {
                        group.isSticky(e.editor) ? groupEvents.sticky.push(e) : groupEvents.unsticky.push(e);
                    }
                    break;
                case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.transient.push(e);
                    }
                    break;
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    if (isGroupEditorMoveEvent(e)) {
                        groupEvents.moved.push(e);
                    }
                    break;
                case 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */:
                    if (isGroupEditorChangeEvent(e)) {
                        groupEvents.disposed.push(e);
                    }
                    break;
            }
        }));
        return groupEvents;
    }
    let index = 0;
    class TestEditorInput extends EditorInput {
        constructor(id) {
            super();
            this.id = id;
            this.resource = undefined;
        }
        get typeId() { return 'testEditorInputForGroups'; }
        async resolve() { return null; }
        matches(other) {
            return other && this.id === other.id && other instanceof TestEditorInput;
        }
        setDirty() {
            this._onDidChangeDirty.fire();
        }
        setLabel() {
            this._onDidChangeLabel.fire();
        }
    }
    class NonSerializableTestEditorInput extends EditorInput {
        constructor(id) {
            super();
            this.id = id;
            this.resource = undefined;
        }
        get typeId() { return 'testEditorInputForGroups-nonSerializable'; }
        async resolve() { return null; }
        matches(other) {
            return other && this.id === other.id && other instanceof NonSerializableTestEditorInput;
        }
    }
    class TestFileEditorInput extends EditorInput {
        constructor(id, resource) {
            super();
            this.id = id;
            this.resource = resource;
            this.preferredResource = this.resource;
        }
        get typeId() { return 'testFileEditorInputForGroups'; }
        get editorId() { return this.id; }
        async resolve() { return null; }
        setPreferredName(name) { }
        setPreferredDescription(description) { }
        setPreferredResource(resource) { }
        async setEncoding(encoding) { }
        getEncoding() { return undefined; }
        setPreferredEncoding(encoding) { }
        setForceOpenAsBinary() { }
        setPreferredContents(contents) { }
        setLanguageId(languageId) { }
        setPreferredLanguageId(languageId) { }
        isResolved() { return false; }
        matches(other) {
            if (super.matches(other)) {
                return true;
            }
            if (other instanceof TestFileEditorInput) {
                return isEqual(other.resource, this.resource);
            }
            return false;
        }
    }
    function input(id = String(index++), nonSerializable, resource) {
        if (resource) {
            return disposables.add(new TestFileEditorInput(id, resource));
        }
        return nonSerializable ? disposables.add(new NonSerializableTestEditorInput(id)) : disposables.add(new TestEditorInput(id));
    }
    class TestEditorInputSerializer {
        static { this.disableSerialize = false; }
        static { this.disableDeserialize = false; }
        canSerialize(editorInput) {
            return true;
        }
        serialize(editorInput) {
            if (TestEditorInputSerializer.disableSerialize) {
                return undefined;
            }
            const testEditorInput = editorInput;
            const testInput = {
                id: testEditorInput.id
            };
            return JSON.stringify(testInput);
        }
        deserialize(instantiationService, serializedEditorInput) {
            if (TestEditorInputSerializer.disableDeserialize) {
                return undefined;
            }
            const testInput = JSON.parse(serializedEditorInput);
            return disposables.add(new TestEditorInput(testInput.id));
        }
    }
    const disposables = new DisposableStore();
    setup(() => {
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = false;
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer('testEditorInputForGroups', TestEditorInputSerializer));
    });
    teardown(() => {
        disposables.clear();
        index = 1;
    });
    test('Clone Group', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        // Sticky
        group.stick(input2);
        assert.ok(group.isSticky(input2));
        // Locked
        assert.strictEqual(group.isLocked, false);
        group.lock(true);
        assert.strictEqual(group.isLocked, true);
        const clone = disposables.add(group.clone());
        assert.notStrictEqual(group.id, clone.id);
        assert.strictEqual(clone.count, 3);
        assert.strictEqual(clone.isLocked, false); // locking does not clone over
        let didEditorLabelChange = false;
        const toDispose = clone.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                didEditorLabelChange = true;
            }
        });
        input1.setLabel();
        assert.ok(didEditorLabelChange);
        assert.strictEqual(clone.isPinned(input1), true);
        assert.strictEqual(clone.isActive(input1), false);
        assert.strictEqual(clone.isSticky(input1), false);
        assert.strictEqual(clone.isPinned(input2), true);
        assert.strictEqual(clone.isActive(input2), false);
        assert.strictEqual(clone.isSticky(input2), true);
        assert.strictEqual(clone.isPinned(input3), false);
        assert.strictEqual(clone.isActive(input3), true);
        assert.strictEqual(clone.isSticky(input3), false);
        toDispose.dispose();
    });
    test('isActive - untyped', () => {
        const group = createEditorGroupModel();
        const input = disposables.add(new TestFileEditorInput('testInput', URI.file('fake')));
        const input2 = disposables.add(new TestFileEditorInput('testInput2', URI.file('fake2')));
        const untypedInput = { resource: URI.file('/fake'), options: { override: 'testInput' } };
        const untypedNonActiveInput = { resource: URI.file('/fake2'), options: { override: 'testInput2' } };
        group.openEditor(input, { pinned: true, active: true });
        group.openEditor(input2, { active: false });
        assert.ok(group.isActive(input));
        assert.ok(group.isActive(untypedInput));
        assert.ok(!group.isActive(untypedNonActiveInput));
    });
    test('openEditor - prefers existing side by side editor if same', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const group = createEditorGroupModel();
        const input1 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake1')));
        const input2 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake2')));
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input2);
        let res = group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(res.editor, sideBySideInputSame);
        assert.strictEqual(res.isNew, true);
        res = group.openEditor(input1, { pinned: true, active: true, supportSideBySide: SideBySideEditor.BOTH });
        assert.strictEqual(res.editor, sideBySideInputSame);
        assert.strictEqual(res.isNew, false);
        group.closeEditor(sideBySideInputSame);
        res = group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(res.editor, sideBySideInputDifferent);
        assert.strictEqual(res.isNew, true);
        res = group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(res.editor, input1);
        assert.strictEqual(res.isNew, true);
    });
    test('indexOf() - prefers direct matching editor over side by side matching one', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const group = createEditorGroupModel();
        const input1 = disposables.add(new TestFileEditorInput('testInput', URI.file('fake1')));
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input1, input1);
        group.openEditor(sideBySideInput, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(sideBySideInput), 0);
        assert.strictEqual(group.indexOf(input1), -1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.BOTH }), 0);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.ANY }), 0);
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.BOTH }), 1);
        assert.strictEqual(group.indexOf(input1, undefined, { supportSideBySide: SideBySideEditor.ANY }), 1);
    });
    test('contains() - untyped', function () {
        const group = createEditorGroupModel();
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input1 = input('input1', false, URI.file('/input1'));
        const input2 = input('input2', false, URI.file('/input2'));
        const untypedInput1 = { resource: URI.file('/input1'), options: { override: 'input1' } };
        const untypedInput2 = { resource: URI.file('/input2'), options: { override: 'input2' } };
        const diffInput1 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input1, input2, undefined);
        const diffInput2 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input2, input1, undefined);
        const untypedDiffInput1 = {
            original: untypedInput1,
            modified: untypedInput2
        };
        const untypedDiffInput2 = {
            original: untypedInput2,
            modified: untypedInput1
        };
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input2);
        const untypedSideBySideInputSame = {
            primary: untypedInput1,
            secondary: untypedInput1
        };
        const untypedSideBySideInputDifferent = {
            primary: untypedInput2,
            secondary: untypedInput1
        };
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput1, { strictEquals: true }), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { strictEquals: true }), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(diffInput1, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        group.openEditor(diffInput2, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedInput1), true);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(input1);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(untypedInput2), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(input2);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedDiffInput1), true);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(diffInput1);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), true);
        group.closeEditor(diffInput2);
        assert.strictEqual(group.contains(untypedInput1), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedInput2), false);
        assert.strictEqual(group.contains(untypedInput2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(untypedDiffInput1), false);
        assert.strictEqual(group.contains(untypedDiffInput2), false);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedSideBySideInputSame), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY, strictEquals: true }), false);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH, strictEquals: true }), false);
        group.closeEditor(sideBySideInputSame);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(group.contains(untypedSideBySideInputDifferent), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(untypedInput1, { supportSideBySide: SideBySideEditor.BOTH }), false);
    });
    test('contains()', () => {
        const group = createEditorGroupModel();
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input1 = input();
        const input2 = input();
        const diffInput1 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input1, input2, undefined);
        const diffInput2 = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input2, input1, undefined);
        const sideBySideInputSame = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input1);
        const sideBySideInputDifferent = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, input1, input2);
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input1, { strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { strictEquals: true }), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(diffInput1, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), false);
        group.openEditor(diffInput2, { pinned: true, active: true });
        assert.strictEqual(group.contains(input1), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(input1);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(input2);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(diffInput1), true);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(diffInput1);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), true);
        group.closeEditor(diffInput2);
        assert.strictEqual(group.contains(input1), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(input2), false);
        assert.strictEqual(group.contains(input2, { supportSideBySide: SideBySideEditor.ANY }), false);
        assert.strictEqual(group.contains(diffInput1), false);
        assert.strictEqual(group.contains(diffInput2), false);
        const input3 = input(undefined, true, URI.parse('foo://bar'));
        const input4 = input(undefined, true, URI.parse('foo://barsomething'));
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.contains(input4), false);
        assert.strictEqual(group.contains(input3), true);
        group.closeEditor(input3);
        assert.strictEqual(group.contains(input3), false);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputSame, { pinned: true, active: true });
        assert.strictEqual(group.contains(sideBySideInputSame), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY, strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH, strictEquals: true }), true);
        group.closeEditor(sideBySideInputSame);
        assert.strictEqual(group.count, 0);
        group.openEditor(sideBySideInputDifferent, { pinned: true, active: true });
        assert.strictEqual(group.contains(sideBySideInputDifferent), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.ANY, strictEquals: true }), true);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH }), false);
        assert.strictEqual(group.contains(input1, { supportSideBySide: SideBySideEditor.BOTH, strictEquals: true }), false);
    });
    test('group serialization', function () {
        inst().invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Case 1: inputs can be serialized and deserialized
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 3);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 3);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(deserialized.isPinned(input1), true);
        assert.strictEqual(deserialized.isPinned(input2), true);
        assert.strictEqual(deserialized.isPinned(input3), false);
        assert.strictEqual(deserialized.isActive(input3), true);
        // Case 2: inputs cannot be serialized
        TestEditorInputSerializer.disableSerialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Case 3: inputs cannot be deserialized
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
    });
    test('group serialization (sticky editor)', function () {
        inst().invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Case 1: inputs can be serialized and deserialized
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        group.stick(input2);
        assert.ok(group.isSticky(input2));
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 3);
        assert.strictEqual(deserialized.isPinned(input1), true);
        assert.strictEqual(deserialized.isActive(input1), false);
        assert.strictEqual(deserialized.isSticky(input1), false);
        assert.strictEqual(deserialized.isPinned(input2), true);
        assert.strictEqual(deserialized.isActive(input2), false);
        assert.strictEqual(deserialized.isSticky(input2), true);
        assert.strictEqual(deserialized.isPinned(input3), false);
        assert.strictEqual(deserialized.isActive(input3), true);
        assert.strictEqual(deserialized.isSticky(input3), false);
        // Case 2: inputs cannot be serialized
        TestEditorInputSerializer.disableSerialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.stickyCount, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Case 3: inputs cannot be deserialized
        TestEditorInputSerializer.disableSerialize = false;
        TestEditorInputSerializer.disableDeserialize = true;
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.stickyCount, 0);
        assert.strictEqual(deserialized.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 0);
        assert.strictEqual(deserialized.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
    });
    test('group serialization (locked group)', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.locked.length, 0);
        group.lock(true);
        group.lock(true);
        assert.strictEqual(events.locked.length, 1);
        group.lock(false);
        group.lock(false);
        assert.strictEqual(events.locked.length, 2);
    });
    test('locked group', function () {
        const group = createEditorGroupModel();
        group.lock(true);
        let deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.isLocked, true);
        group.lock(false);
        deserialized = createEditorGroupModel(group.serialize());
        assert.strictEqual(group.id, deserialized.id);
        assert.strictEqual(deserialized.count, 0);
        assert.strictEqual(deserialized.isLocked, false);
    });
    test('index', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.index.length, 0);
        group.setIndex(4);
        assert.strictEqual(events.index.length, 1);
    });
    test('label', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.label.length, 0);
        group.setLabel('Window 1');
        assert.strictEqual(events.label.length, 1);
    });
    test('active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(events.active.length, 0);
        group.setActive(undefined);
        assert.strictEqual(events.active.length, 1);
    });
    test('One Editor', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        // Active && Pinned
        const input1 = input();
        const { editor: openedEditor, isNew } = group.openEditor(input1, { active: true, pinned: true });
        assert.strictEqual(openedEditor, input1);
        assert.strictEqual(isNew, true);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.findEditor(input1)[0], input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(group.isFirst(input1), true);
        assert.strictEqual(group.isLast(input1), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[0].editorIndex, 0);
        assert.strictEqual(events.activated[0].editor, input1);
        assert.strictEqual(events.activated[0].editorIndex, 0);
        const index = group.indexOf(input1);
        assert.strictEqual(group.findEditor(input1)[1], index);
        let event = group.closeEditor(input1, EditorCloseContext.UNPIN);
        assert.strictEqual(event?.editor, input1);
        assert.strictEqual(event?.editorIndex, index);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(group.isFirst(input1), false);
        assert.strictEqual(group.isLast(input1), false);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[0].editorIndex, 0);
        assert.strictEqual(events.closed[0].context === EditorCloseContext.UNPIN, true);
        // Active && Preview
        const input2 = input();
        group.openEditor(input2, { active: true, pinned: false });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.isActive(input2), true);
        assert.strictEqual(group.isPinned(input2), false);
        assert.strictEqual(group.isPinned(0), false);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[1].editorIndex, 0);
        assert.strictEqual(events.activated[1].editor, input2);
        assert.strictEqual(events.activated[1].editorIndex, 0);
        group.closeEditor(input2);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(events.closed[1].editorIndex, 0);
        assert.strictEqual(events.closed[1].context === EditorCloseContext.REPLACE, false);
        event = group.closeEditor(input2);
        assert.ok(!event);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[1].editor, input2);
        // Nonactive && Pinned => gets active because its first editor
        const input3 = input();
        group.openEditor(input3, { active: false, pinned: true });
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[2].editor, input3);
        group.closeEditor(input3);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[2].editor, input3);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[2].editor, input3);
        group.closeEditor(input3);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[2].editor, input3);
        // Nonactive && Preview => gets active because its first editor
        const input4 = input();
        group.openEditor(input4);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(group.isActive(input4), true);
        assert.strictEqual(group.isPinned(input4), false);
        assert.strictEqual(group.isPinned(0), false);
        assert.strictEqual(events.opened[3].editor, input4);
        assert.strictEqual(events.activated[3].editor, input4);
        group.closeEditor(input4);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(events.closed[3].editor, input4);
    });
    test('Multiple Editors - Pinned and Active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input('1');
        const input1Copy = input('1');
        const input2 = input('2');
        const input3 = input('3');
        // Pinned and Active
        let openedEditorResult = group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(openedEditorResult.editor, input1);
        assert.strictEqual(openedEditorResult.isNew, true);
        openedEditorResult = group.openEditor(input1Copy, { pinned: true, active: true }); // opening copy of editor should still return existing one
        assert.strictEqual(openedEditorResult.editor, input1);
        assert.strictEqual(openedEditorResult.isNew, false);
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input1), false);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isFirst(input1), true);
        assert.strictEqual(group.isFirst(input2), false);
        assert.strictEqual(group.isFirst(input3), false);
        assert.strictEqual(group.isLast(input1), false);
        assert.strictEqual(group.isLast(input2), false);
        assert.strictEqual(group.isLast(input3), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.activated[0].editor, input1);
        assert.strictEqual(events.activated[0].editorIndex, 0);
        assert.strictEqual(events.activated[1].editor, input2);
        assert.strictEqual(events.activated[1].editorIndex, 1);
        assert.strictEqual(events.activated[2].editor, input3);
        assert.strictEqual(events.activated[2].editorIndex, 2);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru[1], input2);
        assert.strictEqual(mru[2], input1);
        // Add some tests where a matching input is used
        // and verify that events carry the original input
        const sameInput1 = input('1');
        group.openEditor(sameInput1, { pinned: true, active: true });
        assert.strictEqual(events.activated[3].editor, input1);
        assert.strictEqual(events.activated[3].editorIndex, 0);
        group.unpin(sameInput1);
        assert.strictEqual(events.unpinned[0].editor, input1);
        assert.strictEqual(events.unpinned[0].editorIndex, 0);
        group.pin(sameInput1);
        assert.strictEqual(events.pinned[0].editor, input1);
        assert.strictEqual(events.pinned[0].editorIndex, 0);
        group.stick(sameInput1);
        assert.strictEqual(events.sticky[0].editor, input1);
        assert.strictEqual(events.sticky[0].editorIndex, 0);
        group.unstick(sameInput1);
        assert.strictEqual(events.unsticky[0].editor, input1);
        assert.strictEqual(events.unsticky[0].editorIndex, 0);
        group.moveEditor(sameInput1, 1);
        assert.strictEqual(events.moved[0].editor, input1);
        assert.strictEqual(events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(events.moved[0].editorIndex, 1);
        group.closeEditor(sameInput1);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[0].editorIndex, 1);
        closeAllEditors(group);
        assert.strictEqual(events.closed.length, 3);
        assert.strictEqual(group.count, 0);
    });
    test('Multiple Editors - Preview editor moves to the side of the active one', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: false, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(input3, group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2]);
        const input4 = input();
        group.openEditor(input4, { pinned: false, active: true }); // this should cause the preview editor to move after input3
        assert.strictEqual(input4, group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2]);
    });
    test('Multiple Editors - Pinned and Active (DEFAULT_OPEN_EDITOR_DIRECTION = Direction.LEFT)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        inst.stub(IConfigurationService, config);
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'left' } });
        const group = disposables.add(inst.createInstance(EditorGroupModel, undefined));
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input1);
        closeAllEditors(group);
        assert.strictEqual(events.closed.length, 3);
        assert.strictEqual(group.count, 0);
        inst.dispose();
    });
    test('Multiple Editors - Pinned and Not Active', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Pinned and Active
        group.openEditor(input1, { pinned: true });
        group.openEditor(input2, { pinned: true });
        group.openEditor(input3, { pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isPinned(input1), true);
        assert.strictEqual(group.isPinned(0), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isPinned(1), true);
        assert.strictEqual(group.isActive(input3), false);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isPinned(2), true);
        assert.strictEqual(group.isPinned(input3), true);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input1);
        assert.strictEqual(mru[1], input3);
        assert.strictEqual(mru[2], input2);
    });
    test('Multiple Editors - Preview gets overwritten', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        // Non active, preview
        group.openEditor(input1); // becomes active, preview
        group.openEditor(input2); // overwrites preview
        group.openEditor(input3); // overwrites preview
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(group.isPinned(input3), false);
        assert.strictEqual(!group.isPinned(input3), true);
        assert.strictEqual(events.opened[0].editor, input1);
        assert.strictEqual(events.opened[1].editor, input2);
        assert.strictEqual(events.opened[2].editor, input3);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(events.closed[0].context === EditorCloseContext.REPLACE, true);
        assert.strictEqual(events.closed[1].context === EditorCloseContext.REPLACE, true);
        const mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru.length, 1);
    });
    test('Multiple Editors - set active', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.activeEditor, input3);
        let mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input3);
        assert.strictEqual(mru[1], input2);
        assert.strictEqual(mru[2], input1);
        group.setActive(input3);
        assert.strictEqual(events.activated.length, 3);
        group.setActive(input1);
        assert.strictEqual(events.activated[3].editor, input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.isActive(input1), true);
        assert.strictEqual(group.isActive(input2), false);
        assert.strictEqual(group.isActive(input3), false);
        mru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mru[0], input1);
        assert.strictEqual(mru[1], input3);
        assert.strictEqual(mru[2], input2);
    });
    test('Multiple Editors - pin and unpin', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        group.pin(input3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.isActive(input3), true);
        assert.strictEqual(events.pinned[0].editor, input3);
        assert.strictEqual(group.count, 3);
        group.unpin(input1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.isPinned(input1), false);
        assert.strictEqual(group.isActive(input1), false);
        assert.strictEqual(events.unpinned[0].editor, input1);
        assert.strictEqual(group.count, 3);
        group.unpin(input2);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 2); // 2 previews got merged into one
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input3);
        assert.strictEqual(events.closed[0].editor, input1);
        assert.strictEqual(group.count, 2);
        group.unpin(input3);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 1); // pinning replaced the preview
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(events.closed[1].editor, input2);
        assert.strictEqual(group.count, 1);
    });
    test('Multiple Editors - closing picks next from MRU list', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input5);
        assert.strictEqual(group.count, 5);
        group.closeEditor(input5);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(events.activated[5].editor, input4);
        assert.strictEqual(group.count, 4);
        group.setActive(input1);
        group.setActive(input4);
        group.closeEditor(input4);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.count, 3);
        group.closeEditor(input1);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 2);
        group.setActive(input2);
        group.closeEditor(input2);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 1);
        group.closeEditor(input3);
        assert.ok(!group.activeEditor);
        assert.strictEqual(group.count, 0);
    });
    test('Multiple Editors - closing picks next to the right', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { focusRecentEditorAfterClose: false } });
        inst.stub(IConfigurationService, config);
        const group = disposables.add(inst.createInstance(EditorGroupModel, undefined));
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0], input5);
        assert.strictEqual(group.count, 5);
        group.closeEditor(input5);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(events.activated[5].editor, input4);
        assert.strictEqual(group.count, 4);
        group.setActive(input1);
        group.closeEditor(input1);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.count, 3);
        group.setActive(input3);
        group.closeEditor(input3);
        assert.strictEqual(group.activeEditor, input4);
        assert.strictEqual(group.count, 2);
        group.closeEditor(input4);
        assert.strictEqual(group.activeEditor, input2);
        assert.strictEqual(group.count, 1);
        group.closeEditor(input2);
        assert.ok(!group.activeEditor);
        assert.strictEqual(group.count, 0);
        inst.dispose();
    });
    test('Multiple Editors - move editor', function () {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.moveEditor(input1, 1);
        assert.strictEqual(events.moved[0].editor, input1);
        assert.strictEqual(events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(events.moved[0].editorIndex, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input1);
        group.setActive(input1);
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: true, active: true });
        group.openEditor(input5, { pinned: true, active: true });
        group.moveEditor(input4, 0);
        assert.strictEqual(events.moved[1].editor, input4);
        assert.strictEqual(events.moved[1].oldEditorIndex, 3);
        assert.strictEqual(events.moved[1].editorIndex, 0);
        assert.strictEqual(events.moved[1].editor, input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[3], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input5);
        group.moveEditor(input4, 3);
        group.moveEditor(input2, 1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[3], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input5);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input1, 0);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input1, -1);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, 4);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, 100);
        assert.strictEqual(events.moved.length, 4);
        group.moveEditor(input5, -1);
        assert.strictEqual(events.moved.length, 5);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input5);
        group.moveEditor(input1, 100);
        assert.strictEqual(events.moved.length, 6);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[4], input1);
    });
    test('Multiple Editors - move editor across groups', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g2_input1 = input();
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: true });
        group2.openEditor(g2_input1, { active: true, pinned: true });
        // A move across groups is a close in the one group and an open in the other group at a specific index
        group2.closeEditor(g2_input1);
        group1.openEditor(g2_input1, { active: true, pinned: true, index: 1 });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], g1_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], g2_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], g1_input2);
    });
    test('Multiple Editors - move editor across groups (input already exists in group 1)', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g1_input3 = input();
        const g2_input1 = g1_input2;
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: true });
        group1.openEditor(g1_input3, { active: true, pinned: true });
        group2.openEditor(g2_input1, { active: true, pinned: true });
        // A move across groups is a close in the one group and an open in the other group at a specific index
        group2.closeEditor(g2_input1);
        group1.openEditor(g2_input1, { active: true, pinned: true, index: 0 });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], g1_input2);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], g1_input1);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], g1_input3);
    });
    test('Multiple Editors - Pinned & Non Active', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        group.openEditor(input1);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.count, 1);
        const input2 = input();
        group.openEditor(input2, { pinned: true, active: false });
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.count, 2);
        const input3 = input();
        group.openEditor(input3, { pinned: true, active: false });
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.previewEditor, input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input2);
        assert.strictEqual(group.isPinned(input1), false);
        assert.strictEqual(group.isPinned(input2), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.count, 3);
    });
    test('Multiple Editors - Close Others, Close Left, Close Right', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        const input5 = input();
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        // Close Others
        closeEditors(group, group.activeEditor);
        assert.strictEqual(group.activeEditor, input5);
        assert.strictEqual(group.count, 1);
        closeAllEditors(group);
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        group.setActive(input3);
        // Close Left
        assert.strictEqual(group.activeEditor, input3);
        closeEditors(group, group.activeEditor, 0 /* CloseDirection.LEFT */);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input4);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input5);
        closeAllEditors(group);
        group.openEditor(input1, { active: true, pinned: true });
        group.openEditor(input2, { active: true, pinned: true });
        group.openEditor(input3, { active: true, pinned: true });
        group.openEditor(input4, { active: true, pinned: true });
        group.openEditor(input5, { active: true, pinned: true });
        group.setActive(input3);
        // Close Right
        assert.strictEqual(group.activeEditor, input3);
        closeEditors(group, group.activeEditor, 1 /* CloseDirection.RIGHT */);
        assert.strictEqual(group.activeEditor, input3);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], input1);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], input2);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2], input3);
    });
    test('Multiple Editors - real user example', function () {
        const group = createEditorGroupModel();
        // [] -> /index.html/
        const indexHtml = input('index.html');
        let openedEditor = group.openEditor(indexHtml).editor;
        assert.strictEqual(openedEditor, indexHtml);
        assert.strictEqual(group.activeEditor, indexHtml);
        assert.strictEqual(group.previewEditor, indexHtml);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], indexHtml);
        assert.strictEqual(group.count, 1);
        // /index.html/ -> /index.html/
        const sameIndexHtml = input('index.html');
        openedEditor = group.openEditor(sameIndexHtml).editor;
        assert.strictEqual(openedEditor, indexHtml);
        assert.strictEqual(group.activeEditor, indexHtml);
        assert.strictEqual(group.previewEditor, indexHtml);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], indexHtml);
        assert.strictEqual(group.count, 1);
        // /index.html/ -> /style.css/
        const styleCss = input('style.css');
        openedEditor = group.openEditor(styleCss).editor;
        assert.strictEqual(openedEditor, styleCss);
        assert.strictEqual(group.activeEditor, styleCss);
        assert.strictEqual(group.previewEditor, styleCss);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], styleCss);
        assert.strictEqual(group.count, 1);
        // /style.css/ -> [/style.css/, test.js]
        const testJs = input('test.js');
        openedEditor = group.openEditor(testJs, { active: true, pinned: true }).editor;
        assert.strictEqual(openedEditor, testJs);
        assert.strictEqual(group.previewEditor, styleCss);
        assert.strictEqual(group.activeEditor, testJs);
        assert.strictEqual(group.isPinned(styleCss), false);
        assert.strictEqual(group.isPinned(testJs), true);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], styleCss);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], testJs);
        assert.strictEqual(group.count, 2);
        // [/style.css/, test.js] -> [test.js, /index.html/]
        const indexHtml2 = input('index.html');
        group.openEditor(indexHtml2, { active: true });
        assert.strictEqual(group.activeEditor, indexHtml2);
        assert.strictEqual(group.previewEditor, indexHtml2);
        assert.strictEqual(group.isPinned(indexHtml2), false);
        assert.strictEqual(group.isPinned(testJs), true);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0], testJs);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], indexHtml2);
        assert.strictEqual(group.count, 2);
        // make test.js active
        const testJs2 = input('test.js');
        group.setActive(testJs2);
        assert.strictEqual(group.activeEditor, testJs);
        assert.strictEqual(group.isActive(testJs2), true);
        assert.strictEqual(group.count, 2);
        // [test.js, /indexHtml/] -> [test.js, index.html]
        const indexHtml3 = input('index.html');
        group.pin(indexHtml3);
        assert.strictEqual(group.isPinned(indexHtml3), true);
        assert.strictEqual(group.activeEditor, testJs);
        // [test.js, index.html] -> [test.js, file.ts, index.html]
        const fileTs = input('file.ts');
        group.openEditor(fileTs, { active: true, pinned: true });
        assert.strictEqual(group.isPinned(fileTs), true);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor, fileTs);
        // [test.js, index.html, file.ts] -> [test.js, /file.ts/, index.html]
        group.unpin(fileTs);
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.isPinned(fileTs), false);
        assert.strictEqual(group.activeEditor, fileTs);
        // [test.js, /file.ts/, index.html] -> [test.js, /other.ts/, index.html]
        const otherTs = input('other.ts');
        group.openEditor(otherTs, { active: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor, otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[2].matches(indexHtml));
        // make index.html active
        const indexHtml4 = input('index.html');
        group.setActive(indexHtml4);
        assert.strictEqual(group.activeEditor, indexHtml2);
        // [test.js, /other.ts/, index.html] -> [test.js, /other.ts/]
        group.closeEditor(indexHtml);
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.activeEditor, otherTs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1], otherTs);
        // [test.js, /other.ts/] -> [test.js]
        group.closeEditor(otherTs);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor, testJs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        // [test.js] -> /test.js/
        group.unpin(testJs);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor, testJs);
        assert.ok(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(testJs));
        assert.strictEqual(group.isPinned(testJs), false);
        // /test.js/ -> []
        group.closeEditor(testJs);
        assert.strictEqual(group.count, 0);
        assert.strictEqual(group.activeEditor, null);
        assert.strictEqual(group.previewEditor, null);
    });
    test('Single Group, Single Editor - persist', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const input1 = input();
        group.openEditor(input1);
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor.matches(input1), true);
        assert.strictEqual(group.previewEditor.matches(input1), true);
        assert.strictEqual(group.isActive(input1), true);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 1);
        assert.strictEqual(group.activeEditor.matches(input1), true);
        assert.strictEqual(group.previewEditor.matches(input1), true);
        assert.strictEqual(group.isActive(input1), true);
        inst.dispose();
    });
    test('Multiple Groups, Multiple editors - persist', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group1 = createEditorGroupModel();
        const g1_input1 = input();
        const g1_input2 = input();
        const g1_input3 = input();
        group1.openEditor(g1_input1, { active: true, pinned: true });
        group1.openEditor(g1_input2, { active: true, pinned: false });
        group1.openEditor(g1_input3, { active: false, pinned: true });
        let group2 = createEditorGroupModel();
        const g2_input1 = input();
        const g2_input2 = input();
        const g2_input3 = input();
        group2.openEditor(g2_input1, { active: true, pinned: true });
        group2.openEditor(g2_input2, { active: false, pinned: false });
        group2.openEditor(g2_input3, { active: false, pinned: true });
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group2.count, 3);
        assert.strictEqual(group1.activeEditor.matches(g1_input2), true);
        assert.strictEqual(group2.activeEditor.matches(g2_input1), true);
        assert.strictEqual(group1.previewEditor.matches(g1_input2), true);
        assert.strictEqual(group2.previewEditor.matches(g2_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g1_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g1_input3), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g1_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g2_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g2_input3), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g2_input2), true);
        // Create model again - should load from storage
        group1 = disposables.add(inst.createInstance(EditorGroupModel, group1.serialize()));
        group2 = disposables.add(inst.createInstance(EditorGroupModel, group2.serialize()));
        assert.strictEqual(group1.count, 3);
        assert.strictEqual(group2.count, 3);
        assert.strictEqual(group1.activeEditor.matches(g1_input2), true);
        assert.strictEqual(group2.activeEditor.matches(g2_input1), true);
        assert.strictEqual(group1.previewEditor.matches(g1_input2), true);
        assert.strictEqual(group2.previewEditor.matches(g2_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g1_input2), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g1_input3), true);
        assert.strictEqual(group1.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g1_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(g2_input1), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(g2_input3), true);
        assert.strictEqual(group2.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(g2_input2), true);
        inst.dispose();
    });
    test('Single group, multiple editors - persist (some not persistable)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const serializableInput1 = input();
        const nonSerializableInput2 = input('3', true);
        const serializableInput2 = input();
        group.openEditor(serializableInput1, { active: true, pinned: true });
        group.openEditor(nonSerializableInput2, { active: true, pinned: false });
        group.openEditor(serializableInput2, { active: false, pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.activeEditor.matches(nonSerializableInput2), true);
        assert.strictEqual(group.previewEditor.matches(nonSerializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(nonSerializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(serializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[2].matches(serializableInput1), true);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.activeEditor.matches(serializableInput2), true);
        assert.strictEqual(group.previewEditor, null);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[0].matches(serializableInput2), true);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)[1].matches(serializableInput1), true);
        inst.dispose();
    });
    test('Single group, multiple editors - persist (some not persistable, sticky editors)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group = createEditorGroupModel();
        const serializableInput1 = input();
        const nonSerializableInput2 = input('3', true);
        const serializableInput2 = input();
        group.openEditor(serializableInput1, { active: true, pinned: true });
        group.openEditor(nonSerializableInput2, { active: true, pinned: true, sticky: true });
        group.openEditor(serializableInput2, { active: false, pinned: true });
        assert.strictEqual(group.count, 3);
        assert.strictEqual(group.stickyCount, 1);
        // Create model again - should load from storage
        group = disposables.add(inst.createInstance(EditorGroupModel, group.serialize()));
        assert.strictEqual(group.count, 2);
        assert.strictEqual(group.stickyCount, 0);
        inst.dispose();
    });
    test('Multiple groups, multiple editors - persist (some not persistable, causes empty group)', function () {
        const inst = new TestInstantiationService();
        inst.stub(IStorageService, disposables.add(new TestStorageService()));
        inst.stub(IWorkspaceContextService, new TestContextService());
        const lifecycle = disposables.add(new TestLifecycleService());
        inst.stub(ILifecycleService, lifecycle);
        inst.stub(ITelemetryService, NullTelemetryService);
        const config = new TestConfigurationService();
        config.setUserConfiguration('workbench', { editor: { openPositioning: 'right' } });
        inst.stub(IConfigurationService, config);
        inst.invokeFunction(accessor => Registry.as(EditorExtensions.EditorFactory).start(accessor));
        let group1 = createEditorGroupModel();
        let group2 = createEditorGroupModel();
        const serializableInput1 = input();
        const serializableInput2 = input();
        const nonSerializableInput = input('2', true);
        group1.openEditor(serializableInput1, { pinned: true });
        group1.openEditor(serializableInput2);
        group2.openEditor(nonSerializableInput);
        // Create model again - should load from storage
        group1 = disposables.add(inst.createInstance(EditorGroupModel, group1.serialize()));
        group2 = disposables.add(inst.createInstance(EditorGroupModel, group2.serialize()));
        assert.strictEqual(group1.count, 2);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[0].matches(serializableInput1), true);
        assert.strictEqual(group1.getEditors(1 /* EditorsOrder.SEQUENTIAL */)[1].matches(serializableInput2), true);
        inst.dispose();
    });
    test('Multiple Editors - Editor Dispose', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const group1Listener = groupListener(group1);
        const group2Listener = groupListener(group2);
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group1.openEditor(input2, { pinned: true, active: true });
        group1.openEditor(input3, { pinned: true, active: true });
        group2.openEditor(input1, { pinned: true, active: true });
        group2.openEditor(input2, { pinned: true, active: true });
        input1.dispose();
        assert.strictEqual(group1Listener.disposed.length, 1);
        assert.strictEqual(group1Listener.disposed[0].editorIndex, 0);
        assert.strictEqual(group2Listener.disposed.length, 1);
        assert.strictEqual(group2Listener.disposed[0].editorIndex, 0);
        assert.ok(group1Listener.disposed[0].editor.matches(input1));
        assert.ok(group2Listener.disposed[0].editor.matches(input1));
        input3.dispose();
        assert.strictEqual(group1Listener.disposed.length, 2);
        assert.strictEqual(group1Listener.disposed[1].editorIndex, 2);
        assert.strictEqual(group2Listener.disposed.length, 1);
        assert.ok(group1Listener.disposed[1].editor.matches(input3));
    });
    test('Preview tab does not have a stable position (https://github.com/microsoft/vscode/issues/8245)', function () {
        const group1 = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group1.openEditor(input2, { active: true });
        group1.setActive(input1);
        group1.openEditor(input3, { active: true });
        assert.strictEqual(group1.indexOf(input3), 1);
    });
    test('Multiple Editors - Editor Emits Dirty and Label Changed', function () {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        group1.openEditor(input1, { pinned: true, active: true });
        group2.openEditor(input2, { pinned: true, active: true });
        let dirty1Counter = 0;
        disposables.add(group1.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty1Counter++;
            }
        }));
        let dirty2Counter = 0;
        disposables.add(group2.onDidModelChange((e) => {
            if (e.kind === 14 /* GroupModelChangeKind.EDITOR_DIRTY */) {
                dirty2Counter++;
            }
        }));
        let label1ChangeCounter = 0;
        disposables.add(group1.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label1ChangeCounter++;
            }
        }));
        let label2ChangeCounter = 0;
        disposables.add(group2.onDidModelChange((e) => {
            if (e.kind === 9 /* GroupModelChangeKind.EDITOR_LABEL */) {
                label2ChangeCounter++;
            }
        }));
        input1.setDirty();
        input1.setLabel();
        assert.strictEqual(dirty1Counter, 1);
        assert.strictEqual(label1ChangeCounter, 1);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2Counter, 1);
        assert.strictEqual(label2ChangeCounter, 1);
        closeAllEditors(group2);
        input2.setDirty();
        input2.setLabel();
        assert.strictEqual(dirty2Counter, 1);
        assert.strictEqual(label2ChangeCounter, 1);
        assert.strictEqual(dirty1Counter, 1);
        assert.strictEqual(label1ChangeCounter, 1);
    });
    test('Sticky Editors', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        const input4 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).length, 3);
        assert.strictEqual(group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true }).length, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).length, 3);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 3);
        // Stick last editor should move it first and pin
        group.stick(input3);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true }).length, 2);
        assert.strictEqual(group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: false }).length, 3);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.isPinned(input3), true);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        let sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        let sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 2);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input1) >= 0);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input2) >= 0);
        let mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        let mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true });
        assert.strictEqual(mruEditorsExcludingSticky.length, 2);
        assert.ok(mruEditorsExcludingSticky.indexOf(input1) >= 0);
        assert.ok(mruEditorsExcludingSticky.indexOf(input2) >= 0);
        // Sticking same editor again is a no-op
        group.stick(input3);
        assert.strictEqual(group.isSticky(input3), true);
        // Sticking last editor now should move it after sticky one
        group.stick(input2);
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 0);
        sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 1);
        assert.ok(sequentialEditorsExcludingSticky.indexOf(input1) >= 0);
        mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true });
        assert.strictEqual(mruEditorsExcludingSticky.length, 1);
        assert.ok(mruEditorsExcludingSticky.indexOf(input1) >= 0);
        // Sticking remaining editor also works
        group.stick(input1);
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 0);
        sequentialAllEditors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        assert.strictEqual(sequentialAllEditors.length, 3);
        sequentialEditorsExcludingSticky = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true });
        assert.strictEqual(sequentialEditorsExcludingSticky.length, 0);
        mruAllEditors = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        assert.strictEqual(mruAllEditors.length, 3);
        mruEditorsExcludingSticky = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true });
        assert.strictEqual(mruEditorsExcludingSticky.length, 0);
        // Unsticking moves editor after sticky ones
        group.unstick(input3);
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 2);
        // Unsticking all works
        group.unstick(input1);
        group.unstick(input2);
        assert.strictEqual(group.stickyCount, 0);
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        group.moveEditor(input1, 0);
        group.moveEditor(input2, 1);
        group.moveEditor(input3, 2);
        // Opening a new editor always opens after sticky editors
        group.stick(input1);
        group.stick(input2);
        group.setActive(input1);
        const events = groupListener(group);
        group.openEditor(input4, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input4), 2);
        group.closeEditor(input4);
        assert.strictEqual(events.closed[0].sticky, false);
        group.setActive(input2);
        group.openEditor(input4, { pinned: true, active: true });
        assert.strictEqual(group.indexOf(input4), 2);
        group.closeEditor(input4);
        assert.strictEqual(events.closed[1].sticky, false);
        // Reset
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        // Moving a sticky editor works
        group.moveEditor(input1, 1); // still moved within sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input1, 0); // still moved within sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input1, 2); // moved out of sticky range//
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 1);
        group.moveEditor(input2, 2); // moved out of sticky range
        assert.strictEqual(group.isSticky(input1), false);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        // Reset
        group.moveEditor(input1, 0);
        group.moveEditor(input2, 1);
        group.moveEditor(input3, 2);
        group.stick(input1);
        group.unstick(input2);
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        // Moving a unsticky editor in works
        group.moveEditor(input3, 1); // still moved within unsticked range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 1);
        group.moveEditor(input3, 2); // still moved within unsticked range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 2);
        group.moveEditor(input3, 0); // moved into sticky range//
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 1);
        assert.strictEqual(group.indexOf(input2), 2);
        assert.strictEqual(group.indexOf(input3), 0);
        group.moveEditor(input2, 0); // moved into sticky range
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.indexOf(input1), 2);
        assert.strictEqual(group.indexOf(input2), 0);
        assert.strictEqual(group.indexOf(input3), 1);
        // Closing a sticky editor updates state properly
        group.stick(input1);
        group.stick(input2);
        group.unstick(input3);
        assert.strictEqual(group.stickyCount, 2);
        group.closeEditor(input1);
        assert.strictEqual(events.closed[2].sticky, true);
        assert.strictEqual(group.stickyCount, 1);
        group.closeEditor(input2);
        assert.strictEqual(events.closed[3].sticky, true);
        assert.strictEqual(group.stickyCount, 0);
        closeAllEditors(group);
        assert.strictEqual(group.stickyCount, 0);
        // Open sticky
        group.openEditor(input1, { sticky: true });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        group.openEditor(input2, { pinned: true, active: true });
        assert.strictEqual(group.stickyCount, 1);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), false);
        group.openEditor(input2, { sticky: true });
        assert.strictEqual(group.stickyCount, 2);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        group.openEditor(input3, { pinned: true, active: true });
        group.openEditor(input4, { pinned: false, active: true, sticky: true });
        assert.strictEqual(group.stickyCount, 3);
        assert.strictEqual(group.isSticky(input1), true);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.isSticky(input4), true);
        assert.strictEqual(group.isPinned(input4), true);
        assert.strictEqual(group.indexOf(input1), 0);
        assert.strictEqual(group.indexOf(input2), 1);
        assert.strictEqual(group.indexOf(input3), 3);
        assert.strictEqual(group.indexOf(input4), 2);
    });
    test('Sticky/Unsticky Editors sends correct editor index', function () {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true });
        group.openEditor(input2, { pinned: true, active: true });
        group.openEditor(input3, { pinned: false, active: true });
        assert.strictEqual(group.stickyCount, 0);
        const events = groupListener(group);
        group.stick(input3);
        assert.strictEqual(events.sticky[0].editorIndex, 0);
        assert.strictEqual(group.isSticky(input3), true);
        assert.strictEqual(group.stickyCount, 1);
        group.stick(input2);
        assert.strictEqual(events.sticky[1].editorIndex, 1);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.stickyCount, 2);
        group.unstick(input3);
        assert.strictEqual(events.unsticky[0].editorIndex, 1);
        assert.strictEqual(group.isSticky(input3), false);
        assert.strictEqual(group.isSticky(input2), true);
        assert.strictEqual(group.stickyCount, 1);
    });
    test('onDidMoveEditor Event', () => {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const input1group1 = input();
        const input2group1 = input();
        const input1group2 = input();
        const input2group2 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0 });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0 });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        const group1Events = groupListener(group1);
        const group2Events = groupListener(group2);
        group1.moveEditor(input1group1, 1);
        assert.strictEqual(group1Events.moved[0].editor, input1group1);
        assert.strictEqual(group1Events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(group1Events.moved[0].editorIndex, 1);
        group2.moveEditor(input1group2, 1);
        assert.strictEqual(group2Events.moved[0].editor, input1group2);
        assert.strictEqual(group2Events.moved[0].oldEditorIndex, 0);
        assert.strictEqual(group2Events.moved[0].editorIndex, 1);
    });
    test('onDidOpeneditor Event', () => {
        const group1 = createEditorGroupModel();
        const group2 = createEditorGroupModel();
        const group1Events = groupListener(group1);
        const group2Events = groupListener(group2);
        const input1group1 = input();
        const input2group1 = input();
        const input1group2 = input();
        const input2group2 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0 });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0 });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        assert.strictEqual(group1Events.opened.length, 2);
        assert.strictEqual(group1Events.opened[0].editor, input1group1);
        assert.strictEqual(group1Events.opened[0].editorIndex, 0);
        assert.strictEqual(group1Events.opened[1].editor, input2group1);
        assert.strictEqual(group1Events.opened[1].editorIndex, 1);
        assert.strictEqual(group2Events.opened.length, 2);
        assert.strictEqual(group2Events.opened[0].editor, input1group2);
        assert.strictEqual(group2Events.opened[0].editorIndex, 0);
        assert.strictEqual(group2Events.opened[1].editor, input2group2);
        assert.strictEqual(group2Events.opened[1].editorIndex, 1);
    });
    test('moving editor sends sticky event when sticky changes', () => {
        const group1 = createEditorGroupModel();
        const input1group1 = input();
        const input2group1 = input();
        const input3group1 = input();
        // Open all the editors
        group1.openEditor(input1group1, { pinned: true, active: true, index: 0, sticky: true });
        group1.openEditor(input2group1, { pinned: true, active: false, index: 1 });
        group1.openEditor(input3group1, { pinned: true, active: false, index: 2 });
        const group1Events = groupListener(group1);
        group1.moveEditor(input2group1, 0);
        assert.strictEqual(group1Events.sticky[0].editor, input2group1);
        assert.strictEqual(group1Events.sticky[0].editorIndex, 0);
        const group2 = createEditorGroupModel();
        const input1group2 = input();
        const input2group2 = input();
        const input3group2 = input();
        // Open all the editors
        group2.openEditor(input1group2, { pinned: true, active: true, index: 0, sticky: true });
        group2.openEditor(input2group2, { pinned: true, active: false, index: 1 });
        group2.openEditor(input3group2, { pinned: true, active: false, index: 2 });
        const group2Events = groupListener(group2);
        group2.moveEditor(input1group2, 1);
        assert.strictEqual(group2Events.unsticky[0].editor, input1group2);
        assert.strictEqual(group2Events.unsticky[0].editorIndex, 1);
    });
    function assertSelection(group, activeEditor, selectedEditors) {
        assert.strictEqual(group.activeEditor, activeEditor);
        assert.strictEqual(group.selectedEditors.length, selectedEditors.length);
        for (let i = 0; i < selectedEditors.length; i++) {
            assert.strictEqual(group.selectedEditors[i], selectedEditors[i]);
        }
    }
    test('editor selection: selectedEditors', () => {
        const group = createEditorGroupModel();
        const activeEditor = group.activeEditor;
        const selectedEditors = group.selectedEditors;
        assert.strictEqual(activeEditor, null);
        assert.strictEqual(selectedEditors.length, 0);
        // active editor: input1, selection: [input1]
        const input1 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        assertSelection(group, input1, [input1]);
        // active editor: input3, selection: [input3]
        const input2 = input();
        const input3 = input();
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        assertSelection(group, input3, [input3]);
        // active editor: input2, selection: [input1, input2] (in sequential order)
        group.setSelection(input2, [input1]);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: openEditor with inactive selection', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.openEditor(input2, { active: true, inactiveSelection: [input3, input1] });
        assertSelection(group, input2, [input1, input2, input3]);
        // active editor: input1, selection: [input1, input3] (in sequential order)
        // test duplicate entries
        group.openEditor(input1, { active: true, inactiveSelection: [input3, input1, input3] });
        assertSelection(group, input1, [input1, input3]);
        // active editor: input1, selection: [input1, input2] (in sequential order)
        // open new Editor as inactive with selection
        const input4 = input();
        group.openEditor(input4, { pinned: true, active: false, inactiveSelection: [input2], index: 3 });
        assertSelection(group, input1, [input1, input2]);
        // active editor: input5, selection: [input4, input5] (in sequential order)
        // open new Editor as active with selection
        const input5 = input();
        group.openEditor(input5, { pinned: true, active: true, inactiveSelection: [input4], index: 4 });
        assertSelection(group, input5, [input4, input5]);
    });
    test('editor selection: closeEditor keeps selection', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        group.setSelection(input2, [input3, input1]);
        group.closeEditor(input3);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: setSeletion', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.setSelection(input2, [input3, input1]);
        assertSelection(group, input2, [input1, input2, input3]);
        // active editor: input3, selection: [input3]
        group.setSelection(input3, []);
        assertSelection(group, input3, [input3]);
        // active editor: input2, selection: [input1, input2]
        // test duplicate entries
        group.setSelection(input2, [input1, input2, input1]);
        assertSelection(group, input2, [input1, input2]);
    });
    test('editor selection: isSelected', () => {
        const group = createEditorGroupModel();
        // active editor: input3, selection: [input3]
        const input1 = input();
        const input2 = input();
        const input3 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.openEditor(input2, { pinned: true, active: true, index: 1 });
        group.openEditor(input3, { pinned: true, active: true, index: 2 });
        // active editor: input2, selection: [input1, input2, input3] (in sequential order)
        group.setSelection(input2, [input3, input1]);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), true);
        assert.strictEqual(group.isSelected(input3), true);
        // active editor: input3, selection: [input3]
        group.setSelection(input3, []);
        assert.strictEqual(group.isSelected(input1), false);
        assert.strictEqual(group.isSelected(input2), false);
        assert.strictEqual(group.isSelected(input3), true);
        // use index
        assert.strictEqual(group.isSelected(0), false);
        assert.strictEqual(group.isSelected(1), false);
        assert.strictEqual(group.isSelected(2), true);
    });
    test('editor selection: select invalid editor', () => {
        const group = createEditorGroupModel();
        const input1 = input();
        const input2 = input();
        group.openEditor(input1, { pinned: true, active: true, index: 0 });
        group.setSelection(input2, [input1]);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.selectedEditors.length, 1);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
        group.setSelection(input1, [input2]);
        assert.strictEqual(group.activeEditor, input1);
        assert.strictEqual(group.selectedEditors.length, 1);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input1), true);
        assert.strictEqual(group.isSelected(input2), false);
    });
    test('editor transient: basics', () => {
        const group = createEditorGroupModel();
        const events = groupListener(group);
        const input1 = input();
        const input2 = input();
        group.openEditor(input1, { pinned: true, active: true });
        assert.strictEqual(group.isTransient(input1), false);
        assert.strictEqual(events.transient.length, 0);
        group.openEditor(input2, { pinned: true, active: true, transient: true });
        assert.strictEqual(events.transient[0].editor, input2);
        assert.strictEqual(group.isTransient(input2), true);
        group.setTransient(input1, true);
        assert.strictEqual(group.isTransient(input1), true);
        assert.strictEqual(events.transient[1].editor, input1);
        group.setTransient(input2, false);
        assert.strictEqual(group.isTransient(input2), false);
        assert.strictEqual(events.transient[2].editor, input2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckdyb3VwTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGdCQUFnQixFQUE4SCx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hULE9BQU8sRUFBRSxnQkFBZ0IsRUFBdUosZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sOEJBQThCLENBQUM7QUFDalIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNs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QUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3RCxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3RCxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFB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LENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV0RCxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXRELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUU3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUxQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUxQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFckQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRXZFLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxLQUFLLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkgsS0FBSyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxLQUFLLENBQUMsVUFBVSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xILE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckgsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0IsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdkgsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV2QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUV2QixvREFBb0Q7UUFFcEQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFMUQsSUFBSSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXhELHNDQUFzQztRQUN0Qyx5QkFBeUIsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFFbEQsWUFBWSxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFVBQVUsaUNBQXlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFVBQVUsMkNBQW1DLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpGLHdDQUF3QztRQUN4Qyx5QkFBeUIsQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDbkQseUJBQXlCLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBRXBELFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxVQUFVLGlDQUF5QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRTtRQUMzQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN2SCxNQUFNLEtBQUssR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBRXZDLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBRXZCLG9EQUFvRDtRQUVwRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDekQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUxRCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRWxDLElBQUksWUFBWSxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFD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QUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsMkNBQW1DLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbkYsS0FBSyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVwRCw4REFBOEQ7UUFDOUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLDJDQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXZELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsMkNBQW1DLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXBELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV2RCxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxD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TSxDQUFDLENBQUM7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdkQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFVBQVUsMkNBQW1DLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsZ0RBQWdEO1FBQ2hELGtEQUFrRDtRQUNsRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV2RCxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RCxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RCxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuRCxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUVBQXVFLEVBQUU7UUFDN0Us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QUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSwyQ0FBbUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENB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QUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzND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LFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFN0Qsc0dBQXNHO1FBQ3RHLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFO1FBQzlDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUM7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UUFDdkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFFdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDekQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUV6RCxlQUFlO1FBQ2YsWUFBWSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsWUFBYSxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVB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QyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXJILElBQUksTUFBTSxHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFFdEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFFMUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFOUQsSUFBSSxNQUFNLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV0QyxNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUUxQixNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtB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QUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3QyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3QyxRQUFRO1FBQ1IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3QyxvQ0FBb0M7UUFDcEMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFD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O1FBQ2QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUU7UUFDMUQsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV2QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUV2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDekQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBRXhDLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBRTdCLHVCQUF1QjtRQUN2QixNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUzRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFFeEMsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUzQyxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUU3Qix1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7UUFDakUsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUU3Qix1QkFBdUI7UUFDdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RixNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUzRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFM0MsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFFeEMsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDN0IsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDN0IsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFFN0IsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0UsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFM0UsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsZUFBZSxDQUFDLEtBQXVCLEVBQUUsWUFBeUIsRUFBRSxlQUE4QjtRQUMxRyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFFdkMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQztRQUN4QyxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5Qyw2Q0FBNkM7UUFDN0MsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkUsZUFBZSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXpDLDZDQUE2QztRQUM3QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFekMsMkVBQTJFO1FBQzNFLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyQyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRTtRQUNqRSxNQUFNLEtBQUssR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBRXZDLDZDQUE2QztRQUM3QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuRSxtRkFBbUY7UUFDbkYsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRixlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUV6RCwyRUFBMkU7UUFDM0UseUJBQXlCO1FBQ3pCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hGLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFakQsMkVBQTJFO1FBQzNFLDZDQUE2QztRQUM3QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFakQsMkVBQTJFO1FBQzNFLDJDQUEyQztRQUMzQyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hHLGVBQWUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzFELE1BQU0sS0FBSyxHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFFdkMsNkNBQTZDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRW5FLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDN0MsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBRXZDLDZDQUE2QztRQUM3QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuRSxtRkFBbUY7UUFDbkYsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM3QyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUV6RCw2Q0FBNkM7UUFDN0MsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDL0IsZUFBZSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXpDLHFEQUFxRDtRQUNyRCx5QkFBeUI7UUFDekIsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckQsZUFBZSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV2Qyw2Q0FBNkM7UUFDN0MsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbkUsbUZBQW1GO1FBQ25GLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbkQsNkNBQTZDO1FBQzdDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRW5ELFlBQVk7UUFDWixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUV2QyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuRSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXJDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFL0MsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV2RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFcEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFdkQsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=