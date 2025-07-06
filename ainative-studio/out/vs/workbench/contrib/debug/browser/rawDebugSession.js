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
import * as nls from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import * as objects from '../../../../base/common/objects.js';
import { toAction } from '../../../../base/common/actions.js';
import * as errors from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { formatPII, isUri } from '../common/debugUtils.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Schemas } from '../../../../base/common/network.js';
/**
 * Encapsulates the DebugAdapter lifecycle and some idiosyncrasies of the Debug Adapter Protocol.
 */
let RawDebugSession = class RawDebugSession {
    constructor(debugAdapter, dbgr, sessionId, name, extensionHostDebugService, openerService, notificationService, dialogSerivce) {
        this.dbgr = dbgr;
        this.sessionId = sessionId;
        this.name = name;
        this.extensionHostDebugService = extensionHostDebugService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.dialogSerivce = dialogSerivce;
        this.allThreadsContinued = true;
        this._readyForBreakpoints = false;
        // shutdown
        this.debugAdapterStopped = false;
        this.inShutdown = false;
        this.terminated = false;
        this.firedAdapterExitEvent = false;
        // telemetry
        this.startTime = 0;
        this.didReceiveStoppedEvent = false;
        // DAP events
        this._onDidInitialize = new Emitter();
        this._onDidStop = new Emitter();
        this._onDidContinued = new Emitter();
        this._onDidTerminateDebugee = new Emitter();
        this._onDidExitDebugee = new Emitter();
        this._onDidThread = new Emitter();
        this._onDidOutput = new Emitter();
        this._onDidBreakpoint = new Emitter();
        this._onDidLoadedSource = new Emitter();
        this._onDidProgressStart = new Emitter();
        this._onDidProgressUpdate = new Emitter();
        this._onDidProgressEnd = new Emitter();
        this._onDidInvalidated = new Emitter();
        this._onDidInvalidateMemory = new Emitter();
        this._onDidCustomEvent = new Emitter();
        this._onDidEvent = new Emitter();
        // DA events
        this._onDidExitAdapter = new Emitter();
        this.stoppedSinceLastStep = false;
        this.toDispose = [];
        this.debugAdapter = debugAdapter;
        this._capabilities = Object.create(null);
        this.toDispose.push(this.debugAdapter.onError(err => {
            this.shutdown(err);
        }));
        this.toDispose.push(this.debugAdapter.onExit(code => {
            if (code !== 0) {
                this.shutdown(new Error(`exit code: ${code}`));
            }
            else {
                // normal exit
                this.shutdown();
            }
        }));
        this.debugAdapter.onEvent(event => {
            switch (event.event) {
                case 'initialized':
                    this._readyForBreakpoints = true;
                    this._onDidInitialize.fire(event);
                    break;
                case 'loadedSource':
                    this._onDidLoadedSource.fire(event);
                    break;
                case 'capabilities':
                    if (event.body) {
                        const capabilities = event.body.capabilities;
                        this.mergeCapabilities(capabilities);
                    }
                    break;
                case 'stopped':
                    this.didReceiveStoppedEvent = true; // telemetry: remember that debugger stopped successfully
                    this.stoppedSinceLastStep = true;
                    this._onDidStop.fire(event);
                    break;
                case 'continued':
                    this.allThreadsContinued = event.body.allThreadsContinued === false ? false : true;
                    this._onDidContinued.fire(event);
                    break;
                case 'thread':
                    this._onDidThread.fire(event);
                    break;
                case 'output':
                    this._onDidOutput.fire(event);
                    break;
                case 'breakpoint':
                    this._onDidBreakpoint.fire(event);
                    break;
                case 'terminated':
                    this._onDidTerminateDebugee.fire(event);
                    break;
                case 'exited':
                    this._onDidExitDebugee.fire(event);
                    break;
                case 'progressStart':
                    this._onDidProgressStart.fire(event);
                    break;
                case 'progressUpdate':
                    this._onDidProgressUpdate.fire(event);
                    break;
                case 'progressEnd':
                    this._onDidProgressEnd.fire(event);
                    break;
                case 'invalidated':
                    this._onDidInvalidated.fire(event);
                    break;
                case 'memory':
                    this._onDidInvalidateMemory.fire(event);
                    break;
                case 'process':
                    break;
                case 'module':
                    break;
                default:
                    this._onDidCustomEvent.fire(event);
                    break;
            }
            this._onDidEvent.fire(event);
        });
        this.debugAdapter.onRequest(request => this.dispatchRequest(request));
    }
    get isInShutdown() {
        return this.inShutdown;
    }
    get onDidExitAdapter() {
        return this._onDidExitAdapter.event;
    }
    get capabilities() {
        return this._capabilities;
    }
    /**
     * DA is ready to accepts setBreakpoint requests.
     * Becomes true after "initialized" events has been received.
     */
    get readyForBreakpoints() {
        return this._readyForBreakpoints;
    }
    //---- DAP events
    get onDidInitialize() {
        return this._onDidInitialize.event;
    }
    get onDidStop() {
        return this._onDidStop.event;
    }
    get onDidContinued() {
        return this._onDidContinued.event;
    }
    get onDidTerminateDebugee() {
        return this._onDidTerminateDebugee.event;
    }
    get onDidExitDebugee() {
        return this._onDidExitDebugee.event;
    }
    get onDidThread() {
        return this._onDidThread.event;
    }
    get onDidOutput() {
        return this._onDidOutput.event;
    }
    get onDidBreakpoint() {
        return this._onDidBreakpoint.event;
    }
    get onDidLoadedSource() {
        return this._onDidLoadedSource.event;
    }
    get onDidCustomEvent() {
        return this._onDidCustomEvent.event;
    }
    get onDidProgressStart() {
        return this._onDidProgressStart.event;
    }
    get onDidProgressUpdate() {
        return this._onDidProgressUpdate.event;
    }
    get onDidProgressEnd() {
        return this._onDidProgressEnd.event;
    }
    get onDidInvalidated() {
        return this._onDidInvalidated.event;
    }
    get onDidInvalidateMemory() {
        return this._onDidInvalidateMemory.event;
    }
    get onDidEvent() {
        return this._onDidEvent.event;
    }
    //---- DebugAdapter lifecycle
    /**
     * Starts the underlying debug adapter and tracks the session time for telemetry.
     */
    async start() {
        if (!this.debugAdapter) {
            return Promise.reject(new Error(nls.localize('noDebugAdapterStart', "No debug adapter, can not start debug session.")));
        }
        await this.debugAdapter.startSession();
        this.startTime = new Date().getTime();
    }
    /**
     * Send client capabilities to the debug adapter and receive DA capabilities in return.
     */
    async initialize(args) {
        const response = await this.send('initialize', args, undefined, undefined, false);
        if (response) {
            this.mergeCapabilities(response.body);
        }
        return response;
    }
    /**
     * Terminate the debuggee and shutdown the adapter
     */
    disconnect(args) {
        const terminateDebuggee = this.capabilities.supportTerminateDebuggee ? args.terminateDebuggee : undefined;
        const suspendDebuggee = this.capabilities.supportTerminateDebuggee && this.capabilities.supportSuspendDebuggee ? args.suspendDebuggee : undefined;
        return this.shutdown(undefined, args.restart, terminateDebuggee, suspendDebuggee);
    }
    //---- DAP requests
    async launchOrAttach(config) {
        const response = await this.send(config.request, config, undefined, undefined, false);
        if (response) {
            this.mergeCapabilities(response.body);
        }
        return response;
    }
    /**
     * Try killing the debuggee softly...
     */
    terminate(restart = false) {
        if (this.capabilities.supportsTerminateRequest) {
            if (!this.terminated) {
                this.terminated = true;
                return this.send('terminate', { restart }, undefined);
            }
            return this.disconnect({ terminateDebuggee: true, restart });
        }
        return Promise.reject(new Error('terminated not supported'));
    }
    restart(args) {
        if (this.capabilities.supportsRestartRequest) {
            return this.send('restart', args);
        }
        return Promise.reject(new Error('restart not supported'));
    }
    async next(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('next', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async stepIn(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('stepIn', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async stepOut(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('stepOut', args);
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId);
        }
        return response;
    }
    async continue(args) {
        this.stoppedSinceLastStep = false;
        const response = await this.send('continue', args);
        if (response && response.body && response.body.allThreadsContinued !== undefined) {
            this.allThreadsContinued = response.body.allThreadsContinued;
        }
        if (!this.stoppedSinceLastStep) {
            this.fireSimulatedContinuedEvent(args.threadId, this.allThreadsContinued);
        }
        return response;
    }
    pause(args) {
        return this.send('pause', args);
    }
    terminateThreads(args) {
        if (this.capabilities.supportsTerminateThreadsRequest) {
            return this.send('terminateThreads', args);
        }
        return Promise.reject(new Error('terminateThreads not supported'));
    }
    setVariable(args) {
        if (this.capabilities.supportsSetVariable) {
            return this.send('setVariable', args);
        }
        return Promise.reject(new Error('setVariable not supported'));
    }
    setExpression(args) {
        if (this.capabilities.supportsSetExpression) {
            return this.send('setExpression', args);
        }
        return Promise.reject(new Error('setExpression not supported'));
    }
    async restartFrame(args, threadId) {
        if (this.capabilities.supportsRestartFrame) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('restartFrame', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(threadId);
            }
            return response;
        }
        return Promise.reject(new Error('restartFrame not supported'));
    }
    stepInTargets(args) {
        if (this.capabilities.supportsStepInTargetsRequest) {
            return this.send('stepInTargets', args);
        }
        return Promise.reject(new Error('stepInTargets not supported'));
    }
    completions(args, token) {
        if (this.capabilities.supportsCompletionsRequest) {
            return this.send('completions', args, token);
        }
        return Promise.reject(new Error('completions not supported'));
    }
    setBreakpoints(args) {
        return this.send('setBreakpoints', args);
    }
    setFunctionBreakpoints(args) {
        if (this.capabilities.supportsFunctionBreakpoints) {
            return this.send('setFunctionBreakpoints', args);
        }
        return Promise.reject(new Error('setFunctionBreakpoints not supported'));
    }
    dataBreakpointInfo(args) {
        if (this.capabilities.supportsDataBreakpoints) {
            return this.send('dataBreakpointInfo', args);
        }
        return Promise.reject(new Error('dataBreakpointInfo not supported'));
    }
    setDataBreakpoints(args) {
        if (this.capabilities.supportsDataBreakpoints) {
            return this.send('setDataBreakpoints', args);
        }
        return Promise.reject(new Error('setDataBreakpoints not supported'));
    }
    setExceptionBreakpoints(args) {
        return this.send('setExceptionBreakpoints', args);
    }
    breakpointLocations(args) {
        if (this.capabilities.supportsBreakpointLocationsRequest) {
            return this.send('breakpointLocations', args);
        }
        return Promise.reject(new Error('breakpointLocations is not supported'));
    }
    configurationDone() {
        if (this.capabilities.supportsConfigurationDoneRequest) {
            return this.send('configurationDone', null);
        }
        return Promise.reject(new Error('configurationDone not supported'));
    }
    stackTrace(args, token) {
        return this.send('stackTrace', args, token);
    }
    exceptionInfo(args) {
        if (this.capabilities.supportsExceptionInfoRequest) {
            return this.send('exceptionInfo', args);
        }
        return Promise.reject(new Error('exceptionInfo not supported'));
    }
    scopes(args, token) {
        return this.send('scopes', args, token);
    }
    variables(args, token) {
        return this.send('variables', args, token);
    }
    source(args) {
        return this.send('source', args);
    }
    locations(args) {
        return this.send('locations', args);
    }
    loadedSources(args) {
        if (this.capabilities.supportsLoadedSourcesRequest) {
            return this.send('loadedSources', args);
        }
        return Promise.reject(new Error('loadedSources not supported'));
    }
    threads() {
        return this.send('threads', null);
    }
    evaluate(args) {
        return this.send('evaluate', args);
    }
    async stepBack(args) {
        if (this.capabilities.supportsStepBack) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('stepBack', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('stepBack not supported'));
    }
    async reverseContinue(args) {
        if (this.capabilities.supportsStepBack) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('reverseContinue', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('reverseContinue not supported'));
    }
    gotoTargets(args) {
        if (this.capabilities.supportsGotoTargetsRequest) {
            return this.send('gotoTargets', args);
        }
        return Promise.reject(new Error('gotoTargets is not supported'));
    }
    async goto(args) {
        if (this.capabilities.supportsGotoTargetsRequest) {
            this.stoppedSinceLastStep = false;
            const response = await this.send('goto', args);
            if (!this.stoppedSinceLastStep) {
                this.fireSimulatedContinuedEvent(args.threadId);
            }
            return response;
        }
        return Promise.reject(new Error('goto is not supported'));
    }
    async setInstructionBreakpoints(args) {
        if (this.capabilities.supportsInstructionBreakpoints) {
            return await this.send('setInstructionBreakpoints', args);
        }
        return Promise.reject(new Error('setInstructionBreakpoints is not supported'));
    }
    async disassemble(args) {
        if (this.capabilities.supportsDisassembleRequest) {
            return await this.send('disassemble', args);
        }
        return Promise.reject(new Error('disassemble is not supported'));
    }
    async readMemory(args) {
        if (this.capabilities.supportsReadMemoryRequest) {
            return await this.send('readMemory', args);
        }
        return Promise.reject(new Error('readMemory is not supported'));
    }
    async writeMemory(args) {
        if (this.capabilities.supportsWriteMemoryRequest) {
            return await this.send('writeMemory', args);
        }
        return Promise.reject(new Error('writeMemory is not supported'));
    }
    cancel(args) {
        return this.send('cancel', args);
    }
    custom(request, args) {
        return this.send(request, args);
    }
    //---- private
    async shutdown(error, restart = false, terminateDebuggee = undefined, suspendDebuggee = undefined) {
        if (!this.inShutdown) {
            this.inShutdown = true;
            if (this.debugAdapter) {
                try {
                    const args = { restart };
                    if (typeof terminateDebuggee === 'boolean') {
                        args.terminateDebuggee = terminateDebuggee;
                    }
                    if (typeof suspendDebuggee === 'boolean') {
                        args.suspendDebuggee = suspendDebuggee;
                    }
                    // if there's an error, the DA is probably already gone, so give it a much shorter timeout.
                    await this.send('disconnect', args, undefined, error ? 200 : 2000);
                }
                catch (e) {
                    // Catch the potential 'disconnect' error - no need to show it to the user since the adapter is shutting down
                }
                finally {
                    await this.stopAdapter(error);
                }
            }
            else {
                return this.stopAdapter(error);
            }
        }
    }
    async stopAdapter(error) {
        try {
            if (this.debugAdapter) {
                const da = this.debugAdapter;
                this.debugAdapter = null;
                await da.stopSession();
                this.debugAdapterStopped = true;
            }
        }
        finally {
            this.fireAdapterExitEvent(error);
        }
    }
    fireAdapterExitEvent(error) {
        if (!this.firedAdapterExitEvent) {
            this.firedAdapterExitEvent = true;
            const e = {
                emittedStopped: this.didReceiveStoppedEvent,
                sessionLengthInSeconds: (new Date().getTime() - this.startTime) / 1000
            };
            if (error && !this.debugAdapterStopped) {
                e.error = error;
            }
            this._onDidExitAdapter.fire(e);
        }
    }
    async dispatchRequest(request) {
        const response = {
            type: 'response',
            seq: 0,
            command: request.command,
            request_seq: request.seq,
            success: true
        };
        const safeSendResponse = (response) => this.debugAdapter && this.debugAdapter.sendResponse(response);
        if (request.command === 'launchVSCode') {
            try {
                let result = await this.launchVsCode(request.arguments);
                if (!result.success) {
                    const { confirmed } = await this.dialogSerivce.confirm({
                        type: Severity.Warning,
                        message: nls.localize('canNotStart', "The debugger needs to open a new tab or window for the debuggee but the browser prevented this. You must give permission to continue."),
                        primaryButton: nls.localize({ key: 'continue', comment: ['&& denotes a mnemonic'] }, "&&Continue")
                    });
                    if (confirmed) {
                        result = await this.launchVsCode(request.arguments);
                    }
                    else {
                        response.success = false;
                        safeSendResponse(response);
                        await this.shutdown();
                    }
                }
                response.body = {
                    rendererDebugPort: result.rendererDebugPort,
                };
                safeSendResponse(response);
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else if (request.command === 'runInTerminal') {
            try {
                const shellProcessId = await this.dbgr.runInTerminal(request.arguments, this.sessionId);
                const resp = response;
                resp.body = {};
                if (typeof shellProcessId === 'number') {
                    resp.body.shellProcessId = shellProcessId;
                }
                safeSendResponse(resp);
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else if (request.command === 'startDebugging') {
            try {
                const args = request.arguments;
                const config = {
                    ...args.configuration,
                    ...{
                        request: args.request,
                        type: this.dbgr.type,
                        name: args.configuration.name || this.name
                    }
                };
                const success = await this.dbgr.startDebugging(config, this.sessionId);
                if (success) {
                    safeSendResponse(response);
                }
                else {
                    response.success = false;
                    response.message = 'Failed to start debugging';
                    safeSendResponse(response);
                }
            }
            catch (err) {
                response.success = false;
                response.message = err.message;
                safeSendResponse(response);
            }
        }
        else {
            response.success = false;
            response.message = `unknown request '${request.command}'`;
            safeSendResponse(response);
        }
    }
    launchVsCode(vscodeArgs) {
        const args = [];
        for (const arg of vscodeArgs.args) {
            const a2 = (arg.prefix || '') + (arg.path || '');
            const match = /^--(.+)=(.+)$/.exec(a2);
            if (match && match.length === 3) {
                const key = match[1];
                let value = match[2];
                if ((key === 'file-uri' || key === 'folder-uri') && !isUri(arg.path)) {
                    value = isUri(value) ? value : URI.file(value).toString();
                }
                args.push(`--${key}=${value}`);
            }
            else {
                args.push(a2);
            }
        }
        if (vscodeArgs.env) {
            args.push(`--extensionEnvironment=${JSON.stringify(vscodeArgs.env)}`);
        }
        return this.extensionHostDebugService.openExtensionDevelopmentHostWindow(args, !!vscodeArgs.debugRenderer);
    }
    send(command, args, token, timeout, showErrors = true) {
        return new Promise((completeDispatch, errorDispatch) => {
            if (!this.debugAdapter) {
                if (this.inShutdown) {
                    // We are in shutdown silently complete
                    completeDispatch(undefined);
                }
                else {
                    errorDispatch(new Error(nls.localize('noDebugAdapter', "No debugger available found. Can not send '{0}'.", command)));
                }
                return;
            }
            let cancelationListener;
            const requestId = this.debugAdapter.sendRequest(command, args, (response) => {
                cancelationListener?.dispose();
                if (response.success) {
                    completeDispatch(response);
                }
                else {
                    errorDispatch(response);
                }
            }, timeout);
            if (token) {
                cancelationListener = token.onCancellationRequested(() => {
                    cancelationListener.dispose();
                    if (this.capabilities.supportsCancelRequest) {
                        this.cancel({ requestId });
                    }
                });
            }
        }).then(undefined, err => Promise.reject(this.handleErrorResponse(err, showErrors)));
    }
    handleErrorResponse(errorResponse, showErrors) {
        if (errorResponse.command === 'canceled' && errorResponse.message === 'canceled') {
            return new errors.CancellationError();
        }
        const error = errorResponse?.body?.error;
        const errorMessage = errorResponse?.message || '';
        const userMessage = error ? formatPII(error.format, false, error.variables) : errorMessage;
        const url = error?.url;
        if (error && url) {
            const label = error.urlLabel ? error.urlLabel : nls.localize('moreInfo', "More Info");
            const uri = URI.parse(url);
            // Use a suffixed id if uri invokes a command, so default 'Open launch.json' command is suppressed on dialog
            const actionId = uri.scheme === Schemas.command ? 'debug.moreInfo.command' : 'debug.moreInfo';
            return createErrorWithActions(userMessage, [toAction({ id: actionId, label, run: () => this.openerService.open(uri, { allowCommands: true }) })]);
        }
        if (showErrors && error && error.format && error.showUser) {
            this.notificationService.error(userMessage);
        }
        const result = new errors.ErrorNoTelemetry(userMessage);
        result.showUser = error?.showUser;
        return result;
    }
    mergeCapabilities(capabilities) {
        if (capabilities) {
            this._capabilities = objects.mixin(this._capabilities, capabilities);
        }
    }
    fireSimulatedContinuedEvent(threadId, allThreadsContinued = false) {
        this._onDidContinued.fire({
            type: 'event',
            event: 'continued',
            body: {
                threadId,
                allThreadsContinued
            },
            seq: undefined
        });
    }
    dispose() {
        dispose(this.toDispose);
    }
};
RawDebugSession = __decorate([
    __param(4, IExtensionHostDebugService),
    __param(5, IOpenerService),
    __param(6, INotificationService),
    __param(7, IDialogService)
], RawDebugSession);
export { RawDebugSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yYXdEZWJ1Z1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTNELE9BQU8sRUFBRSwwQkFBMEIsRUFBOEIsTUFBTSx5REFBeUQsQ0FBQztBQUNqSSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQWtCN0Q7O0dBRUc7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBeUMzQixZ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