/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI as Uri } from '../../../../../base/common/uri.js';
import { addTerminalEnvironmentKeys, createTerminalEnvironment, getCwd, getLangEnvVariable, mergeEnvironments, preparePathForShell, shouldSetLangEnvVariable } from '../../common/terminalEnvironment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Workbench - TerminalEnvironment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('addTerminalEnvironmentKeys', () => {
        test('should set expected variables', () => {
            const env = {};
            addTerminalEnvironmentKeys(env, '1.2.3', 'en', 'on');
            strictEqual(env['TERM_PROGRAM'], 'vscode');
            strictEqual(env['TERM_PROGRAM_VERSION'], '1.2.3');
            strictEqual(env['COLORTERM'], 'truecolor');
            strictEqual(env['LANG'], 'en_US.UTF-8');
        });
        test('should use language variant for LANG that is provided in locale', () => {
            const env = {};
            addTerminalEnvironmentKeys(env, '1.2.3', 'en-au', 'on');
            strictEqual(env['LANG'], 'en_AU.UTF-8', 'LANG is equal to the requested locale with UTF-8');
        });
        test('should fallback to en_US when no locale is provided', () => {
            const env2 = { FOO: 'bar' };
            addTerminalEnvironmentKeys(env2, '1.2.3', undefined, 'on');
            strictEqual(env2['LANG'], 'en_US.UTF-8', 'LANG is equal to en_US.UTF-8 as fallback.'); // More info on issue #14586
        });
        test('should fallback to en_US when an invalid locale is provided', () => {
            const env3 = { LANG: 'replace' };
            addTerminalEnvironmentKeys(env3, '1.2.3', undefined, 'on');
            strictEqual(env3['LANG'], 'en_US.UTF-8', 'LANG is set to the fallback LANG');
        });
        test('should override existing LANG', () => {
            const env4 = { LANG: 'en_AU.UTF-8' };
            addTerminalEnvironmentKeys(env4, '1.2.3', undefined, 'on');
            strictEqual(env4['LANG'], 'en_US.UTF-8', 'LANG is equal to the parent environment\'s LANG');
        });
    });
    suite('shouldSetLangEnvVariable', () => {
        test('auto', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'auto'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'auto'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'auto'), false);
        });
        test('off', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'off'), false);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'off'), false);
        });
        test('on', () => {
            strictEqual(shouldSetLangEnvVariable({}, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.utf8' }, 'on'), true);
            strictEqual(shouldSetLangEnvVariable({ LANG: 'en-US.UTF-8' }, 'on'), true);
        });
    });
    suite('getLangEnvVariable', () => {
        test('should fallback to en_US when no locale is provided', () => {
            strictEqual(getLangEnvVariable(undefined), 'en_US.UTF-8');
            strictEqual(getLangEnvVariable(''), 'en_US.UTF-8');
        });
        test('should fallback to default language variants when variant isn\'t provided', () => {
            strictEqual(getLangEnvVariable('af'), 'af_ZA.UTF-8');
            strictEqual(getLangEnvVariable('am'), 'am_ET.UTF-8');
            strictEqual(getLangEnvVariable('be'), 'be_BY.UTF-8');
            strictEqual(getLangEnvVariable('bg'), 'bg_BG.UTF-8');
            strictEqual(getLangEnvVariable('ca'), 'ca_ES.UTF-8');
            strictEqual(getLangEnvVariable('cs'), 'cs_CZ.UTF-8');
            strictEqual(getLangEnvVariable('da'), 'da_DK.UTF-8');
            strictEqual(getLangEnvVariable('de'), 'de_DE.UTF-8');
            strictEqual(getLangEnvVariable('el'), 'el_GR.UTF-8');
            strictEqual(getLangEnvVariable('en'), 'en_US.UTF-8');
            strictEqual(getLangEnvVariable('es'), 'es_ES.UTF-8');
            strictEqual(getLangEnvVariable('et'), 'et_EE.UTF-8');
            strictEqual(getLangEnvVariable('eu'), 'eu_ES.UTF-8');
            strictEqual(getLangEnvVariable('fi'), 'fi_FI.UTF-8');
            strictEqual(getLangEnvVariable('fr'), 'fr_FR.UTF-8');
            strictEqual(getLangEnvVariable('he'), 'he_IL.UTF-8');
            strictEqual(getLangEnvVariable('hr'), 'hr_HR.UTF-8');
            strictEqual(getLangEnvVariable('hu'), 'hu_HU.UTF-8');
            strictEqual(getLangEnvVariable('hy'), 'hy_AM.UTF-8');
            strictEqual(getLangEnvVariable('is'), 'is_IS.UTF-8');
            strictEqual(getLangEnvVariable('it'), 'it_IT.UTF-8');
            strictEqual(getLangEnvVariable('ja'), 'ja_JP.UTF-8');
            strictEqual(getLangEnvVariable('kk'), 'kk_KZ.UTF-8');
            strictEqual(getLangEnvVariable('ko'), 'ko_KR.UTF-8');
            strictEqual(getLangEnvVariable('lt'), 'lt_LT.UTF-8');
            strictEqual(getLangEnvVariable('nl'), 'nl_NL.UTF-8');
            strictEqual(getLangEnvVariable('no'), 'no_NO.UTF-8');
            strictEqual(getLangEnvVariable('pl'), 'pl_PL.UTF-8');
            strictEqual(getLangEnvVariable('pt'), 'pt_BR.UTF-8');
            strictEqual(getLangEnvVariable('ro'), 'ro_RO.UTF-8');
            strictEqual(getLangEnvVariable('ru'), 'ru_RU.UTF-8');
            strictEqual(getLangEnvVariable('sk'), 'sk_SK.UTF-8');
            strictEqual(getLangEnvVariable('sl'), 'sl_SI.UTF-8');
            strictEqual(getLangEnvVariable('sr'), 'sr_YU.UTF-8');
            strictEqual(getLangEnvVariable('sv'), 'sv_SE.UTF-8');
            strictEqual(getLangEnvVariable('tr'), 'tr_TR.UTF-8');
            strictEqual(getLangEnvVariable('uk'), 'uk_UA.UTF-8');
            strictEqual(getLangEnvVariable('zh'), 'zh_CN.UTF-8');
        });
        test('should set language variant based on full locale', () => {
            strictEqual(getLangEnvVariable('en-AU'), 'en_AU.UTF-8');
            strictEqual(getLangEnvVariable('en-au'), 'en_AU.UTF-8');
            strictEqual(getLangEnvVariable('fa-ke'), 'fa_KE.UTF-8');
        });
    });
    suite('mergeEnvironments', () => {
        test('should add keys', () => {
            const parent = {
                a: 'b'
            };
            const other = {
                c: 'd'
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                a: 'b',
                c: 'd'
            });
        });
        (!isWindows ? test.skip : test)('should add keys ignoring case on Windows', () => {
            const parent = {
                a: 'b'
            };
            const other = {
                A: 'c'
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                a: 'c'
            });
        });
        test('null values should delete keys from the parent env', () => {
            const parent = {
                a: 'b',
                c: 'd'
            };
            const other = {
                a: null
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                c: 'd'
            });
        });
        (!isWindows ? test.skip : test)('null values should delete keys from the parent env ignoring case on Windows', () => {
            const parent = {
                a: 'b',
                c: 'd'
            };
            const other = {
                A: null
            };
            mergeEnvironments(parent, other);
            deepStrictEqual(parent, {
                c: 'd'
            });
        });
    });
    suite('getCwd', () => {
        // This helper checks the paths in a cross-platform friendly manner
        function assertPathsMatch(a, b) {
            strictEqual(Uri.file(a).fsPath, Uri.file(b).fsPath);
        }
        test('should default to userHome for an empty workspace', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, undefined), '/userHome/');
        });
        test('should use to the workspace if it exists', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/foo'), undefined), '/foo');
        });
        test('should use an absolute custom cwd as is', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, '/foo'), '/foo');
        });
        test('should normalize a relative custom cwd against the workspace path', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), 'foo'), '/bar/foo');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), './foo'), '/bar/foo');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, Uri.file('/bar'), '../foo'), '/foo');
        });
        test('should fall back for relative a custom cwd that doesn\'t have a workspace', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, 'foo'), '/userHome/');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, './foo'), '/userHome/');
            assertPathsMatch(await getCwd({ executable: undefined, args: [] }, '/userHome/', undefined, undefined, '../foo'), '/userHome/');
        });
        test('should ignore custom cwd when told to ignore', async () => {
            assertPathsMatch(await getCwd({ executable: undefined, args: [], ignoreConfigurationCwd: true }, '/userHome/', undefined, Uri.file('/bar'), '/foo'), '/bar');
        });
    });
    suite('preparePathForShell', () => {
        const wslPathBackend = {
            getWslPath: async (original, direction) => {
                if (direction === 'unix-to-win') {
                    const match = original.match(/^\/mnt\/(?<drive>[a-zA-Z])\/(?<path>.+)$/);
                    const groups = match?.groups;
                    if (!groups) {
                        return original;
                    }
                    return `${groups.drive}:\\${groups.path.replace(/\//g, '\\')}`;
                }
                const match = original.match(/(?<drive>[a-zA-Z]):\\(?<path>.+)/);
                const groups = match?.groups;
                if (!groups) {
                    return original;
                }
                return `/mnt/${groups.drive.toLowerCase()}/${groups.path.replace(/\\/g, '/')}`;
            }
        };
        suite('Windows frontend, Windows backend', () => {
            test('Command Prompt', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell('c:\\foo\\bar\'baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar'baz`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `"c:\\foo\\bar$(echo evil)baz"`);
            });
            test('PowerShell', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell('c:\\foo\\bar\'baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `& 'c:\\foo\\bar''baz'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `& 'c:\\foo\\bar$(echo evil)baz'`);
            });
            test('Git Bash', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `'c:/foo/bar'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), `'c:/foo/bar(echo evil)baz'`);
            });
            test('WSL', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "wsl" /* WindowsShellType.Wsl */, wslPathBackend, 1 /* OperatingSystem.Windows */, true), '/mnt/c/foo/bar');
            });
        });
        suite('Windows frontend, Linux backend', () => {
            test('Bash', async () => {
                strictEqual(await preparePathForShell('/foo/bar', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/bar'`);
                strictEqual(await preparePathForShell('/foo/bar\'baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/barbaz'`);
                strictEqual(await preparePathForShell('/foo/bar$(echo evil)baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, true), `'/foo/bar(echo evil)baz'`);
            });
        });
        suite('Linux frontend, Windows backend', () => {
            test('Command Prompt', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell('c:\\foo\\bar\'baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar'baz`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'cmd', 'cmd', "cmd" /* WindowsShellType.CommandPrompt */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `"c:\\foo\\bar$(echo evil)baz"`);
            });
            test('PowerShell', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `c:\\foo\\bar`);
                strictEqual(await preparePathForShell('c:\\foo\\bar\'baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `& 'c:\\foo\\bar''baz'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'pwsh', 'pwsh', "pwsh" /* GeneralShellType.PowerShell */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `& 'c:\\foo\\bar$(echo evil)baz'`);
            });
            test('Git Bash', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `'c:/foo/bar'`);
                strictEqual(await preparePathForShell('c:\\foo\\bar$(echo evil)baz', 'bash', 'bash', "gitbash" /* WindowsShellType.GitBash */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), `'c:/foo/bar(echo evil)baz'`);
            });
            test('WSL', async () => {
                strictEqual(await preparePathForShell('c:\\foo\\bar', 'bash', 'bash', "wsl" /* WindowsShellType.Wsl */, wslPathBackend, 1 /* OperatingSystem.Windows */, false), '/mnt/c/foo/bar');
            });
        });
        suite('Linux frontend, Linux backend', () => {
            test('Bash', async () => {
                strictEqual(await preparePathForShell('/foo/bar', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/bar'`);
                strictEqual(await preparePathForShell('/foo/bar\'baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/barbaz'`);
                strictEqual(await preparePathForShell('/foo/bar$(echo evil)baz', 'bash', 'bash', "bash" /* PosixShellType.Bash */, wslPathBackend, 3 /* OperatingSystem.Linux */, false), `'/foo/bar(echo evil)baz'`);
            });
        });
    });
    suite('createTerminalEnvironment', () => {
        const commonVariables = {
            COLORTERM: 'truecolor',
            TERM_PROGRAM: 'vscode'
        };
        test('should retain variables equal to the empty string', async () => {
            deepStrictEqual(await createTerminalEnvironment({}, undefined, undefined, undefined, 'off', { foo: 'bar', empty: '' }), { foo: 'bar', empty: '', ...commonVariables });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL3Rlcm1pbmFsRW52aXJvbm1lbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUV0RCxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLHdDQUF3QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTFNLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7WUFDMUMsTUFBTSxHQUFHLEdBQTJCLEVBQUUsQ0FBQztZQUN2QywwQkFBMEIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsRUFBRSxPQUFPLENBQUMs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WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElB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