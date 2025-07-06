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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3Rlcm1pbmFsVG9vbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUczRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNkMsTUFBTSw0REFBNEQsQ0FBQztBQUN6SSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUzSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUF5QjNELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQUlqRywrQ0FBK0M7QUFDL0MseUdBQXlHO0FBQ3pHLDhEQUE4RDtBQUM5RCwwQ0FBMEM7QUFDMUMsMkZBQTJGO0FBQzNGLDBCQUEwQjtBQUMxQixJQUFJO0FBR0osTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRTtJQUN4RCxJQUFJLEVBQUUs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