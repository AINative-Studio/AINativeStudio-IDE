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
import { TerminalShellExecutionCommandLineConfidence } from './extHostTypes.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { Emitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { AsyncIterableObject, Barrier } from '../../../base/common/async.js';
export const IExtHostTerminalShellIntegration = createDecorator('IExtHostTerminalShellIntegration');
let ExtHostTerminalShellIntegration = class ExtHostTerminalShellIntegration extends Disposable {
    constructor(extHostRpc, _extHostTerminalService) {
        super();
        this._extHostTerminalService = _extHostTerminalService;
        this._activeShellIntegrations = new Map();
        this._onDidChangeTerminalShellIntegration = new Emitter();
        this.onDidChangeTerminalShellIntegration = this._onDidChangeTerminalShellIntegration.event;
        this._onDidStartTerminalShellExecution = new Emitter();
        this.onDidStartTerminalShellExecution = this._onDidStartTerminalShellExecution.event;
        this._onDidEndTerminalShellExecution = new Emitter();
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalShellIntegration);
        // Clean up listeners
        this._register(toDisposable(() => {
            for (const [_, integration] of this._activeShellIntegrations) {
                integration.dispose();
            }
            this._activeShellIntegrations.clear();
        }));
        // Convenient test code:
        // this.onDidChangeTerminalShellIntegration(e => {
        // 	console.log('*** onDidChangeTerminalShellIntegration', e);
        // });
        // this.onDidStartTerminalShellExecution(async e => {
        // 	console.log('*** onDidStartTerminalShellExecution', e);
        // 	// new Promise<void>(r => {
        // 	// 	(async () => {
        // 	// 		for await (const d of e.execution.read()) {
        // 	// 			console.log('data2', d);
        // 	// 		}
        // 	// 	})();
        // 	// });
        // 	for await (const d of e.execution.read()) {
        // 		console.log('data', d);
        // 	}
        // });
        // this.onDidEndTerminalShellExecution(e => {
        // 	console.log('*** onDidEndTerminalShellExecution', e);
        // });
        // setTimeout(() => {
        // 	console.log('before executeCommand(\"echo hello\")');
        // 	Array.from(this._activeShellIntegrations.values())[0].value.executeCommand('echo hello');
        // 	console.log('after executeCommand(\"echo hello\")');
        // }, 4000);
    }
    $shellIntegrationChange(instanceId) {
        const terminal = this._extHostTerminalService.getTerminalById(instanceId);
        if (!terminal) {
            return;
        }
        const apiTerminal = terminal.value;
        let shellIntegration = this._activeShellIntegrations.get(instanceId);
        if (!shellIntegration) {
            shellIntegration = new InternalTerminalShellIntegration(terminal.value, this._onDidStartTerminalShellExecution);
            this._activeShellIntegrations.set(instanceId, shellIntegration);
            shellIntegration.store.add(terminal.onWillDispose(() => this._activeShellIntegrations.get(instanceId)?.dispose()));
            shellIntegration.store.add(shellIntegration.onDidRequestShellExecution(commandLine => this._proxy.$executeCommand(instanceId, commandLine)));
            shellIntegration.store.add(shellIntegration.onDidRequestEndExecution(e => this._onDidEndTerminalShellExecution.fire(e)));
            shellIntegration.store.add(shellIntegration.onDidRequestChangeShellIntegration(e => this._onDidChangeTerminalShellIntegration.fire(e)));
            terminal.shellIntegration = shellIntegration.value;
        }
        this._onDidChangeTerminalShellIntegration.fire({
            terminal: apiTerminal,
            shellIntegration: shellIntegration.value
        });
    }
    $shellExecutionStart(instanceId, commandLineValue, commandLineConfidence, isTrusted, cwd) {
        // Force shellIntegration creation if it hasn't been created yet, this could when events
        // don't come through on startup
        if (!this._activeShellIntegrations.has(instanceId)) {
            this.$shellIntegrationChange(instanceId);
        }
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted
        };
        this._activeShellIntegrations.get(instanceId)?.startShellExecution(commandLine, URI.revive(cwd));
    }
    $shellExecutionEnd(instanceId, commandLineValue, commandLineConfidence, isTrusted, exitCode) {
        const commandLine = {
            value: commandLineValue,
            confidence: commandLineConfidence,
            isTrusted
        };
        this._activeShellIntegrations.get(instanceId)?.endShellExecution(commandLine, exitCode);
    }
    $shellExecutionData(instanceId, data) {
        this._activeShellIntegrations.get(instanceId)?.emitData(data);
    }
    $shellEnvChange(instanceId, shellEnvKeys, shellEnvValues, isTrusted) {
        this._activeShellIntegrations.get(instanceId)?.setEnv(shellEnvKeys, shellEnvValues, isTrusted);
    }
    $cwdChange(instanceId, cwd) {
        this._activeShellIntegrations.get(instanceId)?.setCwd(URI.revive(cwd));
    }
    $closeTerminal(instanceId) {
        this._activeShellIntegrations.get(instanceId)?.dispose();
        this._activeShellIntegrations.delete(instanceId);
    }
};
ExtHostTerminalShellIntegration = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostTerminalService)
], ExtHostTerminalShellIntegration);
export { ExtHostTerminalShellIntegration };
export class InternalTerminalShellIntegration extends Disposable {
    get currentExecution() { return this._currentExecution; }
    constructor(_terminal, _onDidStartTerminalShellExecution) {
        super();
        this._terminal = _terminal;
        this._onDidStartTerminalShellExecution = _onDidStartTerminalShellExecution;
        this._pendingExecutions = [];
        this.store = this._register(new DisposableStore());
        this._onDidRequestChangeShellIntegration = this._register(new Emitter());
        this.onDidRequestChangeShellIntegration = this._onDidRequestChangeShellIntegration.event;
        this._onDidRequestShellExecution = this._register(new Emitter());
        this.onDidRequestShellExecution = this._onDidRequestShellExecution.event;
        this._onDidRequestEndExecution = this._register(new Emitter());
        this.onDidRequestEndExecution = this._onDidRequestEndExecution.event;
        this._onDidRequestNewExecution = this._register(new Emitter());
        this.onDidRequestNewExecution = this._onDidRequestNewExecution.event;
        const that = this;
        this.value = {
            get cwd() {
                return that._cwd;
            },
            get env() {
                if (!that._env) {
                    return undefined;
                }
                return Object.freeze({
                    isTrusted: that._env.isTrusted,
                    value: Object.freeze({ ...that._env.value })
                });
            },
            // executeCommand(commandLine: string): vscode.TerminalShellExecution;
            // executeCommand(executable: string, args: string[]): vscode.TerminalShellExecution;
            executeCommand(commandLineOrExecutable, args) {
                let commandLineValue = commandLineOrExecutable;
                if (args) {
                    for (const arg of args) {
                        const wrapInQuotes = !arg.match(/["'`]/) && arg.match(/\s/);
                        if (wrapInQuotes) {
                            commandLineValue += ` "${arg}"`;
                        }
                        else {
                            commandLineValue += ` ${arg}`;
                        }
                    }
                }
                that._onDidRequestShellExecution.fire(commandLineValue);
                // Fire the event in a microtask to allow the extension to use the execution before
                // the start event fires
                const commandLine = {
                    value: commandLineValue,
                    confidence: TerminalShellExecutionCommandLineConfidence.High,
                    isTrusted: true
                };
                const execution = that.requestNewShellExecution(commandLine, that._cwd).value;
                return execution;
            }
        };
    }
    requestNewShellExecution(commandLine, cwd) {
        const execution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        const unresolvedCommandLines = splitAndSanitizeCommandLine(commandLine.value);
        if (unresolvedCommandLines.length > 1) {
            this._currentExecutionProperties = {
                isMultiLine: true,
                unresolvedCommandLines: splitAndSanitizeCommandLine(commandLine.value),
            };
        }
        this._pendingExecutions.push(execution);
        this._onDidRequestNewExecution.fire(commandLine.value);
        return execution;
    }
    startShellExecution(commandLine, cwd) {
        // Since an execution is starting, fire the end event for any execution that is awaiting to
        // end. When this happens it means that the data stream may not be flushed and therefore may
        // fire events after the end event.
        if (this._pendingEndingExecution) {
            this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._pendingEndingExecution.value, exitCode: undefined });
            this._pendingEndingExecution = undefined;
        }
        if (this._currentExecution) {
            // If the current execution is multi-line, check if this command line is part of it.
            if (this._currentExecutionProperties?.isMultiLine && this._currentExecutionProperties.unresolvedCommandLines) {
                const subExecutionResult = isSubExecution(this._currentExecutionProperties.unresolvedCommandLines, commandLine);
                if (subExecutionResult) {
                    this._currentExecutionProperties.unresolvedCommandLines = subExecutionResult.unresolvedCommandLines;
                    return;
                }
            }
            this._currentExecution.endExecution(undefined);
            this._currentExecution.flush();
            this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._currentExecution.value, exitCode: undefined });
        }
        // Get the matching pending execution, how strict this is depends on the confidence of the
        // command line
        let currentExecution;
        if (commandLine.confidence === TerminalShellExecutionCommandLineConfidence.High) {
            for (const [i, execution] of this._pendingExecutions.entries()) {
                if (execution.value.commandLine.value === commandLine.value) {
                    currentExecution = execution;
                    this._currentExecutionProperties = {
                        isMultiLine: false,
                        unresolvedCommandLines: undefined,
                    };
                    currentExecution = execution;
                    this._pendingExecutions.splice(i, 1);
                    break;
                }
                else {
                    const subExecutionResult = isSubExecution(splitAndSanitizeCommandLine(execution.value.commandLine.value), commandLine);
                    if (subExecutionResult) {
                        this._currentExecutionProperties = {
                            isMultiLine: true,
                            unresolvedCommandLines: subExecutionResult.unresolvedCommandLines,
                        };
                        currentExecution = execution;
                        this._pendingExecutions.splice(i, 1);
                        break;
                    }
                }
            }
        }
        else {
            currentExecution = this._pendingExecutions.shift();
        }
        // If there is no execution, create a new one
        if (!currentExecution) {
            // Fallback to the shell integration's cwd as the cwd may not have been restored after a reload
            currentExecution = new InternalTerminalShellExecution(commandLine, cwd ?? this._cwd);
        }
        this._currentExecution = currentExecution;
        this._onDidStartTerminalShellExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: this._currentExecution.value });
    }
    emitData(data) {
        this.currentExecution?.emitData(data);
    }
    endShellExecution(commandLine, exitCode) {
        // If the current execution is multi-line, don't end it until the next command line is
        // confirmed to not be a part of it.
        if (this._currentExecutionProperties?.isMultiLine) {
            if (this._currentExecutionProperties.unresolvedCommandLines && this._currentExecutionProperties.unresolvedCommandLines.length > 0) {
                return;
            }
        }
        if (this._currentExecution) {
            const commandLineForEvent = this._currentExecutionProperties?.isMultiLine ? this._currentExecution.value.commandLine : commandLine;
            this._currentExecution.endExecution(commandLineForEvent);
            const currentExecution = this._currentExecution;
            this._pendingEndingExecution = currentExecution;
            this._currentExecution = undefined;
            // IMPORTANT: Ensure the current execution's data events are flushed in order to
            // prevent data events firing after the end event fires.
            currentExecution.flush().then(() => {
                // Only fire if it's still the same execution, if it's changed it would have already
                // been fired.
                if (this._pendingEndingExecution === currentExecution) {
                    this._onDidRequestEndExecution.fire({ terminal: this._terminal, shellIntegration: this.value, execution: currentExecution.value, exitCode });
                    this._pendingEndingExecution = undefined;
                }
            });
        }
    }
    setEnv(keys, values, isTrusted) {
        const env = {};
        for (let i = 0; i < keys.length; i++) {
            env[keys[i]] = values[i];
        }
        this._env = { value: env, isTrusted };
        this._fireChangeEvent();
    }
    setCwd(cwd) {
        let wasChanged = false;
        if (URI.isUri(this._cwd)) {
            wasChanged = !URI.isUri(cwd) || this._cwd.toString() !== cwd.toString();
        }
        else if (this._cwd !== cwd) {
            wasChanged = true;
        }
        if (wasChanged) {
            this._cwd = cwd;
            this._fireChangeEvent();
        }
    }
    _fireChangeEvent() {
        this._onDidRequestChangeShellIntegration.fire({ terminal: this._terminal, shellIntegration: this.value });
    }
}
class InternalTerminalShellExecution {
    constructor(_commandLine, cwd) {
        this._commandLine = _commandLine;
        this.cwd = cwd;
        this._isEnded = false;
        const that = this;
        this.value = {
            get commandLine() {
                return that._commandLine;
            },
            get cwd() {
                return that.cwd;
            },
            read() {
                return that._createDataStream();
            }
        };
    }
    _createDataStream() {
        if (!this._dataStream) {
            if (this._isEnded) {
                return AsyncIterableObject.EMPTY;
            }
            this._dataStream = new ShellExecutionDataStream();
        }
        return this._dataStream.createIterable();
    }
    emitData(data) {
        if (!this._isEnded) {
            this._dataStream?.emitData(data);
        }
    }
    endExecution(commandLine) {
        if (commandLine) {
            this._commandLine = commandLine;
        }
        this._dataStream?.endExecution();
        this._isEnded = true;
    }
    async flush() {
        if (this._dataStream) {
            await this._dataStream.flush();
            this._dataStream.dispose();
            this._dataStream = undefined;
        }
    }
}
class ShellExecutionDataStream extends Disposable {
    constructor() {
        super(...arguments);
        this._iterables = [];
        this._emitters = [];
    }
    createIterable() {
        if (!this._barrier) {
            this._barrier = new Barrier();
        }
        const barrier = this._barrier;
        const iterable = new AsyncIterableObject(async (emitter) => {
            this._emitters.push(emitter);
            await barrier.wait();
        });
        this._iterables.push(iterable);
        return iterable;
    }
    emitData(data) {
        for (const emitter of this._emitters) {
            emitter.emitOne(data);
        }
    }
    endExecution() {
        this._barrier?.open();
    }
    async flush() {
        await Promise.all(this._iterables.map(e => e.toPromise()));
    }
}
function splitAndSanitizeCommandLine(commandLine) {
    return commandLine
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}
/**
 * When executing something that the shell considers multiple commands, such as
 * a comment followed by a command, this needs to all be tracked under a single
 * execution.
 */
function isSubExecution(unresolvedCommandLines, commandLine) {
    if (unresolvedCommandLines.length === 0) {
        return false;
    }
    const newUnresolvedCommandLines = [...unresolvedCommandLines];
    const subExecutionLines = splitAndSanitizeCommandLine(commandLine.value);
    if (newUnresolvedCommandLines && newUnresolvedCommandLines.length > 0) {
        // If all sub-execution lines are in the command line, this is part of the
        // multi-line execution.
        while (newUnresolvedCommandLines.length > 0) {
            if (newUnresolvedCommandLines[0] !== subExecutionLines[0]) {
                break;
            }
            newUnresolvedCommandLines.shift();
            subExecutionLines.shift();
        }
        if (subExecutionLines.length === 0) {
            return { unresolvedCommandLines: newUnresolvedCommandLines };
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2hlbGxJbnRlZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGVybWluYWxTaGVsbEludGVncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUEyRixNQUFNLHVCQUF1QixDQUFDO0FBQzdJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQWMsTUFBTSwrQkFBK0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFzQixNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFTeEcsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsZUFBZSxDQUFtQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRS9ILElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsVUFBVTtJQWU5RCxZQUNxQixVQUE4QixFQUN6Qix1QkFBaUU7UUFFMUYsS0FBSyxFQUFFLENBQUM7UUFGa0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQVhuRiw2QkFBd0IsR0FBZ0UsSUFBSSxH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