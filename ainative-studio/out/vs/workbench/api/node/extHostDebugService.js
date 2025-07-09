/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createCancelablePromise, disposableTimeout, firstParallel, RunOnceScheduler, timeout } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import * as nls from '../../../nls.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService } from '../../../platform/externalTerminal/node/externalTerminalService.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ExecutableDebugAdapter, NamedPipeDebugAdapter, SocketDebugAdapter } from '../../contrib/debug/node/debugAdapter.js';
import { hasChildProcesses, prepareCommand } from '../../contrib/debug/node/terminals.js';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { ExtHostDebugServiceBase } from '../common/extHostDebugService.js';
import { IExtHostEditorTabs } from '../common/extHostEditorTabs.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostTesting } from '../common/extHostTesting.js';
import { DebugAdapterExecutable, DebugAdapterNamedPipeServer, DebugAdapterServer, ThemeIcon } from '../common/extHostTypes.js';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
import { IExtHostWorkspace } from '../common/extHostWorkspace.js';
import { IExtHostTerminalShellIntegration } from '../common/extHostTerminalShellIntegration.js';
let ExtHostDebugService = class ExtHostDebugService extends ExtHostDebugServiceBase {
    constructor(extHostRpcService, workspaceService, extensionService, configurationService, _terminalService, _terminalShellIntegrationService, editorTabs, variableResolver, commands, testing) {
        super(extHostRpcService, workspaceService, extensionService, configurationService, editorTabs, variableResolver, commands, testing);
        this._terminalService = _terminalService;
        this._terminalShellIntegrationService = _terminalShellIntegrationService;
        this._integratedTerminalInstances = new DebugTerminalCollection();
    }
    createDebugAdapter(adapter, session) {
        if (adapter instanceof DebugAdapterExecutable) {
            return new ExecutableDebugAdapter(this.convertExecutableToDto(adapter), session.type);
        }
        else if (adapter instanceof DebugAdapterServer) {
            return new SocketDebugAdapter(this.convertServerToDto(adapter));
        }
        else if (adapter instanceof DebugAdapterNamedPipeServer) {
            return new NamedPipeDebugAdapter(this.convertPipeServerToDto(adapter));
        }
        else {
            return super.createDebugAdapter(adapter, session);
        }
    }
    daExecutableFromPackage(session, extensionRegistry) {
        const dae = ExecutableDebugAdapter.platformAdapterExecutable(extensionRegistry.getAllExtensionDescriptions(), session.type);
        if (dae) {
            return new DebugAdapterExecutable(dae.command, dae.args, dae.options);
        }
        return undefined;
    }
    createSignService() {
        return new SignService();
    }
    async $runInTerminal(args, sessionId) {
        if (args.kind === 'integrated') {
            if (!this._terminalDisposedListener) {
                // React on terminal disposed and check if that is the debug terminal #12956
                this._terminalDisposedListener = this._register(this._terminalService.onDidCloseTerminal(terminal => {
                    this._integratedTerminalInstances.onTerminalClosed(terminal);
                }));
            }
            const configProvider = await this._configurationService.getConfigProvider();
            const shell = this._terminalService.getDefaultShell(true);
            const shellArgs = this._terminalService.getDefaultShellArgs(true);
            const terminalName = args.title || nls.localize('debug.terminal.title', "Debug Process");
            const shellConfig = JSON.stringify({ shell, shellArgs });
            let terminal = await this._integratedTerminalInstances.checkout(shellConfig, terminalName);
            let cwdForPrepareCommand;
            let giveShellTimeToInitialize = false;
            if (!terminal) {
                const options = {
                    shellPath: shell,
                    shellArgs: shellArgs,
                    cwd: args.cwd,
                    name: terminalName,
                    iconPath: new ThemeIcon('debug'),
                };
                giveShellTimeToInitialize = true;
                terminal = this._terminalService.createTerminalFromOptions(options, {
                    isFeatureTerminal: true,
                    // Since debug termnials are REPLs, we want shell integration to be enabled.
                    // Ignore isFeatureTerminal when evaluating shell integration enablement.
                    forceShellIntegration: true,
                    useShellEnvironment: true
                });
                this._integratedTerminalInstances.insert(terminal, shellConfig);
            }
            else {
                cwdForPrepareCommand = args.cwd;
            }
            terminal.show(true);
            const shellProcessId = await terminal.processId;
            if (giveShellTimeToInitialize) {
                // give a new terminal some time to initialize the shell (most recently, #228191)
                // - If shell integration is available, use that as a deterministic signal
                // - Debounce content being written to known when the prompt is available
                // - Give a longer timeout otherwise
                let Timing;
                (function (Timing) {
                    Timing[Timing["DataDebounce"] = 500] = "DataDebounce";
                    Timing[Timing["MaxDelay"] = 5000] = "MaxDelay";
                })(Timing || (Timing = {}));
                const ds = new DisposableStore();
                await new Promise(resolve => {
                    const scheduler = ds.add(new RunOnceScheduler(resolve, 500 /* Timing.DataDebounce */));
                    ds.add(this._terminalService.onDidWriteTerminalData(e => {
                        if (e.terminal === terminal) {
                            scheduler.schedule();
                        }
                    }));
                    ds.add(this._terminalShellIntegrationService.onDidChangeTerminalShellIntegration(e => {
                        if (e.terminal === terminal) {
                            resolve();
                        }
                    }));
                    ds.add(disposableTimeout(resolve, 5000 /* Timing.MaxDelay */));
                });
                ds.dispose();
            }
            else {
                if (terminal.state.isInteractedWith && !terminal.shellIntegration) {
                    terminal.sendText('\u0003'); // Ctrl+C for #106743. Not part of the same command for #107969
                    await timeout(200); // mirroring https://github.com/microsoft/vscode/blob/c67ccc70ece5f472ec25464d3eeb874cfccee9f1/src/vs/workbench/contrib/terminal/browser/terminalInstance.ts#L852-L857
                }
                if (configProvider.getConfiguration('debug.terminal').get('clearBeforeReusing')) {
                    // clear terminal before reusing it
                    let clearCommand;
                    if (shell.indexOf('powershell') >= 0 || shell.indexOf('pwsh') >= 0 || shell.indexOf('cmd.exe') >= 0) {
                        clearCommand = 'cls';
                    }
                    else if (shell.indexOf('bash') >= 0) {
                        clearCommand = 'clear';
                    }
                    else if (platform.isWindows) {
                        clearCommand = 'cls';
                    }
                    else {
                        clearCommand = 'clear';
                    }
                    if (terminal.shellIntegration) {
                        const ds = new DisposableStore();
                        const execution = terminal.shellIntegration.executeCommand(clearCommand);
                        await new Promise(resolve => {
                            ds.add(this._terminalShellIntegrationService.onDidEndTerminalShellExecution(e => {
                                if (e.execution === execution) {
                                    resolve();
                                }
                            }));
                            ds.add(disposableTimeout(resolve, 500)); // 500ms timeout to ensure we resolve
                        });
                        ds.dispose();
                    }
                    else {
                        terminal.sendText(clearCommand);
                        await timeout(200); // add a small delay to ensure the command is processed, see #240953
                    }
                }
            }
            const command = prepareCommand(shell, args.args, !!args.argsCanBeInterpretedByShell, cwdForPrepareCommand, args.env);
            if (terminal.shellIntegration) {
                terminal.shellIntegration.executeCommand(command);
            }
            else {
                terminal.sendText(command);
            }
            // Mark terminal as unused when its session ends, see #112055
            const sessionListener = this.onDidTerminateDebugSession(s => {
                if (s.id === sessionId) {
                    this._integratedTerminalInstances.free(terminal);
                    sessionListener.dispose();
                }
            });
            return shellProcessId;
        }
        else if (args.kind === 'external') {
            return runInExternalTerminal(args, await this._configurationService.getConfigProvider());
        }
        return super.$runInTerminal(args, sessionId);
    }
};
ExtHostDebugService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostExtensionService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostTerminalService),
    __param(5, IExtHostTerminalShellIntegration),
    __param(6, IExtHostEditorTabs),
    __param(7, IExtHostVariableResolverProvider),
    __param(8, IExtHostCommands),
    __param(9, IExtHostTesting)
], ExtHostDebugService);
export { ExtHostDebugService };
let externalTerminalService = undefined;
function runInExternalTerminal(args, configProvider) {
    if (!externalTerminalService) {
        if (platform.isWindows) {
            externalTerminalService = new WindowsExternalTerminalService();
        }
        else if (platform.isMacintosh) {
            externalTerminalService = new MacExternalTerminalService();
        }
        else if (platform.isLinux) {
            externalTerminalService = new LinuxExternalTerminalService();
        }
        else {
            throw new Error('external terminals not supported on this platform');
        }
    }
    const config = configProvider.getConfiguration('terminal');
    return externalTerminalService.runInTerminal(args.title, args.cwd, args.args, args.env || {}, config.external || {});
}
class DebugTerminalCollection {
    constructor() {
        this._terminalInstances = new Map();
    }
    /**
     * Delay before a new terminal is a candidate for reuse. See #71850
     */
    static { this.minUseDelay = 1000; }
    async checkout(config, name, cleanupOthersByName = false) {
        const entries = [...this._terminalInstances.entries()];
        const promises = entries.map(([terminal, termInfo]) => createCancelablePromise(async (ct) => {
            // Only allow terminals that match the title.  See #123189
            if (terminal.name !== name) {
                return null;
            }
            if (termInfo.lastUsedAt !== -1 && await hasChildProcesses(await terminal.processId)) {
                return null;
            }
            // important: date check and map operations must be synchronous
            const now = Date.now();
            if (termInfo.lastUsedAt + DebugTerminalCollection.minUseDelay > now || ct.isCancellationRequested) {
                return null;
            }
            if (termInfo.config !== config) {
                if (cleanupOthersByName) {
                    terminal.dispose();
                }
                return null;
            }
            termInfo.lastUsedAt = now;
            return terminal;
        }));
        return await firstParallel(promises, (t) => !!t);
    }
    insert(terminal, termConfig) {
        this._terminalInstances.set(terminal, { lastUsedAt: Date.now(), config: termConfig });
    }
    free(terminal) {
        const info = this._terminalInstances.get(terminal);
        if (info) {
            info.lastUsedAt = -1;
        }
    }
    onTerminalClosed(terminal) {
        this._terminalInstances.delete(terminal);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdERlYnVnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JJLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFFdkMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFOUssT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzdILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUUxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQXlCLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakcsT0FBTyxFQUFFLHVCQUF1QixFQUF1QixNQUFNLGtDQUFrQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFD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