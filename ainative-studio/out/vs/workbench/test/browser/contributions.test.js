/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isCI } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchContributionsRegistry } from '../../common/contributions.js';
import { EditorService } from '../../services/editor/browser/editorService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { TestFileEditorInput, TestServiceAccessor, TestSingletonFileEditorInput, createEditorPart, registerTestEditor, workbenchInstantiationService } from './workbenchTestServices.js';
suite('Contributions', () => {
    const disposables = new DisposableStore();
    let aCreated;
    let aCreatedPromise;
    let bCreated;
    let bCreatedPromise;
    const TEST_EDITOR_ID = 'MyTestEditorForContributions';
    const TEST_EDITOR_INPUT_ID = 'testEditorInputForContributions';
    async function createEditorService(instantiationService = workbenchInstantiationService(undefined, disposables)) {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return [part, editorService];
    }
    setup(() => {
        aCreated = false;
        aCreatedPromise = new DeferredPromise();
        bCreated = false;
        bCreatedPromise = new DeferredPromise();
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput), new SyncDescriptor(TestSingletonFileEditorInput)], TEST_EDITOR_INPUT_ID));
    });
    teardown(async () => {
        disposables.clear();
    });
    class TestContributionA {
        constructor() {
            aCreated = true;
            aCreatedPromise.complete();
        }
    }
    class TestContributionB {
        constructor() {
            bCreated = true;
            bCreatedPromise.complete();
        }
    }
    class TestContributionError {
        constructor() {
            throw new Error();
        }
    }
    test('getWorkbenchContribution() - with lazy contributions', () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('a', TestContributionA, { lazy: true });
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('b', TestContributionB, { lazy: true });
        registry.registerWorkbenchContribution2('c', TestContributionError, { lazy: true });
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        registry.start(instantiationService);
        const instanceA = registry.getWorkbenchContribution('a');
        assert.ok(instanceA instanceof TestContributionA);
        assert.ok(aCreated);
        assert.strictEqual(instanceA, registry.getWorkbenchContribution('a'));
        const instanceB = registry.getWorkbenchContribution('b');
        assert.ok(instanceB instanceof TestContributionB);
        assert.throws(() => registry.getWorkbenchContribution('c'));
    });
    test('getWorkbenchContribution() - with non-lazy contributions', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        registry.start(instantiationService);
        assert.throws(() => registry.getWorkbenchContribution('a'));
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        const instanceA = registry.getWorkbenchContribution('a');
        assert.ok(instanceA instanceof TestContributionA);
        assert.ok(aCreated);
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        await aCreatedPromise.p;
        assert.strictEqual(instanceA, registry.getWorkbenchContribution('a'));
    });
    test('lifecycle phase instantiation works when phase changes', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        registry.start(instantiationService);
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        assert.ok(!aCreated);
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    test('lifecycle phase instantiation works when phase was already met', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        registry.registerWorkbenchContribution2('a', TestContributionA, 2 /* WorkbenchPhase.BlockRestore */);
        registry.start(instantiationService);
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    (isCI ? test.skip /* runWhenIdle seems flaky in CI on Windows */ : test)('lifecycle phase instantiation works for late phases', async () => {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.usePhases = true;
        registry.start(instantiationService);
        registry.registerWorkbenchContribution2('a', TestContributionA, 3 /* WorkbenchPhase.AfterRestored */);
        registry.registerWorkbenchContribution2('b', TestContributionB, 4 /* WorkbenchPhase.Eventually */);
        assert.ok(!aCreated);
        assert.ok(!bCreated);
        accessor.lifecycleService.phase = 1 /* LifecyclePhase.Starting */;
        accessor.lifecycleService.phase = 2 /* LifecyclePhase.Ready */;
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        await aCreatedPromise.p;
        assert.ok(aCreated);
        accessor.lifecycleService.phase = 4 /* LifecyclePhase.Eventually */;
        await bCreatedPromise.p;
        assert.ok(bCreated);
    });
    test('contribution on editor - editor exists before start', async function () {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [, editorService] = await createEditorService(instantiationService);
        const input = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID));
        await editorService.openEditor(input, { pinned: true });
        registry.registerWorkbenchContribution2('a', TestContributionA, { editorTypeId: TEST_EDITOR_ID });
        registry.start(instantiationService.createChild(new ServiceCollection([IEditorService, editorService])));
        await aCreatedPromise.p;
        assert.ok(aCreated);
        registry.registerWorkbenchContribution2('b', TestContributionB, { editorTypeId: TEST_EDITOR_ID });
        const input2 = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics2'), TEST_EDITOR_INPUT_ID));
        await editorService.openEditor(input2, { pinned: true }, SIDE_GROUP);
        await bCreatedPromise.p;
        assert.ok(bCreated);
    });
    test('contribution on editor - editor does not exist before start', async function () {
        const registry = disposables.add(new WorkbenchContributionsRegistry());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const [, editorService] = await createEditorService(instantiationService);
        const input = disposables.add(new TestFileEditorInput(URI.parse('my://resource-basics'), TEST_EDITOR_INPUT_ID));
        registry.registerWorkbenchContribution2('a', TestContributionA, { editorTypeId: TEST_EDITOR_ID });
        registry.start(instantiationService.createChild(new ServiceCollection([IEditorService, editorService])));
        await editorService.openEditor(input, { pinned: true });
        await aCreatedPromise.p;
        assert.ok(aCreated);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvY29udHJpYnV0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRWhHLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUUzRixPQUFPLEVBQTZCLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLDRCQUE0QixFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFcE4sS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsTUFBTSxX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