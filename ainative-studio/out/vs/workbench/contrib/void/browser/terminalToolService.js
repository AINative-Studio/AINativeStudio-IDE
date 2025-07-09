/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdGVybWluYWxUb29sU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUE2QyxNQUFNLDREQUE0RCxDQUFDO0FBQ3pJLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTNILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQXlCM0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBSWpHLCtDQUErQztBQUMvQyx5R0FBeUc7QUFDekcsOERBQThEO0FBQzlELDBDQUEwQztBQUMxQywyRkFBMkY7QUFDM0YsMEJBQTBCO0FBQzFCLElBQUk7QUFHSixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFO0lBQ3hELElBQUksRUFBRSxLQUFL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