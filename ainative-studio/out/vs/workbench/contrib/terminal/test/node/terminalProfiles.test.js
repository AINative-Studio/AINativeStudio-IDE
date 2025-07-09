/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, fail, ok, strictEqual } from 'assert';
import { isWindows } from '../../../../../base/common/platform.js';
import { detectAvailableProfiles } from '../../../../../platform/terminal/node/terminalProfiles.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
/**
 * Assets that two profiles objects are equal, this will treat explicit undefined and unset
 * properties the same. Order of the profiles is ignored.
 */
function profilesEqual(actualProfiles, expectedProfiles) {
    strictEqual(actualProfiles.length, expectedProfiles.length, `Actual: ${actualProfiles.map(e => e.profileName).join(',')}\nExpected: ${expectedProfiles.map(e => e.profileName).join(',')}`);
    for (const expected of expectedProfiles) {
        const actual = actualProfiles.find(e => e.profileName === expected.profileName);
        ok(actual, `Expected profile ${expected.profileName} not found`);
        strictEqual(actual.profileName, expected.profileName);
        strictEqual(actual.path, expected.path);
        deepStrictEqual(actual.args, expected.args);
        strictEqual(actual.isAutoDetected, expected.isAutoDetected);
        strictEqual(actual.overrideName, expected.overrideName);
    }
}
suite('Workbench - TerminalProfiles', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('detectAvailableProfiles', () => {
        if (isWindows) {
            test('should detect Git Bash and provide login args', async () => {
                const fsProvider = createFsProvider([
                    'C:\\Program Files\\Git\\bin\\bash.exe'
                ]);
                const config = {
                    profiles: {
                        windows: {
                            'Git Bash': { source: "Git Bash" /* ProfileSource.GitBash */ }
                        },
                        linux: {},
                        osx: {}
                    },
                    useWslProfiles: false
                };
                const configurationService = new TestConfigurationService({ terminal: { integrated: config } });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'Git Bash', path: 'C:\\Program Files\\Git\\bin\\bash.exe', args: ['--login', '-i'], isDefault: true }
                ];
                profilesEqual(profiles, expected);
            });
            test('should allow source to have args', async () => {
                const pwshSourcePaths = [
                    'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
                ];
                const fsProvider = createFsProvider(pwshSourcePaths);
                const config = {
                    profiles: {
                        windows: {
                            'PowerShell': { source: "PowerShell" /* ProfileSource.Pwsh */, args: ['-NoProfile'], overrideName: true }
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false
                };
                const configurationService = new TestConfigurationService({ terminal: { integrated: config } });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                const expected = [
                    { profileName: 'PowerShell', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', overrideName: true, args: ['-NoProfile'], isDefault: true }
                ];
                profilesEqual(profiles, expected);
            });
            test('configured args should override default source ones', async () => {
                const fsProvider = createFsProvider([
                    'C:\\Program Files\\Git\\bin\\bash.exe'
                ]);
                const config = {
                    profiles: {
                        windows: {
                            'Git Bash': { source: "Git Bash" /* ProfileSource.GitBash */, args: [] }
                        },
                        linux: {},
                        osx: {}
                    },
                    useWslProfiles: false
                };
                const configurationService = new TestConfigurationService({ terminal: { integrated: config } });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [{ profileName: 'Git Bash', path: 'C:\\Program Files\\Git\\bin\\bash.exe', args: [], isAutoDetected: undefined, overrideName: undefined, isDefault: true }];
                profilesEqual(profiles, expected);
            });
            suite('pwsh source detection/fallback', () => {
                const pwshSourceConfig = {
                    profiles: {
                        windows: {
                            'PowerShell': { source: "PowerShell" /* ProfileSource.Pwsh */ }
                        },
                        linux: {},
                        osx: {},
                    },
                    useWslProfiles: false
                };
                test('should prefer pwsh 7 to Windows PowerShell', async () => {
                    const pwshSourcePaths = [
                        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                        'C:\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({ terminal: { integrated: pwshSourceConfig } });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    const expected = [
                        { profileName: 'PowerShell', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', isDefault: true }
                    ];
                    profilesEqual(profiles, expected);
                });
                test('should prefer pwsh 7 to pwsh 6', async () => {
                    const pwshSourcePaths = [
                        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
                        'C:\\Program Files\\PowerShell\\6\\pwsh.exe',
                        'C:\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({ terminal: { integrated: pwshSourceConfig } });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    const expected = [
                        { profileName: 'PowerShell', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', isDefault: true }
                    ];
                    profilesEqual(profiles, expected);
                });
                test('should fallback to Windows PowerShell', async () => {
                    const pwshSourcePaths = [
                        'C:\\Windows\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe',
                        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
                    ];
                    const fsProvider = createFsProvider(pwshSourcePaths);
                    const configurationService = new TestConfigurationService({ terminal: { integrated: pwshSourceConfig } });
                    const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, pwshSourcePaths);
                    strictEqual(profiles.length, 1);
                    strictEqual(profiles[0].profileName, 'PowerShell');
                });
            });
        }
        else {
            const absoluteConfig = {
                profiles: {
                    windows: {},
                    osx: {
                        'fakeshell1': { path: '/bin/fakeshell1' },
                        'fakeshell2': { path: '/bin/fakeshell2' },
                        'fakeshell3': { path: '/bin/fakeshell3' }
                    },
                    linux: {
                        'fakeshell1': { path: '/bin/fakeshell1' },
                        'fakeshell2': { path: '/bin/fakeshell2' },
                        'fakeshell3': { path: '/bin/fakeshell3' }
                    }
                },
                useWslProfiles: false
            };
            const onPathConfig = {
                profiles: {
                    windows: {},
                    osx: {
                        'fakeshell1': { path: 'fakeshell1' },
                        'fakeshell2': { path: 'fakeshell2' },
                        'fakeshell3': { path: 'fakeshell3' }
                    },
                    linux: {
                        'fakeshell1': { path: 'fakeshell1' },
                        'fakeshell2': { path: 'fakeshell2' },
                        'fakeshell3': { path: 'fakeshell3' }
                    }
                },
                useWslProfiles: false
            };
            test('should detect shells via absolute paths', async () => {
                const fsProvider = createFsProvider([
                    '/bin/fakeshell1',
                    '/bin/fakeshell3'
                ]);
                const configurationService = new TestConfigurationService({ terminal: { integrated: absoluteConfig } });
                const profiles = await detectAvailableProfiles(undefined, undefined, false, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isDefault: true },
                    { profileName: 'fakeshell3', path: '/bin/fakeshell3', isDefault: true }
                ];
                profilesEqual(profiles, expected);
            });
            test('should auto detect shells via /etc/shells', async () => {
                const fsProvider = createFsProvider([
                    '/bin/fakeshell1',
                    '/bin/fakeshell3'
                ], '/bin/fakeshell1\n/bin/fakeshell3');
                const configurationService = new TestConfigurationService({ terminal: { integrated: onPathConfig } });
                const profiles = await detectAvailableProfiles(undefined, undefined, true, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isFromPath: true, isDefault: true },
                    { profileName: 'fakeshell3', path: '/bin/fakeshell3', isFromPath: true, isDefault: true }
                ];
                profilesEqual(profiles, expected);
            });
            test('should validate auto detected shells from /etc/shells exist', async () => {
                // fakeshell3 exists in /etc/shells but not on FS
                const fsProvider = createFsProvider([
                    '/bin/fakeshell1'
                ], '/bin/fakeshell1\n/bin/fakeshell3');
                const configurationService = new TestConfigurationService({ terminal: { integrated: onPathConfig } });
                const profiles = await detectAvailableProfiles(undefined, undefined, true, configurationService, process.env, fsProvider, undefined, undefined, undefined);
                const expected = [
                    { profileName: 'fakeshell1', path: '/bin/fakeshell1', isFromPath: true, isDefault: true }
                ];
                profilesEqual(profiles, expected);
            });
        }
    });
    function createFsProvider(expectedPaths, etcShellsContent = '') {
        const provider = {
            async existsFile(path) {
                return expectedPaths.includes(path);
            },
            async readFile(path) {
                if (path !== '/etc/shells') {
                    fail('Unexepected path');
                }
                return Buffer.from(etcShellsContent);
            }
        };
        return provider;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3Qvbm9kZS90ZXJtaW5hbFByb2ZpbGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFlLE1BQU0sMkRBQTJELENBQUM7QUFDakgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkc7OztHQUdHO0FBQ0gsU0FBUyxhQUFhLENBQUMsY0FBa0MsRUFBRSxnQkFBb0M7SUFDOUYsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFdBQVcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUwsS0FBSyxNQUFNLFFBQVEsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FB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