/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-test-async-suite */
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { homedir, userInfo } from 'os';
import { isWindows } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../log/common/log.js';
import { getShellIntegrationInjection, getWindowsBuildNumber } from '../../node/terminalEnvironment.js';
const enabledProcessOptions = { shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' }, windowsEnableConpty: true, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const disabledProcessOptions = { shellIntegration: { enabled: false, suggestEnabled: false, nonce: '' }, windowsEnableConpty: true, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const winptyProcessOptions = { shellIntegration: { enabled: true, suggestEnabled: false, nonce: '' }, windowsEnableConpty: false, windowsUseConptyDll: false, environmentVariableCollections: undefined, workspaceFolder: undefined };
const pwshExe = process.platform === 'win32' ? 'pwsh.exe' : 'pwsh';
const repoRoot = process.platform === 'win32' ? process.cwd()[0].toLowerCase() + process.cwd().substring(1) : process.cwd();
const logService = new NullLogService();
const productService = { applicationName: 'vscode' };
const defaultEnvironment = {};
function deepStrictEqualIgnoreStableVar(actual, expected) {
    if (actual?.envMixin) {
        delete actual.envMixin['VSCODE_STABLE'];
    }
    deepStrictEqual(actual, expected);
}
suite('platform - terminalEnvironment', async () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getShellIntegrationInjection', () => {
        suite('should not enable', () => {
            // This test is only expected to work on Windows 10 build 18309 and above
            (getWindowsBuildNumber() < 18309 ? test.skip : test)('when isFeatureTerminal or when no executable is provided', async () => {
                ok(!(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: true }, enabledProcessOptions, defaultEnvironment, logService, productService, true)));
                ok(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'], isFeatureTerminal: false }, enabledProcessOptions, defaultEnvironment, logService, productService, true));
            });
            if (isWindows) {
                test('when on windows with conpty false', async () => {
                    ok(!(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'], isFeatureTerminal: false }, winptyProcessOptions, defaultEnvironment, logService, productService, true)));
                });
            }
        });
        // These tests are only expected to work on Windows 10 build 18309 and above
        (getWindowsBuildNumber() < 18309 ? suite.skip : suite)('pwsh', () => {
            const expectedPs1 = process.platform === 'win32'
                ? `try { . "${repoRoot}\\out\\vs\\workbench\\contrib\\terminal\\common\\scripts\\shellIntegration.ps1" } catch {}`
                : `. "${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration.ps1"`;
            suite('should override args', () => {
                const enabledExpectedResult = Object.freeze({
                    newArgs: [
                        '-noexit',
                        '-command',
                        expectedPs1
                    ],
                    envMixin: {
                        VSCODE_INJECTION: '1'
                    }
                });
                test('when undefined, []', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                suite('when no logo', () => {
                    test('array - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOLOGO'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-nol'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-NOL'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    test('string - case insensitive', async () => {
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NoLogo' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOLOGO' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-nol' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-NOL' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                });
            });
            suite('should incorporate login arg', () => {
                const enabledExpectedResult = Object.freeze({
                    newArgs: [
                        '-l',
                        '-noexit',
                        '-command',
                        expectedPs1
                    ],
                    envMixin: {
                        VSCODE_INJECTION: '1'
                    }
                });
                test('when array contains no logo and login', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
                test('when string', async () => {
                    deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                });
            });
            suite('should not modify args', () => {
                test('when shell integration is disabled', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: '-l' }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
                test('when using unrecognized arg', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: ['-l', '-NoLogo', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
                test('when using unrecognized arg (string)', async () => {
                    strictEqual(await getShellIntegrationInjection({ executable: pwshExe, args: '-i' }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                });
            });
        });
        if (process.platform !== 'win32') {
            suite('zsh', () => {
                suite('should override args', () => {
                    const username = userInfo().username;
                    const expectedDir = new RegExp(`.+\/${username}-vscode-zsh`);
                    const customZdotdir = '/custom/zsh/dotdir';
                    const expectedDests = [
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshrc`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zprofile`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zshenv`),
                        new RegExp(`.+\\/${username}-vscode-zsh\\/\\.zlogin`)
                    ];
                    const expectedSources = [
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-rc.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-profile.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-env.zsh/,
                        /.+\/out\/vs\/workbench\/contrib\/terminal\/common\/scripts\/shellIntegration-login.zsh/
                    ];
                    function assertIsEnabled(result, globalZdotdir = homedir()) {
                        strictEqual(Object.keys(result.envMixin).length, 3);
                        ok(result.envMixin['ZDOTDIR']?.match(expectedDir));
                        strictEqual(result.envMixin['USER_ZDOTDIR'], globalZdotdir);
                        ok(result.envMixin['VSCODE_INJECTION']?.match('1'));
                        strictEqual(result.filesToCopy?.length, 4);
                        ok(result.filesToCopy[0].dest.match(expectedDests[0]));
                        ok(result.filesToCopy[1].dest.match(expectedDests[1]));
                        ok(result.filesToCopy[2].dest.match(expectedDests[2]));
                        ok(result.filesToCopy[3].dest.match(expectedDests[3]));
                        ok(result.filesToCopy[0].source.match(expectedSources[0]));
                        ok(result.filesToCopy[1].source.match(expectedSources[1]));
                        ok(result.filesToCopy[2].source.match(expectedSources[2]));
                        ok(result.filesToCopy[3].source.match(expectedSources[3]));
                    }
                    test('when undefined, []', async () => {
                        const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result1?.newArgs, ['-i']);
                        assertIsEnabled(result1);
                        const result2 = await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                        deepStrictEqual(result2?.newArgs, ['-i']);
                        assertIsEnabled(result2);
                    });
                    suite('should incorporate login arg', () => {
                        test('when array', async () => {
                            const result = await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true);
                            deepStrictEqual(result?.newArgs, ['-il']);
                            assertIsEnabled(result);
                        });
                    });
                    suite('should not modify args', () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                        test('when using unrecognized arg', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'zsh', args: ['-l', '-fake'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                    });
                    suite('should incorporate global ZDOTDIR env variable', () => {
                        test('when custom ZDOTDIR', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, { ...defaultEnvironment, ZDOTDIR: customZdotdir }, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1, customZdotdir);
                        });
                        test('when undefined', async () => {
                            const result1 = await getShellIntegrationInjection({ executable: 'zsh', args: [] }, enabledProcessOptions, undefined, logService, productService, true);
                            deepStrictEqual(result1?.newArgs, ['-i']);
                            assertIsEnabled(result1);
                        });
                    });
                });
            });
            suite('bash', () => {
                suite('should override args', () => {
                    test('when undefined, [], empty string', async () => {
                        const enabledExpectedResult = Object.freeze({
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1'
                            }
                        });
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: [] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: '' }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: undefined }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                    });
                    suite('should set login env variable and not modify args', () => {
                        const enabledExpectedResult = Object.freeze({
                            newArgs: [
                                '--init-file',
                                `${repoRoot}/out/vs/workbench/contrib/terminal/common/scripts/shellIntegration-bash.sh`
                            ],
                            envMixin: {
                                VSCODE_INJECTION: '1',
                                VSCODE_SHELL_LOGIN: '1'
                            }
                        });
                        test('when array', async () => {
                            deepStrictEqualIgnoreStableVar(await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, enabledProcessOptions, defaultEnvironment, logService, productService, true), enabledExpectedResult);
                        });
                    });
                    suite('should not modify args', () => {
                        test('when shell integration is disabled', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: ['-l'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: undefined }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                        test('when custom array entry', async () => {
                            strictEqual(await getShellIntegrationInjection({ executable: 'bash', args: ['-l', '-i'] }, disabledProcessOptions, defaultEnvironment, logService, productService, true), undefined);
                        });
                    });
                });
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL3Rlc3Qvbm9kZS90ZXJtaW5hbEVudmlyb25tZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsbURBQW1EO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUN2QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRzVELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBb0MsTUFBTSxtQ0FBbUMsQ0FBQztBQUUxSSxNQUFNLHFCQUFxQixHQUE0QixFQUFFLGdCQUFnQixFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLENBQUM7QUFDL1AsTUFBTSxzQkFBc0IsR0FBNEIsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFF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