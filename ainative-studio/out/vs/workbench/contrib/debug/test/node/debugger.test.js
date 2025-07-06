/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { join, normalize } from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { Debugger } from '../../common/debugger.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { URI } from '../../../../../base/common/uri.js';
import { ExecutableDebugAdapter } from '../../node/debugAdapter.js';
import { TestTextResourcePropertiesService } from '../../../../../editor/test/common/services/testTextResourcePropertiesService.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Debug - Debugger', () => {
    let _debugger;
    const extensionFolderPath = '/a/b/c/';
    const debuggerContribution = {
        type: 'mock',
        label: 'Mock Debug',
        program: './out/mock/mockDebug.js',
        args: ['arg1', 'arg2'],
        configurationAttributes: {
            launch: {
                required: ['program'],
                properties: {
                    program: {
                        'type': 'string',
                        'description': 'Workspace relative path to a text file.',
                        'default': 'readme.md'
                    }
                }
            }
        },
        variables: null,
        initialConfigurations: [
            {
                name: 'Mock-Debug',
                type: 'mock',
                request: 'launch',
                program: 'readme.md'
            }
        ]
    };
    const extensionDescriptor0 = {
        id: 'adapter',
        identifier: new ExtensionIdentifier('adapter'),
        name: 'myAdapter',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file(extensionFolderPath),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            'debuggers': [
                debuggerContribution
            ]
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const extensionDescriptor1 = {
        id: 'extension1',
        identifier: new ExtensionIdentifier('extension1'),
        name: 'extension1',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file('/e1/b/c/'),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            'debuggers': [
                {
                    type: 'mock',
                    runtime: 'runtime',
                    runtimeArgs: ['rarg'],
                    program: 'mockprogram',
                    args: ['parg']
                }
            ]
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const extensionDescriptor2 = {
        id: 'extension2',
        identifier: new ExtensionIdentifier('extension2'),
        name: 'extension2',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file('/e2/b/c/'),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            'debuggers': [
                {
                    type: 'mock',
                    win: {
                        runtime: 'winRuntime',
                        program: 'winProgram'
                    },
                    linux: {
                        runtime: 'linuxRuntime',
                        program: 'linuxProgram'
                    },
                    osx: {
                        runtime: 'osxRuntime',
                        program: 'osxProgram'
                    }
                }
            ]
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        }
    };
    ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    const testResourcePropertiesService = new TestTextResourcePropertiesService(configurationService);
    setup(() => {
        _debugger = new Debugger(adapterManager, debuggerContribution, extensionDescriptor0, configurationService, testResourcePropertiesService, undefined, undefined, undefined, undefined);
    });
    teardown(() => {
        _debugger = null;
    });
    test('attributes', () => {
        assert.strictEqual(_debugger.type, debuggerContribution.type);
        assert.strictEqual(_debugger.label, debuggerContribution.label);
        const ae = ExecutableDebugAdapter.platformAdapterExecutable([extensionDescriptor0], 'mock');
        assert.strictEqual(ae.command, join(extensionFolderPath, debuggerContribution.program));
        assert.deepStrictEqual(ae.args, debuggerContribution.args);
    });
    test('merge platform specific attributes', function () {
        if (!process.versions.electron) {
            this.skip(); //TODO@debug this test fails when run in node.js environments
        }
        const ae = ExecutableDebugAdapter.platformAdapterExecutable([extensionDescriptor1, extensionDescriptor2], 'mock');
        assert.strictEqual(ae.command, platform.isLinux ? 'linuxRuntime' : (platform.isMacintosh ? 'osxRuntime' : 'winRuntime'));
        const xprogram = platform.isLinux ? 'linuxProgram' : (platform.isMacintosh ? 'osxProgram' : 'winProgram');
        assert.deepStrictEqual(ae.args, ['rarg', normalize('/e2/b/c/') + xprogram, 'parg']);
    });
    test('initial config file content', () => {
        const expected = ['{',
            '	// Use IntelliSense to learn about possible attributes.',
            '	// Hover to view descriptions of existing attributes.',
            '	// For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387',
            '	"version": "0.2.0",',
            '	"configurations": [',
            '		{',
            '			"name": "Mock-Debug",',
            '			"type": "mock",',
            '			"request": "launch",',
            '			"program": "readme.md"',
            '		}',
            '	]',
            '}'].join(testResourcePropertiesService.getEOL(URI.file('somefile')));
        return _debugger.getInitialConfigurationContent().then(content => {
            assert.strictEqual(content, expected);
        }, err => assert.fail(err));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3Qvbm9kZS9kZWJ1Z2dlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUNwSSxPQUFPLEVBQUUsbUJBQW1CLEVBQXlDLE1BQU0seURBQXlELENBQUM7QUFDckksT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLFNBQW1CLENBQUM7SUFFeEIsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUM7SUFDdEMsTUFBTSxvQkFBb0IsR0FBRztRQUM1QixJQUFJLEVBQUUsTUFBTTtRQUNaLEtBQUssRUFBRSxZQUFZO1FBQ25CLE9BQU8sRUFBRSx5QkFBeUI7UUFDbEMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztRQUN0Qix1QkFBdUIsRUFBRTtZQUN4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