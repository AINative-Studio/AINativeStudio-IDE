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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlJbnB1dFN0b3JhZ2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFJlZ2lzdHJ5SW5wdXRTdG9yYWdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRW5ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxGLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7SUFDcEQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLGtCQUFzQyxDQUFDO0lBQzNDLElBQUksd0JBQWtELENBQUM7SUFDdkQsSUFBSSxjQUEyQixDQUFDO0lBQ2hDLElBQUksZUFBd0MsQ0FBQztJQUU3QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQWtCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUN6RCx3QkFBd0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDMUQsY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWpELGtEQUFrRDtRQUNsRCxlQUFlLEdB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