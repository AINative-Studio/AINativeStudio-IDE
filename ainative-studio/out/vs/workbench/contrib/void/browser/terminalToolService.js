/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalService } from '../../../../workbench/contrib/terminal/browser/terminal.js';
import { MAX_TERMINAL_BG_COMMAND_TIME, MAX_TERMINAL_CHARS, MAX_TERMINAL_INACTIVE_TIME } from '../common/prompt/prompts.js';
import { timeout } from '../../../../base/common/async.js';
export const ITerminalToolService = createDecorator('TerminalToolService');
// function isCommandComplete(output: string) {
// 	// https://code.visualstudio.com/docs/terminal/shell-integration#_vs-code-custom-sequences-osc-633-st
// 	const completionMatch = output.match(/\]633;D(?:;(\d+))?/)
// 	if (!completionMatch) { return false }
// 	if (completionMatch[1] !== undefined) return { exitCode: parseInt(completionMatch[1]) }
// 	return { exitCode: 0 }
// }
export const persistentTerminalNameOfId = (id) => {
    if (id === '1')
        return 'Void Agent';
    return `Void Agent (${id})`;
};
export const idOfPersistentTerminalName = (name) => {
    if (name === 'Void Agent')
        return '1';
    const match = name.match(/Void Agent \((\d+)\)/);
    if (!match)
        return null;
    if (Number.isInteger(match[1]) && Number(match[1]) >= 1)
        return match[1];
    return null;
};
let TerminalToolService = class TerminalToolService extends Disposable {
    constructor(terminalService, workspaceContextService) {
        super();
        this.terminalService = terminalService;
        this.workspaceContextService = workspaceContextService;
        this.persistentTerminalInstanceOfId = {};
        this.temporaryTerminalInstanceOfId = {};
        this.createPersistentTerminal = async ({ cwd }) => {
            const terminalId = this.getValidNewTerminalId();
            const config = { name: persistentTerminalNameOfId(terminalId), title: persistentTerminalNameOfId(terminalId) };
            const terminal = await this._createTerminal({ cwd, config, });
            this.persistentTerminalInstanceOfId[terminalId] = terminal;
            return terminalId;
        };
        this.focusPersistentTerminal = async (terminalId) => {
            if (!terminalId)
                return;
            const terminal = this.persistentTerminalInstanceOfId[terminalId];
            if (!terminal)
                return; // should never happen
            this.terminalService.setActiveInstance(terminal);
            await this.terminalService.focusActiveInstance();
        };
        this.readTerminal = async (terminalId) => {
            // Try persistent first, then temporary
            const terminal = this.getPersistentTerminal(terminalId) ?? this.getTemporaryTerminal(terminalId);
            if (!terminal) {
                throw new Error(`Read Terminal: Terminal with ID ${terminalId} does not exist.`);
            }
            // Ensure the xterm.js instance has been created – otherwise we cannot access the buffer.
            if (!terminal.xterm) {
                throw new Error('Read Terminal: The requested terminal has not yet been rendered and therefore has no scrollback buffer available.');
            }
            // Collect lines from the buffer iterator (oldest to newest)
            const lines = [];
            for (const line of terminal.xterm.getBufferReverseIterator()) {
                lines.unshift(line);
            }
            let result = removeAnsiEscapeCodes(lines.join('\n'));
            if (result.length > MAX_TERMINAL_CHARS) {
                const half = MAX_TERMINAL_CHARS / 2;
                result = result.slice(0, half) + '\n...\n' + result.slice(result.length - half);
            }
            return result;
        };
        this.runCommand = async (command, params) => {
            await this.terminalService.whenConnected;
            const { type } = params;
            const isPersistent = type === 'persistent';
            let terminal;
            const disposables = [];
            if (isPersistent) { // BG process
                const { persistentTerminalId } = params;
                terminal = this.persistentTerminalInstanceOfId[persistentTerminalId];
                if (!terminal)
                    throw new Error(`Unexpected internal error: Terminal with ID ${persistentTerminalId} did not exist.`);
            }
            else {
                const { cwd } = params;
                terminal = await this._createTerminal({ cwd: cwd, config: undefined, hidden: true });
                this.temporaryTerminalInstanceOfId[params.terminalId] = terminal;
            }
            const interrupt = () => {
                terminal.dispose();
                if (!isPersistent)
                    delete this.temporaryTerminalInstanceOfId[params.terminalId];
                else
                    delete this.persistentTerminalInstanceOfId[params.persistentTerminalId];
            };
            const waitForResult = async () => {
                if (isPersistent) {
                    // focus the terminal about to run
                    this.terminalService.setActiveInstance(terminal);
                    await this.terminalService.focusActiveInstance();
                }
                let result = '';
                let resolveReason;
                const cmdCap = await this._waitForCommandDetectionCapability(terminal);
                // if (!cmdCap) throw new Error(`There was an error using the terminal: CommandDetection capability did not mount yet. Please try again in a few seconds or report this to the Void team.`)
                // Prefer the structured command-detection capability when available
                const waitUntilDone = new Promise(resolve => {
                    if (!cmdCap)
                        return;
                    const l = cmdCap.onCommandFinished(cmd => {
                        if (resolveReason)
                            return; // already resolved
                        resolveReason = { type: 'done', exitCode: cmd.exitCode ?? 0 };
                        result = cmd.getOutput() ?? '';
                        l.dispose();
                        resolve();
                    });
                    disposables.push(l);
                });
                // send the command now that listeners are attached
                await terminal.sendText(command, true);
                const waitUntilInterrupt = isPersistent ?
                    // timeout after X seconds
                    new Promise((res) => {
                        setTimeout(() => {
                            resolveReason = { type: 'timeout' };
                            res();
                        }, MAX_TERMINAL_BG_COMMAND_TIME * 1000);
                    })
                    // inactivity-based timeout
                    : new Promise(res => {
                        let globalTimeoutId;
                        const resetTimer = () => {
                            clearTimeout(globalTimeoutId);
                            globalTimeoutId = setTimeout(() => {
                                if (resolveReason)
                                    return;
                                resolveReason = { type: 'timeout' };
                                res();
                            }, MAX_TERMINAL_INACTIVE_TIME * 1000);
                        };
                        const dTimeout = terminal.onData(() => { resetTimer(); });
                        disposables.push(dTimeout, toDisposable(() => clearTimeout(globalTimeoutId)));
                        resetTimer();
                    });
                // wait for result
                await Promise.any([waitUntilDone, waitUntilInterrupt])
                    .finally(() => disposables.forEach(d => d.dispose()));
                // read result if timed out, since we didn't get it (could clean this code up but it's ok)
                if (resolveReason?.type === 'timeout') {
                    const terminalId = isPersistent ? params.persistentTerminalId : params.terminalId;
                    result = await this.readTerminal(terminalId);
                }
                if (!isPersistent) {
                    interrupt();
                }
                if (!resolveReason)
                    throw new Error('Unexpected internal error: Promise.any should have resolved with a reason.');
                if (!isPersistent)
                    result = `$ ${command}\n${result}`;
                result = removeAnsiEscapeCodes(result);
                // trim
                if (result.length > MAX_TERMINAL_CHARS) {
                    const half = MAX_TERMINAL_CHARS / 2;
                    result = result.slice(0, half)
                        + '\n...\n'
                        + result.slice(result.length - half, Infinity);
                }
                return { result, resolveReason };
            };
            const resPromise = waitForResult();
            return {
                interrupt,
                resPromise,
            };
        };
        // runs on ALL terminals for simplicity
        const initializeTerminal = (terminal) => {
            // when exit, remove
            const d = terminal.onExit(() => {
                const terminalId = idOfPersistentTerminalName(terminal.title);
                if (terminalId !== null && (terminalId in this.persistentTerminalInstanceOfId))
                    delete this.persistentTerminalInstanceOfId[terminalId];
                d.dispose();
            });
        };
        // initialize any terminals that are already open
        for (const terminal of terminalService.instances) {
            const proposedTerminalId = idOfPersistentTerminalName(terminal.title);
            if (proposedTerminalId)
                this.persistentTerminalInstanceOfId[proposedTerminalId] = terminal;
            initializeTerminal(terminal);
        }
        this._register(terminalService.onDidCreateInstance(terminal => { initializeTerminal(terminal); }));
    }
    listPersistentTerminalIds() {
        return Object.keys(this.persistentTerminalInstanceOfId);
    }
    getValidNewTerminalId() {
        // {1 2 3} # size 3, new=4
        // {1 3 4} # size 3, new=2
        // 1 <= newTerminalId <= n + 1
        const n = Object.keys(this.persistentTerminalInstanceOfId).length;
        if (n === 0)
            return '1';
        for (let i = 1; i <= n + 1; i++) {
            const potentialId = i + '';
            if (!(potentialId in this.persistentTerminalInstanceOfId))
                return potentialId;
        }
        throw new Error('This should never be reached by pigeonhole principle');
    }
    async _createTerminal(props) {
        const { cwd: override_cwd, config, hidden } = props;
        const cwd = (override_cwd ?? undefined) ?? this.workspaceContextService.getWorkspace().folders[0]?.uri;
        const options = {
            cwd,
            location: hidden ? undefined : TerminalLocation.Panel,
            config: {
                name: config && 'name' in config ? config.name : undefined,
                forceShellIntegration: true,
                hideFromUser: hidden ? true : undefined,
                // Copy any other properties from the provided config
                ...config,
            },
            // Skip profile check to ensure the terminal is created quickly
            skipContributedProfileCheck: true,
        };
        const terminal = await this.terminalService.createTerminal(options);
        // // when a new terminal is created, there is an initial command that gets run which is empty, wait for it to end before returning
        // const disposables: IDisposable[] = []
        // const waitForMount = new Promise<void>(res => {
        // 	let data = ''
        // 	const d = terminal.onData(newData => {
        // 		data += newData
        // 		if (isCommandComplete(data)) { res() }
        // 	})
        // 	disposables.push(d)
        // })
        // const waitForTimeout = new Promise<void>(res => { setTimeout(() => { res() }, 5000) })
        // await Promise.any([waitForMount, waitForTimeout,])
        // disposables.forEach(d => d.dispose())
        return terminal;
    }
    async killPersistentTerminal(terminalId) {
        const terminal = this.persistentTerminalInstanceOfId[terminalId];
        if (!terminal)
            throw new Error(`Kill Terminal: Terminal with ID ${terminalId} did not exist.`);
        terminal.dispose();
        delete this.persistentTerminalInstanceOfId[terminalId];
        return;
    }
    persistentTerminalExists(terminalId) {
        return terminalId in this.persistentTerminalInstanceOfId;
    }
    getTemporaryTerminal(terminalId) {
        if (!terminalId)
            return;
        const terminal = this.temporaryTerminalInstanceOfId[terminalId];
        if (!terminal)
            return; // should never happen
        return terminal;
    }
    getPersistentTerminal(terminalId) {
        if (!terminalId)
            return;
        const terminal = this.persistentTerminalInstanceOfId[terminalId];
        if (!terminal)
            return; // should never happen
        return terminal;
    }
    async _waitForCommandDetectionCapability(terminal) {
        const cmdCap = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (cmdCap)
            return cmdCap;
        const disposables = [];
        const waitTimeout = timeout(10_000);
        const waitForCapability = new Promise((res) => {
            disposables.push(terminal.capabilities.onDidAddCapability((e) => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */)
                    res(e.capability);
            }));
        });
        const capability = await Promise.any([waitTimeout, waitForCapability])
            .finally(() => { disposables.forEach((d) => d.dispose()); });
        return capability ?? undefined;
    }
};
TerminalToolService = __decorate([
    __param(0, ITerminalService),
    __param(1, IWorkspaceContextService)
], TerminalToolService);
export { TerminalToolService };
registerSingleton(ITerminalToolService, TerminalToolService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci90ZXJtaW5hbFRvb2xTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQTZDLE1BQU0sNERBQTRELENBQUM7QUFDekksT0FBTyxFQUFFLDRCQUE0QixFQUFFLGtCQUFrQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFM0gsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBeUIzRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFJakcsK0NBQStDO0FBQy9DLHlHQUF5RztBQUN6Ryw4REFBOEQ7QUFDOUQsMENBQTBDO0FBQzFDLDJGQUEyRjtBQUMzRiwwQkFBMEI7QUFDMUIsSUFBSTtBQUdKLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUU7SUFDeEQsSUFBSSxFQUFFLEtBQUss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