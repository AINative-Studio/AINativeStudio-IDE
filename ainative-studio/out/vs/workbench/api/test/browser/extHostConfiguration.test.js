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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0Q29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBd0IscUJBQXFCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNoSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBb0IsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBSXhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxLQUFLLENBQUMsc0JBQXNCLEVBQUU7SUFFN0IsTUFBTSxjQUFlLFNBQVEsSUFBSSxFQUFnQztRQUV2RCwwQkFBMEIsQ0FBQyxNQUEyQixFQUFFLEdBQVcsRUFBRSxLQUFVO1lBQ3ZGLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO0tBQ0Q7SUFFRCxTQUFTLHNCQUFzQjtRQUM5QixPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxlQUFlLEVBQUUsRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTJCO1NBQUksRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTBCO1lBQVksZUFBZSxLQUFLLE9BQU8sT0FBTyxDQUFDLENBQUMsNkRBQWtELENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQUUsRUFBRSxJQUFJLGNBQWMsRUFBRSxFQUFFLElBQUksS0FBTSxTQUFRLElBQUksRUFBMEI7U0FBSSxDQUFDLENBQUM7SUFDM1YsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQUMsV0FBZ0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFvQztRQUM1RyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFnQzthQUFJLENBQUM7UUFDcEUsQ0FBQztRQUNELE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDNUgsQ0FBQztJQUVELFNBQVMsdUJBQXVCLENBQUMsUUFBYTtRQUM3QyxPQUFPO1lBQ04sUUFBUSxFQUFFLElBQUksa0JBQWtCLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDbkYsTUFBTSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDdEUsU0FBUyxFQUFFLElBQUksa0JBQWtCLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEYsVUFBVSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDckUsU0FBUyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEUsT0FBTyxFQUFFLEVBQUU7WUFDWCxtQkFBbUIsRUFBRSxFQUFFO1NBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLENBQUMsNERBQTRELEVBQUU7UUFDbEUsTUFBTSxhQUFhLEdBQUcsMEJBQTBCLENBQUM7WUFDaEQsUUFBUSxFQUFFO2dCQUNULFNBQVMsRUFBRTtvQkFDVixpQkFBaUIsRUFBRSxJQUFJO2lCQUN2QjthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFNLFNBQVMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFMUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBRXBCLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixDQUFDO1lBQ3RDLFFBQVEsRUFBRTtnQkFDVCxTQUFTLEVBQUUsSUFBSTtnQkFDZixRQUFRLEVBQUU7b0JBQ1QsU0FBUyxFQUFFLEVBQUU7b0JBQ2IsU0FBUyxFQUFFLDZCQUE2QjtpQkFDeEM7Z0JBQ0QsU0FBUyxFQUFFLEVBQUU7YUFDYjtTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUN2RyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFFOUIsTUFBTSxHQUFHLEdBQUcsMEJBQTBCLENBQUM7WUFDdEMsUUFBUSxFQUFFO2dCQUNULFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRTtvQkFDVCxTQUFTLEVBQUUsRUFBRTtvQkFDYixTQUFTLEVBQUUsNkJBQTZCO2lCQUN4QztnQkFDRCxTQUFTLEVBQUUsRUFBRTthQUNiO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1FBQzVHLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFDeEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRTtRQUU3QyxNQUFNLEdBQUcsR0FBRywwQkFBMEIsQ0FBQztZQUN0QyxRQUFRLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsUUFBUSxFQUFFO29CQUNULFNBQVMsRUFBRSxFQUFFO29CQUNiLFNBQVMsRUFBRSw2QkFBNkI7aUJBQ3hDO2dCQUNELFNBQVMsRUFBRSxFQUFFO2FBQ2I7WUFDRCxXQUFXLEVBQUU7Z0JBQ1oscUJBQXFCLEVBQUU7b0JBQ3RCLHNCQUFzQixFQUFFLFdBQVc7aUJBQ25DO2FBQ0Q7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QyxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFNLFFBQVEsQ0FBRSxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVsRCxVQUFVLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFakQsVUFBVSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFN0MsVUFBVSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTVDLFVBQVUsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNwQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUUsQ0FBQztRQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV0RCxVQUFVLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFFLENBQUM7UUFDaEQsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUQsVUFBVSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxNQUFNLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBRSxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDakUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFFeEMsTUFBTSxHQUFHLEdBQUcsMEJBQTBCLENBQUM7WUFDdEMsUUFBUSxFQUFFO2dCQUNULFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRTtvQkFDVCxTQUFTLEVBQUUsRUFBRTtvQkFDYixTQUFTLEVBQUUsNkJBQTZCO2lCQUN4QztnQkFDRCxTQUFTLEVBQUUsRUFBRTthQUNiO1lBQ0QsV0FBVyxFQUFFO2dCQUNaLHFCQUFxQixFQUFFO29CQUN0QixzQkFBc0IsRUFBRSxXQUFXO2lCQUNuQztnQkFDRCxnQkFBZ0IsRUFBRSxFQUNqQjthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDMUMsSUFBSSxNQUFNLEdBQVEsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckMsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLDZCQUE2QjthQUN4QztZQUNELFNBQVMsRUFBRSxFQUFFO1NBQ2IsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU1QixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3JDLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFFBQVEsRUFBRTtnQkFDVCxTQUFTLEVBQUUsRUFBRTtnQkFDYixTQUFTLEVBQUUsNkJBQTZCO2FBQ3hDO1lBQ0QsU0FBUyxFQUFFLEVBQUU7U0FDYixDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFNLFdBQVcsQ0FBRSxDQUFDLHFCQUFxQixDQUFFLENBQUM7UUFDbkUsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxzQkFBc0IsRUFBRSxXQUFXO1lBQ25DLHNCQUFzQixFQUFFLGNBQWM7U0FDdEMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU1QixNQUFNLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxxQkFBcUIsRUFBRTtnQkFDdEIsc0JBQXNCLEVBQUUsV0FBVzthQUNuQztZQUNELGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsWUFBWSxFQUFFLFdBQVc7U0FDekIsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU1QixNQUFNLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sR0FBRztZQUNSLEdBQUcsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO1lBQ2pCLHNCQUFzQixFQUFFLE1BQU07WUFDOUIsc0JBQXNCLEVBQUUsTUFBTTtTQUM5QixDQUFDO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3JDLHNCQUFzQixFQUFFLE1BQU07WUFDOUIsc0JBQXNCLEVBQUUsTUFBTTtTQUM5QixDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdELE1BQU0sR0FBRztZQUNSLEdBQUcsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO1lBQ2pCLHNCQUFzQixFQUFFLE1BQU07WUFDOUIsc0JBQXNCLEVBQUUsTUFBTTtTQUM5QixDQUFDO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3JDLHNCQUFzQixFQUFFLE1BQU07WUFDOUIsc0JBQXNCLEVBQUUsTUFBTTtTQUM5QixDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFO1FBRTVDLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixDQUFDO1lBQ3RDLFFBQVEsRUFBRTtnQkFDVCxTQUFTLEVBQUUsSUFBSTtnQkFDZixRQUFRLEVBQUU7b0JBQ1QsU0FBUyxFQUFFLEVBQUU7b0JBQ2IsU0FBUyxFQUFFLDZCQUE2QjtpQkFDeEM7Z0JBQ0QsU0FBUyxFQUFFLEVBQUU7YUFDYjtTQUNELENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFRLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBRS9DLElBQUksQ0FBQztZQUNKLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUM7WUFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUkscUJBQXFCLENBQzNDLElBQUksS0FBTSxTQUFRLElBQUksRUFBZ0M7U0FBSSxFQUMxRCxzQkFBc0IsRUFBRSxFQUN4QjtZQUNDLFFBQVEsRUFBRSxJQUFJLGtCQUFrQixDQUFDO2dCQUNoQyxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLGFBQWEsRUFBRSxJQUFJO29CQUNuQixVQUFVLEVBQUUsTUFBTTtpQkFDbEI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsTUFBTSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDdEUsU0FBUyxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ2pDLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsSUFBSTtvQkFDaEIsYUFBYSxFQUFFLEtBQUs7aUJBQ3BCO2FBQ0QsRUFBRSxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ2xGLFVBQVUsRUFBRSxJQUFJLGtCQUFrQixDQUFDO2dCQUNsQyxRQUFRLEVBQUU7b0JBQ1QsYUFBYSxFQUFFLFVBQVU7aUJBQ3pCO2FBQ0QsRUFBRSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUM5QixRQUFRLEVBQUU7b0JBQ1QsYUFBYSxFQUFFLFVBQVU7b0JBQ3pCLFVBQVUsRUFBRSxNQUFNO2lCQUNsQjthQUNELEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUN4QixTQUFTLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUM5RSxPQUFPLEVBQUUsRUFBRTtZQUNYLG1CQUFtQixFQUFFLEVBQUU7U0FDdkIsRUFDRCxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBRUYsSUFBSSxNQUFNLEdBQWlDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDO1FBQ3JHLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBRSxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBRSxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtRQUN0QyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sT0FBTyxHQUEyQyxFQUFFLENBQUM7UUFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQztZQUN4QyxRQUFRLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLFNBQVM7YUFDckI7U0FDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxnQkFBZ0IsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBQ2xELGdCQUFnQixDQUFDLG9CQUFvQixDQUFDO1lBQ3JDLElBQUksRUFBRSxLQUFLO1lBQ1gsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqRCxNQUFNLEVBQUUsS0FBSztTQUNiLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDVCxNQUFNLFVBQVUsR0FBRyxJQUFJLHFCQUFxQixDQUMzQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWdDO1NBQUksRUFDMUQsZ0JBQWdCLEVBQ2hCO1lBQ0MsUUFBUSxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ2hDLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsS0FBSztpQkFDakI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsTUFBTSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDdEUsU0FBUyxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ2pDLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsSUFBSTtpQkFDaEI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsVUFBVSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDckUsU0FBUztZQUNULE9BQU87WUFDUCxtQkFBbUIsRUFBRSxFQUFFO1NBQ3ZCLEVBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUVGLElBQUksT0FBTyxHQUFpQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUN0RyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxJQUFJLE9BQU8sR0FBaUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUM3SCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFFLENBQUM7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQztZQUN4QyxRQUFRLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLFNBQVM7YUFDckI7U0FDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQztRQUU3RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FBMkMsRUFBRSxDQUFDO1FBQzNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQztnQkFDL0MsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRSxLQUFLO29CQUNqQixhQUFhLEVBQUUsVUFBVTtpQkFDekI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLGtCQUFrQixDQUFDO2dCQUNoRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFLElBQUk7aUJBQ2hCO2FBQ0QsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvRixNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixFQUFFLENBQUM7UUFDbEQsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUM7WUFDckMsSUFBSSxFQUFFLEtBQUs7WUFDWCxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sRUFBRSxLQUFLO1NBQ2IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNULE1BQU0sVUFBVSxHQUFHLElBQUkscUJBQXFCLENBQzNDLElBQUksS0FBTSxTQUFRLElBQUksRUFBZ0M7U0FBSSxFQUMxRCxnQkFBZ0IsRUFDaEI7WUFDQyxRQUFRLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQztnQkFDaEMsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRSxLQUFLO29CQUNqQixhQUFhLEVBQUUsSUFBSTtpQkFDbkI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsTUFBTSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakUsV0FBVyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDdEUsU0FBUyxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ2pDLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsSUFBSTtpQkFDaEI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsVUFBVSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDckUsU0FBUztZQUNULE9BQU87WUFDUCxtQkFBbUIsRUFBRSxFQUFFO1NBQ3ZCLEVBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUVGLElBQUksT0FBTyxHQUFpQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUN0RyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUUsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxJQUFJLE9BQU8sR0FBaUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUMxSCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFFLENBQUM7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEQsT0FBTyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBRSxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTdELE9BQU8sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDO1FBQ3pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXZELE9BQU8sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV2RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUN4RixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxPQUFPLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFFLENBQUM7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUU7UUFDdkMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sT0FBTyxHQUEyQyxFQUFFLENBQUM7UUFDM0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQztnQkFDN0MsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsY0FBYyxFQUFFO29CQUNmLGlCQUFpQixFQUFFLFdBQVc7aUJBQzlCO2FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUNsRCxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQztZQUNyQyxJQUFJLEVBQUUsS0FBSztZQUNYLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxFQUFFLEtBQUs7U0FDYixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ1QsTUFBTSxVQUFVLEdBQUcsSUFBSSxxQkFBcUIsQ0FDM0MsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFnQztTQUFJLEVBQzFELGdCQUFnQixFQUNoQjtZQUNDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQztnQkFDOUIsaUJBQWlCLEVBQUUsS0FBSztnQkFDeEIsWUFBWSxFQUFFO29CQUNiLGlCQUFpQixFQUFFLFNBQVM7aUJBQzVCO2FBQ0QsQ0FBQztZQUNGLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ2pFLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3RFLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQztnQkFDL0IsaUJBQWlCLEVBQUUsU0FBUztnQkFDNUIsY0FBYyxFQUFFO29CQUNmLG9CQUFvQixFQUFFLEtBQUs7aUJBQzNCO2FBQ0QsQ0FBQztZQUNGLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3JFLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQztnQkFDL0IsY0FBYyxFQUFFO29CQUNmLGlCQUFpQixFQUFFLFdBQVc7b0JBQzlCLG9CQUFvQixFQUFFLEtBQUs7aUJBQzNCO2FBQ0QsQ0FBQztZQUNGLE9BQU87WUFDUCxtQkFBbUIsRUFBRSxFQUFFO1NBQ3ZCLEVBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUVGLElBQUksTUFBTSxHQUFpQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUUsQ0FBQztRQUM1SixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUV2RSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFFLENBQUM7UUFDM0gsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBRTlDLE1BQU0sVUFBVSxHQUFHLElBQUkscUJBQXFCLENBQzNDLElBQUksS0FBTSxTQUFRLElBQUksRUFBZ0M7U0FBSSxFQUMxRCxzQkFBc0IsRUFBRSxFQUN4QjtZQUNDLFFBQVEsRUFBRSxJQUFJLGtCQUFrQixDQUFDO2dCQUNoQyxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFLEtBQUs7b0JBQ2pCLGFBQWEsRUFBRSxJQUFJO29CQUNuQixVQUFVLEVBQUUsTUFBTTtpQkFDbEI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsTUFBTSxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDakUsV0FBVyxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ25DLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsSUFBSTtpQkFDaEI7YUFDRCxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDNUQsU0FBUyxFQUFFLElBQUksa0JBQWtCLENBQUM7Z0JBQ2pDLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsTUFBTTtvQkFDbEIsYUFBYSxFQUFFLEtBQUs7aUJBQ3BCO2FBQ0QsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzVELFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3JFLFNBQVMsRUFBRSxJQUFJLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQzlFLE9BQU8sRUFBRSxFQUFFO1lBQ1gsbUJBQW1CLEVBQUUsRUFBRTtTQUN2QixFQUNELElBQUksY0FBYyxFQUFFLENBQ3BCLENBQUM7UUFFRixJQUFJLE1BQU0sR0FBaUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFFLENBQUM7UUFDckcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVqRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFFLENBQUM7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFFLENBQUM7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5QkFBeUIsRUFBRTtRQUUvQixNQUFNLEdBQUcsR0FBRywwQkFBMEIsQ0FBQztZQUN0QyxRQUFRLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsU0FBUyxFQUFFLEVBQUU7YUFDYjtTQUNELENBQUMsQ0FBQztRQUVILElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1FBQ3hCLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixDQUFDO1lBQ3RDLFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsVUFBVTthQUNqQjtTQUNELENBQUMsQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFRLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtCQUErQixFQUFFO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDbkMsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUM7WUFDNUMsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxDQUFDO2dCQUNSLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRVYsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXpCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUU3QixNQUFNLEtBQUssR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ25DLE1BQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDO1lBQzVDLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVWLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxtQ0FBMkIsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1FBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDbkMsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUM7WUFDNUMsUUFBUSxFQUFFO2dCQUNULGNBQWMsRUFBRSxJQUFJO2FBQ3BCO1NBQ0QsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVWLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRTtRQUVqQyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWdDO1lBQzFELDBCQUEwQixDQUFDLE1BQTJCLEVBQUUsR0FBVyxFQUFFLEtBQVU7Z0JBQ3ZGLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO1lBQ3JFLENBQUM7U0FDRCxDQUFDO1FBRUYsT0FBTywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDO2FBQzFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQzthQUNwQixNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUM7YUFDdkIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBNkIsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUUzQyxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLEVBQUUsQ0FBQztRQUNsRCxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQztZQUNyQyxJQUFJLEVBQUUsS0FBSztZQUNYLFNBQVMsRUFBRSxDQUFDLGVBQWUsQ0FBQztZQUM1QixNQUFNLEVBQUUsS0FBSztTQUNiLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDVCxNQUFNLFVBQVUsR0FBRyxJQUFJLHFCQUFxQixDQUMzQyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWdDO1NBQUksRUFDMUQsZ0JBQWdCLEVBQ2hCLHVCQUF1QixDQUFDO1lBQ3ZCLFFBQVEsRUFBRTtnQkFDVCxRQUFRLEVBQUUsS0FBSztnQkFDZixlQUFlLEVBQUUsS0FBSzthQUN0QjtTQUNELENBQUMsRUFDRixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUFDO1FBRUYsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7WUFDN0MsUUFBUSxFQUFFO2dCQUNULFFBQVEsRUFBRSxLQUFLO2dCQUNmLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixXQUFXLEVBQUUsSUFBSTthQUNqQjtTQUNELENBQUMsQ0FBQztRQUNILE1BQU0sZUFBZSxHQUF5QixFQUFFLElBQUksRUFBRSxDQUFDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQ3BILEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBRWpELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNuRSxRQUFRLEVBQUUsS0FBSztnQkFDZixlQUFlLEVBQUUsSUFBSTtnQkFDckIsV0FBVyxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsRUFBRSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUzRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLElBQUksRUFBRSxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDMUMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXhFLE1BQU0sS0FBSyxHQUFhLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVoQixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFRLEVBQUUsS0FBYSxFQUFFLE9BQWUsRUFBRTtRQUNuRSxPQUFPLElBQUksZUFBZSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFDLEdBQVE7UUFDckMsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDO0lBQ2xDLENBQUM7QUFFRixDQUFDLENBQUMsQ0FBQyJ9