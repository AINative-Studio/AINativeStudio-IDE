/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { DefaultConfiguration, PolicyConfiguration } from '../../common/configurations.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import { Extensions } from '../../common/configurationRegistry.js';
import { Registry } from '../../../registry/common/platform.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { deepClone } from '../../../../base/common/objects.js';
import { FilePolicyService } from '../../../policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('PolicyConfiguration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let testObject;
    let fileService;
    let policyService;
    const policyFile = URI.file('policyFile').with({ scheme: 'vscode-tests' });
    const policyConfigurationNode = {
        'id': 'policyConfiguration',
        'order': 1,
        'title': 'a',
        'type': 'object',
        'properties': {
            'policy.settingA': {
                'type': 'string',
                'default': 'defaultValueA',
                policy: {
                    name: 'PolicySettingA',
                    minimumVersion: '1.0.0',
                }
            },
            'policy.settingB': {
                'type': 'string',
                'default': 'defaultValueB',
                policy: {
                    name: 'PolicySettingB',
                    minimumVersion: '1.0.0',
                }
            },
            'policy.objectSetting': {
                'type': 'object',
                'default': {},
                policy: {
                    name: 'PolicyObjectSetting',
                    minimumVersion: '1.0.0',
                }
            },
            'policy.arraySetting': {
                'type': 'object',
                'default': [],
                policy: {
                    name: 'PolicyArraySetting',
                    minimumVersion: '1.0.0',
                }
            },
            'policy.internalSetting': {
                'type': 'string',
                'default': 'defaultInternalValue',
                included: false,
                policy: {
                    name: 'PolicyInternalSetting',
                    minimumVersion: '1.0.0',
                }
            },
            'nonPolicy.setting': {
                'type': 'boolean',
                'default': true
            }
        }
    };
    suiteSetup(() => Registry.as(Extensions.Configuration).registerConfiguration(policyConfigurationNode));
    suiteTeardown(() => Registry.as(Extensions.Configuration).deregisterConfigurations([policyConfigurationNode]));
    setup(async () => {
        const defaultConfiguration = disposables.add(new DefaultConfiguration(new NullLogService()));
        await defaultConfiguration.initialize();
        fileService = disposables.add(new FileService(new NullLogService()));
        const diskFileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(policyFile.scheme, diskFileSystemProvider));
        policyService = disposables.add(new FilePolicyService(policyFile, fileService, new NullLogService()));
        testObject = disposables.add(new PolicyConfiguration(defaultConfiguration, policyService, new NullLogService()));
    });
    test('initialize: with policies', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: no policies', async () => {
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
    });
    test('initialize: with policies but not registered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA', 'PolicySettingB': 'policyValueB', 'PolicySettingC': 'policyValueC' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), 'policyValueB');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA', 'policy.settingB']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: with object type policy', async () => {
        const expected = {
            'microsoft': true,
            'github': 'stable',
            'other': 1,
            'complex': {
                'key': 'value'
            },
            'array': [1, 2, 3]
        };
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicyObjectSetting': JSON.stringify(expected) })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), expected);
    });
    test('initialize: with array type policy', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicyArraySetting': JSON.stringify([1]) })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.arraySetting'), [1]);
    });
    test('initialize: with object type policy ignores policy if value is not valid', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicyObjectSetting': '{"a": "b", "hello": }' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), undefined);
    });
    test('initialize: with object type policy ignores policy if there are duplicate keys', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicyObjectSetting': '{"microsoft": true, "microsoft": false }' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.deepStrictEqual(acutal.getValue('policy.objectSetting'), undefined);
    });
    test('change: when policy is added', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA', 'PolicySettingB': 'policyValueB', 'PolicySettingC': 'policyValueC' })));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueA');
        assert.strictEqual(acutal.getValue('policy.settingB'), 'policyValueB');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA', 'policy.settingB']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy is updated', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueAChanged' })));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), 'policyValueAChanged');
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingA']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy is removed', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await testObject.initialize();
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({})));
            await promise;
        });
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy setting is registered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingC': 'policyValueC' })));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        policyConfigurationNode.properties['policy.settingC'] = {
            'type': 'string',
            'default': 'defaultValueC',
            policy: {
                name: 'PolicySettingC',
                minimumVersion: '1.0.0',
            }
        };
        Registry.as(Extensions.Configuration).registerConfiguration(deepClone(policyConfigurationNode));
        await promise;
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingC'), 'policyValueC');
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.settingC']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('change: when policy setting is deregistered', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        Registry.as(Extensions.Configuration).deregisterConfigurations([policyConfigurationNode]);
        await promise;
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, []);
        assert.deepStrictEqual(acutal.overrides, []);
    });
    test('initialize: with internal policies', async () => {
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicyInternalSetting': 'internalValue' })));
        await testObject.initialize();
        const acutal = testObject.configurationModel;
        assert.strictEqual(acutal.getValue('policy.settingA'), undefined);
        assert.strictEqual(acutal.getValue('policy.settingB'), undefined);
        assert.strictEqual(acutal.getValue('policy.internalSetting'), 'internalValue');
        assert.strictEqual(acutal.getValue('nonPolicy.setting'), undefined);
        assert.deepStrictEqual(acutal.keys, ['policy.internalSetting']);
        assert.deepStrictEqual(acutal.overrides, []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5Q29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vcG9saWN5Q29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBOEMsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lB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