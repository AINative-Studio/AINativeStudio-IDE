/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { EditorResolverService } from '../../browser/editorResolverService.js';
import { IEditorGroupsService } from '../../common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../common/editorResolverService.js';
import { createEditorPart, TestFileEditorInput, TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('EditorResolverService', () => {
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForEditorResolverService';
    const disposables = new DisposableStore();
    teardown(() => disposables.clear());
    ensureNoDisposablesAreLeakedInTestSuite();
    async function createEditorResolverService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorResolverService = instantiationService.createInstance(EditorResolverService);
        instantiationService.stub(IEditorResolverService, editorResolverService);
        disposables.add(editorResolverService);
        return [part, editorResolverService, instantiationService.createInstance(TestServiceAccessor)];
    }
    function constructDisposableFileEditorInput(uri, typeId, store) {
        const editor = new TestFileEditorInput(uri, typeId);
        store.add(editor);
        return editor;
    }
    test('Simple Resolve', async () => {
        const [part, service] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) }),
        });
        const resultingResolution = await service.resolveEditor({ resource: URI.file('my://resource-basics.test') }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        registeredEditor.dispose();
    });
    test('Untitled Resolve', async () => {
        const UNTITLED_TEST_EDITOR_INPUT_ID = 'UNTITLED_TEST_INPUT';
        const [part, service] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) }),
            createUntitledEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput((resource ? resource : URI.from({ scheme: Schemas.untitled })), UNTITLED_TEST_EDITOR_INPUT_ID) }),
        });
        // Untyped untitled - no resource
        let resultingResolution = await service.resolveEditor({ resource: undefined }, part.activeGroup);
        assert.ok(resultingResolution);
        // We don't expect untitled to match the *.test glob
        assert.strictEqual(typeof resultingResolution, 'number');
        // Untyped untitled - with untitled resource
        resultingResolution = await service.resolveEditor({ resource: URI.from({ scheme: Schemas.untitled, path: 'foo.test' }) }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, UNTITLED_TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        // Untyped untitled - file resource with forceUntitled
        resultingResolution = await service.resolveEditor({ resource: URI.file('/fake.test'), forceUntitled: true }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, UNTITLED_TEST_EDITOR_INPUT_ID);
            resultingResolution.editor.dispose();
        }
        registeredEditor.dispose();
    });
    test('Side by side Resolve', async () => {
        const [part, service] = await createEditorResolverService();
        const registeredEditorPrimary = service.registerEditor('*.test-primary', {
            id: 'TEST_EDITOR_PRIMARY',
            label: 'Test Editor Label Primary',
            detail: 'Test Editor Details Primary',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables) }),
        });
        const registeredEditorSecondary = service.registerEditor('*.test-secondary', {
            id: 'TEST_EDITOR_SECONDARY',
            label: 'Test Editor Label Secondary',
            detail: 'Test Editor Details Secondary',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables) }),
        });
        const resultingResolution = await service.resolveEditor({
            primary: { resource: URI.file('my://resource-basics.test-primary') },
            secondary: { resource: URI.file('my://resource-basics.test-secondary') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editorinputs.sidebysideEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditorPrimary.dispose();
        registeredEditorSecondary.dispose();
    });
    test('Diff editor Resolve', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        const registeredEditor = service.registerEditor('*.test-diff', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables) }),
            createDiffEditorInput: ({ modified, original, options }, group) => ({
                editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined)
            })
        });
        const resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditor.dispose();
    });
    test('Diff editor Resolve - Different Types', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        let diffOneCounter = 0;
        let diffTwoCounter = 0;
        let defaultDiffCounter = 0;
        const registeredEditor = service.registerEditor('*.test-diff', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: constructDisposableFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID, disposables) }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                diffOneCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined)
                };
            }
        });
        const secondRegisteredEditor = service.registerEditor('*.test-secondDiff', {
            id: 'TEST_EDITOR_2',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                diffTwoCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined)
                };
            }
        });
        const defaultRegisteredEditor = service.registerEditor('*', {
            id: 'default',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.option
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) }),
            createDiffEditorInput: ({ modified, original, options }, group) => {
                defaultDiffCounter++;
                return {
                    editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined)
                };
            }
        });
        let resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 0);
            assert.strictEqual(defaultDiffCounter, 0);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-secondDiff') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 0);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 1);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-diff') },
            modified: { resource: URI.file('my://resource-basics.test-secondDiff') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 1);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 2);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test-secondDiff') },
            modified: { resource: URI.file('my://resource-basics.test-diff') },
            options: { override: 'TEST_EDITOR' }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(diffOneCounter, 2);
            assert.strictEqual(diffTwoCounter, 1);
            assert.strictEqual(defaultDiffCounter, 2);
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        registeredEditor.dispose();
        secondRegisteredEditor.dispose();
        defaultRegisteredEditor.dispose();
    });
    test('Registry & Events', async () => {
        const [, service] = await createEditorResolverService();
        let eventCounter = 0;
        disposables.add(service.onDidChangeEditorRegistrations(() => {
            eventCounter++;
        }));
        const editors = service.getEditors();
        const registeredEditor = service.registerEditor('*.test', {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        }, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) })
        });
        assert.strictEqual(eventCounter, 1);
        assert.strictEqual(service.getEditors().length, editors.length + 1);
        assert.strictEqual(service.getEditors().some(editor => editor.id === 'TEST_EDITOR'), true);
        registeredEditor.dispose();
        assert.strictEqual(eventCounter, 2);
        assert.strictEqual(service.getEditors().length, editors.length);
        assert.strictEqual(service.getEditors().some(editor => editor.id === 'TEST_EDITOR'), false);
    });
    test('Multiple registrations to same glob and id #155859', async () => {
        const [part, service, accessor] = await createEditorResolverService();
        const testEditorInfo = {
            id: 'TEST_EDITOR',
            label: 'Test Editor Label',
            detail: 'Test Editor Details',
            priority: RegisteredEditorPriority.default
        };
        const registeredSingleEditor = service.registerEditor('*.test', testEditorInfo, {}, {
            createEditorInput: ({ resource, options }, group) => ({ editor: new TestFileEditorInput(URI.parse(resource.toString()), TEST_EDITOR_INPUT_ID) })
        });
        const registeredDiffEditor = service.registerEditor('*.test', testEditorInfo, {}, {
            createDiffEditorInput: ({ modified, original, options }, group) => ({
                editor: accessor.instantiationService.createInstance(DiffEditorInput, 'name', 'description', constructDisposableFileEditorInput(URI.parse(original.toString()), TEST_EDITOR_INPUT_ID, disposables), constructDisposableFileEditorInput(URI.parse(modified.toString()), TEST_EDITOR_INPUT_ID, disposables), undefined)
            })
        });
        // Resolve a diff
        let resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test') },
            modified: { resource: URI.file('my://resource-basics.test') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.notStrictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 1 /* ResolvedStatus.ABORT */ && resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.strictEqual(resultingResolution.editor.typeId, 'workbench.editors.diffEditorInput');
            resultingResolution.editor.dispose();
        }
        else {
            assert.fail();
        }
        // Remove diff registration
        registeredDiffEditor.dispose();
        // Resolve a diff again, expected failure
        resultingResolution = await service.resolveEditor({
            original: { resource: URI.file('my://resource-basics.test') },
            modified: { resource: URI.file('my://resource-basics.test') }
        }, part.activeGroup);
        assert.ok(resultingResolution);
        assert.strictEqual(typeof resultingResolution, 'number');
        if (resultingResolution !== 2 /* ResolvedStatus.NONE */) {
            assert.fail();
        }
        registeredSingleEditor.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQWtCLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekgsT0FBTyxFQUFFLGdCQUFnQixFQUE2QixtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXpMLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFFbkMsTUFBTSxvQkFBb0IsR0FBRyx5Q0FBeUMsQ0FBQztJQUN2RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRTFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENB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