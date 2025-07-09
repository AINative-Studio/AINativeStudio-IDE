/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual, ok } from 'assert';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { join } from '../../../../../../base/common/path.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { env } from '../../../../../../base/common/process.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IRemoteAgentService } from '../../../../../services/remote/common/remoteAgentService.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
import { fetchBashHistory, fetchFishHistory, fetchPwshHistory, fetchZshHistory, sanitizeFishHistoryCmd, TerminalPersistedHistory } from '../../common/history.js';
function getConfig(limit) {
    return {
        terminal: {
            integrated: {
                shellIntegration: {
                    history: limit
                }
            }
        }
    };
}
const expectedCommands = [
    'single line command',
    'git commit -m "A wrapped line in pwsh history\n\nSome commit description\n\nFixes #xyz"',
    'git status',
    'two "\nline"'
];
suite('Terminal history', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('TerminalPersistedHistory', () => {
        let history;
        let instantiationService;
        let configurationService;
        setup(() => {
            configurationService = new TestConfigurationService(getConfig(5));
            instantiationService = store.add(new TestInstantiationService());
            instantiationService.set(IConfigurationService, configurationService);
            instantiationService.set(IStorageService, store.add(new TestStorageService()));
            history = store.add(instantiationService.createInstance((TerminalPersistedHistory), 'test'));
        });
        teardown(() => {
            instantiationService.dispose();
        });
        test('should support adding items to the cache and respect LRU', () => {
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [
                ['foo', 1]
            ]);
            history.add('bar', 2);
            deepStrictEqual(Array.from(history.entries), [
                ['foo', 1],
                ['bar', 2]
            ]);
            history.add('foo', 1);
            deepStrictEqual(Array.from(history.entries), [
                ['bar', 2],
                ['foo', 1]
            ]);
        });
        test('should support removing specific items', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
        });
        test('should limit the number of entries based on config', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            history.add('4', 4);
            history.add('5', 5);
            strictEqual(Array.from(history.entries).length, 5);
            history.add('6', 6);
            strictEqual(Array.from(history.entries).length, 5);
            configurationService.setUserConfiguration('terminal', getConfig(2).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('7', 7);
            strictEqual(Array.from(history.entries).length, 2);
            configurationService.setUserConfiguration('terminal', getConfig(3).terminal);
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            strictEqual(Array.from(history.entries).length, 2);
            history.add('8', 8);
            strictEqual(Array.from(history.entries).length, 3);
            history.add('9', 9);
            strictEqual(Array.from(history.entries).length, 3);
        });
        test('should reload from storage service after recreation', () => {
            history.add('1', 1);
            history.add('2', 2);
            history.add('3', 3);
            strictEqual(Array.from(history.entries).length, 3);
            const history2 = store.add(instantiationService.createInstance(TerminalPersistedHistory, 'test'));
            strictEqual(Array.from(history2.entries).length, 3);
        });
    });
    suite('fetchBashHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history',
            '',
            'Some commit description',
            '',
            'Fixes #xyz"',
            'git status',
            'two "',
            'line"'
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.bash_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.bash_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.bash_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchBashHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchBashHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchZshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            ': 1655252330:0;single line command',
            ': 1655252330:0;git commit -m "A wrapped line in pwsh history\\',
            '\\',
            'Some commit description\\',
            '\\',
            'Fixes #xyz"',
            ': 1655252330:0;git status',
            ': 1655252330:0;two "\\',
            'line"'
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.bash_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.zsh_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.zsh_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchZshHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchZshHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchPwshHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            'single line command',
            'git commit -m "A wrapped line in pwsh history`',
            '`',
            'Some commit description`',
            '`',
            'Fixes #xyz"',
            'git status',
            'two "`',
            'line"'
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({
                        scheme: fileScheme,
                        authority: remoteConnection?.remoteAuthority,
                        path: URI.file(filePath).path
                    });
                    // Sanitize the encoded `/` chars as they don't impact behavior
                    strictEqual(resource.toString().replaceAll('%5C', '/'), expected.toString().replaceAll('%5C', '/'));
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        suite('local', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
                env['HOME'] = '/home/user';
                env['APPDATA'] = 'C:\\AppData';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.zsh_history';
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('current OS', async () => {
                if (isWindows) {
                    filePath = join(env['APPDATA'], 'Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt');
                }
                else {
                    filePath = join(env['HOME'], '.local/share/powershell/PSReadline/ConsoleHost_history.txt');
                }
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                originalEnvValues = { HOME: env['HOME'], APPDATA: env['APPDATA'] };
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
                if (originalEnvValues['APPDATA'] === undefined) {
                    delete env['APPDATA'];
                }
                else {
                    env['APPDATA'] = originalEnvValues['APPDATA'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                env['APPDATA'] = 'C:\\AppData';
                filePath = 'C:\\AppData\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                env['HOME'] = '/home/user';
                filePath = '/home/user/.local/share/powershell/PSReadline/ConsoleHost_history.txt';
                deepStrictEqual((await instantiationService.invokeFunction(fetchPwshHistory)).commands, expectedCommands);
            });
        });
    });
    suite('fetchFishHistory', () => {
        let fileScheme;
        let filePath;
        const fileContent = [
            '- cmd: single line command',
            '  when: 1650000000',
            '- cmd: git commit -m "A wrapped line in pwsh history\\n\\nSome commit description\\n\\nFixes #xyz"',
            '  when: 1650000010',
            '- cmd: git status',
            '  when: 1650000020',
            '- cmd: two "\\nline"',
            '  when: 1650000030',
        ].join('\n');
        let instantiationService;
        let remoteConnection = null;
        let remoteEnvironment = null;
        setup(() => {
            instantiationService = new TestInstantiationService();
            instantiationService.stub(IFileService, {
                async readFile(resource) {
                    const expected = URI.from({ scheme: fileScheme, path: filePath });
                    strictEqual(resource.scheme, expected.scheme);
                    strictEqual(resource.path, expected.path);
                    return { value: VSBuffer.fromString(fileContent) };
                }
            });
            instantiationService.stub(IRemoteAgentService, {
                async getEnvironment() { return remoteEnvironment; },
                getConnection() { return remoteConnection; }
            });
        });
        teardown(() => {
            instantiationService.dispose();
        });
        if (!isWindows) {
            suite('local', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { HOME: env['HOME'] };
                    env['HOME'] = '/home/user';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/.local/share/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['HOME'] === undefined) {
                        delete env['HOME'];
                    }
                    else {
                        env['HOME'] = originalEnvValues['HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/.local/share/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
            suite('local (overriden path)', () => {
                let originalEnvValues;
                setup(() => {
                    originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                    env['XDG_DATA_HOME'] = '/home/user/data-home';
                    remoteConnection = { remoteAuthority: 'some-remote' };
                    fileScheme = Schemas.vscodeRemote;
                    filePath = '/home/user/data-home/fish/fish_history';
                });
                teardown(() => {
                    if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                        delete env['XDG_DATA_HOME'];
                    }
                    else {
                        env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                    }
                });
                test('current OS', async () => {
                    filePath = '/home/user/data-home/fish/fish_history';
                    deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
                });
            });
        }
        suite('remote', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { HOME: env['HOME'] };
                env['HOME'] = '/home/user';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/.local/share/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['HOME'] === undefined) {
                    delete env['HOME'];
                }
                else {
                    env['HOME'] = originalEnvValues['HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('remote (overriden path)', () => {
            let originalEnvValues;
            setup(() => {
                originalEnvValues = { XDG_DATA_HOME: env['XDG_DATA_HOME'] };
                env['XDG_DATA_HOME'] = '/home/user/data-home';
                remoteConnection = { remoteAuthority: 'some-remote' };
                fileScheme = Schemas.vscodeRemote;
                filePath = '/home/user/data-home/fish/fish_history';
            });
            teardown(() => {
                if (originalEnvValues['XDG_DATA_HOME'] === undefined) {
                    delete env['XDG_DATA_HOME'];
                }
                else {
                    env['XDG_DATA_HOME'] = originalEnvValues['XDG_DATA_HOME'];
                }
            });
            test('Windows', async () => {
                remoteEnvironment = { os: 1 /* OperatingSystem.Windows */ };
                strictEqual(await instantiationService.invokeFunction(fetchFishHistory), undefined);
            });
            test('macOS', async () => {
                remoteEnvironment = { os: 2 /* OperatingSystem.Macintosh */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
            test('Linux', async () => {
                remoteEnvironment = { os: 3 /* OperatingSystem.Linux */ };
                deepStrictEqual((await instantiationService.invokeFunction(fetchFishHistory)).commands, expectedCommands);
            });
        });
        suite('sanitizeFishHistoryCmd', () => {
            test('valid new-lines', () => {
                /**
                 * Valid new-lines have odd number of leading backslashes: \n, \\\n, \\\\\n
                 */
                const cases = [
                    '\\n',
                    '\\n at start',
                    'some \\n in the middle',
                    'at the end \\n',
                    '\\\\\\n',
                    '\\\\\\n valid at start',
                    'valid \\\\\\n in the middle',
                    'valid in the end \\\\\\n',
                    '\\\\\\\\\\n',
                    '\\\\\\\\\\n valid at start',
                    'valid \\\\\\\\\\n in the middle',
                    'valid in the end \\\\\\\\\\n',
                    'mixed valid \\r\\n',
                    'mixed valid \\\\\\r\\n',
                    'mixed valid \\r\\\\\\n',
                ];
                for (const x of cases) {
                    ok(sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
            test('invalid new-lines', () => {
                /**
                 * Invalid new-lines have even number of leading backslashes: \\n, \\\\n, \\\\\\n
                 */
                const cases = [
                    '\\\\n',
                    '\\\\n invalid at start',
                    'invalid \\\\n in the middle',
                    'invalid in the end \\\\n',
                    '\\\\\\\\n',
                    '\\\\\\\\n invalid at start',
                    'invalid \\\\\\\\n in the middle',
                    'invalid in the end \\\\\\\\n',
                    'mixed invalid \\r\\\\n',
                    'mixed invalid \\r\\\\\\\\n',
                    'echo "\\\\n"',
                ];
                for (const x of cases) {
                    ok(!sanitizeFishHistoryCmd(x).includes('\n'));
                }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9oaXN0b3J5L3Rlc3QvY29tbW9uL2hpc3RvcnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkYsT0FBTyxFQUEwQixtQkFBbUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzFILE9BQU8sRUFBRSxrQkFBa0IsRUFB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