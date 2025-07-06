/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AbstractDebugAdapter } from '../../common/abstractDebugAdapter.js';
import { DebugStorage } from '../../common/debugStorage.js';
export class MockDebugService {
    get state() {
        throw new Error('not implemented');
    }
    get onWillNewSession() {
        throw new Error('not implemented');
    }
    get onDidNewSession() {
        throw new Error('not implemented');
    }
    get onDidEndSession() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    getConfigurationManager() {
        throw new Error('not implemented');
    }
    getAdapterManager() {
        throw new Error('Method not implemented.');
    }
    canSetBreakpointsIn(model) {
        throw new Error('Method not implemented.');
    }
    focusStackFrame(focusedStackFrame) {
        throw new Error('not implemented');
    }
    sendAllBreakpoints(session) {
        throw new Error('not implemented');
    }
    sendBreakpoints(modelUri, sourceModified, session) {
        throw new Error('not implemented');
    }
    addBreakpoints(uri, rawBreakpoints) {
        throw new Error('not implemented');
    }
    updateBreakpoints(uri, data, sendOnResourceSaved) {
        throw new Error('not implemented');
    }
    enableOrDisableBreakpoints(enabled) {
        throw new Error('not implemented');
    }
    setBreakpointsActivated() {
        throw new Error('not implemented');
    }
    removeBreakpoints() {
        throw new Error('not implemented');
    }
    addInstructionBreakpoint(opts) {
        throw new Error('Method not implemented.');
    }
    removeInstructionBreakpoints(address) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointCondition(breakpoint, condition) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointsForSession(session, data) {
        throw new Error('Method not implemented.');
    }
    addFunctionBreakpoint() { }
    moveWatchExpression(id, position) { }
    updateFunctionBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeFunctionBreakpoints(id) {
        throw new Error('not implemented');
    }
    addDataBreakpoint() {
        throw new Error('Method not implemented.');
    }
    updateDataBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeDataBreakpoints(id) {
        throw new Error('Method not implemented.');
    }
    addReplExpression(name) {
        throw new Error('not implemented');
    }
    removeReplExpressions() { }
    addWatchExpression(name) {
        throw new Error('not implemented');
    }
    renameWatchExpression(id, newName) {
        throw new Error('not implemented');
    }
    removeWatchExpressions(id) { }
    startDebugging(launch, configOrName, options) {
        return Promise.resolve(true);
    }
    restartSession() {
        throw new Error('not implemented');
    }
    stopSession() {
        throw new Error('not implemented');
    }
    getModel() {
        throw new Error('not implemented');
    }
    getViewModel() {
        throw new Error('not implemented');
    }
    sourceIsNotAvailable(uri) { }
    tryToAutoFocusStackFrame(thread) {
        throw new Error('not implemented');
    }
    runTo(uri, lineNumber, column) {
        throw new Error('Method not implemented.');
    }
}
export class MockSession {
    constructor() {
        this.suppressDebugToolbar = false;
        this.suppressDebugStatusbar = false;
        this.suppressDebugView = false;
        this.autoExpandLazyVariables = false;
        this.configuration = { type: 'mock', name: 'mock', request: 'launch' };
        this.unresolvedConfiguration = { type: 'mock', name: 'mock', request: 'launch' };
        this.state = 2 /* State.Stopped */;
        this.capabilities = {};
    }
    getMemory(memoryReference) {
        throw new Error('Method not implemented.');
    }
    get onDidInvalidateMemory() {
        throw new Error('Not implemented');
    }
    readMemory(memoryReference, offset, count) {
        throw new Error('Method not implemented.');
    }
    writeMemory(memoryReference, offset, data, allowPartial) {
        throw new Error('Method not implemented.');
    }
    cancelCorrelatedTestRun() {
    }
    get compoundRoot() {
        return undefined;
    }
    get saveBeforeRestart() {
        return true;
    }
    get isSimpleUI() {
        return false;
    }
    get lifecycleManagedByParent() {
        return false;
    }
    stepInTargets(frameId) {
        throw new Error('Method not implemented.');
    }
    cancel(_progressId) {
        throw new Error('Method not implemented.');
    }
    breakpointsLocations(uri, lineNumber) {
        throw new Error('Method not implemented.');
    }
    dataBytesBreakpointInfo(address, bytes) {
        throw new Error('Method not implemented.');
    }
    dataBreakpointInfo(name, variablesReference) {
        throw new Error('Method not implemented.');
    }
    sendDataBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    get compact() {
        return false;
    }
    setSubId(subId) {
        throw new Error('Method not implemented.');
    }
    get parentSession() {
        return undefined;
    }
    getReplElements() {
        return [];
    }
    hasSeparateRepl() {
        return true;
    }
    removeReplExpressions() { }
    get onDidChangeReplElements() {
        throw new Error('not implemented');
    }
    addReplExpression(stackFrame, name) {
        return Promise.resolve(undefined);
    }
    appendToRepl(data) { }
    getId() {
        return 'mock';
    }
    getLabel() {
        return 'mockname';
    }
    get name() {
        return 'mockname';
    }
    setName(name) {
        throw new Error('not implemented');
    }
    getSourceForUri(modelUri) {
        throw new Error('not implemented');
    }
    getThread(threadId) {
        throw new Error('not implemented');
    }
    getStoppedDetails() {
        throw new Error('not implemented');
    }
    get onDidCustomEvent() {
        throw new Error('not implemented');
    }
    get onDidLoadedSource() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    get onDidEndAdapter() {
        throw new Error('not implemented');
    }
    get onDidChangeName() {
        throw new Error('not implemented');
    }
    get onDidProgressStart() {
        throw new Error('not implemented');
    }
    get onDidProgressUpdate() {
        throw new Error('not implemented');
    }
    get onDidProgressEnd() {
        throw new Error('not implemented');
    }
    setConfiguration(configuration) { }
    getAllThreads() {
        return [];
    }
    getSource(raw) {
        throw new Error('not implemented');
    }
    getLoadedSources() {
        return Promise.resolve([]);
    }
    completions(frameId, threadId, text, position) {
        throw new Error('not implemented');
    }
    clearThreads(removeThreads, reference) { }
    rawUpdate(data) { }
    initialize(dbgr) {
        throw new Error('Method not implemented.');
    }
    launchOrAttach(config) {
        throw new Error('Method not implemented.');
    }
    restart() {
        throw new Error('Method not implemented.');
    }
    sendBreakpoints(modelUri, bpts, sourceModified) {
        throw new Error('Method not implemented.');
    }
    sendFunctionBreakpoints(fbps) {
        throw new Error('Method not implemented.');
    }
    sendExceptionBreakpoints(exbpts) {
        throw new Error('Method not implemented.');
    }
    sendInstructionBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    getDebugProtocolBreakpoint(breakpointId) {
        throw new Error('Method not implemented.');
    }
    customRequest(request, args) {
        throw new Error('Method not implemented.');
    }
    stackTrace(threadId, startFrame, levels, token) {
        throw new Error('Method not implemented.');
    }
    exceptionInfo(threadId) {
        throw new Error('Method not implemented.');
    }
    scopes(frameId) {
        throw new Error('Method not implemented.');
    }
    variables(variablesReference, threadId, filter, start, count) {
        throw new Error('Method not implemented.');
    }
    evaluate(expression, frameId, context) {
        throw new Error('Method not implemented.');
    }
    restartFrame(frameId, threadId) {
        throw new Error('Method not implemented.');
    }
    next(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepIn(threadId, targetId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepOut(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepBack(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    continue(threadId) {
        throw new Error('Method not implemented.');
    }
    reverseContinue(threadId) {
        throw new Error('Method not implemented.');
    }
    pause(threadId) {
        throw new Error('Method not implemented.');
    }
    terminateThreads(threadIds) {
        throw new Error('Method not implemented.');
    }
    setVariable(variablesReference, name, value) {
        throw new Error('Method not implemented.');
    }
    setExpression(frameId, expression, value) {
        throw new Error('Method not implemented.');
    }
    loadSource(resource) {
        throw new Error('Method not implemented.');
    }
    disassemble(memoryReference, offset, instructionOffset, instructionCount) {
        throw new Error('Method not implemented.');
    }
    terminate(restart = false) {
        throw new Error('Method not implemented.');
    }
    disconnect(restart = false) {
        throw new Error('Method not implemented.');
    }
    gotoTargets(source, line, column) {
        throw new Error('Method not implemented.');
    }
    goto(threadId, targetId) {
        throw new Error('Method not implemented.');
    }
    resolveLocationReference(locationReference) {
        throw new Error('Method not implemented.');
    }
}
export class MockRawSession {
    constructor() {
        this.capabilities = {};
        this.disconnected = false;
        this.sessionLengthInSeconds = 0;
        this.readyForBreakpoints = true;
        this.emittedStopped = true;
        this.onDidStop = null;
    }
    getLengthInSeconds() {
        return 100;
    }
    stackTrace(args) {
        return Promise.resolve({
            seq: 1,
            type: 'response',
            request_seq: 1,
            success: true,
            command: 'stackTrace',
            body: {
                stackFrames: [{
                        id: 1,
                        name: 'mock',
                        line: 5,
                        column: 6
                    }]
            }
        });
    }
    exceptionInfo(args) {
        throw new Error('not implemented');
    }
    launchOrAttach(args) {
        throw new Error('not implemented');
    }
    scopes(args) {
        throw new Error('not implemented');
    }
    variables(args) {
        throw new Error('not implemented');
    }
    evaluate(args) {
        return Promise.resolve(null);
    }
    custom(request, args) {
        throw new Error('not implemented');
    }
    terminate(restart = false) {
        throw new Error('not implemented');
    }
    disconnect(restart) {
        throw new Error('not implemented');
    }
    threads() {
        throw new Error('not implemented');
    }
    stepIn(args) {
        throw new Error('not implemented');
    }
    stepOut(args) {
        throw new Error('not implemented');
    }
    stepBack(args) {
        throw new Error('not implemented');
    }
    continue(args) {
        throw new Error('not implemented');
    }
    reverseContinue(args) {
        throw new Error('not implemented');
    }
    pause(args) {
        throw new Error('not implemented');
    }
    terminateThreads(args) {
        throw new Error('not implemented');
    }
    setVariable(args) {
        throw new Error('not implemented');
    }
    restartFrame(args) {
        throw new Error('not implemented');
    }
    completions(args) {
        throw new Error('not implemented');
    }
    next(args) {
        throw new Error('not implemented');
    }
    source(args) {
        throw new Error('not implemented');
    }
    loadedSources(args) {
        throw new Error('not implemented');
    }
    setBreakpoints(args) {
        throw new Error('not implemented');
    }
    setFunctionBreakpoints(args) {
        throw new Error('not implemented');
    }
    setExceptionBreakpoints(args) {
        throw new Error('not implemented');
    }
}
export class MockDebugAdapter extends AbstractDebugAdapter {
    constructor() {
        super(...arguments);
        this.seq = 0;
        this.pendingResponses = new Map();
    }
    startSession() {
        return Promise.resolve();
    }
    stopSession() {
        return Promise.resolve();
    }
    sendMessage(message) {
        if (message.type === 'request') {
            setTimeout(() => {
                const request = message;
                switch (request.command) {
                    case 'evaluate':
                        this.evaluate(request, request.arguments);
                        return;
                }
                this.sendResponseBody(request, {});
                return;
            }, 0);
        }
        else if (message.type === 'response') {
            const response = message;
            if (this.pendingResponses.has(response.command)) {
                this.pendingResponses.get(response.command).complete(response);
            }
        }
    }
    sendResponseBody(request, body) {
        const response = {
            seq: ++this.seq,
            type: 'response',
            request_seq: request.seq,
            command: request.command,
            success: true,
            body
        };
        this.acceptMessage(response);
    }
    sendEventBody(event, body) {
        const response = {
            seq: ++this.seq,
            type: 'event',
            event,
            body
        };
        this.acceptMessage(response);
    }
    waitForResponseFromClient(command) {
        const deferred = new DeferredPromise();
        if (this.pendingResponses.has(command)) {
            return this.pendingResponses.get(command).p;
        }
        this.pendingResponses.set(command, deferred);
        return deferred.p;
    }
    sendRequestBody(command, args) {
        const response = {
            seq: ++this.seq,
            type: 'request',
            command,
            arguments: args
        };
        this.acceptMessage(response);
    }
    evaluate(request, args) {
        if (args.expression.indexOf('before.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
        this.sendResponseBody(request, {
            result: '=' + args.expression,
            variablesReference: 0
        });
        if (args.expression.indexOf('after.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
    }
}
export class MockDebugStorage extends DebugStorage {
    constructor(storageService) {
        super(storageService, undefined, undefined, new NullLogService());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0RlYnVnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9jb21tb24vbW9ja0RlYnVnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQU10RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFLNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELE1BQU0sT0FBTyxnQkFBZ0I7SUFHNUIsSUFBSSxLQUFLO1FBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQs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SUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQW1DO1FBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxDQUFDLElBQXNDO1FBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLElBQXFDO1FBQzdDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWUsRUFBRSxJQUFTO1FBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWlCO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsT0FBTztRQUNOLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQW1DO1FBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQW9DO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLElBQXFDO1FBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsUUFBUSxDQUFDLElBQXFDO1FBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQTRDO1FB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