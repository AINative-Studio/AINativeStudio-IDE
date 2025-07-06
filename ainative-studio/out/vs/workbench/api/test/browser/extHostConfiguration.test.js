/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostWorkspace } from '../../common/extHostWorkspace.js';
import { ExtHostConfigProvider } from '../../common/extHostConfiguration.js';
import { ConfigurationModel, ConfigurationModelParser } from '../../../../platform/configuration/common/configurationModels.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { WorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { isLinux } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostConfiguration', function () {
    class RecordingShape extends mock() {
        $updateConfigurationOption(target, key, value) {
            this.lastArgs = [target, key, value];
            return Promise.resolve(undefined);
        }
    }
    function createExtHostWorkspace() {
        return new ExtHostWorkspace(new TestRPCProtocol(), new class extends mock() {
        }, new class extends mock() {
            getCapabilities() { return isLinux ? 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ : undefined; }
        }, new NullLogService(), new class extends mock() {
        });
    }
    function createExtHostConfiguration(contents = Object.create(null), shape) {
        if (!shape) {
            shape = new class extends mock() {
            };
        }
        return new ExtHostConfigProvider(shape, createExtHostWorkspace(), createConfigurationData(contents), new NullLogService());
    }
    function createConfigurationData(contents) {
        return {
            defaults: new ConfigurationModel(contents, [], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel(contents, [], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: ConfigurationModel.createEmptyModel(new NullLogService()),
            folders: [],
            configurationScopes: []
        };
    }
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('getConfiguration fails regression test 1.7.1 -> 1.8 #15552', function () {
        const extHostConfig = createExtHostConfiguration({
            'search': {
                'exclude': {
                    '**/node_modules': true
                }
            }
        });
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude')['**/node_modules'], true);
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude').get('**/node_modules'), true);
        assert.strictEqual(extHostConfig.getConfiguration('search').get('exclude')['**/node_modules'], true);
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude').has('**/node_modules'), true);
        assert.strictEqual(extHostConfig.getConfiguration('search').has('exclude.**/node_modules'), true);
    });
    test('has/get', () => {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'nested': {
                    'config1': 42,
                    'config2': 'Das Pferd frisst kein Reis.'
                },
                'config4': ''
            }
        });
        const config = all.getConfiguration('farboo');
        assert.ok(config.has('config0'));
        assert.strictEqual(config.get('config0'), true);
        assert.strictEqual(config.get('config4'), '');
        assert.strictEqual(config['config0'], true);
        assert.strictEqual(config['config4'], '');
        assert.ok(config.has('nested.config1'));
        assert.strictEqual(config.get('nested.config1'), 42);
        assert.ok(config.has('nested.config2'));
        assert.strictEqual(config.get('nested.config2'), 'Das Pferd frisst kein Reis.');
        assert.ok(config.has('nested'));
        assert.deepStrictEqual(config.get('nested'), { config1: 42, config2: 'Das Pferd frisst kein Reis.' });
    });
    test('get nested config', () => {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'nested': {
                    'config1': 42,
                    'config2': 'Das Pferd frisst kein Reis.'
                },
                'config4': ''
            }
        });
        assert.deepStrictEqual(all.getConfiguration('farboo.nested').get('config1'), 42);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested').get('config2'), 'Das Pferd frisst kein Reis.');
        assert.deepStrictEqual(all.getConfiguration('farboo.nested')['config1'], 42);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested')['config2'], 'Das Pferd frisst kein Reis.');
        assert.deepStrictEqual(all.getConfiguration('farboo.nested1').get('config1'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested1').get('config2'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.config0.config1').get('a'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.config0.config1')['a'], undefined);
    });
    test('can modify the returned configuration', function () {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'nested': {
                    'config1': 42,
                    'config2': 'Das Pferd frisst kein Reis.'
                },
                'config4': ''
            },
            'workbench': {
                'colorCustomizations': {
                    'statusBar.foreground': 'somevalue'
                }
            }
        });
        let testObject = all.getConfiguration();
        let actual = testObject.get('farboo');
        actual['nested']['config1'] = 41;
        assert.strictEqual(41, actual['nested']['config1']);
        actual['farboo1'] = 'newValue';
        assert.strictEqual('newValue', actual['farboo1']);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['nested']['config1'], 42);
        assert.strictEqual(actual['farboo1'], undefined);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['config0'], true);
        actual['config0'] = false;
        assert.strictEqual(actual['config0'], false);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['config0'], true);
        testObject = all.getConfiguration();
        actual = testObject.inspect('farboo');
        actual['value'] = 'effectiveValue';
        assert.strictEqual('effectiveValue', actual['value']);
        testObject = all.getConfiguration('workbench');
        actual = testObject.get('colorCustomizations');
        actual['statusBar.foreground'] = undefined;
        assert.strictEqual(actual['statusBar.foreground'], undefined);
        testObject = all.getConfiguration('workbench');
        actual = testObject.get('colorCustomizations');
        assert.strictEqual(actual['statusBar.foreground'], 'somevalue');
    });
    test('Stringify returned configuration', function () {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'nested': {
                    'config1': 42,
                    'config2': 'Das Pferd frisst kein Reis.'
                },
                'config4': ''
            },
            'workbench': {
                'colorCustomizations': {
                    'statusBar.foreground': 'somevalue'
                },
                'emptyobjectkey': {}
            }
        });
        const testObject = all.getConfiguration();
        let actual = testObject.get('farboo');
        assert.deepStrictEqual(JSON.stringify({
            'config0': true,
            'nested': {
                'config1': 42,
                'config2': 'Das Pferd frisst kein Reis.'
            },
            'config4': ''
        }), JSON.stringify(actual));
        assert.deepStrictEqual(undefined, JSON.stringify(testObject.get('unknownkey')));
        actual = testObject.get('farboo');
        actual['config0'] = false;
        assert.deepStrictEqual(JSON.stringify({
            'config0': false,
            'nested': {
                'config1': 42,
                'config2': 'Das Pferd frisst kein Reis.'
            },
            'config4': ''
        }), JSON.stringify(actual));
        actual = testObject.get('workbench')['colorCustomizations'];
        actual['statusBar.background'] = 'anothervalue';
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.foreground': 'somevalue',
            'statusBar.background': 'anothervalue'
        }), JSON.stringify(actual));
        actual = testObject.get('workbench');
        actual['unknownkey'] = 'somevalue';
        assert.deepStrictEqual(JSON.stringify({
            'colorCustomizations': {
                'statusBar.foreground': 'somevalue'
            },
            'emptyobjectkey': {},
            'unknownkey': 'somevalue'
        }), JSON.stringify(actual));
        actual = all.getConfiguration('workbench').get('emptyobjectkey');
        actual = {
            ...(actual || {}),
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        };
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        }), JSON.stringify(actual));
        actual = all.getConfiguration('workbench').get('unknownkey');
        actual = {
            ...(actual || {}),
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        };
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        }), JSON.stringify(actual));
    });
    test('cannot modify returned configuration', function () {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'nested': {
                    'config1': 42,
                    'config2': 'Das Pferd frisst kein Reis.'
                },
                'config4': ''
            }
        });
        const testObject = all.getConfiguration();
        try {
            testObject['get'] = null;
            assert.fail('This should be readonly');
        }
        catch (e) {
        }
        try {
            testObject['farboo']['config0'] = false;
            assert.fail('This should be readonly');
        }
        catch (e) {
        }
        try {
            testObject['farboo']['farboo1'] = 'hello';
            assert.fail('This should be readonly');
        }
        catch (e) {
        }
    });
    test('inspect in no workspace context', function () {
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, createExtHostWorkspace(), {
            defaults: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'off',
                    'lineNumbers': 'on',
                    'fontSize': '12px'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'on',
                    'lineNumbers': 'off'
                }
            }, ['editor.wordWrap', 'editor.lineNumbers'], [], undefined, new NullLogService()),
            userRemote: new ConfigurationModel({
                'editor': {
                    'lineNumbers': 'relative'
                }
            }, ['editor.lineNumbers'], [], {
                'editor': {
                    'lineNumbers': 'relative',
                    'fontSize': '14px'
                }
            }, new NullLogService()),
            workspace: new ConfigurationModel({}, [], [], undefined, new NullLogService()),
            folders: [],
            configurationScopes: []
        }, new NullLogService());
        let actual = testObject.getConfiguration().inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'on');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, 'on');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        actual = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'on');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, 'on');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        actual = testObject.getConfiguration('editor').inspect('lineNumbers');
        assert.strictEqual(actual.defaultValue, 'on');
        assert.strictEqual(actual.globalLocalValue, 'off');
        assert.strictEqual(actual.globalRemoteValue, 'relative');
        assert.strictEqual(actual.globalValue, 'relative');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration('editor').get('fontSize'), '12px');
        actual = testObject.getConfiguration('editor').inspect('fontSize');
        assert.strictEqual(actual.defaultValue, '12px');
        assert.strictEqual(actual.globalLocalValue, undefined);
        assert.strictEqual(actual.globalRemoteValue, '14px');
        assert.strictEqual(actual.globalValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    });
    test('inspect in single root context', function () {
        const workspaceUri = URI.file('foo');
        const folders = [];
        const workspace = new ConfigurationModel({
            'editor': {
                'wordWrap': 'bounded'
            }
        }, ['editor.wordWrap'], [], undefined, new NullLogService());
        folders.push([workspaceUri, workspace]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            'id': 'foo',
            'folders': [aWorkspaceFolder(URI.file('foo'), 0)],
            'name': 'foo'
        }, true);
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, extHostWorkspace, {
            defaults: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'off'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'on'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace,
            folders,
            configurationScopes: []
        }, new NullLogService());
        let actual1 = testObject.getConfiguration().inspect('editor.wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        let actual2 = testObject.getConfiguration(undefined, workspaceUri).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'bounded');
        actual2 = testObject.getConfiguration('editor', workspaceUri).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'bounded');
    });
    test('inspect in multi root context', function () {
        const workspace = new ConfigurationModel({
            'editor': {
                'wordWrap': 'bounded'
            }
        }, ['editor.wordWrap'], [], undefined, new NullLogService());
        const firstRoot = URI.file('foo1');
        const secondRoot = URI.file('foo2');
        const thirdRoot = URI.file('foo3');
        const folders = [];
        folders.push([firstRoot, new ConfigurationModel({
                'editor': {
                    'wordWrap': 'off',
                    'lineNumbers': 'relative'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService())]);
        folders.push([secondRoot, new ConfigurationModel({
                'editor': {
                    'wordWrap': 'on'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService())]);
        folders.push([thirdRoot, new ConfigurationModel({}, [], [], undefined, new NullLogService())]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            'id': 'foo',
            'folders': [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
            'name': 'foo'
        }, true);
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, extHostWorkspace, {
            defaults: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'off',
                    'lineNumbers': 'on'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'on'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace,
            folders,
            configurationScopes: []
        }, new NullLogService());
        let actual1 = testObject.getConfiguration().inspect('editor.wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('lineNumbers');
        assert.strictEqual(actual1.defaultValue, 'on');
        assert.strictEqual(actual1.globalValue, undefined);
        assert.strictEqual(actual1.globalLocalValue, undefined);
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, undefined);
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        let actual2 = testObject.getConfiguration(undefined, firstRoot).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'off');
        actual2 = testObject.getConfiguration('editor', firstRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'off');
        actual2 = testObject.getConfiguration('editor', firstRoot).inspect('lineNumbers');
        assert.strictEqual(actual2.defaultValue, 'on');
        assert.strictEqual(actual2.globalValue, undefined);
        assert.strictEqual(actual2.globalLocalValue, undefined);
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, undefined);
        assert.strictEqual(actual2.workspaceFolderValue, 'relative');
        actual2 = testObject.getConfiguration(undefined, secondRoot).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'on');
        actual2 = testObject.getConfiguration('editor', secondRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'on');
        actual2 = testObject.getConfiguration(undefined, thirdRoot).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.ok(Object.keys(actual2).indexOf('workspaceFolderValue') !== -1);
        assert.strictEqual(actual2.workspaceFolderValue, undefined);
        actual2 = testObject.getConfiguration('editor', thirdRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.ok(Object.keys(actual2).indexOf('workspaceFolderValue') !== -1);
        assert.strictEqual(actual2.workspaceFolderValue, undefined);
    });
    test('inspect with language overrides', function () {
        const firstRoot = URI.file('foo1');
        const secondRoot = URI.file('foo2');
        const folders = [];
        folders.push([firstRoot, toConfigurationModel({
                'editor.wordWrap': 'bounded',
                '[typescript]': {
                    'editor.wordWrap': 'unbounded',
                }
            })]);
        folders.push([secondRoot, toConfigurationModel({})]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            'id': 'foo',
            'folders': [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
            'name': 'foo'
        }, true);
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, extHostWorkspace, {
            defaults: toConfigurationModel({
                'editor.wordWrap': 'off',
                '[markdown]': {
                    'editor.wordWrap': 'bounded',
                }
            }),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: toConfigurationModel({
                'editor.wordWrap': 'bounded',
                '[typescript]': {
                    'editor.lineNumbers': 'off',
                }
            }),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: toConfigurationModel({
                '[typescript]': {
                    'editor.wordWrap': 'unbounded',
                    'editor.lineNumbers': 'off',
                }
            }),
            folders,
            configurationScopes: []
        }, new NullLogService());
        let actual = testObject.getConfiguration(undefined, { uri: firstRoot, languageId: 'typescript' }).inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'bounded');
        assert.strictEqual(actual.globalLocalValue, 'bounded');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, 'bounded');
        assert.strictEqual(actual.defaultLanguageValue, undefined);
        assert.strictEqual(actual.globalLanguageValue, undefined);
        assert.strictEqual(actual.workspaceLanguageValue, 'unbounded');
        assert.strictEqual(actual.workspaceFolderLanguageValue, 'unbounded');
        assert.deepStrictEqual(actual.languageIds, ['markdown', 'typescript']);
        actual = testObject.getConfiguration(undefined, { uri: secondRoot, languageId: 'typescript' }).inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'bounded');
        assert.strictEqual(actual.globalLocalValue, 'bounded');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.defaultLanguageValue, undefined);
        assert.strictEqual(actual.globalLanguageValue, undefined);
        assert.strictEqual(actual.workspaceLanguageValue, 'unbounded');
        assert.strictEqual(actual.workspaceFolderLanguageValue, undefined);
        assert.deepStrictEqual(actual.languageIds, ['markdown', 'typescript']);
    });
    test('application is not set in inspect', () => {
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, createExtHostWorkspace(), {
            defaults: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'off',
                    'lineNumbers': 'on',
                    'fontSize': '12px'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'on'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userLocal: new ConfigurationModel({
                'editor': {
                    'wordWrap': 'auto',
                    'lineNumbers': 'off'
                }
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: new ConfigurationModel({}, [], [], undefined, new NullLogService()),
            folders: [],
            configurationScopes: []
        }, new NullLogService());
        let actual = testObject.getConfiguration().inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'auto');
        assert.strictEqual(actual.globalLocalValue, 'auto');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.wordWrap'), 'auto');
        actual = testObject.getConfiguration().inspect('editor.lineNumbers');
        assert.strictEqual(actual.defaultValue, 'on');
        assert.strictEqual(actual.globalValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'off');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.lineNumbers'), 'off');
        actual = testObject.getConfiguration().inspect('editor.fontSize');
        assert.strictEqual(actual.defaultValue, '12px');
        assert.strictEqual(actual.globalLocalValue, undefined);
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.fontSize'), '12px');
    });
    test('getConfiguration vs get', function () {
        const all = createExtHostConfiguration({
            'farboo': {
                'config0': true,
                'config4': 38
            }
        });
        let config = all.getConfiguration('farboo.config0');
        assert.strictEqual(config.get(''), undefined);
        assert.strictEqual(config.has(''), false);
        config = all.getConfiguration('farboo');
        assert.strictEqual(config.get('config0'), true);
        assert.strictEqual(config.has('config0'), true);
    });
    test('name vs property', function () {
        const all = createExtHostConfiguration({
            'farboo': {
                'get': 'get-prop'
            }
        });
        const config = all.getConfiguration('farboo');
        assert.ok(config.has('get'));
        assert.strictEqual(config.get('get'), 'get-prop');
        assert.deepStrictEqual(config['get'], config.get);
        assert.throws(() => config['get'] = 'get-prop');
    });
    test('update: no target passes null', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            'foo': {
                'bar': 1,
                'far': 1
            }
        }, shape);
        const config = allConfig.getConfiguration('foo');
        config.update('bar', 42);
        assert.strictEqual(shape.lastArgs[0], null);
    });
    test('update/section to key', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            'foo': {
                'bar': 1,
                'far': 1
            }
        }, shape);
        let config = allConfig.getConfiguration('foo');
        config.update('bar', 42, true);
        assert.strictEqual(shape.lastArgs[0], 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(shape.lastArgs[1], 'foo.bar');
        assert.strictEqual(shape.lastArgs[2], 42);
        config = allConfig.getConfiguration('');
        config.update('bar', 42, true);
        assert.strictEqual(shape.lastArgs[1], 'bar');
        config.update('foo.bar', 42, true);
        assert.strictEqual(shape.lastArgs[1], 'foo.bar');
    });
    test('update, what is #15834', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            'editor': {
                'formatOnSave': true
            }
        }, shape);
        allConfig.getConfiguration('editor').update('formatOnSave', { extensions: ['ts'] });
        assert.strictEqual(shape.lastArgs[1], 'editor.formatOnSave');
        assert.deepStrictEqual(shape.lastArgs[2], { extensions: ['ts'] });
    });
    test('update/error-state not OK', function () {
        const shape = new class extends mock() {
            $updateConfigurationOption(target, key, value) {
                return Promise.reject(new Error('Unknown Key')); // something !== OK
            }
        };
        return createExtHostConfiguration({}, shape)
            .getConfiguration('')
            .update('', true, false)
            .then(() => assert.ok(false), err => { });
    });
    test('configuration change event', (done) => {
        const workspaceFolder = aWorkspaceFolder(URI.file('folder1'), 0);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            'id': 'foo',
            'folders': [workspaceFolder],
            'name': 'foo'
        }, true);
        const testObject = new ExtHostConfigProvider(new class extends mock() {
        }, extHostWorkspace, createConfigurationData({
            'farboo': {
                'config': false,
                'updatedConfig': false
            }
        }), new NullLogService());
        const newConfigData = createConfigurationData({
            'farboo': {
                'config': false,
                'updatedConfig': true,
                'newConfig': true,
            }
        });
        const configEventData = { keys: ['farboo.updatedConfig', 'farboo.newConfig'], overrides: [] };
        store.add(testObject.onDidChangeConfiguration(e => {
            assert.deepStrictEqual(testObject.getConfiguration().get('farboo'), {
                'config': false,
                'updatedConfig': true,
                'newConfig': true,
            });
            assert.ok(e.affectsConfiguration('farboo'));
            assert.ok(e.affectsConfiguration('farboo', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo', URI.file('any')));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig'));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig', URI.file('any')));
            assert.ok(e.affectsConfiguration('farboo.newConfig'));
            assert.ok(e.affectsConfiguration('farboo.newConfig', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo.newConfig', URI.file('any')));
            assert.ok(!e.affectsConfiguration('farboo.config'));
            assert.ok(!e.affectsConfiguration('farboo.config', workspaceFolder.uri));
            assert.ok(!e.affectsConfiguration('farboo.config', URI.file('any')));
            done();
        }));
        testObject.$acceptConfigurationChanged(newConfigData, configEventData);
    });
    test('get return instance of array value', function () {
        const testObject = createExtHostConfiguration({ 'far': { 'boo': [] } });
        const value = testObject.getConfiguration().get('far.boo', []);
        value.push('a');
        const actual = testObject.getConfiguration().get('far.boo', []);
        assert.deepStrictEqual(actual, []);
    });
    function aWorkspaceFolder(uri, index, name = '') {
        return new WorkspaceFolder({ uri, name, index });
    }
    function toConfigurationModel(obj) {
        const parser = new ConfigurationModelParser('test', new NullLogService());
        parser.parse(JSON.stringify(obj));
        return parser.configurationModel;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RDb25maWd1cmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFvQixlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFJeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtJQUU3QixNQUFNLGNBQWUsU0FBUSxJQUFJLEVBQWdDO1FBRXZELDBCQUEwQixDQUFDLE1BQTJCLEVBQUUsR0FBVyxFQUFFLEtBQVU7WUFDdkYsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckMs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