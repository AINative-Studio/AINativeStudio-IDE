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
import { EditorPane, EditorMemento } from '../../../../browser/parts/editor/editorPane.js';
import { WorkspaceTrustRequiredPlaceholderEditor } from '../../../../browser/parts/editor/editorPlaceholder.js';
import { EditorExtensions } from '../../../../common/editor.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { workbenchInstantiationService, TestEditorGroupView, TestEditorGroupsService, registerTestResourceEditor, TestEditorInput, createEditorPart, TestTextResourceConfigurationService } from '../../workbenchTestServices.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorPaneDescriptor } from '../../../../browser/editor.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TestStorageService, TestWorkspaceTrustManagementService } from '../../../common/workbenchTestServices.js';
import { extUri } from '../../../../../base/common/resources.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const NullThemeService = new TestThemeService();
const editorRegistry = Registry.as(EditorExtensions.EditorPane);
const editorInputRegistry = Registry.as(EditorExtensions.EditorFactory);
class TestEditor extends EditorPane {
    constructor(group) {
        const disposables = new DisposableStore();
        super('TestEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
        this._register(disposables);
    }
    getId() { return 'testEditor'; }
    layout() { }
    createEditor() { }
}
class OtherTestEditor extends EditorPane {
    constructor(group) {
        const disposables = new DisposableStore();
        super('testOtherEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
        this._register(disposables);
    }
    getId() { return 'testOtherEditor'; }
    layout() { }
    createEditor() { }
}
class TestInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return input.toString();
    }
    deserialize(instantiationService, raw) {
        return {};
    }
}
class TestInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    prefersEditorPane(editors) {
        return editors[1];
    }
    get typeId() {
        return 'testInput';
    }
    resolve() {
        return null;
    }
}
class OtherTestInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    get typeId() {
        return 'otherTestInput';
    }
    resolve() {
        return null;
    }
}
class TestResourceEditorInput extends TextResourceEditorInput {
}
suite('EditorPane', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('EditorPane API', async () => {
        const group = new TestEditorGroupView(1);
        const editor = new TestEditor(group);
        assert.ok(editor.group);
        const input = disposables.add(new OtherTestInput());
        const options = {};
        assert(!editor.isVisible());
        assert(!editor.input);
        await editor.setInput(input, options, Object.create(null), CancellationToken.None);
        assert.strictEqual(input, editor.input);
        editor.setVisible(true);
        assert(editor.isVisible());
        editor.dispose();
        editor.clearInput();
        editor.setVisible(false);
        assert(!editor.isVisible());
        assert(!editor.input);
        assert(!editor.getControl());
    });
    test('EditorPaneDescriptor', () => {
        const editorDescriptor = EditorPaneDescriptor.create(TestEditor, 'id', 'name');
        assert.strictEqual(editorDescriptor.typeId, 'id');
        assert.strictEqual(editorDescriptor.name, 'name');
    });
    test('Editor Pane Registration', function () {
        const editorDescriptor1 = EditorPaneDescriptor.create(TestEditor, 'id1', 'name');
        const editorDescriptor2 = EditorPaneDescriptor.create(OtherTestEditor, 'id2', 'name');
        const oldEditorsCnt = editorRegistry.getEditorPanes().length;
        const oldInputCnt = editorRegistry.getEditors().length;
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor1, [new SyncDescriptor(TestInput)]));
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor2, [new SyncDescriptor(TestInput), new SyncDescriptor(OtherTestInput)]));
        assert.strictEqual(editorRegistry.getEditorPanes().length, oldEditorsCnt + 2);
        assert.strictEqual(editorRegistry.getEditors().length, oldInputCnt + 3);
        assert.strictEqual(editorRegistry.getEditorPane(disposables.add(new TestInput())), editorDescriptor2);
        assert.strictEqual(editorRegistry.getEditorPane(disposables.add(new OtherTestInput())), editorDescriptor2);
        assert.strictEqual(editorRegistry.getEditorPaneByType('id1'), editorDescriptor1);
        assert.strictEqual(editorRegistry.getEditorPaneByType('id2'), editorDescriptor2);
        assert(!editorRegistry.getEditorPaneByType('id3'));
    });
    test('Editor Pane Lookup favors specific class over superclass (match on specific class)', function () {
        const d1 = EditorPaneDescriptor.create(TestEditor, 'id1', 'name');
        disposables.add(registerTestResourceEditor());
        disposables.add(editorRegistry.registerEditorPane(d1, [new SyncDescriptor(TestResourceEditorInput)]));
        const inst = workbenchInstantiationService(undefined, disposables);
        const group = new TestEditorGroupView(1);
        const editor = disposables.add(editorRegistry.getEditorPane(disposables.add(inst.createInstance(TestResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined))).instantiate(inst, group));
        assert.strictEqual(editor.getId(), 'testEditor');
        const otherEditor = disposables.add(editorRegistry.getEditorPane(disposables.add(inst.createInstance(TextResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined))).instantiate(inst, group));
        assert.strictEqual(otherEditor.getId(), 'workbench.editors.textResourceEditor');
    });
    test('Editor Pane Lookup favors specific class over superclass (match on super class)', function () {
        const inst = workbenchInstantiationService(undefined, disposables);
        const group = new TestEditorGroupView(1);
        disposables.add(registerTestResourceEditor());
        const editor = disposables.add(editorRegistry.getEditorPane(disposables.add(inst.createInstance(TestResourceEditorInput, URI.file('/fake'), 'fake', '', undefined, undefined))).instantiate(inst, group));
        assert.strictEqual('workbench.editors.textResourceEditor', editor.getId());
    });
    test('Editor Input Serializer', function () {
        const testInput = disposables.add(new TestEditorInput(URI.file('/fake'), 'testTypeId'));
        workbenchInstantiationService(undefined, disposables).invokeFunction(accessor => editorInputRegistry.start(accessor));
        disposables.add(editorInputRegistry.registerEditorSerializer(testInput.typeId, TestInputSerializer));
        let factory = editorInputRegistry.getEditorSerializer('testTypeId');
        assert(factory);
        factory = editorInputRegistry.getEditorSerializer(testInput);
        assert(factory);
        // throws when registering serializer for same type
        assert.throws(() => editorInputRegistry.registerEditorSerializer(testInput.typeId, TestInputSerializer));
    });
    test('EditorMemento - basics', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const testGroup1 = new TestEditorGroupView(1);
        const testGroup4 = new TestEditorGroupView(4);
        const configurationService = new TestTextResourceConfigurationService();
        const editorGroupService = new TestEditorGroupsService([
            testGroup0,
            testGroup1,
            new TestEditorGroupView(2)
        ]);
        const rawMemento = Object.create(null);
        let memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        let res = memento.loadEditorState(testGroup0, URI.file('/A'));
        assert.ok(!res);
        memento.saveEditorState(testGroup0, URI.file('/A'), { line: 3 });
        res = memento.loadEditorState(testGroup0, URI.file('/A'));
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        memento.saveEditorState(testGroup1, URI.file('/A'), { line: 5 });
        res = memento.loadEditorState(testGroup1, URI.file('/A'));
        assert.ok(res);
        assert.strictEqual(res.line, 5);
        // Ensure capped at 3 elements
        memento.saveEditorState(testGroup0, URI.file('/B'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/C'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/D'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/E'), { line: 1 });
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/A')));
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/B')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/E')));
        // Save at an unknown group
        memento.saveEditorState(testGroup4, URI.file('/E'), { line: 1 });
        assert.ok(memento.loadEditorState(testGroup4, URI.file('/E'))); // only gets removed when memento is saved
        memento.saveEditorState(testGroup4, URI.file('/C'), { line: 1 });
        assert.ok(memento.loadEditorState(testGroup4, URI.file('/C'))); // only gets removed when memento is saved
        memento.saveState();
        memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/E')));
        // Check on entries no longer there from invalid groups
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/E')));
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/C')));
        memento.clearEditorState(URI.file('/C'), testGroup4);
        memento.clearEditorState(URI.file('/E'));
        assert.ok(!memento.loadEditorState(testGroup4, URI.file('/C')));
        assert.ok(memento.loadEditorState(testGroup0, URI.file('/D')));
        assert.ok(!memento.loadEditorState(testGroup0, URI.file('/E')));
    });
    test('EditorMemento - move', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const configurationService = new TestTextResourceConfigurationService();
        const editorGroupService = new TestEditorGroupsService([testGroup0]);
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        memento.saveEditorState(testGroup0, URI.file('/some/folder/file-1.txt'), { line: 1 });
        memento.saveEditorState(testGroup0, URI.file('/some/folder/file-2.txt'), { line: 2 });
        memento.saveEditorState(testGroup0, URI.file('/some/other/file.txt'), { line: 3 });
        memento.moveEditorState(URI.file('/some/folder/file-1.txt'), URI.file('/some/folder/file-moved.txt'), extUri);
        let res = memento.loadEditorState(testGroup0, URI.file('/some/folder/file-1.txt'));
        assert.ok(!res);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder/file-moved.txt'));
        assert.strictEqual(res?.line, 1);
        memento.moveEditorState(URI.file('/some/folder'), URI.file('/some/folder-moved'), extUri);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder-moved/file-moved.txt'));
        assert.strictEqual(res?.line, 1);
        res = memento.loadEditorState(testGroup0, URI.file('/some/folder-moved/file-2.txt'));
        assert.strictEqual(res?.line, 2);
    });
    test('EditoMemento - use with editor input', function () {
        const testGroup0 = new TestEditorGroupView(0);
        class TestEditorInput extends EditorInput {
            constructor(resource, id = 'testEditorInputForMementoTest') {
                super();
                this.resource = resource;
                this.id = id;
            }
            get typeId() { return 'testEditorInputForMementoTest'; }
            async resolve() { return null; }
            matches(other) {
                return other && this.id === other.id && other instanceof TestEditorInput;
            }
        }
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, new TestEditorGroupsService(), new TestTextResourceConfigurationService()));
        const testInputA = disposables.add(new TestEditorInput(URI.file('/A')));
        let res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputA, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        // State removed when input gets disposed
        testInputA.dispose();
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
    });
    test('EditoMemento - clear on editor dispose', function () {
        const testGroup0 = new TestEditorGroupView(0);
        class TestEditorInput extends EditorInput {
            constructor(resource, id = 'testEditorInputForMementoTest') {
                super();
                this.resource = resource;
                this.id = id;
            }
            get typeId() { return 'testEditorInputForMementoTest'; }
            async resolve() { return null; }
            matches(other) {
                return other && this.id === other.id && other instanceof TestEditorInput;
            }
        }
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, new TestEditorGroupsService(), new TestTextResourceConfigurationService()));
        const testInputA = disposables.add(new TestEditorInput(URI.file('/A')));
        let res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputA.resource, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        // State not yet removed when input gets disposed
        // because we used resource
        testInputA.dispose();
        res = memento.loadEditorState(testGroup0, testInputA);
        assert.ok(res);
        const testInputB = disposables.add(new TestEditorInput(URI.file('/B')));
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(!res);
        memento.saveEditorState(testGroup0, testInputB.resource, { line: 3 });
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(res);
        assert.strictEqual(res.line, 3);
        memento.clearEditorStateOnDispose(testInputB.resource, testInputB);
        // State removed when input gets disposed
        testInputB.dispose();
        res = memento.loadEditorState(testGroup0, testInputB);
        assert.ok(!res);
    });
    test('EditorMemento - workbench.editor.sharedViewState', function () {
        const testGroup0 = new TestEditorGroupView(0);
        const testGroup1 = new TestEditorGroupView(1);
        const configurationService = new TestTextResourceConfigurationService(new TestConfigurationService({
            workbench: {
                editor: {
                    sharedViewState: true
                }
            }
        }));
        const editorGroupService = new TestEditorGroupsService([testGroup0]);
        const rawMemento = Object.create(null);
        const memento = disposables.add(new EditorMemento('id', 'key', rawMemento, 3, editorGroupService, configurationService));
        const resource = URI.file('/some/folder/file-1.txt');
        memento.saveEditorState(testGroup0, resource, { line: 1 });
        let res = memento.loadEditorState(testGroup0, resource);
        assert.strictEqual(res.line, 1);
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.saveEditorState(testGroup0, resource, { line: 3 });
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 3);
        memento.saveEditorState(testGroup1, resource, { line: 1 });
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.clearEditorState(resource, testGroup0);
        memento.clearEditorState(resource, testGroup1);
        res = memento.loadEditorState(testGroup1, resource);
        assert.strictEqual(res.line, 1);
        memento.clearEditorState(resource);
        res = memento.loadEditorState(testGroup1, resource);
        assert.ok(!res);
    });
    test('WorkspaceTrustRequiredEditor', async function () {
        let TrustRequiredTestEditor = class TrustRequiredTestEditor extends EditorPane {
            constructor(group, telemetryService) {
                super('TestEditor', group, NullTelemetryService, NullThemeService, disposables.add(new TestStorageService()));
            }
            getId() { return 'trustRequiredTestEditor'; }
            layout() { }
            createEditor() { }
        };
        TrustRequiredTestEditor = __decorate([
            __param(1, ITelemetryService)
        ], TrustRequiredTestEditor);
        class TrustRequiredTestInput extends EditorInput {
            constructor() {
                super(...arguments);
                this.resource = undefined;
            }
            get typeId() {
                return 'trustRequiredTestInput';
            }
            get capabilities() {
                return 16 /* EditorInputCapabilities.RequiresTrust */;
            }
            resolve() {
                return null;
            }
        }
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const workspaceTrustService = disposables.add(instantiationService.createInstance(TestWorkspaceTrustManagementService));
        instantiationService.stub(IWorkspaceTrustManagementService, workspaceTrustService);
        workspaceTrustService.setWorkspaceTrust(false);
        const editorPart = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, editorPart);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const group = editorPart.activeGroup;
        const editorDescriptor = EditorPaneDescriptor.create(TrustRequiredTestEditor, 'id1', 'name');
        disposables.add(editorRegistry.registerEditorPane(editorDescriptor, [new SyncDescriptor(TrustRequiredTestInput)]));
        const testInput = disposables.add(new TrustRequiredTestInput());
        await group.openEditor(testInput);
        assert.strictEqual(group.activeEditorPane?.getId(), WorkspaceTrustRequiredPlaceholderEditor.ID);
        const getEditorPaneIdAsync = () => new Promise(resolve => {
            disposables.add(editorService.onDidActiveEditorChange(() => {
                resolve(group.activeEditorPane?.getId());
            }));
        });
        workspaceTrustService.setWorkspaceTrust(true);
        assert.strictEqual(await getEditorPaneIdAsync(), 'trustRequiredTestEditor');
        workspaceTrustService.setWorkspaceTrust(false);
        assert.strictEqual(await getEditorPaneIdAsync(), WorkspaceTrustRequiredPlaceholderEditor.ID);
        await group.closeAllEditors();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFuZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hILE9BQU8sRUFBNkMsZ0JBQWdCLEVBQTJELE1BQU0sOEJBQThCLENBQUM7QUFFcEssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLG9DQUFvQyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbE8sT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBc0IsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RixPQUFPLEVBQUUs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