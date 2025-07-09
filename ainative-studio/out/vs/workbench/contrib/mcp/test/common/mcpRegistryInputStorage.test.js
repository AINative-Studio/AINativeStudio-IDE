/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistryInputStorage } from '../../common/mcpRegistryInputStorage.js';
suite('Workbench - MCP - RegistryInputStorage', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testStorageService;
    let testSecretStorageService;
    let testLogService;
    let mcpInputStorage;
    setup(() => {
        testStorageService = store.add(new TestStorageService());
        testSecretStorageService = new TestSecretStorageService();
        testLogService = store.add(new NullLogService());
        // Create the input storage with APPLICATION scope
        mcpInputStorage = store.add(new McpRegistryInputStorage(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, testStorageService, testSecretStorageService, testLogService));
    });
    test('setPlainText stores values that can be retrieved with getMap', async () => {
        const values = {
            'key1': { value: 'value1' },
            'key2': { value: 'value2' }
        };
        await mcpInputStorage.setPlainText(values);
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1.value, 'value1');
        assert.strictEqual(result.key2.value, 'value2');
    });
    test('setSecrets stores encrypted values that can be retrieved with getMap', async () => {
        const secrets = {
            'secretKey1': { value: 'secretValue1' },
            'secretKey2': { value: 'secretValue2' }
        };
        await mcpInputStorage.setSecrets(secrets);
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.secretKey1.value, 'secretValue1');
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('getMap returns combined plain text and secret values', async () => {
        await mcpInputStorage.setPlainText({
            'plainKey': { value: 'plainValue' }
        });
        await mcpInputStorage.setSecrets({
            'secretKey': { value: 'secretValue' }
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.plainKey.value, 'plainValue');
        assert.strictEqual(result.secretKey.value, 'secretValue');
    });
    test('clear removes specific values', async () => {
        await mcpInputStorage.setPlainText({
            'key1': { value: 'value1' },
            'key2': { value: 'value2' }
        });
        await mcpInputStorage.setSecrets({
            'secretKey1': { value: 'secretValue1' },
            'secretKey2': { value: 'secretValue2' }
        });
        // Clear one plain and one secret value
        await mcpInputStorage.clear('key1');
        await mcpInputStorage.clear('secretKey1');
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1, undefined);
        assert.strictEqual(result.key2.value, 'value2');
        assert.strictEqual(result.secretKey1, undefined);
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('clearAll removes all values', async () => {
        await mcpInputStorage.setPlainText({
            'key1': { value: 'value1' }
        });
        await mcpInputStorage.setSecrets({
            'secretKey1': { value: 'secretValue1' }
        });
        mcpInputStorage.clearAll();
        const result = await mcpInputStorage.getMap();
        assert.deepStrictEqual(result, {});
    });
    test('updates to plain text values overwrite existing values', async () => {
        await mcpInputStorage.setPlainText({
            'key1': { value: 'value1' },
            'key2': { value: 'value2' }
        });
        await mcpInputStorage.setPlainText({
            'key1': { value: 'updatedValue1' }
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.key1.value, 'updatedValue1');
        assert.strictEqual(result.key2.value, 'value2');
    });
    test('updates to secret values overwrite existing values', async () => {
        await mcpInputStorage.setSecrets({
            'secretKey1': { value: 'secretValue1' },
            'secretKey2': { value: 'secretValue2' }
        });
        await mcpInputStorage.setSecrets({
            'secretKey1': { value: 'updatedSecretValue1' }
        });
        const result = await mcpInputStorage.getMap();
        assert.strictEqual(result.secretKey1.value, 'updatedSecretValue1');
        assert.strictEqual(result.secretKey2.value, 'secretValue2');
    });
    test('storage persists values across instances', async () => {
        // Set values on first instance
        await mcpInputStorage.setPlainText({
            'key1': { value: 'value1' }
        });
        await mcpInputStorage.setSecrets({
            'secretKey1': { value: 'secretValue1' }
        });
        await testStorageService.flush();
        // Create a second instance that should have access to the same storage
        const secondInstance = store.add(new McpRegistryInputStorage(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, testStorageService, testSecretStorageService, testLogService));
        const result = await secondInstance.getMap();
        assert.strictEqual(result.key1.value, 'value1');
        assert.strictEqual(result.secretKey1.value, 'secretValue1');
        assert.ok(!testStorageService.get('mcpInputs', -1 /* StorageScope.APPLICATION */)?.includes('secretValue1'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFFbkgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEYsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtJQUNwRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksa0JBQXNDLENBQUM7SUFDM0MsSUFBSSx3QkFBa0QsQ0FBQztJQUN2RCxJQUFJLGNBQTJCLENBQUM7SUFDaEMsSUFBSSxlQUF3QyxDQUFDO0lBRTdDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixrQkFBa0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELHdCQUF3QixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUMxRCxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFakQsa0RBQWtEO1FBQ2xELGVBQWUsR0FBRyxL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