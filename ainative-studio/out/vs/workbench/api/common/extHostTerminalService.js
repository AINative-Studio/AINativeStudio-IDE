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
import { Emitter } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../base/common/uri.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { DisposableStore, Disposable, MutableDisposable } from '../../../base/common/lifecycle.js';
import { Disposable as VSCodeDisposable, EnvironmentVariableMutatorType } from './extHostTypes.js';
import { localize } from '../../../nls.js';
import { NotSupportedError } from '../../../base/common/errors.js';
import { serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection } from '../../../platform/terminal/common/environmentVariableShared.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { TerminalDataBufferer } from '../../../platform/terminal/common/terminalDataBuffering.js';
import { ThemeColor } from '../../../base/common/themables.js';
import { Promises } from '../../../base/common/async.js';
import { TerminalCompletionList, TerminalQuickFix, ViewColumn } from './extHostTypeConverters.js';
import { IExtHostCommands } from './extHostCommands.js';
export const IExtHostTerminalService = createDecorator('IExtHostTerminalService');
export class ExtHostTerminal extends Disposable {
    constructor(_proxy, _id, _creationOptions, _name) {
        super();
        this._proxy = _proxy;
        this._id = _id;
        this._creationOptions = _creationOptions;
        this._name = _name;
        this._disposed = false;
        this._state = { isInteractedWith: false, shell: undefined };
        this.isOpen = false;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._creationOptions = Object.freeze(this._creationOptions);
        this._pidPromise = new Promise(c => this._pidPromiseComplete = c);
        const that = this;
        this.value = {
            get name() {
                return that._name || '';
            },
            get processId() {
                return that._pidPromise;
            },
            get creationOptions() {
                return that._creationOptions;
            },
            get exitStatus() {
                return that._exitStatus;
            },
            get state() {
                return that._state;
            },
            get selection() {
                return that._selection;
            },
            get shellIntegration() {
                return that.shellIntegration;
            },
            sendText(text, shouldExecute = true) {
                that._checkDisposed();
                that._proxy.$sendText(that._id, text, shouldExecute);
            },
            show(preserveFocus) {
                that._checkDisposed();
                that._proxy.$show(that._id, preserveFocus);
            },
            hide() {
                that._checkDisposed();
                that._proxy.$hide(that._id);
            },
            dispose() {
                if (!that._disposed) {
                    that._disposed = true;
                    that._proxy.$dispose(that._id);
                }
            },
            get dimensions() {
                if (that._cols === undefined || that._rows === undefined) {
                    return undefined;
                }
                return {
                    columns: that._cols,
                    rows: that._rows
                };
            }
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
    async create(options, internalOptions) {
        if (typeof this._id !== 'string') {
            throw new Error('Terminal has already been created');
        }
        await this._proxy.$createTerminal(this._id, {
            name: options.name,
            shellPath: options.shellPath ?? undefined,
            shellArgs: options.shellArgs ?? undefined,
            cwd: options.cwd ?? internalOptions?.cwd ?? undefined,
            env: options.env ?? undefined,
            icon: asTerminalIcon(options.iconPath) ?? undefined,
            color: ThemeColor.isThemeColor(options.color) ? options.color.id : undefined,
            initialText: options.message ?? undefined,
            strictEnv: options.strictEnv ?? undefined,
            hideFromUser: options.hideFromUser ?? undefined,
            forceShellIntegration: internalOptions?.forceShellIntegration ?? undefined,
            isFeatureTerminal: internalOptions?.isFeatureTerminal ?? undefined,
            isExtensionOwnedTerminal: true,
            useShellEnvironment: internalOptions?.useShellEnvironment ?? undefined,
            location: internalOptions?.location || this._serializeParentTerminal(options.location, internalOptions?.resolvedExtHostIdentifier),
            isTransient: options.isTransient ?? undefined,
        });
    }
    async createExtensionTerminal(location, internalOptions, parentTerminal, iconPath, color) {
        if (typeof this._id !== 'string') {
            throw new Error('Terminal has already been created');
        }
        await this._proxy.$createTerminal(this._id, {
            name: this._name,
            isExtensionCustomPtyTerminal: true,
            icon: iconPath,
            color: ThemeColor.isThemeColor(color) ? color.id : undefined,
            location: internalOptions?.location || this._serializeParentTerminal(location, parentTerminal),
            isTransient: true
        });
        // At this point, the id has been set via `$acceptTerminalOpened`
        if (typeof this._id === 'string') {
            throw new Error('Terminal creation failed');
        }
        return this._id;
    }
    _serializeParentTerminal(location, parentTerminal) {
        if (typeof location === 'object') {
            if ('parentTerminal' in location && location.parentTerminal && parentTerminal) {
                return { parentTerminal };
            }
            if ('viewColumn' in location) {
                return { viewColumn: ViewColumn.from(location.viewColumn), preserveFocus: location.preserveFocus };
            }
            return undefined;
        }
        return location;
    }
    _checkDisposed() {
        if (this._disposed) {
            throw new Error('Terminal has already been disposed');
        }
    }
    set name(name) {
        this._name = name;
    }
    setExitStatus(code, reason) {
        this._exitStatus = Object.freeze({ code, reason });
    }
    setDimensions(cols, rows) {
        if (cols === this._cols && rows === this._rows) {
            // Nothing changed
            return false;
        }
        if (cols === 0 || rows === 0) {
            return false;
        }
        this._cols = cols;
        this._rows = rows;
        return true;
    }
    setInteractedWith() {
        if (!this._state.isInteractedWith) {
            this._state = {
                ...this._state,
                isInteractedWith: true
            };
            return true;
        }
        return false;
    }
    setShellType(shellType) {
        if (this._state.shell !== shellType) {
            this._state = {
                ...this._state,
                shell: shellType
            };
            return true;
        }
        return false;
    }
    setSelection(selection) {
        this._selection = selection;
    }
    _setProcessId(processId) {
        // The event may fire 2 times when the panel is restored
        if (this._pidPromiseComplete) {
            this._pidPromiseComplete(processId);
            this._pidPromiseComplete = undefined;
        }
        else {
            // Recreate the promise if this is the nth processId set (e.g. reused task terminals)
            this._pidPromise.then(pid => {
                if (pid !== processId) {
                    this._pidPromise = Promise.resolve(processId);
                }
            });
        }
    }
}
class ExtHostPseudoterminal {
    get onProcessReady() { return this._onProcessReady.event; }
    constructor(_pty) {
        this._pty = _pty;
        this.id = 0;
        this.shouldPersist = false;
        this._onProcessData = new Emitter();
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = new Emitter();
        this._onDidChangeProperty = new Emitter();
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = new Emitter();
        this.onProcessExit = this._onProcessExit.event;
    }
    refreshProperty(property) {
        throw new Error(`refreshProperty is not suppported in extension owned terminals. property: ${property}`);
    }
    updateProperty(property, value) {
        throw new Error(`updateProperty is not suppported in extension owned terminals. property: ${property}, value: ${value}`);
    }
    async start() {
        return undefined;
    }
    shutdown() {
        this._pty.close();
    }
    input(data) {
        this._pty.handleInput?.(data);
    }
    resize(cols, rows) {
        this._pty.setDimensions?.({ columns: cols, rows });
    }
    clearBuffer() {
        // no-op
    }
    async processBinary(data) {
        // No-op, processBinary is not supported in extension owned terminals.
    }
    acknowledgeDataEvent(charCount) {
        // No-op, flow control is not supported in extension owned terminals. If this is ever
        // implemented it will need new pause and resume VS Code APIs.
    }
    async setUnicodeVersion(version) {
        // No-op, xterm-headless isn't used for extension owned terminals.
    }
    getInitialCwd() {
        return Promise.resolve('');
    }
    getCwd() {
        return Promise.resolve('');
    }
    startSendingEvents(initialDimensions) {
        // Attach the listeners
        this._pty.onDidWrite(e => this._onProcessData.fire(e));
        this._pty.onDidClose?.((e = undefined) => {
            this._onProcessExit.fire(e === void 0 ? undefined : e);
        });
        this._pty.onDidOverrideDimensions?.(e => {
            if (e) {
                this._onDidChangeProperty.fire({ type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */, value: { cols: e.columns, rows: e.rows } });
            }
        });
        this._pty.onDidChangeName?.(title => {
            this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: title });
        });
        this._pty.open(initialDimensions ? initialDimensions : undefined);
        if (initialDimensions) {
            this._pty.setDimensions?.(initialDimensions);
        }
        this._onProcessReady.fire({ pid: -1, cwd: '', windowsPty: undefined });
    }
}
let nextLinkId = 1;
let BaseExtHostTerminalService = class BaseExtHostTerminalService extends Disposable {
    get activeTerminal() { return this._activeTerminal?.value; }
    get terminals() { return this._terminals.map(term => term.value); }
    constructor(supportsProcesses, _extHostCommands, extHostRpc) {
        super();
        this._extHostCommands = _extHostCommands;
        this._terminals = [];
        this._terminalProcesses = new Map();
        this._terminalProcessDisposables = {};
        this._extensionTerminalAwaitingStart = {};
        this._getTerminalPromises = {};
        this._environmentVariableCollections = new Map();
        this._lastQuickFixCommands = this._register(new MutableDisposable());
        this._linkProviders = new Set();
        this._completionProviders = new Map();
        this._profileProviders = new Map();
        this._quickFixProviders = new Map();
        this._terminalLinkCache = new Map();
        this._terminalLinkCancellationSource = new Map();
        this._onDidCloseTerminal = new Emitter();
        this.onDidCloseTerminal = this._onDidCloseTerminal.event;
        this._onDidOpenTerminal = new Emitter();
        this.onDidOpenTerminal = this._onDidOpenTerminal.event;
        this._onDidChangeActiveTerminal = new Emitter();
        this.onDidChangeActiveTerminal = this._onDidChangeActiveTerminal.event;
        this._onDidChangeTerminalDimensions = new Emitter();
        this.onDidChangeTerminalDimensions = this._onDidChangeTerminalDimensions.event;
        this._onDidChangeTerminalState = new Emitter();
        this.onDidChangeTerminalState = this._onDidChangeTerminalState.event;
        this._onDidChangeShell = new Emitter();
        this.onDidChangeShell = this._onDidChangeShell.event;
        this._onDidWriteTerminalData = new Emitter({
            onWillAddFirstListener: () => this._proxy.$startSendingDataEvents(),
            onDidRemoveLastListener: () => this._proxy.$stopSendingDataEvents()
        });
        this.onDidWriteTerminalData = this._onDidWriteTerminalData.event;
        this._onDidExecuteCommand = new Emitter({
            onWillAddFirstListener: () => this._proxy.$startSendingCommandEvents(),
            onDidRemoveLastListener: () => this._proxy.$stopSendingCommandEvents()
        });
        this.onDidExecuteTerminalCommand = this._onDidExecuteCommand.event;
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalService);
        this._bufferer = new TerminalDataBufferer(this._proxy.$sendProcessData);
        this._proxy.$registerProcessSupport(supportsProcesses);
        this._extHostCommands.registerArgumentProcessor({
            processArgument: arg => {
                const deserialize = (arg) => {
                    const cast = arg;
                    return this.getTerminalById(cast.instanceId)?.value;
                };
                switch (arg?.$mid) {
                    case 15 /* MarshalledId.TerminalContext */: return deserialize(arg);
                    default: {
                        // Do array transformation in place as this is a hot path
                        if (Array.isArray(arg)) {
                            for (let i = 0; i < arg.length; i++) {
                                if (arg[i].$mid === 15 /* MarshalledId.TerminalContext */) {
                                    arg[i] = deserialize(arg[i]);
                                }
                                else {
                                    // Probably something else, so exit early
                                    break;
                                }
                            }
                        }
                        return arg;
                    }
                }
            }
        });
        this._register({
            dispose: () => {
                for (const [_, terminalProcess] of this._terminalProcesses) {
                    terminalProcess.shutdown(true);
                }
            }
        });
    }
    getDefaultShell(useAutomationShell) {
        const profile = useAutomationShell ? this._defaultAutomationProfile : this._defaultProfile;
        return profile?.path || '';
    }
    getDefaultShellArgs(useAutomationShell) {
        const profile = useAutomationShell ? this._defaultAutomationProfile : this._defaultProfile;
        return profile?.args || [];
    }
    createExtensionTerminal(options, internalOptions) {
        const terminal = new ExtHostTerminal(this._proxy, generateUuid(), options, options.name);
        const p = new ExtHostPseudoterminal(options.pty);
        terminal.createExtensionTerminal(options.location, internalOptions, this._serializeParentTerminal(options, internalOptions).resolvedExtHostIdentifier, asTerminalIcon(options.iconPath), asTerminalColor(options.color)).then(id => {
            const disposable = this._setupExtHostProcessListeners(id, p);
            this._terminalProcessDisposables[id] = disposable;
        });
        this._terminals.push(terminal);
        return terminal.value;
    }
    _serializeParentTerminal(options, internalOptions) {
        internalOptions = internalOptions ? internalOptions : {};
        if (options.location && typeof options.location === 'object' && 'parentTerminal' in options.location) {
            const parentTerminal = options.location.parentTerminal;
            if (parentTerminal) {
                const parentExtHostTerminal = this._terminals.find(t => t.value === parentTerminal);
                if (parentExtHostTerminal) {
                    internalOptions.resolvedExtHostIdentifier = parentExtHostTerminal._id;
                }
            }
        }
        else if (options.location && typeof options.location !== 'object') {
            internalOptions.location = options.location;
        }
        else if (internalOptions.location && typeof internalOptions.location === 'object' && 'splitActiveTerminal' in internalOptions.location) {
            internalOptions.location = { splitActiveTerminal: true };
        }
        return internalOptions;
    }
    attachPtyToTerminal(id, pty) {
        const terminal = this.getTerminalById(id);
        if (!terminal) {
            throw new Error(`Cannot resolve terminal with id ${id} for virtual process`);
        }
        const p = new ExtHostPseudoterminal(pty);
        const disposable = this._setupExtHostProcessListeners(id, p);
        this._terminalProcessDisposables[id] = disposable;
    }
    async $acceptActiveTerminalChanged(id) {
        const original = this._activeTerminal;
        if (id === null) {
            this._activeTerminal = undefined;
            if (original !== this._activeTerminal) {
                this._onDidChangeActiveTerminal.fire(this._activeTerminal);
            }
            return;
        }
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._activeTerminal = terminal;
            if (original !== this._activeTerminal) {
                this._onDidChangeActiveTerminal.fire(this._activeTerminal.value);
            }
        }
    }
    async $acceptTerminalProcessData(id, data) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._onDidWriteTerminalData.fire({ terminal: terminal.value, data });
        }
    }
    async $acceptTerminalDimensions(id, cols, rows) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            if (terminal.setDimensions(cols, rows)) {
                this._onDidChangeTerminalDimensions.fire({
                    terminal: terminal.value,
                    dimensions: terminal.value.dimensions
                });
            }
        }
    }
    async $acceptDidExecuteCommand(id, command) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            this._onDidExecuteCommand.fire({ terminal: terminal.value, ...command });
        }
    }
    async $acceptTerminalMaximumDimensions(id, cols, rows) {
        // Extension pty terminal only - when virtual process resize fires it means that the
        // terminal's maximum dimensions changed
        this._terminalProcesses.get(id)?.resize(cols, rows);
    }
    async $acceptTerminalTitleChange(id, name) {
        const terminal = this.getTerminalById(id);
        if (terminal) {
            terminal.name = name;
        }
    }
    async $acceptTerminalClosed(id, exitCode, exitReason) {
        const index = this._getTerminalObjectIndexById(this._terminals, id);
        if (index !== null) {
            const terminal = this._terminals.splice(index, 1)[0];
            terminal.setExitStatus(exitCode, exitReason);
            this._onDidCloseTerminal.fire(terminal.value);
        }
    }
    $acceptTerminalOpened(id, extHostTerminalId, name, shellLaunchConfigDto) {
        if (extHostTerminalId) {
            // Resolve with the renderer generated id
            const index = this._getTerminalObjectIndexById(this._terminals, extHostTerminalId);
            if (index !== null) {
                // The terminal has already been created (via createTerminal*), only fire the event
                this._terminals[index]._id = id;
                this._onDidOpenTerminal.fire(this.terminals[index]);
                this._terminals[index].isOpen = true;
                return;
            }
        }
        const creationOptions = {
            name: shellLaunchConfigDto.name,
            shellPath: shellLaunchConfigDto.executable,
            shellArgs: shellLaunchConfigDto.args,
            cwd: typeof shellLaunchConfigDto.cwd === 'string' ? shellLaunchConfigDto.cwd : URI.revive(shellLaunchConfigDto.cwd),
            env: shellLaunchConfigDto.env,
            hideFromUser: shellLaunchConfigDto.hideFromUser
        };
        const terminal = new ExtHostTerminal(this._proxy, id, creationOptions, name);
        this._terminals.push(terminal);
        this._onDidOpenTerminal.fire(terminal.value);
        terminal.isOpen = true;
    }
    async $acceptTerminalProcessId(id, processId) {
        const terminal = this.getTerminalById(id);
        terminal?._setProcessId(processId);
    }
    async $startExtensionTerminal(id, initialDimensions) {
        // Make sure the ExtHostTerminal exists so onDidOpenTerminal has fired before we call
        // Pseudoterminal.start
        const terminal = this.getTerminalById(id);
        if (!terminal) {
            return { message: localize('launchFail.idMissingOnExtHost', "Could not find the terminal with id {0} on the extension host", id) };
        }
        // Wait for onDidOpenTerminal to fire
        if (!terminal.isOpen) {
            await new Promise(r => {
                // Ensure open is called after onDidOpenTerminal
                const listener = this.onDidOpenTerminal(async (e) => {
                    if (e === terminal.value) {
                        listener.dispose();
                        r();
                    }
                });
            });
        }
        const terminalProcess = this._terminalProcesses.get(id);
        if (terminalProcess) {
            terminalProcess.startSendingEvents(initialDimensions);
        }
        else {
            // Defer startSendingEvents call to when _setupExtHostProcessListeners is called
            this._extensionTerminalAwaitingStart[id] = { initialDimensions };
        }
        return undefined;
    }
    _setupExtHostProcessListeners(id, p) {
        const disposables = new DisposableStore();
        disposables.add(p.onProcessReady(e => this._proxy.$sendProcessReady(id, e.pid, e.cwd, e.windowsPty)));
        disposables.add(p.onDidChangeProperty(property => this._proxy.$sendProcessProperty(id, property)));
        // Buffer data events to reduce the amount of messages going to the renderer
        this._bufferer.startBuffering(id, p.onProcessData);
        disposables.add(p.onProcessExit(exitCode => this._onProcessExit(id, exitCode)));
        this._terminalProcesses.set(id, p);
        const awaitingStart = this._extensionTerminalAwaitingStart[id];
        if (awaitingStart && p instanceof ExtHostPseudoterminal) {
            p.startSendingEvents(awaitingStart.initialDimensions);
            delete this._extensionTerminalAwaitingStart[id];
        }
        return disposables;
    }
    $acceptProcessAckDataEvent(id, charCount) {
        this._terminalProcesses.get(id)?.acknowledgeDataEvent(charCount);
    }
    $acceptProcessInput(id, data) {
        this._terminalProcesses.get(id)?.input(data);
    }
    $acceptTerminalInteraction(id) {
        const terminal = this.getTerminalById(id);
        if (terminal?.setInteractedWith()) {
            this._onDidChangeTerminalState.fire(terminal.value);
        }
    }
    $acceptTerminalSelection(id, selection) {
        this.getTerminalById(id)?.setSelection(selection);
    }
    $acceptProcessResize(id, cols, rows) {
        try {
            this._terminalProcesses.get(id)?.resize(cols, rows);
        }
        catch (error) {
            // We tried to write to a closed pipe / channel.
            if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                throw (error);
            }
        }
    }
    $acceptProcessShutdown(id, immediate) {
        this._terminalProcesses.get(id)?.shutdown(immediate);
    }
    $acceptProcessRequestInitialCwd(id) {
        this._terminalProcesses.get(id)?.getInitialCwd().then(initialCwd => this._proxy.$sendProcessProperty(id, { type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: initialCwd }));
    }
    $acceptProcessRequestCwd(id) {
        this._terminalProcesses.get(id)?.getCwd().then(cwd => this._proxy.$sendProcessProperty(id, { type: "cwd" /* ProcessPropertyType.Cwd */, value: cwd }));
    }
    $acceptProcessRequestLatency(id) {
        return Promise.resolve(id);
    }
    registerProfileProvider(extension, id, provider) {
        if (this._profileProviders.has(id)) {
            throw new Error(`Terminal profile provider "${id}" already registered`);
        }
        this._profileProviders.set(id, provider);
        this._proxy.$registerProfileProvider(id, extension.identifier.value);
        return new VSCodeDisposable(() => {
            this._profileProviders.delete(id);
            this._proxy.$unregisterProfileProvider(id);
        });
    }
    registerTerminalCompletionProvider(extension, provider, ...triggerCharacters) {
        if (this._completionProviders.has(provider.id)) {
            throw new Error(`Terminal completion provider "${provider.id}" already registered`);
        }
        this._completionProviders.set(provider.id, provider);
        this._proxy.$registerCompletionProvider(provider.id, extension.identifier.value, ...triggerCharacters);
        return new VSCodeDisposable(() => {
            this._completionProviders.delete(provider.id);
            this._proxy.$unregisterCompletionProvider(provider.id);
        });
    }
    async $provideTerminalCompletions(id, options) {
        const token = new CancellationTokenSource().token;
        if (token.isCancellationRequested || !this.activeTerminal) {
            return undefined;
        }
        const provider = this._completionProviders.get(id);
        if (!provider) {
            return;
        }
        const completions = await provider.provideTerminalCompletions(this.activeTerminal, options, token);
        if (completions === null || completions === undefined) {
            return undefined;
        }
        return TerminalCompletionList.from(completions);
    }
    $acceptTerminalShellType(id, shellType) {
        const terminal = this.getTerminalById(id);
        if (terminal?.setShellType(shellType)) {
            this._onDidChangeTerminalState.fire(terminal.value);
        }
    }
    registerTerminalQuickFixProvider(id, extensionId, provider) {
        if (this._quickFixProviders.has(id)) {
            throw new Error(`Terminal quick fix provider "${id}" is already registered`);
        }
        this._quickFixProviders.set(id, provider);
        this._proxy.$registerQuickFixProvider(id, extensionId);
        return new VSCodeDisposable(() => {
            this._quickFixProviders.delete(id);
            this._proxy.$unregisterQuickFixProvider(id);
        });
    }
    async $provideTerminalQuickFixes(id, matchResult) {
        const token = new CancellationTokenSource().token;
        if (token.isCancellationRequested) {
            return;
        }
        const provider = this._quickFixProviders.get(id);
        if (!provider) {
            return;
        }
        const quickFixes = await provider.provideTerminalQuickFixes(matchResult, token);
        if (quickFixes === null || (Array.isArray(quickFixes) && quickFixes.length === 0)) {
            return undefined;
        }
        const store = new DisposableStore();
        this._lastQuickFixCommands.value = store;
        // Single
        if (!Array.isArray(quickFixes)) {
            return quickFixes ? TerminalQuickFix.from(quickFixes, this._extHostCommands.converter, store) : undefined;
        }
        // Many
        const result = [];
        for (const fix of quickFixes) {
            const converted = TerminalQuickFix.from(fix, this._extHostCommands.converter, store);
            if (converted) {
                result.push(converted);
            }
        }
        return result;
    }
    async $createContributedProfileTerminal(id, options) {
        const token = new CancellationTokenSource().token;
        let profile = await this._profileProviders.get(id)?.provideTerminalProfile(token);
        if (token.isCancellationRequested) {
            return;
        }
        if (profile && !('options' in profile)) {
            profile = { options: profile };
        }
        if (!profile || !('options' in profile)) {
            throw new Error(`No terminal profile options provided for id "${id}"`);
        }
        if ('pty' in profile.options) {
            this.createExtensionTerminal(profile.options, options);
            return;
        }
        this.createTerminalFromOptions(profile.options, options);
    }
    registerLinkProvider(provider) {
        this._linkProviders.add(provider);
        if (this._linkProviders.size === 1) {
            this._proxy.$startLinkProvider();
        }
        return new VSCodeDisposable(() => {
            this._linkProviders.delete(provider);
            if (this._linkProviders.size === 0) {
                this._proxy.$stopLinkProvider();
            }
        });
    }
    async $provideLinks(terminalId, line) {
        const terminal = this.getTerminalById(terminalId);
        if (!terminal) {
            return [];
        }
        // Discard any cached links the terminal has been holding, currently all links are released
        // when new links are provided.
        this._terminalLinkCache.delete(terminalId);
        const oldToken = this._terminalLinkCancellationSource.get(terminalId);
        oldToken?.dispose(true);
        const cancellationSource = new CancellationTokenSource();
        this._terminalLinkCancellationSource.set(terminalId, cancellationSource);
        const result = [];
        const context = { terminal: terminal.value, line };
        const promises = [];
        for (const provider of this._linkProviders) {
            promises.push(Promises.withAsyncBody(async (r) => {
                cancellationSource.token.onCancellationRequested(() => r({ provider, links: [] }));
                const links = (await provider.provideTerminalLinks(context, cancellationSource.token)) || [];
                if (!cancellationSource.token.isCancellationRequested) {
                    r({ provider, links });
                }
            }));
        }
        const provideResults = await Promise.all(promises);
        if (cancellationSource.token.isCancellationRequested) {
            return [];
        }
        const cacheLinkMap = new Map();
        for (const provideResult of provideResults) {
            if (provideResult && provideResult.links.length > 0) {
                result.push(...provideResult.links.map(providerLink => {
                    const link = {
                        id: nextLinkId++,
                        startIndex: providerLink.startIndex,
                        length: providerLink.length,
                        label: providerLink.tooltip
                    };
                    cacheLinkMap.set(link.id, {
                        provider: provideResult.provider,
                        link: providerLink
                    });
                    return link;
                }));
            }
        }
        this._terminalLinkCache.set(terminalId, cacheLinkMap);
        return result;
    }
    $activateLink(terminalId, linkId) {
        const cachedLink = this._terminalLinkCache.get(terminalId)?.get(linkId);
        if (!cachedLink) {
            return;
        }
        cachedLink.provider.handleTerminalLink(cachedLink.link);
    }
    _onProcessExit(id, exitCode) {
        this._bufferer.stopBuffering(id);
        // Remove process reference
        this._terminalProcesses.delete(id);
        delete this._extensionTerminalAwaitingStart[id];
        // Clean up process disposables
        const processDiposable = this._terminalProcessDisposables[id];
        if (processDiposable) {
            processDiposable.dispose();
            delete this._terminalProcessDisposables[id];
        }
        // Send exit event to main side
        this._proxy.$sendProcessExit(id, exitCode);
    }
    getTerminalById(id) {
        return this._getTerminalObjectById(this._terminals, id);
    }
    getTerminalIdByApiObject(terminal) {
        const index = this._terminals.findIndex(item => {
            return item.value === terminal;
        });
        return index >= 0 ? index : null;
    }
    _getTerminalObjectById(array, id) {
        const index = this._getTerminalObjectIndexById(array, id);
        return index !== null ? array[index] : null;
    }
    _getTerminalObjectIndexById(array, id) {
        const index = array.findIndex(item => {
            return item._id === id;
        });
        return index >= 0 ? index : null;
    }
    getEnvironmentVariableCollection(extension) {
        let collection = this._environmentVariableCollections.get(extension.identifier.value);
        if (!collection) {
            collection = this._register(new UnifiedEnvironmentVariableCollection());
            this._setEnvironmentVariableCollection(extension.identifier.value, collection);
        }
        return collection.getScopedEnvironmentVariableCollection(undefined);
    }
    _syncEnvironmentVariableCollection(extensionIdentifier, collection) {
        const serialized = serializeEnvironmentVariableCollection(collection.map);
        const serializedDescription = serializeEnvironmentDescriptionMap(collection.descriptionMap);
        this._proxy.$setEnvironmentVariableCollection(extensionIdentifier, collection.persistent, serialized.length === 0 ? undefined : serialized, serializedDescription);
    }
    $initEnvironmentVariableCollections(collections) {
        collections.forEach(entry => {
            const extensionIdentifier = entry[0];
            const collection = this._register(new UnifiedEnvironmentVariableCollection(entry[1]));
            this._setEnvironmentVariableCollection(extensionIdentifier, collection);
        });
    }
    $acceptDefaultProfile(profile, automationProfile) {
        const oldProfile = this._defaultProfile;
        this._defaultProfile = profile;
        this._defaultAutomationProfile = automationProfile;
        if (oldProfile?.path !== profile.path) {
            this._onDidChangeShell.fire(profile.path);
        }
    }
    _setEnvironmentVariableCollection(extensionIdentifier, collection) {
        this._environmentVariableCollections.set(extensionIdentifier, collection);
        this._register(collection.onDidChangeCollection(() => {
            // When any collection value changes send this immediately, this is done to ensure
            // following calls to createTerminal will be created with the new environment. It will
            // result in more noise by sending multiple updates when called but collections are
            // expected to be small.
            this._syncEnvironmentVariableCollection(extensionIdentifier, collection);
        }));
    }
};
BaseExtHostTerminalService = __decorate([
    __param(1, IExtHostCommands),
    __param(2, IExtHostRpcService)
], BaseExtHostTerminalService);
export { BaseExtHostTerminalService };
/**
 * Unified environment variable collection carrying information for all scopes, for a specific extension.
 */
class UnifiedEnvironmentVariableCollection extends Disposable {
    get persistent() { return this._persistent; }
    set persistent(value) {
        this._persistent = value;
        this._onDidChangeCollection.fire();
    }
    get onDidChangeCollection() { return this._onDidChangeCollection && this._onDidChangeCollection.event; }
    constructor(serialized) {
        super();
        this.map = new Map();
        this.scopedCollections = new Map();
        this.descriptionMap = new Map();
        this._persistent = true;
        this._onDidChangeCollection = new Emitter();
        this.map = new Map(serialized);
    }
    getScopedEnvironmentVariableCollection(scope) {
        const scopedCollectionKey = this.getScopeKey(scope);
        let scopedCollection = this.scopedCollections.get(scopedCollectionKey);
        if (!scopedCollection) {
            scopedCollection = new ScopedEnvironmentVariableCollection(this, scope);
            this.scopedCollections.set(scopedCollectionKey, scopedCollection);
            this._register(scopedCollection.onDidChangeCollection(() => this._onDidChangeCollection.fire()));
        }
        return scopedCollection;
    }
    replace(variable, value, options, scope) {
        this._setIfDiffers(variable, { value, type: EnvironmentVariableMutatorType.Replace, options: options ?? { applyAtProcessCreation: true }, scope });
    }
    append(variable, value, options, scope) {
        this._setIfDiffers(variable, { value, type: EnvironmentVariableMutatorType.Append, options: options ?? { applyAtProcessCreation: true }, scope });
    }
    prepend(variable, value, options, scope) {
        this._setIfDiffers(variable, { value, type: EnvironmentVariableMutatorType.Prepend, options: options ?? { applyAtProcessCreation: true }, scope });
    }
    _setIfDiffers(variable, mutator) {
        if (mutator.options && mutator.options.applyAtProcessCreation === false && !mutator.options.applyAtShellIntegration) {
            throw new Error('EnvironmentVariableMutatorOptions must apply at either process creation or shell integration');
        }
        const key = this.getKey(variable, mutator.scope);
        const current = this.map.get(key);
        const newOptions = mutator.options ? {
            applyAtProcessCreation: mutator.options.applyAtProcessCreation ?? false,
            applyAtShellIntegration: mutator.options.applyAtShellIntegration ?? false,
        } : {
            applyAtProcessCreation: true
        };
        if (!current ||
            current.value !== mutator.value ||
            current.type !== mutator.type ||
            current.options?.applyAtProcessCreation !== newOptions.applyAtProcessCreation ||
            current.options?.applyAtShellIntegration !== newOptions.applyAtShellIntegration ||
            current.scope?.workspaceFolder?.index !== mutator.scope?.workspaceFolder?.index) {
            const key = this.getKey(variable, mutator.scope);
            const value = {
                variable,
                ...mutator,
                options: newOptions
            };
            this.map.set(key, value);
            this._onDidChangeCollection.fire();
        }
    }
    get(variable, scope) {
        const key = this.getKey(variable, scope);
        const value = this.map.get(key);
        // TODO: Set options to defaults if needed
        return value ? convertMutator(value) : undefined;
    }
    getKey(variable, scope) {
        const scopeKey = this.getScopeKey(scope);
        return scopeKey.length ? `${variable}:::${scopeKey}` : variable;
    }
    getScopeKey(scope) {
        return this.getWorkspaceKey(scope?.workspaceFolder) ?? '';
    }
    getWorkspaceKey(workspaceFolder) {
        return workspaceFolder ? workspaceFolder.uri.toString() : undefined;
    }
    getVariableMap(scope) {
        const map = new Map();
        for (const [_, value] of this.map) {
            if (this.getScopeKey(value.scope) === this.getScopeKey(scope)) {
                map.set(value.variable, convertMutator(value));
            }
        }
        return map;
    }
    delete(variable, scope) {
        const key = this.getKey(variable, scope);
        this.map.delete(key);
        this._onDidChangeCollection.fire();
    }
    clear(scope) {
        if (scope?.workspaceFolder) {
            for (const [key, mutator] of this.map) {
                if (mutator.scope?.workspaceFolder?.index === scope.workspaceFolder.index) {
                    this.map.delete(key);
                }
            }
            this.clearDescription(scope);
        }
        else {
            this.map.clear();
            this.descriptionMap.clear();
        }
        this._onDidChangeCollection.fire();
    }
    setDescription(description, scope) {
        const key = this.getScopeKey(scope);
        const current = this.descriptionMap.get(key);
        if (!current || current.description !== description) {
            let descriptionStr;
            if (typeof description === 'string') {
                descriptionStr = description;
            }
            else {
                // Only take the description before the first `\n\n`, so that the description doesn't mess up the UI
                descriptionStr = description?.value.split('\n\n')[0];
            }
            const value = { description: descriptionStr, scope };
            this.descriptionMap.set(key, value);
            this._onDidChangeCollection.fire();
        }
    }
    getDescription(scope) {
        const key = this.getScopeKey(scope);
        return this.descriptionMap.get(key)?.description;
    }
    clearDescription(scope) {
        const key = this.getScopeKey(scope);
        this.descriptionMap.delete(key);
    }
}
class ScopedEnvironmentVariableCollection {
    get persistent() { return this.collection.persistent; }
    set persistent(value) {
        this.collection.persistent = value;
    }
    get onDidChangeCollection() { return this._onDidChangeCollection && this._onDidChangeCollection.event; }
    constructor(collection, scope) {
        this.collection = collection;
        this.scope = scope;
        this._onDidChangeCollection = new Emitter();
    }
    getScoped(scope) {
        return this.collection.getScopedEnvironmentVariableCollection(scope);
    }
    replace(variable, value, options) {
        this.collection.replace(variable, value, options, this.scope);
    }
    append(variable, value, options) {
        this.collection.append(variable, value, options, this.scope);
    }
    prepend(variable, value, options) {
        this.collection.prepend(variable, value, options, this.scope);
    }
    get(variable) {
        return this.collection.get(variable, this.scope);
    }
    forEach(callback, thisArg) {
        this.collection.getVariableMap(this.scope).forEach((value, variable) => callback.call(thisArg, variable, value, this), this.scope);
    }
    [Symbol.iterator]() {
        return this.collection.getVariableMap(this.scope).entries();
    }
    delete(variable) {
        this.collection.delete(variable, this.scope);
        this._onDidChangeCollection.fire(undefined);
    }
    clear() {
        this.collection.clear(this.scope);
    }
    set description(description) {
        this.collection.setDescription(description, this.scope);
    }
    get description() {
        return this.collection.getDescription(this.scope);
    }
}
let WorkerExtHostTerminalService = class WorkerExtHostTerminalService extends BaseExtHostTerminalService {
    constructor(extHostCommands, extHostRpc) {
        super(false, extHostCommands, extHostRpc);
    }
    createTerminal(name, shellPath, shellArgs) {
        throw new NotSupportedError();
    }
    createTerminalFromOptions(options, internalOptions) {
        throw new NotSupportedError();
    }
};
WorkerExtHostTerminalService = __decorate([
    __param(0, IExtHostCommands),
    __param(1, IExtHostRpcService)
], WorkerExtHostTerminalService);
export { WorkerExtHostTerminalService };
function asTerminalIcon(iconPath) {
    if (!iconPath || typeof iconPath === 'string') {
        return undefined;
    }
    if (!('id' in iconPath)) {
        return iconPath;
    }
    return {
        id: iconPath.id,
        color: iconPath.color
    };
}
function asTerminalColor(color) {
    return ThemeColor.isThemeColor(color) ? color : undefined;
}
function convertMutator(mutator) {
    const newMutator = { ...mutator };
    delete newMutator.scope;
    newMutator.options = newMutator.options ?? undefined;
    delete newMutator.variable;
    return newMutator;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBK0IsV0FBVyxFQUFtUyxNQUFNLHVCQUF1QixDQUFDO0FBQ2xYLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoSCxPQUFPLEVBQUUsVUFBVSxJQUFJLGdCQUFnQixFQUFFLDhCQUE4QixFQUE4QyxNQUFNLG1CQUFtQixDQUFDO0FBRS9JLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUM1SixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1D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