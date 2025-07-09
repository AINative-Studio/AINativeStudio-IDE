/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { equals } from '../../../../base/common/objects.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Extensions } from '../../common/configurationRegistry.js';
import { DefaultConfiguration } from '../../common/configurations.js';
import { NullLogService } from '../../../log/common/log.js';
import { Registry } from '../../../registry/common/platform.js';
suite('DefaultConfiguration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationRegistry = Registry.as(Extensions.Configuration);
    setup(() => reset());
    teardown(() => reset());
    function reset() {
        configurationRegistry.deregisterConfigurations(configurationRegistry.getConfigurations());
        configurationRegistry.deregisterDefaultConfigurations(configurationRegistry.getRegisteredDefaultConfigurations());
    }
    test('Test registering a property before initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        const actual = await testObject.initialize();
        assert.strictEqual(actual.getValue('a'), false);
    });
    test('Test registering a property and do not initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        assert.strictEqual(testObject.configurationModel.getValue('a'), undefined);
    });
    test('Test registering a property after initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'defaultConfiguration.testSetting1': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        const { defaults: actual, properties } = await promise;
        assert.strictEqual(actual.getValue('defaultConfiguration.testSetting1'), false);
        assert.deepStrictEqual(properties, ['defaultConfiguration.testSetting1']);
    });
    test('Test registering nested properties', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a.b': {
                    'description': '1',
                    'type': 'object',
                    'default': {},
                },
                'a.b.c': {
                    'description': '2',
                    'type': 'object',
                    'default': '2',
                }
            }
        });
        const actual = await testObject.initialize();
        assert.ok(equals(actual.getValue('a'), { b: { c: '2' } }));
        assert.ok(equals(actual.contents, { 'a': { b: { c: '2' } } }));
        assert.deepStrictEqual(actual.keys.sort(), ['a.b', 'a.b.c']);
    });
    test('Test registering the same property again', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': true,
                }
            }
        });
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        const actual = await testObject.initialize();
        assert.strictEqual(true, actual.getValue('a'));
    });
    test('Test registering an override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[a]': {
                        'b': true
                    }
                }
            }]);
        const actual = await testObject.initialize();
        assert.ok(equals(actual.getValue('[a]'), { 'b': true }));
        assert.ok(equals(actual.contents, { '[a]': { 'b': true } }));
        assert.ok(equals(actual.overrides, [{ contents: { 'b': true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test registering a normal property and override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[a]': {
                        'b': true
                    }
                }
            }]);
        const actual = await testObject.initialize();
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { 'b': true }));
        assert.ok(equals(actual.contents, { 'b': false, '[a]': { 'b': true } }));
        assert.ok(equals(actual.overrides, [{ contents: { 'b': true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test normal property is registered after override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[a]': {
                        'b': true
                    }
                }
            }]);
        await testObject.initialize();
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        const { defaults: actual, properties } = await promise;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { 'b': true }));
        assert.ok(equals(actual.contents, { 'b': false, '[a]': { 'b': true } }));
        assert.ok(equals(actual.overrides, [{ contents: { 'b': true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
        assert.deepStrictEqual(properties, ['b']);
    });
    test('Test override identifier is registered after property', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        await testObject.initialize();
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[a]': {
                        'b': true
                    }
                }
            }]);
        const { defaults: actual, properties } = await promise;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { 'b': true }));
        assert.ok(equals(actual.contents, { 'b': false, '[a]': { 'b': true } }));
        assert.ok(equals(actual.overrides, [{ contents: { 'b': true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
        assert.deepStrictEqual(properties, ['[a]']);
    });
    test('Test register override identifier and property after initialize', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        await testObject.initialize();
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        configurationRegistry.registerDefaultConfigurations([{
                overrides: {
                    '[a]': {
                        'b': true
                    }
                }
            }]);
        const actual = testObject.configurationModel;
        assert.deepStrictEqual(actual.getValue('b'), false);
        assert.ok(equals(actual.getValue('[a]'), { 'b': true }));
        assert.ok(equals(actual.contents, { 'b': false, '[a]': { 'b': true } }));
        assert.ok(equals(actual.overrides, [{ contents: { 'b': true }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(actual.keys.sort(), ['[a]', 'b']);
        assert.strictEqual(actual.getOverrideValue('b', 'a'), true);
    });
    test('Test deregistering a property', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        const node = {
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'a': {
                    'description': 'a',
                    'type': 'boolean',
                    'default': false,
                }
            }
        };
        configurationRegistry.registerConfiguration(node);
        await testObject.initialize();
        configurationRegistry.deregisterConfigurations([node]);
        const { defaults: actual, properties } = await promise;
        assert.strictEqual(actual.getValue('a'), undefined);
        assert.ok(equals(actual.contents, {}));
        assert.deepStrictEqual(actual.keys, []);
        assert.deepStrictEqual(properties, ['a']);
    });
    test('Test deregistering an override identifier', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'a',
            'order': 1,
            'title': 'a',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'boolean',
                    'default': false,
                }
            }
        });
        const node = {
            overrides: {
                '[a]': {
                    'b': true
                }
            }
        };
        configurationRegistry.registerDefaultConfigurations([node]);
        await testObject.initialize();
        configurationRegistry.deregisterDefaultConfigurations([node]);
        assert.deepStrictEqual(testObject.configurationModel.getValue('[a]'), undefined);
        assert.ok(equals(testObject.configurationModel.contents, { 'b': false }));
        assert.ok(equals(testObject.configurationModel.overrides, []));
        assert.deepStrictEqual(testObject.configurationModel.keys, ['b']);
        assert.strictEqual(testObject.configurationModel.getOverrideValue('b', 'a'), undefined);
    });
    test('Test deregistering a merged language object setting', async () => {
        const testObject = disposables.add(new DefaultConfiguration(new NullLogService()));
        configurationRegistry.registerConfiguration({
            'id': 'b',
            'order': 1,
            'title': 'b',
            'type': 'object',
            'properties': {
                'b': {
                    'description': 'b',
                    'type': 'object',
                    'default': {},
                }
            }
        });
        const node1 = {
            overrides: {
                '[a]': {
                    'b': {
                        'aa': '1',
                        'bb': '2'
                    }
                }
            },
            source: { id: 'source1', displayName: 'source1' }
        };
        const node2 = {
            overrides: {
                '[a]': {
                    'b': {
                        'bb': '20',
                        'cc': '30'
                    }
                }
            },
            source: { id: 'source2', displayName: 'source2' }
        };
        configurationRegistry.registerDefaultConfigurations([node1]);
        configurationRegistry.registerDefaultConfigurations([node2]);
        await testObject.initialize();
        configurationRegistry.deregisterDefaultConfigurations([node1]);
        assert.ok(equals(testObject.configurationModel.getValue('[a]'), { 'b': { 'bb': '20', 'cc': '30' } }));
        assert.ok(equals(testObject.configurationModel.contents, { '[a]': { 'b': { 'bb': '20', 'cc': '30' } }, 'b': {} }));
        assert.ok(equals(testObject.configurationModel.overrides, [{ contents: { 'b': { 'bb': '20', 'cc': '30' } }, identifiers: ['a'], keys: ['b'] }]));
        assert.deepStrictEqual(testObject.configurationModel.keys.sort(), ['[a]', 'b']);
        assert.ok(equals(testObject.configurationModel.getOverrideValue('b', 'a'), { 'bb': '20', 'cc': '30' }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL3Rlc3QvY29tbW9uL2NvbmZpZ3VyYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBOEMsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUM5RCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUU1RixLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNyQixRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUV4QixTQUFTLEtBQUs7UUFDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7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