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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L25vZGUvZGVidWdnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUZBQWlGLENBQUM7QUFDcEksT0FBTyxFQUFFLG1CQUFtQixFQUF5QyxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxTQUFtQixDQUFDO0lBRXhCLE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDO0lBQ3RDLE1BQU0sb0JBQW9CLEdBQUc7UUFDNUIsSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsWUFBWTtRQUNuQixPQUFPLEVBQUUseUJBQXlCO1FBQ2xDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7UUFDdEIsdUJBQXVCLEVBQUU7WUFDeEIsTUFBTSxFQUFFO2dCQUNQLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQztnQkFDckIsVUFBVSxFQUFFO29CQUNYLE9BQU8sRUFBRTt3QkFDUixNQUFNLEVBQUUsUUFBUTt3QkFDaEIsYUFBYSxFQUFFLHlDQUF5Qzt3QkFDeEQsU0FBUyxFQUFFLFdBQVc7cUJBQ3RCO2lCQUNEO2FBQ0Q7U0FDRDtRQUNELFNBQVMsRUFBRSxJQUFLO1FBQ2hCLHFCQUFxQixFQUFFO1lBQ3RCO2dCQUNDLElBQUksRUFBRSxZQUFZO2dCQUNsQixJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsUUFBUTtnQkFDakIsT0FBTyxFQUFFLFdBQVc7YUFDcEI7U0FDRDtLQUNELENBQUM7SUFFRixNQUFNLG9CQUFvQixHQUEwQjtRQUNuRCxFQUFFLEVBQUUsU0FBUztRQUNiLFVBQVUsRUFBRSxJQUFJLG1CQUFtQixDQUFDLFNBQVMsQ0FBQztRQUM5QyxJQUFJLEVBQUUsV0FBVztRQUNqQixPQUFPLEVBQUUsT0FBTztRQUNoQixTQUFTLEVBQUUsUUFBUTtRQUNuQixpQkFBaUIsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDO1FBQ2hELFNBQVMsRUFBRSxLQUFLO1FBQ2hCLGFBQWEsRUFBRSxLQUFLO1FBQ3BCLGtCQUFrQixFQUFFLEtBQUs7UUFDekIsT0FBTyxFQUFFLElBQUs7UUFDZCxjQUFjLDRDQUEwQjtRQUN4QyxXQUFXLEVBQUU7WUFDWixXQUFXLEVBQUU7Z0JBQ1osb0JBQW9CO2FBQ3BCO1NBQ0Q7UUFDRCxtQkFBbUIsRUFBRSxTQUFTO1FBQzlCLFVBQVUsRUFBRSxLQUFLO0tBQ2pCLENBQUM7SUFFRixNQUFNLG9CQUFvQixHQUFHO1FBQzVCLEVBQUUsRUFBRSxZQUFZO1FBQ2hCLFVBQVUsRUFBRSxJQUFJLG1CQUFtQixDQUFDLFlBQVksQ0FBQztRQUNqRCxJQUFJLEVBQUUsWUFBWTtRQUNsQixPQUFPLEVBQUUsT0FBTztRQUNoQixTQUFTLEVBQUUsUUFBUTtRQUNuQixpQkFBaUIsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2QyxTQUFTLEVBQUUsS0FBSztRQUNoQixhQUFhLEVBQUUsS0FBSztRQUNwQixrQkFBa0IsRUFBRSxLQUFLO1FBQ3pCLE9BQU8sRUFBRSxJQUFLO1FBQ2QsY0FBYyw0Q0FBMEI7UUFDeEMsV0FBVyxFQUFFO1lBQ1osV0FBVyxFQUFFO2dCQUNaO29CQUNDLElBQUksRUFBRSxNQUFNO29CQUNaLE9BQU8sRUFBRSxTQUFTO29CQUNsQixXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUM7b0JBQ3JCLE9BQU8sRUFBRSxhQUFhO29CQUN0QixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7aUJBQ2Q7YUFDRDtTQUNEO1FBQ0QsbUJBQW1CLEVBQUUsU0FBUztRQUM5QixVQUFVLEVBQUUsS0FBSztLQUNqQixDQUFDO0lBRUYsTUFBTSxvQkFBb0IsR0FBRztRQUM1QixFQUFFLEVBQUUsWUFBWTtRQUNoQixVQUFVLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7UUFDakQsSUFBSSxFQUFFLFlBQVk7UUFDbEIsT0FBTyxFQUFFLE9BQU87UUFDaEIsU0FBUyxFQUFFLFFBQVE7UUFDbkIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDdkMsU0FBUyxFQUFFLEtBQUs7UUFDaEIsYUFBYSxFQUFFLEtBQUs7UUFDcEIsa0JBQWtCLEVBQUUsS0FBSztRQUN6QixPQUFPLEVBQUUsSUFBSztRQUNkLGNBQWMsNENBQTBCO1FBQ3hDLFdBQVcsRUFBRTtZQUNaLFdBQVcsRUFBRTtnQkFDWjtvQkFDQyxJQUFJLEVBQUUsTUFBTTtvQkFDWixHQUFHLEVBQUU7d0JBQ0osT0FBTyxFQUFFLFlBQVk7d0JBQ3JCLE9BQU8sRUFBRSxZQUFZO3FCQUNyQjtvQkFDRCxLQUFLLEVBQUU7d0JBQ04sT0FBTyxFQUFFLGNBQWM7d0JBQ3ZCLE9BQU8sRUFBRSxjQUFjO3FCQUN2QjtvQkFDRCxHQUFHLEVBQUU7d0JBQ0osT0FBTyxFQUFFLFlBQVk7d0JBQ3JCLE9BQU8sRUFBRSxZQUFZO3FCQUNyQjtpQkFDRDthQUNEO1NBQ0Q7UUFDRCxtQkFBbUIsRUFBRSxTQUFTO1FBQzlCLFVBQVUsRUFBRSxLQUFLO0tBQ2pCLENBQUM7SUFHRixNQUFNLGNBQWMsR0FBb0I7UUFDdkMseUJBQXlCLENBQUMsT0FBc0IsRUFBRSxNQUFlO1lBQ2hFLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO0tBQ0QsQ0FBQztJQUVGLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7SUFDNUQsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGlDQUFpQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFFbEcsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVBQUUsU0FBVSxFQUFFLFNBQVUsRUFBRSxTQUFVLEVBQUUsU0FBVSxDQUFDLENBQUM7SUFDM0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsU0FBUyxHQUFHLElBQUssQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEUsTUFBTSxFQUFFLEdBQUcsc0JBQXNCLENBQUMseUJBQXlCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN6RixNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUcsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsNkRBQTZEO1FBQzNFLENBQUM7UUFDRCxNQUFNLEVBQUUsR0FBRyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsTUFBTSxDQUFFLENBQUM7UUFDbkgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDekgsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDMUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFFeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHO1lBQ3BCLDBEQUEwRDtZQUMxRCx3REFBd0Q7WUFDeEQsaUZBQWlGO1lBQ2pGLHNCQUFzQjtZQUN0QixzQkFBc0I7WUFDdEIsS0FBSztZQUNMLDBCQUEwQjtZQUMxQixvQkFBb0I7WUFDcEIseUJBQXlCO1lBQ3pCLDJCQUEyQjtZQUMzQixLQUFLO1lBQ0wsSUFBSTtZQUNKLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkUsT0FBTyxTQUFTLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==