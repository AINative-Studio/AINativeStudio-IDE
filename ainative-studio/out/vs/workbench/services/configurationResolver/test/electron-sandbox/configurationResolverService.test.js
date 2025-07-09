/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub } from 'sinon';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { normalize } from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { isLinux, isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { isObject } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { EditorType } from '../../../../../editor/common/editorCommon.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { testWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestEditorService, TestQuickInputService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService, TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { BaseConfigurationResolverService } from '../../browser/baseConfigurationResolverService.js';
import { ConfigurationResolverExpression } from '../../common/configurationResolverExpression.js';
const mockLineNumber = 10;
class TestEditorServiceWithActiveEditor extends TestEditorService {
    get activeTextEditorControl() {
        return {
            getEditorType() {
                return EditorType.ICodeEditor;
            },
            getSelection() {
                return new Selection(mockLineNumber, 1, mockLineNumber, 10);
            }
        };
    }
    get activeEditor() {
        return {
            get resource() {
                return URI.parse('file:///VSCode/workspaceLocation/file');
            }
        };
    }
}
class TestConfigurationResolverService extends BaseConfigurationResolverService {
}
const nullContext = {
    getAppRoot: () => undefined,
    getExecPath: () => undefined
};
suite('Configuration Resolver Service', () => {
    let configurationResolverService;
    const envVariables = { key1: 'Value for key1', key2: 'Value for key2' };
    // let environmentService: MockWorkbenchEnvironmentService;
    let mockCommandService;
    let editorService;
    let containingWorkspace;
    let workspace;
    let quickInputService;
    let labelService;
    let pathService;
    let extensionService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        mockCommandService = new MockCommandService();
        editorService = disposables.add(new TestEditorServiceWithActiveEditor());
        quickInputService = new TestQuickInputService();
        // environmentService = new MockWorkbenchEnvironmentService(envVariables);
        labelService = new MockLabelService();
        pathService = new MockPathService();
        extensionService = new TestExtensionService();
        containingWorkspace = testWorkspace(URI.parse('file:///VSCode/workspaceLocation'));
        workspace = containingWorkspace.folders[0];
        configurationResolverService = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), editorService, new MockInputsConfigurationService(), mockCommandService, new TestContextService(containingWorkspace), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
    });
    teardown(() => {
        configurationResolverService = null;
    });
    test('substitute one', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('apples platform specific config', async () => {
        const expected = isWindows ? 'windows.exe' : isMacintosh ? 'osx.sh' : isLinux ? 'linux.sh' : undefined;
        const obj = {
            windows: {
                program: 'windows.exe'
            },
            osx: {
                program: 'osx.sh'
            },
            linux: {
                program: 'linux.sh'
            }
        };
        const originalObj = JSON.stringify(obj);
        const config = await configurationResolverService.resolveAsync(workspace, obj);
        assert.strictEqual(config.program, expected);
        assert.strictEqual(config.windows, undefined);
        assert.strictEqual(config.osx, undefined);
        assert.strictEqual(config.linux, undefined);
        assert.strictEqual(JSON.stringify(obj), originalObj); // did not mutate original
    });
    test('workspace folder with argument', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('workspace folder with invalid argument', async () => {
        await assert.rejects(async () => await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:invalidLocation} xyz'));
    });
    test('workspace folder with undefined workspace folder', async () => {
        await assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder} xyz'));
    });
    test('workspace folder with argument and undefined workspace folder', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('workspace folder with invalid argument and undefined workspace folder', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:invalidLocation} xyz'));
    });
    test('workspace root folder name', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceRootFolderName} xyz'), 'abc workspaceLocation xyz');
    });
    test('current selected line number', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${lineNumber} xyz'), `abc ${mockLineNumber} xyz`);
    });
    test('relative file', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile} xyz'), 'abc file xyz');
    });
    test('relative file with argument', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile:workspaceLocation} xyz'), 'abc file xyz');
    });
    test('relative file with invalid argument', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile:invalidLocation} xyz'));
    });
    test('relative file with undefined workspace folder', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile} xyz'), 'abc \\VSCode\\workspaceLocation\\file xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile} xyz'), 'abc /VSCode/workspaceLocation/file xyz');
        }
    });
    test('relative file with argument and undefined workspace folder', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile:workspaceLocation} xyz'), 'abc file xyz');
    });
    test('relative file with invalid argument and undefined workspace folder', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile:invalidLocation} xyz'));
    });
    test('substitute many', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder}'), '\\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder}'), '/VSCode/workspaceLocation - /VSCode/workspaceLocation');
        }
    });
    test('substitute one env variable', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} ${env:key1} xyz'), 'abc \\VSCode\\workspaceLocation Value for key1 xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} ${env:key1} xyz'), 'abc /VSCode/workspaceLocation Value for key1 xyz');
        }
    });
    test('substitute many env variable', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), '\\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation Value for key1 - Value for key2');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), '/VSCode/workspaceLocation - /VSCode/workspaceLocation Value for key1 - Value for key2');
        }
    });
    test('disallows nested keys (#77289)', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} ${env:key1${env:key2}}'), 'Value for key1 ');
    });
    test('supports extensionDir', async () => {
        const getExtension = stub(extensionService, 'getExtension');
        getExtension.withArgs('publisher.extId').returns(Promise.resolve({ extensionLocation: URI.file('/some/path') }));
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${extensionInstallFolder:publisher.extId}'), URI.file('/some/path').fsPath);
    });
    // test('substitute keys and values in object', () => {
    // 	const myObject = {
    // 		'${workspaceRootFolderName}': '${lineNumber}',
    // 		'hey ${env:key1} ': '${workspaceRootFolderName}'
    // 	};
    // 	assert.deepStrictEqual(configurationResolverService!.resolveAsync(workspace, myObject), {
    // 		'workspaceLocation': `${editorService.mockLineNumber}`,
    // 		'hey Value for key1 ': 'workspaceLocation'
    // 	});
    // });
    test('substitute one env variable using platform case sensitivity', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} - ${env:Key1}'), 'Value for key1 - Value for key1');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} - ${env:Key1}'), 'Value for key1 - ');
        }
    });
    test('substitute one configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar'
                }
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} xyz'), 'abc foo xyz');
    });
    test('substitute configuration variable with undefined workspace folder', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(undefined, 'abc ${config:editor.fontFamily} xyz'), 'abc foo xyz');
    });
    test('substitute many configuration variables', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar'
                }
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} xyz'), 'abc foo bar xyz');
    });
    test('substitute one env variable and a configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar'
                }
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        if (platform.isWindows) {
            assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${workspaceFolder} ${env:key1} xyz'), 'abc foo \\VSCode\\workspaceLocation Value for key1 xyz');
        }
        else {
            assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${workspaceFolder} ${env:key1} xyz'), 'abc foo /VSCode/workspaceLocation Value for key1 xyz');
        }
    });
    test('substitute many env variable and a configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar'
                }
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        if (platform.isWindows) {
            assert.strictEqual(await service.resolveAsync(workspace, '${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} ${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), 'foo bar \\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation Value for key1 - Value for key2');
        }
        else {
            assert.strictEqual(await service.resolveAsync(workspace, '${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} ${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), 'foo bar /VSCode/workspaceLocation - /VSCode/workspaceLocation Value for key1 - Value for key2');
        }
    });
    test('mixed types of configuration variables', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
                lineNumbers: 123,
                insertSpaces: false
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar'
                }
            },
            json: {
                schemas: [
                    {
                        fileMatch: [
                            '/myfile',
                            '/myOtherfile'
                        ],
                        url: 'schemaURL'
                    }
                ]
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${config:editor.lineNumbers} ${config:editor.insertSpaces} xyz'), 'abc foo 123 false xyz');
    });
    test('uses original variable as fallback', async () => {
        const configurationService = new TestConfigurationService({
            editor: {}
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${unknownVariable} xyz'), 'abc ${unknownVariable} xyz');
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${env:unknownVariable} xyz'), 'abc  xyz');
    });
    test('configuration variables with invalid accessor', () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo'
            }
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${env} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${env:} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor..fontFamily} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor.none.none2} xyz'));
    });
    test('a single command variable', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${command:command1}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(undefined, configuration).then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'command1-result',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('an old style command variable', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${command:commandVariable1}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService.resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables).then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'command1-result',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('multiple new and old-style command variables', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${command:commandVariable1}',
            'pid': '${command:command2}',
            'sourceMaps': false,
            'outDir': 'src/${command:command2}',
            'env': {
                'processId': '__${command:command2}__',
            }
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService.resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables).then(result => {
            const expected = {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'command1-result',
                'pid': 'command2-result',
                'sourceMaps': false,
                'outDir': 'src/command2-result',
                'env': {
                    'processId': '__command2-result__',
                }
            };
            assert.deepStrictEqual(Object.keys(result), Object.keys(expected));
            Object.keys(result).forEach(property => {
                const expectedProperty = expected[property];
                if (isObject(result[property])) {
                    assert.deepStrictEqual({ ...result[property] }, expectedProperty);
                }
                else {
                    assert.deepStrictEqual(result[property], expectedProperty);
                }
            });
            assert.strictEqual(2, mockCommandService.callCount);
        });
    });
    test('a command variable that relies on resolved env vars', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${command:commandVariable1}',
            'value': '${env:key1}'
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService.resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables).then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'Value for key1',
                'value': 'Value for key1'
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('a single prompt input variable', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${input:input1}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(workspace, configuration, 'tasks').then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'resolvedEnterinput1',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('a single pick input variable', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${input:input2}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(workspace, configuration, 'tasks').then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'selectedPick',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('a single command input variable', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${input:input4}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(workspace, configuration, 'tasks').then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'arg for command',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('several input variables and command', () => {
        const configuration = {
            'name': '${input:input3}',
            'type': '${command:command1}',
            'request': '${input:input1}',
            'processId': '${input:input2}',
            'command': '${input:input4}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(workspace, configuration, 'tasks').then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'resolvedEnterinput3',
                'type': 'command1-result',
                'request': 'resolvedEnterinput1',
                'processId': 'selectedPick',
                'command': 'arg for command',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(2, mockCommandService.callCount);
        });
    });
    test('input variable with undefined workspace folder', () => {
        const configuration = {
            'name': 'Attach to Process',
            'type': 'node',
            'request': 'attach',
            'processId': '${input:input1}',
            'port': 5858,
            'sourceMaps': false,
            'outDir': null
        };
        return configurationResolverService.resolveWithInteractionReplace(undefined, configuration, 'tasks').then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': 'Attach to Process',
                'type': 'node',
                'request': 'attach',
                'processId': 'resolvedEnterinput1',
                'port': 5858,
                'sourceMaps': false,
                'outDir': null
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('contributed variable', () => {
        const buildTask = 'npm: compile';
        const variable = 'defaultBuildTask';
        const configuration = {
            'name': '${' + variable + '}',
        };
        configurationResolverService.contributeVariable(variable, async () => { return buildTask; });
        return configurationResolverService.resolveWithInteractionReplace(workspace, configuration).then(result => {
            assert.deepStrictEqual({ ...result }, {
                'name': `${buildTask}`
            });
        });
    });
    test('resolveWithEnvironment', async () => {
        const env = {
            'VAR_1': 'VAL_1',
            'VAR_2': 'VAL_2'
        };
        const configuration = 'echo ${env:VAR_1}${env:VAR_2}';
        const resolvedResult = await configurationResolverService.resolveWithEnvironment({ ...env }, undefined, configuration);
        assert.deepStrictEqual(resolvedResult, 'echo VAL_1VAL_2');
    });
});
class MockCommandService {
    constructor() {
        this.callCount = 0;
        this.onWillExecuteCommand = () => Disposable.None;
        this.onDidExecuteCommand = () => Disposable.None;
    }
    executeCommand(commandId, ...args) {
        this.callCount++;
        let result = `${commandId}-result`;
        if (args.length >= 1) {
            if (args[0] && args[0].value) {
                result = args[0].value;
            }
        }
        return Promise.resolve(result);
    }
}
class MockLabelService {
    constructor() {
        this.onDidChangeFormatters = new Emitter().event;
    }
    getUriLabel(resource, options) {
        return normalize(resource.fsPath);
    }
    getUriBasenameLabel(resource) {
        throw new Error('Method not implemented.');
    }
    getWorkspaceLabel(workspace, options) {
        throw new Error('Method not implemented.');
    }
    getHostLabel(scheme, authority) {
        throw new Error('Method not implemented.');
    }
    getHostTooltip() {
        throw new Error('Method not implemented.');
    }
    getSeparator(scheme, authority) {
        throw new Error('Method not implemented.');
    }
    registerFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
    registerCachedFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
}
class MockPathService {
    constructor() {
        this.defaultUriScheme = Schemas.file;
    }
    get path() {
        throw new Error('Property not implemented');
    }
    fileURI(path) {
        throw new Error('Method not implemented.');
    }
    userHome(options) {
        const uri = URI.file('c:\\users\\username');
        return options?.preferLocal ? uri : Promise.resolve(uri);
    }
    hasValidBasename(resource, arg2, name) {
        throw new Error('Method not implemented.');
    }
}
class MockInputsConfigurationService extends TestConfigurationService {
    getValue(arg1, arg2) {
        let configuration;
        if (arg1 === 'tasks') {
            configuration = {
                inputs: [
                    {
                        id: 'input1',
                        type: 'promptString',
                        description: 'Enterinput1',
                        default: 'default input1'
                    },
                    {
                        id: 'input2',
                        type: 'pickString',
                        description: 'Enterinput1',
                        default: 'option2',
                        options: ['option1', 'option2', 'option3']
                    },
                    {
                        id: 'input3',
                        type: 'promptString',
                        description: 'Enterinput3',
                        default: 'default input3',
                        provide: true,
                        password: true
                    },
                    {
                        id: 'input4',
                        type: 'command',
                        command: 'command1',
                        args: {
                            value: 'arg for command'
                        }
                    }
                ]
            };
        }
        return configuration;
    }
    inspect(key, overrides) {
        return {
            value: undefined,
            defaultValue: undefined,
            userValue: undefined,
            overrideIdentifiers: []
        };
    }
}
suite('ConfigurationResolverExpression', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse empty object', () => {
        const expr = ConfigurationResolverExpression.parse({});
        assert.strictEqual(Array.from(expr.unresolved()).length, 0);
        assert.deepStrictEqual(expr.toObject(), {});
    });
    test('parse simple string', () => {
        const expr = ConfigurationResolverExpression.parse({ value: '${env:HOME}' });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
    });
    test('parse string with argument and colon', () => {
        const expr = ConfigurationResolverExpression.parse({ value: '${config:path:to:value}' });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'config');
        assert.strictEqual(unresolved[0].arg, 'path:to:value');
    });
    test('parse object with nested variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}',
            path: '${env:HOME}/folder',
            settings: {
                value: '${config:path}'
            },
            array: ['${env:TERM}', { key: '${env:KEY}' }]
        });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 5);
        assert.deepStrictEqual(unresolved.map(r => r.name).sort(), ['config', 'env', 'env', 'env', 'env']);
    });
    test('resolve and get result', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}',
            path: '${env:HOME}/folder'
        });
        expr.resolve({ inner: 'env:USERNAME', id: '${env:USERNAME}', name: 'env', arg: 'USERNAME' }, 'testuser');
        expr.resolve({ inner: 'env:HOME', id: '${env:HOME}', name: 'env', arg: 'HOME' }, '/home/testuser');
        assert.deepStrictEqual(expr.toObject(), {
            name: 'testuser',
            path: '/home/testuser/folder'
        });
    });
    test('keeps unresolved variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}'
        });
        assert.deepStrictEqual(expr.toObject(), {
            name: '${env:USERNAME}'
        });
    });
    test('deduplicates identical variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            first: '${env:HOME}',
            second: '${env:HOME}'
        });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
        expr.resolve(unresolved[0], '/home/user');
        assert.deepStrictEqual(expr.toObject(), {
            first: '/home/user',
            second: '/home/user'
        });
    });
    test('handles root string value', () => {
        const expr = ConfigurationResolverExpression.parse('abc ${env:HOME} xyz');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
        expr.resolve(unresolved[0], '/home/user');
        assert.strictEqual(expr.toObject(), 'abc /home/user xyz');
    });
    test('handles root string value with multiple variables', () => {
        const expr = ConfigurationResolverExpression.parse('${env:HOME}/folder${env:SHELL}');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 2);
        expr.resolve({ id: '${env:HOME}', inner: 'env:HOME', name: 'env', arg: 'HOME' }, '/home/user');
        expr.resolve({ id: '${env:SHELL}', inner: 'env:SHELL', name: 'env', arg: 'SHELL' }, '/bin/bash');
        assert.strictEqual(expr.toObject(), '/home/user/folder/bin/bash');
    });
    test('handles root string with escaped variables', () => {
        const expr = ConfigurationResolverExpression.parse('abc ${env:HOME${env:USER}} xyz');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME${env:USER}');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2NvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUM3QixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQVMsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7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