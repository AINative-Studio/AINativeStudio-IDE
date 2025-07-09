/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { StandaloneConfigurationModelParser, Configuration } from '../../common/configurationModels.js';
import { ConfigurationModelParser, ConfigurationModel } from '../../../../../platform/configuration/common/configurationModels.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../../base/common/uri.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
suite('FolderSettingsModelParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            'id': 'FolderSettingsModelParser_1',
            'type': 'object',
            'properties': {
                'FolderSettingsModelParser.window': {
                    'type': 'string',
                    'default': 'isSet'
                },
                'FolderSettingsModelParser.resource': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'FolderSettingsModelParser.resourceLanguage': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
                },
                'FolderSettingsModelParser.application': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'FolderSettingsModelParser.machine': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
    });
    test('parse all folder settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({ 'FolderSettingsModelParser.window': 'window', 'FolderSettingsModelParser.resource': 'resource', 'FolderSettingsModelParser.application': 'application', 'FolderSettingsModelParser.machine': 'executable' }), { scopes: [5 /* ConfigurationScope.RESOURCE */, 4 /* ConfigurationScope.WINDOW */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['window'] = 'window';
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
    test('parse resource folder settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({ 'FolderSettingsModelParser.window': 'window', 'FolderSettingsModelParser.resource': 'resource', 'FolderSettingsModelParser.application': 'application', 'FolderSettingsModelParser.machine': 'executable' }), { scopes: [5 /* ConfigurationScope.RESOURCE */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
    test('parse resource and resource language settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({ '[json]': { 'FolderSettingsModelParser.window': 'window', 'FolderSettingsModelParser.resource': 'resource', 'FolderSettingsModelParser.resourceLanguage': 'resourceLanguage', 'FolderSettingsModelParser.application': 'application', 'FolderSettingsModelParser.machine': 'executable' } }), { scopes: [5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        expected['FolderSettingsModelParser']['resourceLanguage'] = 'resourceLanguage';
        assert.deepStrictEqual(testObject.configurationModel.overrides, [{ 'contents': expected, 'identifiers': ['json'], 'keys': ['FolderSettingsModelParser.resource', 'FolderSettingsModelParser.resourceLanguage'] }]);
    });
    test('reparse folder settings excludes application and machine setting', () => {
        const parseOptions = { scopes: [5 /* ConfigurationScope.RESOURCE */, 4 /* ConfigurationScope.WINDOW */] };
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({ 'FolderSettingsModelParser.resource': 'resource', 'FolderSettingsModelParser.anotherApplicationSetting': 'executable' }), parseOptions);
        let expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        expected['FolderSettingsModelParser']['anotherApplicationSetting'] = 'executable';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            'id': 'FolderSettingsModelParser_2',
            'type': 'object',
            'properties': {
                'FolderSettingsModelParser.anotherApplicationSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'FolderSettingsModelParser.anotherMachineSetting': {
                    'type': 'string',
                    'default': 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */
                }
            }
        });
        testObject.reparse(parseOptions);
        expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
});
suite('StandaloneConfigurationModelParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse tasks stand alone configuration model', () => {
        const testObject = new StandaloneConfigurationModelParser('tasks', 'tasks', new NullLogService());
        testObject.parse(JSON.stringify({ 'version': '1.1.1', 'tasks': [] }));
        const expected = Object.create(null);
        expected['tasks'] = Object.create(null);
        expected['tasks']['version'] = '1.1.1';
        expected['tasks']['tasks'] = [];
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
});
suite('Workspace Configuration', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const defaultConfigurationModel = toConfigurationModel({
        'editor.lineNumbers': 'on',
        'editor.fontSize': 12,
        'window.zoomLevel': 1,
        '[markdown]': {
            'editor.wordWrap': 'off'
        },
        'window.title': 'custom',
        'workbench.enableTabs': false,
        'editor.insertSpaces': true
    });
    test('Test compare same configurations', () => {
        const workspace = new Workspace('a', [new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }), new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('folder2') }), new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') })]);
        const configuration1 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration1.updateDefaultConfiguration(defaultConfigurationModel);
        configuration1.updateLocalUserConfiguration(toConfigurationModel({ 'window.title': 'native', '[typescript]': { 'editor.insertSpaces': false } }));
        configuration1.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration1.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration1.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const configuration2 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration2.updateDefaultConfiguration(defaultConfigurationModel);
        configuration2.updateLocalUserConfiguration(toConfigurationModel({ 'window.title': 'native', '[typescript]': { 'editor.insertSpaces': false } }));
        configuration2.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration2.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration2.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const actual = configuration2.compare(configuration1);
        assert.deepStrictEqual(actual, { keys: [], overrides: [] });
    });
    test('Test compare different configurations', () => {
        const workspace = new Workspace('a', [new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }), new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('folder2') }), new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') })]);
        const configuration1 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration1.updateDefaultConfiguration(defaultConfigurationModel);
        configuration1.updateLocalUserConfiguration(toConfigurationModel({ 'window.title': 'native', '[typescript]': { 'editor.insertSpaces': false } }));
        configuration1.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration1.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration1.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const configuration2 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration2.updateDefaultConfiguration(defaultConfigurationModel);
        configuration2.updateLocalUserConfiguration(toConfigurationModel({ 'workbench.enableTabs': true, '[typescript]': { 'editor.insertSpaces': true } }));
        configuration2.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.fontSize': 11 }));
        configuration2.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.insertSpaces': true }));
        configuration2.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({
            '[markdown]': {
                'editor.wordWrap': 'on',
                'editor.lineNumbers': 'relative'
            },
        }));
        const actual = configuration2.compare(configuration1);
        assert.deepStrictEqual(actual, { keys: ['editor.wordWrap', 'editor.fontSize', '[markdown]', 'window.title', 'workbench.enableTabs', '[typescript]'], overrides: [['markdown', ['editor.lineNumbers', 'editor.wordWrap']], ['typescript', ['editor.insertSpaces']]] });
    });
});
function toConfigurationModel(obj) {
    const parser = new ConfigurationModelParser('test', new NullLogService());
    parser.parse(JSON.stringify(obj));
    return parser.configurationModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL3Rlc3QvY29tbW9uL2NvbmZpZ3VyYXRpb25Nb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQTZCLE1BQU0scUVBQXFFLENBQUM7QUFDOUosT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQXNCLE1BQU0sdUVBQXVFLENBQUM7QUFDMUssT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBRXZDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENB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