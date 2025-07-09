/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { TestExtensionService, TestHistoryService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { EnvironmentVariableService } from '../../common/environmentVariableService.js';
import { EnvironmentVariableMutatorType } from '../../../../../platform/terminal/common/environmentVariable.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class TestEnvironmentVariableService extends EnvironmentVariableService {
    persistCollections() { this._persistCollections(); }
    notifyCollectionUpdates() { this._notifyCollectionUpdates(); }
}
suite('EnvironmentVariable - EnvironmentVariableService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let environmentVariableService;
    let changeExtensionsEvent;
    setup(() => {
        changeExtensionsEvent = store.add(new Emitter());
        instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(IExtensionService, TestExtensionService);
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(IHistoryService, new TestHistoryService());
        instantiationService.stub(IExtensionService, TestExtensionService);
        instantiationService.stub(IExtensionService, 'onDidChangeExtensions', changeExtensionsEvent.event);
        instantiationService.stub(IExtensionService, 'extensions', [
            { identifier: { value: 'ext1' } },
            { identifier: { value: 'ext2' } },
            { identifier: { value: 'ext3' } }
        ]);
        environmentVariableService = store.add(instantiationService.createInstance(TestEnvironmentVariableService));
    });
    test('should persist collections to the storage service and be able to restore from them', () => {
        const collection = new Map();
        collection.set('A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
        collection.set('B-key', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' });
        collection.set('C-key', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C', options: { applyAtProcessCreation: true, applyAtShellIntegration: true } });
        environmentVariableService.set('ext1', { map: collection, persistent: true });
        deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
            ['A', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Replace, value: 'a', variable: 'A', options: undefined }]],
            ['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Append, value: 'b', variable: 'B', options: undefined }]],
            ['C', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Prepend, value: 'c', variable: 'C', options: { applyAtProcessCreation: true, applyAtShellIntegration: true } }]]
        ]);
        // Persist with old service, create a new service with the same storage service to verify restore
        environmentVariableService.persistCollections();
        const service2 = store.add(instantiationService.createInstance(TestEnvironmentVariableService));
        deepStrictEqual([...service2.mergedCollection.getVariableMap(undefined).entries()], [
            ['A', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Replace, value: 'a', variable: 'A', options: undefined }]],
            ['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Append, value: 'b', variable: 'B', options: undefined }]],
            ['C', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Prepend, value: 'c', variable: 'C', options: { applyAtProcessCreation: true, applyAtShellIntegration: true } }]]
        ]);
    });
    suite('mergedCollection', () => {
        test('should overwrite any other variable with the first extension that replaces', () => {
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Append, variable: 'A' });
            collection1.set('B-key', { value: 'b1', type: EnvironmentVariableMutatorType.Replace, variable: 'B' });
            collection2.set('A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
            collection2.set('B-key', { value: 'b2', type: EnvironmentVariableMutatorType.Append, variable: 'B' });
            collection3.set('A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' });
            collection3.set('B-key', { value: 'b3', type: EnvironmentVariableMutatorType.Replace, variable: 'B' });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Replace, value: 'a2', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Append, value: 'a1', variable: 'A', options: undefined }
                    ]],
                ['B', [{ extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Replace, value: 'b1', variable: 'B', options: undefined }]]
            ]);
        });
        test('should correctly apply the environment values from multiple extension contributions in the correct order', async () => {
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', { value: ':a1', type: EnvironmentVariableMutatorType.Append, variable: 'A' });
            collection2.set('A-key', { value: 'a2:', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' });
            collection3.set('A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Replace, variable: 'A' });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            // The entries should be ordered in the order they are applied
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(undefined).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext3', type: EnvironmentVariableMutatorType.Replace, value: 'a3', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Prepend, value: 'a2:', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Append, value: ':a1', variable: 'A', options: undefined }
                    ]]
            ]);
            // Verify the entries get applied to the environment as expected
            const env = { A: 'foo' };
            await environmentVariableService.mergedCollection.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, { A: 'a2:a3:a1' });
        });
        test('should correctly apply the workspace specific environment values from multiple extension contributions in the correct order', async () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const collection1 = new Map();
            const collection2 = new Map();
            const collection3 = new Map();
            collection1.set('A-key', { value: ':a1', type: EnvironmentVariableMutatorType.Append, scope: scope1, variable: 'A' });
            collection2.set('A-key', { value: 'a2:', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' });
            collection3.set('A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Replace, scope: scope2, variable: 'A' });
            environmentVariableService.set('ext1', { map: collection1, persistent: true });
            environmentVariableService.set('ext2', { map: collection2, persistent: true });
            environmentVariableService.set('ext3', { map: collection3, persistent: true });
            // The entries should be ordered in the order they are applied
            deepStrictEqual([...environmentVariableService.mergedCollection.getVariableMap(scope1).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Prepend, value: 'a2:', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Append, value: ':a1', scope: scope1, variable: 'A', options: undefined }
                    ]]
            ]);
            // Verify the entries get applied to the environment as expected
            const env = { A: 'foo' };
            await environmentVariableService.mergedCollection.applyToProcessEnvironment(env, scope1);
            deepStrictEqual(env, { A: 'a2:foo:a1' });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEksT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEYsT0FBTyxFQUFFLDhCQUE4QixFQUErQixNQUFNLGdFQUFnRSxDQUFDO0FBQzdJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxNQUFNLDhCQUErQixTQUFRLDBCQUEwQjtJQUN0RSxrQkFBa0IsS0FBVyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUQsdUJBQXVCLEtBQVcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENB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