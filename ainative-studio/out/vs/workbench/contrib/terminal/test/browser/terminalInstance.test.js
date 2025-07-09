/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ITerminalConfigurationService, ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalConfigurationService } from '../../browser/terminalConfigurationService.js';
import { parseExitResult, TerminalInstance, TerminalLabelComputer } from '../../browser/terminalInstance.js';
import { IEnvironmentVariableService } from '../../common/environmentVariable.js';
import { EnvironmentVariableService } from '../../common/environmentVariableService.js';
import { ITerminalProfileResolverService } from '../../common/terminal.js';
import { TestViewDescriptorService } from './xterm/xtermTerminal.test.js';
import { fixPath } from '../../../../services/search/test/browser/queryBuilder.test.js';
import { TestTerminalProfileResolverService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
const root1 = '/foo/root1';
const ROOT_1 = fixPath(root1);
const root2 = '/foo/root2';
const ROOT_2 = fixPath(root2);
class MockTerminalProfileResolverService extends TestTerminalProfileResolverService {
    async getDefaultProfile() {
        return {
            profileName: "my-sh",
            path: "/usr/bin/zsh",
            env: {
                TEST: "TEST",
            },
            isDefault: true,
            isUnsafePath: false,
            isFromPath: true,
            icon: {
                id: "terminal-linux",
            },
            color: "terminal.ansiYellow",
        };
    }
}
const terminalShellTypeContextKey = {
    set: () => { },
    reset: () => { },
    get: () => undefined
};
class TestTerminalChildProcess extends Disposable {
    get capabilities() { return []; }
    constructor(shouldPersist) {
        super();
        this.shouldPersist = shouldPersist;
        this.id = 0;
        this.onDidChangeProperty = Event.None;
        this.onProcessData = Event.None;
        this.onProcessExit = Event.None;
        this.onProcessReady = Event.None;
        this.onProcessTitleChanged = Event.None;
        this.onProcessShellTypeChanged = Event.None;
    }
    updateProperty(property, value) {
        throw new Error('Method not implemented.');
    }
    async start() { return undefined; }
    shutdown(immediate) { }
    input(data) { }
    resize(cols, rows) { }
    clearBuffer() { }
    acknowledgeDataEvent(charCount) { }
    async setUnicodeVersion(version) { }
    async getInitialCwd() { return ''; }
    async getCwd() { return ''; }
    async processBinary(data) { }
    refreshProperty(property) { return Promise.resolve(''); }
}
class TestTerminalInstanceService extends Disposable {
    getBackend() {
        return {
            onPtyHostExit: Event.None,
            onPtyHostUnresponsive: Event.None,
            onPtyHostResponsive: Event.None,
            onPtyHostRestart: Event.None,
            onDidMoveWindowInstance: Event.None,
            onDidRequestDetach: Event.None,
            createProcess: (shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, windowsEnableConpty, shouldPersist) => this._register(new TestTerminalChildProcess(shouldPersist)),
            getLatency: () => Promise.resolve([])
        };
    }
}
suite('Workbench - TerminalInstance', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('TerminalInstance', () => {
        let terminalInstance;
        test('should create an instance of TerminalInstance with env from default profile', async () => {
            const instantiationService = workbenchInstantiationService({
                configurationService: () => new TestConfigurationService({
                    files: {},
                    terminal: {
                        integrated: {
                            fontFamily: 'monospace',
                            scrollback: 1000,
                            fastScrollSensitivity: 2,
                            mouseWheelScrollSensitivity: 1,
                            unicodeVersion: '6',
                            shellIntegration: {
                                enabled: true
                            }
                        }
                    },
                })
            }, store);
            instantiationService.set(ITerminalProfileResolverService, new MockTerminalProfileResolverService());
            instantiationService.stub(IViewDescriptorService, new TestViewDescriptorService());
            instantiationService.stub(IEnvironmentVariableService, store.add(instantiationService.createInstance(EnvironmentVariableService)));
            instantiationService.stub(ITerminalInstanceService, store.add(new TestTerminalInstanceService()));
            terminalInstance = store.add(instantiationService.createInstance(TerminalInstance, terminalShellTypeContextKey, {}));
            // //Wait for the teminalInstance._xtermReadyPromise to resolve
            await new Promise(resolve => setTimeout(resolve, 100));
            deepStrictEqual(terminalInstance.shellLaunchConfig.env, { TEST: 'TEST' });
        });
    });
    suite('parseExitResult', () => {
        test('should return no message for exit code = undefined', () => {
            deepStrictEqual(parseExitResult(undefined, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: undefined, message: undefined });
            deepStrictEqual(parseExitResult(undefined, {}, 5 /* ProcessState.KilledByUser */, undefined), { code: undefined, message: undefined });
            deepStrictEqual(parseExitResult(undefined, {}, 6 /* ProcessState.KilledByProcess */, undefined), { code: undefined, message: undefined });
        });
        test('should return no message for exit code = 0', () => {
            deepStrictEqual(parseExitResult(0, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 0, message: undefined });
            deepStrictEqual(parseExitResult(0, {}, 5 /* ProcessState.KilledByUser */, undefined), { code: 0, message: undefined });
            deepStrictEqual(parseExitResult(0, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 0, message: undefined });
        });
        test('should return friendly message when executable is specified for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 1, message: 'The terminal process "foo" failed to launch (exit code: 1).' });
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 5 /* ProcessState.KilledByUser */, undefined), { code: 1, message: 'The terminal process "foo" terminated with exit code: 1.' });
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 6 /* ProcessState.KilledByProcess */, undefined), { code: 1, message: 'The terminal process "foo" terminated with exit code: 1.' });
        });
        test('should return friendly message when executable and args are specified for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 1, message: `The terminal process "foo 'bar', 'baz'" failed to launch (exit code: 1).` });
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 5 /* ProcessState.KilledByUser */, undefined), { code: 1, message: `The terminal process "foo 'bar', 'baz'" terminated with exit code: 1.` });
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 6 /* ProcessState.KilledByProcess */, undefined), { code: 1, message: `The terminal process "foo 'bar', 'baz'" terminated with exit code: 1.` });
        });
        test('should return friendly message when executable and arguments are omitted for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 1, message: `The terminal process failed to launch (exit code: 1).` });
            deepStrictEqual(parseExitResult(1, {}, 5 /* ProcessState.KilledByUser */, undefined), { code: 1, message: `The terminal process terminated with exit code: 1.` });
            deepStrictEqual(parseExitResult(1, {}, 6 /* ProcessState.KilledByProcess */, undefined), { code: 1, message: `The terminal process terminated with exit code: 1.` });
        });
        test('should ignore pty host-related errors', () => {
            deepStrictEqual(parseExitResult({ message: 'Could not find pty with id 16' }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: undefined, message: undefined });
        });
        test('should format conpty failure code 5', () => {
            deepStrictEqual(parseExitResult({ code: 5, message: 'A native exception occurred during launch (Cannot create process, error code: 5)' }, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 5, message: `The terminal process failed to launch: Access was denied to the path containing your executable "foo". Manage and change your permissions to get this to work.` });
        });
        test('should format conpty failure code 267', () => {
            deepStrictEqual(parseExitResult({ code: 267, message: 'A native exception occurred during launch (Cannot create process, error code: 267)' }, {}, 4 /* ProcessState.KilledDuringLaunch */, '/foo'), { code: 267, message: `The terminal process failed to launch: Invalid starting directory "/foo", review your terminal.integrated.cwd setting.` });
        });
        test('should format conpty failure code 1260', () => {
            deepStrictEqual(parseExitResult({ code: 1260, message: 'A native exception occurred during launch (Cannot create process, error code: 1260)' }, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 1260, message: `The terminal process failed to launch: Windows cannot open this program because it has been prevented by a software restriction policy. For more information, open Event Viewer or contact your system Administrator.` });
        });
        test('should format generic failures', () => {
            deepStrictEqual(parseExitResult({ code: 123, message: 'A native exception occurred during launch (Cannot create process, error code: 123)' }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 123, message: `The terminal process failed to launch: A native exception occurred during launch (Cannot create process, error code: 123).` });
            deepStrictEqual(parseExitResult({ code: 123, message: 'foo' }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 123, message: `The terminal process failed to launch: foo.` });
        });
    });
    suite('TerminalLabelComputer', () => {
        let instantiationService;
        let capabilities;
        function createInstance(partial) {
            const capabilities = store.add(new TerminalCapabilityStore());
            if (!isWindows) {
                capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
            }
            return {
                shellLaunchConfig: {},
                shellType: "pwsh" /* GeneralShellType.PowerShell */,
                cwd: 'cwd',
                initialCwd: undefined,
                processName: '',
                sequence: undefined,
                workspaceFolder: undefined,
                staticTitle: undefined,
                capabilities,
                title: '',
                description: '',
                userHome: undefined,
                ...partial
            };
        }
        setup(async () => {
            instantiationService = workbenchInstantiationService(undefined, store);
            capabilities = store.add(new TerminalCapabilityStore());
            if (!isWindows) {
                capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
            }
        });
        function createLabelComputer(configuration) {
            instantiationService.set(IConfigurationService, new TestConfigurationService(configuration));
            instantiationService.set(ITerminalConfigurationService, store.add(instantiationService.createInstance(TerminalConfigurationService)));
            return store.add(instantiationService.createInstance(TerminalLabelComputer));
        }
        test('should resolve to "" when the template variables are empty', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '', description: '' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: '' }));
            // TODO:
            // terminalLabelComputer.onLabelChanged(e => {
            // 	strictEqual(e.title, '');
            // 	strictEqual(e.description, '');
            // });
            strictEqual(terminalLabelComputer.title, '');
            strictEqual(terminalLabelComputer.description, '');
        });
        test('should resolve cwd', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, cwd: ROOT_1 }));
            strictEqual(terminalLabelComputer.title, ROOT_1);
            strictEqual(terminalLabelComputer.description, ROOT_1);
        });
        test('should resolve workspaceFolder', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '${workspaceFolder}', description: '${workspaceFolder}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: 'folder' }) } }));
            strictEqual(terminalLabelComputer.title, 'folder');
            strictEqual(terminalLabelComputer.description, 'folder');
        });
        test('should resolve local', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '${local}', description: '${local}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Local' } }));
            strictEqual(terminalLabelComputer.title, 'Local');
            strictEqual(terminalLabelComputer.description, 'Local');
        });
        test('should resolve process', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '${process}', description: '${process}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh' }));
            strictEqual(terminalLabelComputer.title, 'zsh');
            strictEqual(terminalLabelComputer.description, 'zsh');
        });
        test('should resolve sequence', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' - ', title: '${sequence}', description: '${sequence}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, sequence: 'sequence' }));
            strictEqual(terminalLabelComputer.title, 'sequence');
            strictEqual(terminalLabelComputer.description, 'sequence');
        });
        test('should resolve task', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${process}${separator}${task}', description: '${task}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Task' } }));
            strictEqual(terminalLabelComputer.title, 'zsh ~ Task');
            strictEqual(terminalLabelComputer.description, 'Task');
        });
        test('should resolve separator', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${separator}', description: '${separator}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Task' } }));
            strictEqual(terminalLabelComputer.title, 'zsh');
            strictEqual(terminalLabelComputer.description, '');
        });
        test('should always return static title when specified', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${process}', description: '${workspaceFolder}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'process', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: 'folder' }) }, staticTitle: 'my-title' }));
            strictEqual(terminalLabelComputer.title, 'my-title');
            strictEqual(terminalLabelComputer.description, 'folder');
        });
        test('should provide cwdFolder for all cwds only when in multi-root', () => {
            const terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${process}${separator}${cwdFolder}', description: '${cwdFolder}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'process', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }) }, cwd: ROOT_1 }));
            // single-root, cwd is same as root
            strictEqual(terminalLabelComputer.title, 'process');
            strictEqual(terminalLabelComputer.description, '');
            // multi-root
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'process', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }) }, cwd: ROOT_2 }));
            if (isWindows) {
                strictEqual(terminalLabelComputer.title, 'process');
                strictEqual(terminalLabelComputer.description, '');
            }
            else {
                strictEqual(terminalLabelComputer.title, 'process ~ root2');
                strictEqual(terminalLabelComputer.description, 'root2');
            }
        });
        test('should hide cwdFolder in single folder workspaces when cwd matches the workspace\'s default cwd even when slashes differ', async () => {
            let terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${process}${separator}${cwdFolder}', description: '${cwdFolder}' } } } });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'process', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }) }, cwd: ROOT_1 }));
            strictEqual(terminalLabelComputer.title, 'process');
            strictEqual(terminalLabelComputer.description, '');
            if (!isWindows) {
                terminalLabelComputer = createLabelComputer({ terminal: { integrated: { tabs: { separator: ' ~ ', title: '${process}${separator}${cwdFolder}', description: '${cwdFolder}' } } } });
                terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'process', workspaceFolder: { uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }) }, cwd: ROOT_2 }));
                strictEqual(terminalLabelComputer.title, 'process ~ root2');
                strictEqual(terminalLabelComputer.description, 'root2');
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbEluc3RhbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUd6SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUcxSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsNkJBQTZCLEVBQXFCLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFt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