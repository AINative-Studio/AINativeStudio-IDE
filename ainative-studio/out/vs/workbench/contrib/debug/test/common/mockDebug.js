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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0RlYnVnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2NvbW1vbi9tb2NrRGVidWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBTXRFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUczRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUs1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFNUQsTUFBTSxPQUFPLGdCQUFnQjtJQUc1QixJQUFJLEtBQUs7UUFDUixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7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TUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBbUM7UUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxTQUFTLENBQUMsSUFBc0M7UUFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBTyxHQUFHLEtBQUs7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBaUI7UUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBbUM7UUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBb0M7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBcUM7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxlQUFlLENBQUMsSUFB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