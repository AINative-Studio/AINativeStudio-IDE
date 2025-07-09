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
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions } from '../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { TestServiceAccessor, workbenchInstantiationService, createEditorPart } from './workbenchTestServices.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { timeout } from '../../../base/common/async.js';
import { PickerQuickAccessProvider } from '../../../platform/quickinput/browser/pickerQuickAccess.js';
import { URI } from '../../../base/common/uri.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { EditorService } from '../../services/editor/browser/editorService.js';
import { PickerEditorState } from '../../browser/quickaccess.js';
import { Range } from '../../../editor/common/core/range.js';
suite('QuickAccess', () => {
    let disposables;
    let instantiationService;
    let accessor;
    let providerDefaultCalled = false;
    let providerDefaultCanceled = false;
    let providerDefaultDisposed = false;
    let provider1Called = false;
    let provider1Canceled = false;
    let provider1Disposed = false;
    let provider2Called = false;
    let provider2Canceled = false;
    let provider2Disposed = false;
    let provider3Called = false;
    let provider3Canceled = false;
    let provider3Disposed = false;
    let TestProviderDefault = class TestProviderDefault {
        constructor(quickInputService, disposables) {
            this.quickInputService = quickInputService;
        }
        provide(picker, token) {
            assert.ok(picker);
            providerDefaultCalled = true;
            token.onCancellationRequested(() => providerDefaultCanceled = true);
            // bring up provider #3
            setTimeout(() => this.quickInputService.quickAccess.show(providerDescriptor3.prefix));
            return toDisposable(() => providerDefaultDisposed = true);
        }
    };
    TestProviderDefault = __decorate([
        __param(0, IQuickInputService)
    ], TestProviderDefault);
    class TestProvider1 {
        provide(picker, token) {
            assert.ok(picker);
            provider1Called = true;
            token.onCancellationRequested(() => provider1Canceled = true);
            return toDisposable(() => provider1Disposed = true);
        }
    }
    class TestProvider2 {
        provide(picker, token) {
            assert.ok(picker);
            provider2Called = true;
            token.onCancellationRequested(() => provider2Canceled = true);
            return toDisposable(() => provider2Disposed = true);
        }
    }
    class TestProvider3 {
        provide(picker, token) {
            assert.ok(picker);
            provider3Called = true;
            token.onCancellationRequested(() => provider3Canceled = true);
            // hide without picking
            setTimeout(() => picker.hide());
            return toDisposable(() => provider3Disposed = true);
        }
    }
    const providerDescriptorDefault = { ctor: TestProviderDefault, prefix: '', helpEntries: [] };
    const providerDescriptor1 = { ctor: TestProvider1, prefix: 'test', helpEntries: [] };
    const providerDescriptor2 = { ctor: TestProvider2, prefix: 'test something', helpEntries: [] };
    const providerDescriptor3 = { ctor: TestProvider3, prefix: 'changed', helpEntries: [] };
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.dispose();
    });
    test('registry', () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        assert.ok(!registry.getQuickAccessProvider('test'));
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        assert(registry.getQuickAccessProvider('') === providerDescriptorDefault);
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        const disposable = disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        assert(registry.getQuickAccessProvider('test') === providerDescriptor1);
        const providers = registry.getQuickAccessProviders();
        assert(providers.some(provider => provider.prefix === 'test'));
        disposable.dispose();
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        disposables.dispose();
        assert.ok(!registry.getQuickAccessProvider('test'));
        restore();
    });
    test('provider', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor2));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor3));
        accessor.quickInputService.quickAccess.show('test');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, true);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider1Called = false;
        accessor.quickInputService.quickAccess.show('test something');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, true);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, true);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, true);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider2Called = false;
        provider1Canceled = false;
        provider1Disposed = false;
        accessor.quickInputService.quickAccess.show('usedefault');
        assert.strictEqual(providerDefaultCalled, true);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, true);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, true);
        assert.strictEqual(provider3Disposed, false);
        await timeout(1);
        assert.strictEqual(providerDefaultCanceled, true);
        assert.strictEqual(providerDefaultDisposed, true);
        assert.strictEqual(provider3Called, true);
        await timeout(1);
        assert.strictEqual(provider3Canceled, true);
        assert.strictEqual(provider3Disposed, true);
        disposables.dispose();
        restore();
    });
    let fastProviderCalled = false;
    let slowProviderCalled = false;
    let fastAndSlowProviderCalled = false;
    let slowProviderCanceled = false;
    let fastAndSlowProviderCanceled = false;
    class FastTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('fast');
        }
        _getPicks(filter, disposables, token) {
            fastProviderCalled = true;
            return [{ label: 'Fast Pick' }];
        }
    }
    class SlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('slow');
        }
        async _getPicks(filter, disposables, token) {
            slowProviderCalled = true;
            await timeout(1);
            if (token.isCancellationRequested) {
                slowProviderCanceled = true;
            }
            return [{ label: 'Slow Pick' }];
        }
    }
    class FastAndSlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('bothFastAndSlow');
        }
        _getPicks(filter, disposables, token) {
            fastAndSlowProviderCalled = true;
            return {
                picks: [{ label: 'Fast Pick' }],
                additionalPicks: (async () => {
                    await timeout(1);
                    if (token.isCancellationRequested) {
                        fastAndSlowProviderCanceled = true;
                    }
                    return [{ label: 'Slow Pick' }];
                })()
            };
        }
    }
    const fastProviderDescriptor = { ctor: FastTestQuickPickProvider, prefix: 'fast', helpEntries: [] };
    const slowProviderDescriptor = { ctor: SlowTestQuickPickProvider, prefix: 'slow', helpEntries: [] };
    const fastAndSlowProviderDescriptor = { ctor: FastAndSlowTestQuickPickProvider, prefix: 'bothFastAndSlow', helpEntries: [] };
    test('quick pick access - show()', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(slowProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(fastAndSlowProviderDescriptor));
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        fastProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(slowProviderCanceled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        slowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, false);
        fastAndSlowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        await timeout(2);
        assert.strictEqual(slowProviderCanceled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, true);
        disposables.dispose();
        restore();
    });
    test('quick pick access - pick()', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        const result = accessor.quickInputService.quickAccess.pick('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.ok(result instanceof Promise);
        disposables.dispose();
        restore();
    });
    test('PickerEditorState can properly restore editors', async () => {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const editorViewState = disposables.add(instantiationService.createInstance(PickerEditorState));
        disposables.add(part);
        disposables.add(editorService);
        const input1 = {
            resource: URI.parse('foo://bar1'),
            options: {
                pinned: true, preserveFocus: true, selection: new Range(1, 0, 1, 3)
            }
        };
        const input2 = {
            resource: URI.parse('foo://bar2'),
            options: {
                pinned: true, selection: new Range(1, 0, 1, 3)
            }
        };
        const input3 = {
            resource: URI.parse('foo://bar3')
        };
        const input4 = {
            resource: URI.parse('foo://bar4')
        };
        const editor = await editorService.openEditor(input1);
        assert.strictEqual(editor, editorService.activeEditorPane);
        editorViewState.set();
        await editorService.openEditor(input2);
        await editorViewState.openTransientEditor(input3);
        await editorViewState.openTransientEditor(input4);
        await editorViewState.restore();
        assert.strictEqual(part.activeGroup.activeEditor?.resource, input1.resource);
        assert.deepStrictEqual(part.activeGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).map(e => e.resource), [input1.resource, input2.resource]);
        if (part.activeGroup.activeEditorPane?.getSelection) {
            assert.deepStrictEqual(part.activeGroup.activeEditorPane?.getSelection(), input1.options.selection);
        }
        await part.activeGroup.closeAllEditors();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3F1aWNrQWNjZXNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQXdCLFVBQVUsRUFBNkMsTUFBTSxvREFBb0QsQ0FBQztBQUNqSixPQUFPLEVBQThCLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDZCQUE2QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLHlCQUF5QixFQUFvQixNQUFNLDJEQUEyRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUc3RCxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFB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