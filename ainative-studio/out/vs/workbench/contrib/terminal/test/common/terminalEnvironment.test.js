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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxFbnZpcm9ubWVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRXRELE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sd0NBQXdDLENBQUM7QUFDcEYsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFMU0sT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtZQUMxQyxNQUFNLEdBQUcsR0FBMkIsRUFBRSxDQUFDO1lBQ3ZDLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0MsV0FBVyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxD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QUFTLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMxRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsMkVBQTJFLEVBQUUsR0FBRyxFQUFFO1lBQ3RGLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFB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