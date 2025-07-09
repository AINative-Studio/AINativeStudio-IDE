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
import { distinct } from '../../../../base/common/arrays.js';
import { findLastIdx } from '../../../../base/common/arraysFind.js';
import { DeferredPromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, trackSetChanges } from '../../../../base/common/event.js';
import { stringHash } from '../../../../base/common/hash.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { mixin } from '../../../../base/common/objects.js';
import { autorun } from '../../../../base/common/observable.js';
import * as resources from '../../../../base/common/resources.js';
import { isString, isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../../editor/common/core/range.js';
import * as nls from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DEBUG_MEMORY_SCHEME, isFrameDeemphasized } from './debug.js';
import { UNKNOWN_SOURCE_LABEL, getUriFromSource } from './debugSource.js';
import { DisassemblyViewInput } from './disassemblyViewInput.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export class ExpressionContainer {
    static { this.allValues = new Map(); }
    // Use chunks to support variable paging #9537
    static { this.BASE_CHUNK_SIZE = 100; }
    constructor(session, threadId, _reference, id, namedVariables = 0, indexedVariables = 0, memoryReference = undefined, startOfVariables = 0, presentationHint = undefined, valueLocationReference = undefined) {
        this.session = session;
        this.threadId = threadId;
        this._reference = _reference;
        this.id = id;
        this.namedVariables = namedVariables;
        this.indexedVariables = indexedVariables;
        this.memoryReference = memoryReference;
        this.startOfVariables = startOfVariables;
        this.presentationHint = presentationHint;
        this.valueLocationReference = valueLocationReference;
        this.valueChanged = false;
        this._value = '';
    }
    get reference() {
        return this._reference;
    }
    set reference(value) {
        this._reference = value;
        this.children = undefined; // invalidate children cache
    }
    async evaluateLazy() {
        if (typeof this.reference === 'undefined') {
            return;
        }
        const response = await this.session.variables(this.reference, this.threadId, undefined, undefined, undefined);
        if (!response || !response.body || !response.body.variables || response.body.variables.length !== 1) {
            return;
        }
        const dummyVar = response.body.variables[0];
        this.reference = dummyVar.variablesReference;
        this._value = dummyVar.value;
        this.namedVariables = dummyVar.namedVariables;
        this.indexedVariables = dummyVar.indexedVariables;
        this.memoryReference = dummyVar.memoryReference;
        this.presentationHint = dummyVar.presentationHint;
        this.valueLocationReference = dummyVar.valueLocationReference;
        // Also call overridden method to adopt subclass props
        this.adoptLazyResponse(dummyVar);
    }
    adoptLazyResponse(response) {
    }
    getChildren() {
        if (!this.children) {
            this.children = this.doGetChildren();
        }
        return this.children;
    }
    async doGetChildren() {
        if (!this.hasChildren) {
            return [];
        }
        if (!this.getChildrenInChunks) {
            return this.fetchVariables(undefined, undefined, undefined);
        }
        // Check if object has named variables, fetch them independent from indexed variables #9670
        const children = this.namedVariables ? await this.fetchVariables(undefined, undefined, 'named') : [];
        // Use a dynamic chunk size based on the number of elements #9774
        let chunkSize = ExpressionContainer.BASE_CHUNK_SIZE;
        while (!!this.indexedVariables && this.indexedVariables > chunkSize * ExpressionContainer.BASE_CHUNK_SIZE) {
            chunkSize *= ExpressionContainer.BASE_CHUNK_SIZE;
        }
        if (!!this.indexedVariables && this.indexedVariables > chunkSize) {
            // There are a lot of children, create fake intermediate values that represent chunks #9537
            const numberOfChunks = Math.ceil(this.indexedVariables / chunkSize);
            for (let i = 0; i < numberOfChunks; i++) {
                const start = (this.startOfVariables || 0) + i * chunkSize;
                const count = Math.min(chunkSize, this.indexedVariables - i * chunkSize);
                children.push(new Variable(this.session, this.threadId, this, this.reference, `[${start}..${start + count - 1}]`, '', '', undefined, count, undefined, { kind: 'virtual' }, undefined, undefined, true, start));
            }
            return children;
        }
        const variables = await this.fetchVariables(this.startOfVariables, this.indexedVariables, 'indexed');
        return children.concat(variables);
    }
    getId() {
        return this.id;
    }
    getSession() {
        return this.session;
    }
    get value() {
        return this._value;
    }
    get hasChildren() {
        // only variables with reference > 0 have children.
        return !!this.reference && this.reference > 0 && !this.presentationHint?.lazy;
    }
    async fetchVariables(start, count, filter) {
        try {
            const response = await this.session.variables(this.reference || 0, this.threadId, filter, start, count);
            if (!response || !response.body || !response.body.variables) {
                return [];
            }
            const nameCount = new Map();
            const vars = response.body.variables.filter(v => !!v).map((v) => {
                if (isString(v.value) && isString(v.name) && typeof v.variablesReference === 'number') {
                    const count = nameCount.get(v.name) || 0;
                    const idDuplicationIndex = count > 0 ? count.toString() : '';
                    nameCount.set(v.name, count + 1);
                    return new Variable(this.session, this.threadId, this, v.variablesReference, v.name, v.evaluateName, v.value, v.namedVariables, v.indexedVariables, v.memoryReference, v.presentationHint, v.type, v.__vscodeVariableMenuContext, true, 0, idDuplicationIndex, v.declarationLocationReference, v.valueLocationReference);
                }
                return new Variable(this.session, this.threadId, this, 0, '', undefined, nls.localize('invalidVariableAttributes', "Invalid variable attributes"), 0, 0, undefined, { kind: 'virtual' }, undefined, undefined, false);
            });
            if (this.session.autoExpandLazyVariables) {
                await Promise.all(vars.map(v => v.presentationHint?.lazy && v.evaluateLazy()));
            }
            return vars;
        }
        catch (e) {
            return [new Variable(this.session, this.threadId, this, 0, '', undefined, e.message, 0, 0, undefined, { kind: 'virtual' }, undefined, undefined, false)];
        }
    }
    // The adapter explicitly sents the children count of an expression only if there are lots of children which should be chunked.
    get getChildrenInChunks() {
        return !!this.indexedVariables;
    }
    set value(value) {
        this._value = value;
        this.valueChanged = !!ExpressionContainer.allValues.get(this.getId()) &&
            ExpressionContainer.allValues.get(this.getId()) !== Expression.DEFAULT_VALUE && ExpressionContainer.allValues.get(this.getId()) !== value;
        ExpressionContainer.allValues.set(this.getId(), value);
    }
    toString() {
        return this.value;
    }
    async evaluateExpression(expression, session, stackFrame, context, keepLazyVars = false, location) {
        if (!session || (!stackFrame && context !== 'repl')) {
            this.value = context === 'repl' ? nls.localize('startDebugFirst', "Please start a debug session to evaluate expressions") : Expression.DEFAULT_VALUE;
            this.reference = 0;
            return false;
        }
        this.session = session;
        try {
            const response = await session.evaluate(expression, stackFrame ? stackFrame.frameId : undefined, context, location);
            if (response && response.body) {
                this.value = response.body.result || '';
                this.reference = response.body.variablesReference;
                this.namedVariables = response.body.namedVariables;
                this.indexedVariables = response.body.indexedVariables;
                this.memoryReference = response.body.memoryReference;
                this.type = response.body.type || this.type;
                this.presentationHint = response.body.presentationHint;
                this.valueLocationReference = response.body.valueLocationReference;
                if (!keepLazyVars && response.body.presentationHint?.lazy) {
                    await this.evaluateLazy();
                }
                return true;
            }
            return false;
        }
        catch (e) {
            this.value = e.message || '';
            this.reference = 0;
            return false;
        }
    }
}
function handleSetResponse(expression, response) {
    if (response && response.body) {
        expression.value = response.body.value || '';
        expression.type = response.body.type || expression.type;
        expression.reference = response.body.variablesReference;
        expression.namedVariables = response.body.namedVariables;
        expression.indexedVariables = response.body.indexedVariables;
        // todo @weinand: the set responses contain most properties, but not memory references. Should they?
    }
}
export class VisualizedExpression {
    evaluateLazy() {
        return Promise.resolve();
    }
    getChildren() {
        return this.visualizer.getVisualizedChildren(this.session, this.treeId, this.treeItem.id);
    }
    getId() {
        return this.id;
    }
    get name() {
        return this.treeItem.label;
    }
    get value() {
        return this.treeItem.description || '';
    }
    get hasChildren() {
        return this.treeItem.collapsibleState !== 0 /* DebugTreeItemCollapsibleState.None */;
    }
    constructor(session, visualizer, treeId, treeItem, original) {
        this.session = session;
        this.visualizer = visualizer;
        this.treeId = treeId;
        this.treeItem = treeItem;
        this.original = original;
        this.id = generateUuid();
    }
    getSession() {
        return this.session;
    }
    /** Edits the value, sets the {@link errorMessage} and returns false if unsuccessful */
    async edit(newValue) {
        try {
            await this.visualizer.editTreeItem(this.treeId, this.treeItem, newValue);
            return true;
        }
        catch (e) {
            this.errorMessage = e.message;
            return false;
        }
    }
}
export class Expression extends ExpressionContainer {
    static { this.DEFAULT_VALUE = nls.localize('notAvailable', "not available"); }
    constructor(name, id = generateUuid()) {
        super(undefined, undefined, 0, id);
        this.name = name;
        this._onDidChangeValue = new Emitter();
        this.onDidChangeValue = this._onDidChangeValue.event;
        this.available = false;
        // name is not set if the expression is just being added
        // in that case do not set default value to prevent flashing #14499
        if (name) {
            this.value = Expression.DEFAULT_VALUE;
        }
    }
    async evaluate(session, stackFrame, context, keepLazyVars, location) {
        const hadDefaultValue = this.value === Expression.DEFAULT_VALUE;
        this.available = await this.evaluateExpression(this.name, session, stackFrame, context, keepLazyVars, location);
        if (hadDefaultValue || this.valueChanged) {
            this._onDidChangeValue.fire(this);
        }
    }
    toString() {
        return `${this.name}\n${this.value}`;
    }
    async setExpression(value, stackFrame) {
        if (!this.session) {
            return;
        }
        const response = await this.session.setExpression(stackFrame.frameId, this.name, value);
        handleSetResponse(this, response);
    }
}
export class Variable extends ExpressionContainer {
    constructor(session, threadId, parent, reference, name, evaluateName, value, namedVariables, indexedVariables, memoryReference, presentationHint, type = undefined, variableMenuContext = undefined, available = true, startOfVariables = 0, idDuplicationIndex = '', declarationLocationReference = undefined, valueLocationReference = undefined) {
        super(session, threadId, reference, `variable:${parent.getId()}:${name}:${idDuplicationIndex}`, namedVariables, indexedVariables, memoryReference, startOfVariables, presentationHint, valueLocationReference);
        this.parent = parent;
        this.name = name;
        this.evaluateName = evaluateName;
        this.variableMenuContext = variableMenuContext;
        this.available = available;
        this.declarationLocationReference = declarationLocationReference;
        this.value = value || '';
        this.type = type;
    }
    getThreadId() {
        return this.threadId;
    }
    async setVariable(value, stackFrame) {
        if (!this.session) {
            return;
        }
        try {
            // Send out a setExpression for debug extensions that do not support set variables https://github.com/microsoft/vscode/issues/124679#issuecomment-869844437
            if (this.session.capabilities.supportsSetExpression && !this.session.capabilities.supportsSetVariable && this.evaluateName) {
                return this.setExpression(value, stackFrame);
            }
            const response = await this.session.setVariable(this.parent.reference, this.name, value);
            handleSetResponse(this, response);
        }
        catch (err) {
            this.errorMessage = err.message;
        }
    }
    async setExpression(value, stackFrame) {
        if (!this.session || !this.evaluateName) {
            return;
        }
        const response = await this.session.setExpression(stackFrame.frameId, this.evaluateName, value);
        handleSetResponse(this, response);
    }
    toString() {
        return this.name ? `${this.name}: ${this.value}` : this.value;
    }
    adoptLazyResponse(response) {
        this.evaluateName = response.evaluateName;
    }
    toDebugProtocolObject() {
        return {
            name: this.name,
            variablesReference: this.reference || 0,
            memoryReference: this.memoryReference,
            value: this.value,
            evaluateName: this.evaluateName
        };
    }
}
export class Scope extends ExpressionContainer {
    constructor(stackFrame, id, name, reference, expensive, namedVariables, indexedVariables, range) {
        super(stackFrame.thread.session, stackFrame.thread.threadId, reference, `scope:${name}:${id}`, namedVariables, indexedVariables);
        this.stackFrame = stackFrame;
        this.name = name;
        this.expensive = expensive;
        this.range = range;
    }
    toString() {
        return this.name;
    }
    toDebugProtocolObject() {
        return {
            name: this.name,
            variablesReference: this.reference || 0,
            expensive: this.expensive
        };
    }
}
export class ErrorScope extends Scope {
    constructor(stackFrame, index, message) {
        super(stackFrame, index, message, 0, false);
    }
    toString() {
        return this.name;
    }
}
export class StackFrame {
    constructor(thread, frameId, source, name, presentationHint, range, index, canRestart, instructionPointerReference) {
        this.thread = thread;
        this.frameId = frameId;
        this.source = source;
        this.name = name;
        this.presentationHint = presentationHint;
        this.range = range;
        this.index = index;
        this.canRestart = canRestart;
        this.instructionPointerReference = instructionPointerReference;
    }
    getId() {
        return `stackframe:${this.thread.getId()}:${this.index}:${this.source.name}`;
    }
    getScopes() {
        if (!this.scopes) {
            this.scopes = this.thread.session.scopes(this.frameId, this.thread.threadId).then(response => {
                if (!response || !response.body || !response.body.scopes) {
                    return [];
                }
                const usedIds = new Set();
                return response.body.scopes.map(rs => {
                    // form the id based on the name and location so that it's the
                    // same across multiple pauses to retain expansion state
                    let id = 0;
                    do {
                        id = stringHash(`${rs.name}:${rs.line}:${rs.column}`, id);
                    } while (usedIds.has(id));
                    usedIds.add(id);
                    return new Scope(this, id, rs.name, rs.variablesReference, rs.expensive, rs.namedVariables, rs.indexedVariables, rs.line && rs.column && rs.endLine && rs.endColumn ? new Range(rs.line, rs.column, rs.endLine, rs.endColumn) : undefined);
                });
            }, err => [new ErrorScope(this, 0, err.message)]);
        }
        return this.scopes;
    }
    async getMostSpecificScopes(range) {
        const scopes = await this.getScopes();
        const nonExpensiveScopes = scopes.filter(s => !s.expensive);
        const haveRangeInfo = nonExpensiveScopes.some(s => !!s.range);
        if (!haveRangeInfo) {
            return nonExpensiveScopes;
        }
        const scopesContainingRange = nonExpensiveScopes.filter(scope => scope.range && Range.containsRange(scope.range, range))
            .sort((first, second) => (first.range.endLineNumber - first.range.startLineNumber) - (second.range.endLineNumber - second.range.startLineNumber));
        return scopesContainingRange.length ? scopesContainingRange : nonExpensiveScopes;
    }
    restart() {
        return this.thread.session.restartFrame(this.frameId, this.thread.threadId);
    }
    forgetScopes() {
        this.scopes = undefined;
    }
    toString() {
        const lineNumberToString = typeof this.range.startLineNumber === 'number' ? `:${this.range.startLineNumber}` : '';
        const sourceToString = `${this.source.inMemory ? this.source.name : this.source.uri.fsPath}${lineNumberToString}`;
        return sourceToString === UNKNOWN_SOURCE_LABEL ? this.name : `${this.name} (${sourceToString})`;
    }
    async openInEditor(editorService, preserveFocus, sideBySide, pinned) {
        const threadStopReason = this.thread.stoppedDetails?.reason;
        if (this.instructionPointerReference &&
            (threadStopReason === 'instruction breakpoint' ||
                (threadStopReason === 'step' && this.thread.lastSteppingGranularity === 'instruction') ||
                editorService.activeEditor instanceof DisassemblyViewInput)) {
            return editorService.openEditor(DisassemblyViewInput.instance, { pinned: true, revealIfOpened: true });
        }
        if (this.source.available) {
            return this.source.openInEditor(editorService, this.range, preserveFocus, sideBySide, pinned);
        }
        return undefined;
    }
    equals(other) {
        return (this.name === other.name) && (other.thread === this.thread) && (this.frameId === other.frameId) && (other.source === this.source) && (Range.equalsRange(this.range, other.range));
    }
}
const KEEP_SUBTLE_FRAME_AT_TOP_REASONS = ['breakpoint', 'step', 'function breakpoint'];
export class Thread {
    constructor(session, name, threadId) {
        this.session = session;
        this.name = name;
        this.threadId = threadId;
        this.callStackCancellationTokens = [];
        this.reachedEndOfCallStack = false;
        this.callStack = [];
        this.staleCallStack = [];
        this.stopped = false;
    }
    getId() {
        return `thread:${this.session.getId()}:${this.threadId}`;
    }
    clearCallStack() {
        if (this.callStack.length) {
            this.staleCallStack = this.callStack;
        }
        this.callStack = [];
        this.callStackCancellationTokens.forEach(c => c.dispose(true));
        this.callStackCancellationTokens = [];
    }
    getCallStack() {
        return this.callStack;
    }
    getStaleCallStack() {
        return this.staleCallStack;
    }
    getTopStackFrame() {
        const callStack = this.getCallStack();
        const stopReason = this.stoppedDetails?.reason;
        // Allow stack frame without source and with instructionReferencePointer as top stack frame when using disassembly view.
        const firstAvailableStackFrame = callStack.find(sf => !!(((stopReason === 'instruction breakpoint' || (stopReason === 'step' && this.lastSteppingGranularity === 'instruction')) && sf.instructionPointerReference) ||
            (sf.source && sf.source.available && (KEEP_SUBTLE_FRAME_AT_TOP_REASONS.includes(stopReason) || !isFrameDeemphasized(sf)))));
        return firstAvailableStackFrame;
    }
    get stateLabel() {
        if (this.stoppedDetails) {
            return this.stoppedDetails.description ||
                (this.stoppedDetails.reason ? nls.localize({ key: 'pausedOn', comment: ['indicates reason for program being paused'] }, "Paused on {0}", this.stoppedDetails.reason) : nls.localize('paused', "Paused"));
        }
        return nls.localize({ key: 'running', comment: ['indicates state'] }, "Running");
    }
    /**
     * Queries the debug adapter for the callstack and returns a promise
     * which completes once the call stack has been retrieved.
     * If the thread is not stopped, it returns a promise to an empty array.
     * Only fetches the first stack frame for performance reasons. Calling this method consecutive times
     * gets the remainder of the call stack.
     */
    async fetchCallStack(levels = 20) {
        if (this.stopped) {
            const start = this.callStack.length;
            const callStack = await this.getCallStackImpl(start, levels);
            this.reachedEndOfCallStack = callStack.length < levels;
            if (start < this.callStack.length) {
                // Set the stack frames for exact position we requested. To make sure no concurrent requests create duplicate stack frames #30660
                this.callStack.splice(start, this.callStack.length - start);
            }
            this.callStack = this.callStack.concat(callStack || []);
            if (typeof this.stoppedDetails?.totalFrames === 'number' && this.stoppedDetails.totalFrames === this.callStack.length) {
                this.reachedEndOfCallStack = true;
            }
        }
    }
    async getCallStackImpl(startFrame, levels) {
        try {
            const tokenSource = new CancellationTokenSource();
            this.callStackCancellationTokens.push(tokenSource);
            const response = await this.session.stackTrace(this.threadId, startFrame, levels, tokenSource.token);
            if (!response || !response.body || tokenSource.token.isCancellationRequested) {
                return [];
            }
            if (this.stoppedDetails) {
                this.stoppedDetails.totalFrames = response.body.totalFrames;
            }
            return response.body.stackFrames.map((rsf, index) => {
                const source = this.session.getSource(rsf.source);
                return new StackFrame(this, rsf.id, source, rsf.name, rsf.presentationHint, new Range(rsf.line, rsf.column, rsf.endLine || rsf.line, rsf.endColumn || rsf.column), startFrame + index, typeof rsf.canRestart === 'boolean' ? rsf.canRestart : true, rsf.instructionPointerReference);
            });
        }
        catch (err) {
            if (this.stoppedDetails) {
                this.stoppedDetails.framesErrorMessage = err.message;
            }
            return [];
        }
    }
    /**
     * Returns exception info promise if the exception was thrown, otherwise undefined
     */
    get exceptionInfo() {
        if (this.stoppedDetails && this.stoppedDetails.reason === 'exception') {
            if (this.session.capabilities.supportsExceptionInfoRequest) {
                return this.session.exceptionInfo(this.threadId);
            }
            return Promise.resolve({
                description: this.stoppedDetails.text,
                breakMode: null
            });
        }
        return Promise.resolve(undefined);
    }
    next(granularity) {
        return this.session.next(this.threadId, granularity);
    }
    stepIn(granularity) {
        return this.session.stepIn(this.threadId, undefined, granularity);
    }
    stepOut(granularity) {
        return this.session.stepOut(this.threadId, granularity);
    }
    stepBack(granularity) {
        return this.session.stepBack(this.threadId, granularity);
    }
    continue() {
        return this.session.continue(this.threadId);
    }
    pause() {
        return this.session.pause(this.threadId);
    }
    terminate() {
        return this.session.terminateThreads([this.threadId]);
    }
    reverseContinue() {
        return this.session.reverseContinue(this.threadId);
    }
}
/**
 * Gets a URI to a memory in the given session ID.
 */
export const getUriForDebugMemory = (sessionId, memoryReference, range, displayName = 'memory') => {
    return URI.from({
        scheme: DEBUG_MEMORY_SCHEME,
        authority: sessionId,
        path: '/' + encodeURIComponent(memoryReference) + `/${encodeURIComponent(displayName)}.bin`,
        query: range ? `?range=${range.fromOffset}:${range.toOffset}` : undefined,
    });
};
export class MemoryRegion extends Disposable {
    constructor(memoryReference, session) {
        super();
        this.memoryReference = memoryReference;
        this.session = session;
        this.invalidateEmitter = this._register(new Emitter());
        /** @inheritdoc */
        this.onDidInvalidate = this.invalidateEmitter.event;
        /** @inheritdoc */
        this.writable = !!this.session.capabilities.supportsWriteMemoryRequest;
        this._register(session.onDidInvalidateMemory(e => {
            if (e.body.memoryReference === memoryReference) {
                this.invalidate(e.body.offset, e.body.count - e.body.offset);
            }
        }));
    }
    async read(fromOffset, toOffset) {
        const length = toOffset - fromOffset;
        const offset = fromOffset;
        const result = await this.session.readMemory(this.memoryReference, offset, length);
        if (result === undefined || !result.body?.data) {
            return [{ type: 1 /* MemoryRangeType.Unreadable */, offset, length }];
        }
        let data;
        try {
            data = decodeBase64(result.body.data);
        }
        catch {
            return [{ type: 2 /* MemoryRangeType.Error */, offset, length, error: 'Invalid base64 data from debug adapter' }];
        }
        const unreadable = result.body.unreadableBytes || 0;
        const dataLength = length - unreadable;
        if (data.byteLength < dataLength) {
            const pad = VSBuffer.alloc(dataLength - data.byteLength);
            pad.buffer.fill(0);
            data = VSBuffer.concat([data, pad], dataLength);
        }
        else if (data.byteLength > dataLength) {
            data = data.slice(0, dataLength);
        }
        if (!unreadable) {
            return [{ type: 0 /* MemoryRangeType.Valid */, offset, length, data }];
        }
        return [
            { type: 0 /* MemoryRangeType.Valid */, offset, length: dataLength, data },
            { type: 1 /* MemoryRangeType.Unreadable */, offset: offset + dataLength, length: unreadable },
        ];
    }
    async write(offset, data) {
        const result = await this.session.writeMemory(this.memoryReference, offset, encodeBase64(data), true);
        const written = result?.body?.bytesWritten ?? data.byteLength;
        this.invalidate(offset, offset + written);
        return written;
    }
    dispose() {
        super.dispose();
    }
    invalidate(fromOffset, toOffset) {
        this.invalidateEmitter.fire({ fromOffset, toOffset });
    }
}
export class Enablement {
    constructor(enabled, id) {
        this.enabled = enabled;
        this.id = id;
    }
    getId() {
        return this.id;
    }
}
function toBreakpointSessionData(data, capabilities) {
    return mixin({
        supportsConditionalBreakpoints: !!capabilities.supportsConditionalBreakpoints,
        supportsHitConditionalBreakpoints: !!capabilities.supportsHitConditionalBreakpoints,
        supportsLogPoints: !!capabilities.supportsLogPoints,
        supportsFunctionBreakpoints: !!capabilities.supportsFunctionBreakpoints,
        supportsDataBreakpoints: !!capabilities.supportsDataBreakpoints,
        supportsInstructionBreakpoints: !!capabilities.supportsInstructionBreakpoints
    }, data);
}
export class BaseBreakpoint extends Enablement {
    constructor(id, opts) {
        super(opts.enabled ?? true, id);
        this.sessionData = new Map();
        this.condition = opts.condition;
        this.hitCondition = opts.hitCondition;
        this.logMessage = opts.logMessage;
        this.mode = opts.mode;
        this.modeLabel = opts.modeLabel;
    }
    setSessionData(sessionId, data) {
        if (!data) {
            this.sessionData.delete(sessionId);
        }
        else {
            data.sessionId = sessionId;
            this.sessionData.set(sessionId, data);
        }
        const allData = Array.from(this.sessionData.values());
        const verifiedData = distinct(allData.filter(d => d.verified), d => `${d.line}:${d.column}`);
        if (verifiedData.length) {
            // In case multiple session verified the breakpoint and they provide different data show the intial data that the user set (corner case)
            this.data = verifiedData.length === 1 ? verifiedData[0] : undefined;
        }
        else {
            // No session verified the breakpoint
            this.data = allData.length ? allData[0] : undefined;
        }
    }
    get message() {
        if (!this.data) {
            return undefined;
        }
        return this.data.message;
    }
    get verified() {
        return this.data ? this.data.verified : true;
    }
    get sessionsThatVerified() {
        const sessionIds = [];
        for (const [sessionId, data] of this.sessionData) {
            if (data.verified) {
                sessionIds.push(sessionId);
            }
        }
        return sessionIds;
    }
    getIdFromAdapter(sessionId) {
        const data = this.sessionData.get(sessionId);
        return data ? data.id : undefined;
    }
    getDebugProtocolBreakpoint(sessionId) {
        const data = this.sessionData.get(sessionId);
        if (data) {
            const bp = {
                id: data.id,
                verified: data.verified,
                message: data.message,
                source: data.source,
                line: data.line,
                column: data.column,
                endLine: data.endLine,
                endColumn: data.endColumn,
                instructionReference: data.instructionReference,
                offset: data.offset
            };
            return bp;
        }
        return undefined;
    }
    toJSON() {
        return {
            id: this.getId(),
            enabled: this.enabled,
            condition: this.condition,
            hitCondition: this.hitCondition,
            logMessage: this.logMessage,
            mode: this.mode,
            modeLabel: this.modeLabel,
        };
    }
}
export class Breakpoint extends BaseBreakpoint {
    constructor(opts, textFileService, uriIdentityService, logService, id = generateUuid()) {
        super(id, opts);
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._uri = opts.uri;
        this._lineNumber = opts.lineNumber;
        this._column = opts.column;
        this._adapterData = opts.adapterData;
        this.triggeredBy = opts.triggeredBy;
    }
    toDAP() {
        return {
            line: this.sessionAgnosticData.lineNumber,
            column: this.sessionAgnosticData.column,
            condition: this.condition,
            hitCondition: this.hitCondition,
            logMessage: this.logMessage,
            mode: this.mode
        };
    }
    get originalUri() {
        return this._uri;
    }
    get lineNumber() {
        return this.verified && this.data && typeof this.data.line === 'number' ? this.data.line : this._lineNumber;
    }
    get verified() {
        if (this.data) {
            return this.data.verified && !this.textFileService.isDirty(this._uri);
        }
        return true;
    }
    get pending() {
        if (this.data) {
            return false;
        }
        return this.triggeredBy !== undefined;
    }
    get uri() {
        return this.verified && this.data && this.data.source ? getUriFromSource(this.data.source, this.data.source.path, this.data.sessionId, this.uriIdentityService, this.logService) : this._uri;
    }
    get column() {
        return this.verified && this.data && typeof this.data.column === 'number' ? this.data.column : this._column;
    }
    get message() {
        if (this.textFileService.isDirty(this.uri)) {
            return nls.localize('breakpointDirtydHover', "Unverified breakpoint. File is modified, please restart debug session.");
        }
        return super.message;
    }
    get adapterData() {
        return this.data && this.data.source && this.data.source.adapterData ? this.data.source.adapterData : this._adapterData;
    }
    get endLineNumber() {
        return this.verified && this.data ? this.data.endLine : undefined;
    }
    get endColumn() {
        return this.verified && this.data ? this.data.endColumn : undefined;
    }
    get sessionAgnosticData() {
        return {
            lineNumber: this._lineNumber,
            column: this._column
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        if (this.logMessage && !this.data.supportsLogPoints) {
            return false;
        }
        if (this.condition && !this.data.supportsConditionalBreakpoints) {
            return false;
        }
        if (this.hitCondition && !this.data.supportsHitConditionalBreakpoints) {
            return false;
        }
        return true;
    }
    setSessionData(sessionId, data) {
        super.setSessionData(sessionId, data);
        if (!this._adapterData) {
            this._adapterData = this.adapterData;
        }
    }
    toJSON() {
        return {
            ...super.toJSON(),
            uri: this._uri,
            lineNumber: this._lineNumber,
            column: this._column,
            adapterData: this.adapterData,
            triggeredBy: this.triggeredBy,
        };
    }
    toString() {
        return `${resources.basenameOrAuthority(this.uri)} ${this.lineNumber}`;
    }
    setSessionDidTrigger(sessionId, didTrigger = true) {
        if (didTrigger) {
            this.sessionsDidTrigger ??= new Set();
            this.sessionsDidTrigger.add(sessionId);
        }
        else {
            this.sessionsDidTrigger?.delete(sessionId);
        }
    }
    getSessionDidTrigger(sessionId) {
        return !!this.sessionsDidTrigger?.has(sessionId);
    }
    update(data) {
        if (data.hasOwnProperty('lineNumber') && !isUndefinedOrNull(data.lineNumber)) {
            this._lineNumber = data.lineNumber;
        }
        if (data.hasOwnProperty('column')) {
            this._column = data.column;
        }
        if (data.hasOwnProperty('condition')) {
            this.condition = data.condition;
        }
        if (data.hasOwnProperty('hitCondition')) {
            this.hitCondition = data.hitCondition;
        }
        if (data.hasOwnProperty('logMessage')) {
            this.logMessage = data.logMessage;
        }
        if (data.hasOwnProperty('mode')) {
            this.mode = data.mode;
            this.modeLabel = data.modeLabel;
        }
        if (data.hasOwnProperty('triggeredBy')) {
            this.triggeredBy = data.triggeredBy;
            this.sessionsDidTrigger = undefined;
        }
    }
}
export class FunctionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.name = opts.name;
    }
    toDAP() {
        return {
            name: this.name,
            condition: this.condition,
            hitCondition: this.hitCondition,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsFunctionBreakpoints;
    }
    toString() {
        return this.name;
    }
}
export class DataBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.sessionDataIdForAddr = new WeakMap();
        this.description = opts.description;
        if ('dataId' in opts) { //  back compat with old saved variables in 1.87
            opts.src = { type: 0 /* DataBreakpointSetType.Variable */, dataId: opts.dataId };
        }
        this.src = opts.src;
        this.canPersist = opts.canPersist;
        this.accessTypes = opts.accessTypes;
        this.accessType = opts.accessType;
        if (opts.initialSessionData) {
            this.sessionDataIdForAddr.set(opts.initialSessionData.session, opts.initialSessionData.dataId);
        }
    }
    async toDAP(session) {
        let dataId;
        if (this.src.type === 0 /* DataBreakpointSetType.Variable */) {
            dataId = this.src.dataId;
        }
        else {
            let sessionDataId = this.sessionDataIdForAddr.get(session);
            if (!sessionDataId) {
                sessionDataId = (await session.dataBytesBreakpointInfo(this.src.address, this.src.bytes))?.dataId;
                if (!sessionDataId) {
                    return undefined;
                }
                this.sessionDataIdForAddr.set(session, sessionDataId);
            }
            dataId = sessionDataId;
        }
        return {
            dataId,
            accessType: this.accessType,
            condition: this.condition,
            hitCondition: this.hitCondition,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            description: this.description,
            src: this.src,
            accessTypes: this.accessTypes,
            accessType: this.accessType,
            canPersist: this.canPersist,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsDataBreakpoints;
    }
    toString() {
        return this.description;
    }
}
export class ExceptionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.supportedSessions = new Set();
        this.fallback = false;
        this.filter = opts.filter;
        this.label = opts.label;
        this.supportsCondition = opts.supportsCondition;
        this.description = opts.description;
        this.conditionDescription = opts.conditionDescription;
        this.fallback = opts.fallback || false;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            filter: this.filter,
            label: this.label,
            enabled: this.enabled,
            supportsCondition: this.supportsCondition,
            conditionDescription: this.conditionDescription,
            condition: this.condition,
            fallback: this.fallback,
            description: this.description,
        };
    }
    setSupportedSession(sessionId, supported) {
        if (supported) {
            this.supportedSessions.add(sessionId);
        }
        else {
            this.supportedSessions.delete(sessionId);
        }
    }
    /**
     * Used to specify which breakpoints to show when no session is specified.
     * Useful when no session is active and we want to show the exception breakpoints from the last session.
     */
    setFallback(isFallback) {
        this.fallback = isFallback;
    }
    get supported() {
        return true;
    }
    /**
     * Checks if the breakpoint is applicable for the specified session.
     * If sessionId is undefined, returns true if this breakpoint is a fallback breakpoint.
     */
    isSupportedSession(sessionId) {
        return sessionId ? this.supportedSessions.has(sessionId) : this.fallback;
    }
    matches(filter) {
        return this.filter === filter.filter
            && this.label === filter.label
            && this.supportsCondition === !!filter.supportsCondition
            && this.conditionDescription === filter.conditionDescription
            && this.description === filter.description;
    }
    toString() {
        return this.label;
    }
}
export class InstructionBreakpoint extends BaseBreakpoint {
    constructor(opts, id = generateUuid()) {
        super(id, opts);
        this.instructionReference = opts.instructionReference;
        this.offset = opts.offset;
        this.canPersist = opts.canPersist;
        this.address = opts.address;
    }
    toDAP() {
        return {
            instructionReference: this.instructionReference,
            condition: this.condition,
            hitCondition: this.hitCondition,
            mode: this.mode,
            offset: this.offset,
        };
    }
    toJSON() {
        return {
            ...super.toJSON(),
            instructionReference: this.instructionReference,
            offset: this.offset,
            canPersist: this.canPersist,
            address: this.address,
        };
    }
    get supported() {
        if (!this.data) {
            return true;
        }
        return this.data.supportsInstructionBreakpoints;
    }
    toString() {
        return this.instructionReference;
    }
}
export class ThreadAndSessionIds {
    constructor(sessionId, threadId) {
        this.sessionId = sessionId;
        this.threadId = threadId;
    }
    getId() {
        return `${this.sessionId}:${this.threadId}`;
    }
}
let DebugModel = class DebugModel extends Disposable {
    constructor(debugStorage, textFileService, uriIdentityService, logService) {
        super();
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.schedulers = new Map();
        this.breakpointsActivated = true;
        this._onDidChangeBreakpoints = this._register(new Emitter());
        this._onDidChangeCallStack = this._register(new Emitter());
        this._onDidChangeWatchExpressions = this._register(new Emitter());
        this._onDidChangeWatchExpressionValue = this._register(new Emitter());
        this._breakpointModes = new Map();
        this._register(autorun(reader => {
            this.breakpoints = debugStorage.breakpoints.read(reader);
            this.functionBreakpoints = debugStorage.functionBreakpoints.read(reader);
            this.exceptionBreakpoints = debugStorage.exceptionBreakpoints.read(reader);
            this.dataBreakpoints = debugStorage.dataBreakpoints.read(reader);
            this._onDidChangeBreakpoints.fire(undefined);
        }));
        this._register(autorun(reader => {
            this.watchExpressions = debugStorage.watchExpressions.read(reader);
            this._onDidChangeWatchExpressions.fire(undefined);
        }));
        this._register(trackSetChanges(() => new Set(this.watchExpressions), this.onDidChangeWatchExpressions, (we) => we.onDidChangeValue((e) => this._onDidChangeWatchExpressionValue.fire(e))));
        this.instructionBreakpoints = [];
        this.sessions = [];
    }
    getId() {
        return 'root';
    }
    getSession(sessionId, includeInactive = false) {
        if (sessionId) {
            return this.getSessions(includeInactive).find(s => s.getId() === sessionId);
        }
        return undefined;
    }
    getSessions(includeInactive = false) {
        // By default do not return inactive sessions.
        // However we are still holding onto inactive sessions due to repl and debug service session revival (eh scenario)
        return this.sessions.filter(s => includeInactive || s.state !== 0 /* State.Inactive */);
    }
    addSession(session) {
        this.sessions = this.sessions.filter(s => {
            if (s.getId() === session.getId()) {
                // Make sure to de-dupe if a session is re-initialized. In case of EH debugging we are adding a session again after an attach.
                return false;
            }
            if (s.state === 0 /* State.Inactive */ && s.configuration.name === session.configuration.name) {
                // Make sure to remove all inactive sessions that are using the same configuration as the new session
                return false;
            }
            return true;
        });
        let i = 1;
        while (this.sessions.some(s => s.getLabel() === session.getLabel())) {
            session.setName(`${session.configuration.name} ${++i}`);
        }
        let index = -1;
        if (session.parentSession) {
            // Make sure that child sessions are placed after the parent session
            index = findLastIdx(this.sessions, s => s.parentSession === session.parentSession || s === session.parentSession);
        }
        if (index >= 0) {
            this.sessions.splice(index + 1, 0, session);
        }
        else {
            this.sessions.push(session);
        }
        this._onDidChangeCallStack.fire(undefined);
    }
    get onDidChangeBreakpoints() {
        return this._onDidChangeBreakpoints.event;
    }
    get onDidChangeCallStack() {
        return this._onDidChangeCallStack.event;
    }
    get onDidChangeWatchExpressions() {
        return this._onDidChangeWatchExpressions.event;
    }
    get onDidChangeWatchExpressionValue() {
        return this._onDidChangeWatchExpressionValue.event;
    }
    rawUpdate(data) {
        const session = this.sessions.find(p => p.getId() === data.sessionId);
        if (session) {
            session.rawUpdate(data);
            this._onDidChangeCallStack.fire(undefined);
        }
    }
    clearThreads(id, removeThreads, reference = undefined) {
        const session = this.sessions.find(p => p.getId() === id);
        this.schedulers.forEach(entry => {
            entry.scheduler.dispose();
            entry.completeDeferred.complete();
        });
        this.schedulers.clear();
        if (session) {
            session.clearThreads(removeThreads, reference);
            this._onDidChangeCallStack.fire(undefined);
        }
    }
    /**
     * Update the call stack and notify the call stack view that changes have occurred.
     */
    async fetchCallstack(thread, levels) {
        if (thread.reachedEndOfCallStack) {
            return;
        }
        const totalFrames = thread.stoppedDetails?.totalFrames;
        const remainingFrames = (typeof totalFrames === 'number') ? (totalFrames - thread.getCallStack().length) : undefined;
        if (!levels || (remainingFrames && levels > remainingFrames)) {
            levels = remainingFrames;
        }
        if (levels && levels > 0) {
            await thread.fetchCallStack(levels);
            this._onDidChangeCallStack.fire();
        }
        return;
    }
    refreshTopOfCallstack(thread, fetchFullStack = true) {
        if (thread.session.capabilities.supportsDelayedStackTraceLoading) {
            // For improved performance load the first stack frame and then load the rest async.
            let topCallStack = Promise.resolve();
            const wholeCallStack = new Promise((c, e) => {
                topCallStack = thread.fetchCallStack(1).then(() => {
                    if (!fetchFullStack) {
                        c();
                        this._onDidChangeCallStack.fire();
                        return;
                    }
                    if (!this.schedulers.has(thread.getId())) {
                        const deferred = new DeferredPromise();
                        this.schedulers.set(thread.getId(), {
                            completeDeferred: deferred,
                            scheduler: new RunOnceScheduler(() => {
                                thread.fetchCallStack(19).then(() => {
                                    const stale = thread.getStaleCallStack();
                                    const current = thread.getCallStack();
                                    let bottomOfCallStackChanged = stale.length !== current.length;
                                    for (let i = 1; i < stale.length && !bottomOfCallStackChanged; i++) {
                                        bottomOfCallStackChanged = !stale[i].equals(current[i]);
                                    }
                                    if (bottomOfCallStackChanged) {
                                        this._onDidChangeCallStack.fire();
                                    }
                                }).finally(() => {
                                    deferred.complete();
                                    this.schedulers.delete(thread.getId());
                                });
                            }, 420)
                        });
                    }
                    const entry = this.schedulers.get(thread.getId());
                    entry.scheduler.schedule();
                    entry.completeDeferred.p.then(c, e);
                    this._onDidChangeCallStack.fire();
                });
            });
            return { topCallStack, wholeCallStack };
        }
        const wholeCallStack = thread.fetchCallStack();
        return { wholeCallStack, topCallStack: wholeCallStack };
    }
    getBreakpoints(filter) {
        if (filter) {
            const uriStr = filter.uri?.toString();
            const originalUriStr = filter.originalUri?.toString();
            return this.breakpoints.filter(bp => {
                if (uriStr && bp.uri.toString() !== uriStr) {
                    return false;
                }
                if (originalUriStr && bp.originalUri.toString() !== originalUriStr) {
                    return false;
                }
                if (filter.lineNumber && bp.lineNumber !== filter.lineNumber) {
                    return false;
                }
                if (filter.column && bp.column !== filter.column) {
                    return false;
                }
                if (filter.enabledOnly && (!this.breakpointsActivated || !bp.enabled)) {
                    return false;
                }
                if (filter.triggeredOnly && bp.triggeredBy === undefined) {
                    return false;
                }
                return true;
            });
        }
        return this.breakpoints;
    }
    getFunctionBreakpoints() {
        return this.functionBreakpoints;
    }
    getDataBreakpoints() {
        return this.dataBreakpoints;
    }
    getExceptionBreakpoints() {
        return this.exceptionBreakpoints;
    }
    getExceptionBreakpointsForSession(sessionId) {
        return this.exceptionBreakpoints.filter(ebp => ebp.isSupportedSession(sessionId));
    }
    getInstructionBreakpoints() {
        return this.instructionBreakpoints;
    }
    setExceptionBreakpointsForSession(sessionId, filters) {
        if (!filters) {
            return;
        }
        let didChangeBreakpoints = false;
        filters.forEach((d) => {
            let ebp = this.exceptionBreakpoints.filter((exbp) => exbp.matches(d)).pop();
            if (!ebp) {
                didChangeBreakpoints = true;
                ebp = new ExceptionBreakpoint({
                    filter: d.filter,
                    label: d.label,
                    enabled: !!d.default,
                    supportsCondition: !!d.supportsCondition,
                    description: d.description,
                    conditionDescription: d.conditionDescription,
                });
                this.exceptionBreakpoints.push(ebp);
            }
            ebp.setSupportedSession(sessionId, true);
        });
        if (didChangeBreakpoints) {
            this._onDidChangeBreakpoints.fire(undefined);
        }
    }
    removeExceptionBreakpointsForSession(sessionId) {
        this.exceptionBreakpoints.forEach(ebp => ebp.setSupportedSession(sessionId, false));
    }
    // Set last focused session as fallback session.
    // This is done to keep track of the exception breakpoints to show when no session is active.
    setExceptionBreakpointFallbackSession(sessionId) {
        this.exceptionBreakpoints.forEach(ebp => ebp.setFallback(ebp.isSupportedSession(sessionId)));
    }
    setExceptionBreakpointCondition(exceptionBreakpoint, condition) {
        exceptionBreakpoint.condition = condition;
        this._onDidChangeBreakpoints.fire(undefined);
    }
    areBreakpointsActivated() {
        return this.breakpointsActivated;
    }
    setBreakpointsActivated(activated) {
        this.breakpointsActivated = activated;
        this._onDidChangeBreakpoints.fire(undefined);
    }
    addBreakpoints(uri, rawData, fireEvent = true) {
        const newBreakpoints = rawData.map(rawBp => {
            return new Breakpoint({
                uri,
                lineNumber: rawBp.lineNumber,
                column: rawBp.column,
                enabled: rawBp.enabled ?? true,
                condition: rawBp.condition,
                hitCondition: rawBp.hitCondition,
                logMessage: rawBp.logMessage,
                triggeredBy: rawBp.triggeredBy,
                adapterData: undefined,
                mode: rawBp.mode,
                modeLabel: rawBp.modeLabel,
            }, this.textFileService, this.uriIdentityService, this.logService, rawBp.id);
        });
        this.breakpoints = this.breakpoints.concat(newBreakpoints);
        this.breakpointsActivated = true;
        this.sortAndDeDup();
        if (fireEvent) {
            this._onDidChangeBreakpoints.fire({ added: newBreakpoints, sessionOnly: false });
        }
        return newBreakpoints;
    }
    removeBreakpoints(toRemove) {
        this.breakpoints = this.breakpoints.filter(bp => !toRemove.some(toRemove => toRemove.getId() === bp.getId()));
        this._onDidChangeBreakpoints.fire({ removed: toRemove, sessionOnly: false });
    }
    updateBreakpoints(data) {
        const updated = [];
        this.breakpoints.forEach(bp => {
            const bpData = data.get(bp.getId());
            if (bpData) {
                bp.update(bpData);
                updated.push(bp);
            }
        });
        this.sortAndDeDup();
        this._onDidChangeBreakpoints.fire({ changed: updated, sessionOnly: false });
    }
    setBreakpointSessionData(sessionId, capabilites, data) {
        this.breakpoints.forEach(bp => {
            if (!data) {
                bp.setSessionData(sessionId, undefined);
            }
            else {
                const bpData = data.get(bp.getId());
                if (bpData) {
                    bp.setSessionData(sessionId, toBreakpointSessionData(bpData, capabilites));
                }
            }
        });
        this.functionBreakpoints.forEach(fbp => {
            if (!data) {
                fbp.setSessionData(sessionId, undefined);
            }
            else {
                const fbpData = data.get(fbp.getId());
                if (fbpData) {
                    fbp.setSessionData(sessionId, toBreakpointSessionData(fbpData, capabilites));
                }
            }
        });
        this.dataBreakpoints.forEach(dbp => {
            if (!data) {
                dbp.setSessionData(sessionId, undefined);
            }
            else {
                const dbpData = data.get(dbp.getId());
                if (dbpData) {
                    dbp.setSessionData(sessionId, toBreakpointSessionData(dbpData, capabilites));
                }
            }
        });
        this.exceptionBreakpoints.forEach(ebp => {
            if (!data) {
                ebp.setSessionData(sessionId, undefined);
            }
            else {
                const ebpData = data.get(ebp.getId());
                if (ebpData) {
                    ebp.setSessionData(sessionId, toBreakpointSessionData(ebpData, capabilites));
                }
            }
        });
        this.instructionBreakpoints.forEach(ibp => {
            if (!data) {
                ibp.setSessionData(sessionId, undefined);
            }
            else {
                const ibpData = data.get(ibp.getId());
                if (ibpData) {
                    ibp.setSessionData(sessionId, toBreakpointSessionData(ibpData, capabilites));
                }
            }
        });
        this._onDidChangeBreakpoints.fire({
            sessionOnly: true
        });
    }
    getDebugProtocolBreakpoint(breakpointId, sessionId) {
        const bp = this.breakpoints.find(bp => bp.getId() === breakpointId);
        if (bp) {
            return bp.getDebugProtocolBreakpoint(sessionId);
        }
        return undefined;
    }
    getBreakpointModes(forBreakpointType) {
        return [...this._breakpointModes.values()].filter(mode => mode.appliesTo.includes(forBreakpointType));
    }
    registerBreakpointModes(debugType, modes) {
        for (const mode of modes) {
            const key = `${mode.mode}/${mode.label}`;
            const rec = this._breakpointModes.get(key);
            if (rec) {
                for (const target of mode.appliesTo) {
                    if (!rec.appliesTo.includes(target)) {
                        rec.appliesTo.push(target);
                    }
                }
            }
            else {
                const duplicate = [...this._breakpointModes.values()].find(r => r !== rec && r.label === mode.label);
                if (duplicate) {
                    duplicate.label = `${duplicate.label} (${duplicate.firstFromDebugType})`;
                }
                this._breakpointModes.set(key, {
                    mode: mode.mode,
                    label: duplicate ? `${mode.label} (${debugType})` : mode.label,
                    firstFromDebugType: debugType,
                    description: mode.description,
                    appliesTo: mode.appliesTo.slice(), // avoid later mutations
                });
            }
        }
    }
    sortAndDeDup() {
        this.breakpoints = this.breakpoints.sort((first, second) => {
            if (first.uri.toString() !== second.uri.toString()) {
                return resources.basenameOrAuthority(first.uri).localeCompare(resources.basenameOrAuthority(second.uri));
            }
            if (first.lineNumber === second.lineNumber) {
                if (first.column && second.column) {
                    return first.column - second.column;
                }
                return 1;
            }
            return first.lineNumber - second.lineNumber;
        });
        this.breakpoints = distinct(this.breakpoints, bp => `${bp.uri.toString()}:${bp.lineNumber}:${bp.column}`);
    }
    setEnablement(element, enable) {
        if (element instanceof Breakpoint || element instanceof FunctionBreakpoint || element instanceof ExceptionBreakpoint || element instanceof DataBreakpoint || element instanceof InstructionBreakpoint) {
            const changed = [];
            if (element.enabled !== enable && (element instanceof Breakpoint || element instanceof FunctionBreakpoint || element instanceof DataBreakpoint || element instanceof InstructionBreakpoint)) {
                changed.push(element);
            }
            element.enabled = enable;
            if (enable) {
                this.breakpointsActivated = true;
            }
            this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
        }
    }
    enableOrDisableAllBreakpoints(enable) {
        const changed = [];
        this.breakpoints.forEach(bp => {
            if (bp.enabled !== enable) {
                changed.push(bp);
            }
            bp.enabled = enable;
        });
        this.functionBreakpoints.forEach(fbp => {
            if (fbp.enabled !== enable) {
                changed.push(fbp);
            }
            fbp.enabled = enable;
        });
        this.dataBreakpoints.forEach(dbp => {
            if (dbp.enabled !== enable) {
                changed.push(dbp);
            }
            dbp.enabled = enable;
        });
        this.instructionBreakpoints.forEach(ibp => {
            if (ibp.enabled !== enable) {
                changed.push(ibp);
            }
            ibp.enabled = enable;
        });
        if (enable) {
            this.breakpointsActivated = true;
        }
        this._onDidChangeBreakpoints.fire({ changed: changed, sessionOnly: false });
    }
    addFunctionBreakpoint(opts, id) {
        const newFunctionBreakpoint = new FunctionBreakpoint(opts, id);
        this.functionBreakpoints.push(newFunctionBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newFunctionBreakpoint], sessionOnly: false });
        return newFunctionBreakpoint;
    }
    updateFunctionBreakpoint(id, update) {
        const functionBreakpoint = this.functionBreakpoints.find(fbp => fbp.getId() === id);
        if (functionBreakpoint) {
            if (typeof update.name === 'string') {
                functionBreakpoint.name = update.name;
            }
            if (typeof update.condition === 'string') {
                functionBreakpoint.condition = update.condition;
            }
            if (typeof update.hitCondition === 'string') {
                functionBreakpoint.hitCondition = update.hitCondition;
            }
            this._onDidChangeBreakpoints.fire({ changed: [functionBreakpoint], sessionOnly: false });
        }
    }
    removeFunctionBreakpoints(id) {
        let removed;
        if (id) {
            removed = this.functionBreakpoints.filter(fbp => fbp.getId() === id);
            this.functionBreakpoints = this.functionBreakpoints.filter(fbp => fbp.getId() !== id);
        }
        else {
            removed = this.functionBreakpoints;
            this.functionBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    addDataBreakpoint(opts, id) {
        const newDataBreakpoint = new DataBreakpoint(opts, id);
        this.dataBreakpoints.push(newDataBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newDataBreakpoint], sessionOnly: false });
    }
    updateDataBreakpoint(id, update) {
        const dataBreakpoint = this.dataBreakpoints.find(fbp => fbp.getId() === id);
        if (dataBreakpoint) {
            if (typeof update.condition === 'string') {
                dataBreakpoint.condition = update.condition;
            }
            if (typeof update.hitCondition === 'string') {
                dataBreakpoint.hitCondition = update.hitCondition;
            }
            this._onDidChangeBreakpoints.fire({ changed: [dataBreakpoint], sessionOnly: false });
        }
    }
    removeDataBreakpoints(id) {
        let removed;
        if (id) {
            removed = this.dataBreakpoints.filter(fbp => fbp.getId() === id);
            this.dataBreakpoints = this.dataBreakpoints.filter(fbp => fbp.getId() !== id);
        }
        else {
            removed = this.dataBreakpoints;
            this.dataBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    addInstructionBreakpoint(opts) {
        const newInstructionBreakpoint = new InstructionBreakpoint(opts);
        this.instructionBreakpoints.push(newInstructionBreakpoint);
        this._onDidChangeBreakpoints.fire({ added: [newInstructionBreakpoint], sessionOnly: true });
    }
    removeInstructionBreakpoints(instructionReference, offset) {
        let removed = [];
        if (instructionReference) {
            for (let i = 0; i < this.instructionBreakpoints.length; i++) {
                const ibp = this.instructionBreakpoints[i];
                if (ibp.instructionReference === instructionReference && (offset === undefined || ibp.offset === offset)) {
                    removed.push(ibp);
                    this.instructionBreakpoints.splice(i--, 1);
                }
            }
        }
        else {
            removed = this.instructionBreakpoints;
            this.instructionBreakpoints = [];
        }
        this._onDidChangeBreakpoints.fire({ removed, sessionOnly: false });
    }
    getWatchExpressions() {
        return this.watchExpressions;
    }
    addWatchExpression(name) {
        const we = new Expression(name || '');
        this.watchExpressions.push(we);
        this._onDidChangeWatchExpressions.fire(we);
        return we;
    }
    renameWatchExpression(id, newName) {
        const filtered = this.watchExpressions.filter(we => we.getId() === id);
        if (filtered.length === 1) {
            filtered[0].name = newName;
            this._onDidChangeWatchExpressions.fire(filtered[0]);
        }
    }
    removeWatchExpressions(id = null) {
        this.watchExpressions = id ? this.watchExpressions.filter(we => we.getId() !== id) : [];
        this._onDidChangeWatchExpressions.fire(undefined);
    }
    moveWatchExpression(id, position) {
        const we = this.watchExpressions.find(we => we.getId() === id);
        if (we) {
            this.watchExpressions = this.watchExpressions.filter(we => we.getId() !== id);
            this.watchExpressions = this.watchExpressions.slice(0, position).concat(we, this.watchExpressions.slice(position));
            this._onDidChangeWatchExpressions.fire(undefined);
        }
    }
    sourceIsNotAvailable(uri) {
        this.sessions.forEach(s => {
            const source = s.getSourceForUri(uri);
            if (source) {
                source.available = false;
            }
        });
        this._onDidChangeCallStack.fire(undefined);
    }
};
DebugModel = __decorate([
    __param(1, ITextFileService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], DebugModel);
export { DebugModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFTLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFjLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3RixPQUFPLEVBQUUsbUJBQW1CLEVBQWlqQixtQkFBbUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNybkIsT0FBTyxFQUFVLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHbEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFNbEYsTUFBTSxPQUFPLG1CQUFtQjthQUVSLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQUFBNUIsQ0FBNkI7SUFDN0QsOENBQThDO2FBQ3RCLG9CQUFlLEdBQUcsR0FBRyxBQUFOLENBQU87SUFPOUMsWUFDVyxPQUFrQyxFQUN6QixRQUE0QixFQUN2QyxVQUE4QixFQUNyQixFQUFVLEVBQ3BCLGlCQUFxQyxDQUFDLEVBQ3RDLG1CQUF1QyxDQUFDLEVBQ3hDLGtCQUFzQyxTQUFTLEVBQzlDLG1CQUF1QyxDQUFDLEVBQ3pDLG1CQUF1RSxTQUFTLEVBQ2hGLHlCQUE2QyxTQUFTO1FBVG5ELFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ3pCLGFBQVEsR0FBUixRQUFRLENBQW9CO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQW9CO1FBQ3JCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDcEIsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1FBQ3RDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0I7UUFDeEMsb0JBQWUsR0FBZixlQUFlLENBQWdDO1FBQzlDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBd0I7UUFDekMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFnRTtRQUNoRiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQWdDO1FBZHZELGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLFdBQU0sR0FBVyxFQUFFLENBQUM7SUFjeEIsQ0FBQztJQUVMLElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRUQsSUFBSSxTQUFTLENBQUMsS0FBeUI7UUFDdEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyw0QkFBNEI7SUFDeEQsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzNDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvRyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyRyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixDQUFDO1FBQzdDLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7UUFDOUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDaEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDO1FBQzlELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVTLGlCQUFpQixDQUFDLFFBQWdDO0lBQzVELENBQUM7SUFFRCxXQUFXO1FBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYTtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMvQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsMkZBQTJGO1FBQzNGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFckcsaUVBQWlFO1FBQ2pFLElBQUksU0FBUyxHQUFHLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztRQUNwRCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzRyxTQUFTLElBQUksbUJBQW1CLENBQUMsZUFBZSxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ2xFLDJGQUEyRjtZQUMzRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNwRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7Z0JBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0JBQ3pFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyxLQUFLLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2pOLENBQUM7WUFFRCxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckcsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLG1EQUFtRDtRQUNuRCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQztJQUMvRSxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUF5QixFQUFFLEtBQXlCLEVBQUUsTUFBdUM7UUFDekgsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM3RCxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUM1QyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBb0MsRUFBRSxFQUFFO2dCQUNsRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDdkYsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN6QyxNQUFNLGtCQUFrQixHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM3RCxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLDRCQUE0QixFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUMxVCxDQUFDO2dCQUNELE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDZCQUE2QixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2TixDQUFDLENBQUMsQ0FBQztZQUVILElBQUksSUFBSSxDQUFDLE9BQVEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFKLENBQUM7SUFDRixDQUFDO0lBRUQsK0hBQStIO0lBQy9ILElBQVksbUJBQW1CO1FBQzlCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsS0FBYTtRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxhQUFhLElBQUksbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUM7UUFDM0ksbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FDdkIsVUFBa0IsRUFDbEIsT0FBa0MsRUFDbEMsVUFBbUMsRUFDbkMsT0FBZSxFQUNmLFlBQVksR0FBRyxLQUFLLEVBQ3BCLFFBQWlDO1FBR2pDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLFVBQVUsSUFBSSxPQUFPLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsc0RBQXNELENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUNySixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVwSCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO2dCQUN2RCxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO2dCQUNyRCxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO2dCQUN2RCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztnQkFFbkUsSUFBSSxDQUFDLFlBQVksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDO29CQUMzRCxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDM0IsQ0FBQztnQkFFRCxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDOztBQUdGLFNBQVMsaUJBQWlCLENBQUMsVUFBK0IsRUFBRSxRQUE2RjtJQUN4SixJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDL0IsVUFBVSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDN0MsVUFBVSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hELFVBQVUsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztRQUN4RCxVQUFVLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ3pELFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1FBQzdELG9HQUFvRztJQUNyRyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxvQkFBb0I7SUFJaEMsWUFBWTtRQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFDRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQiwrQ0FBdUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsWUFDa0IsT0FBa0MsRUFDbEMsVUFBbUMsRUFDcEMsTUFBYyxFQUNkLFFBQXFDLEVBQ3JDLFFBQW1CO1FBSmxCLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ2xDLGVBQVUsR0FBVixVQUFVLENBQXlCO1FBQ3BDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxhQUFRLEdBQVIsUUFBUSxDQUE2QjtRQUNyQyxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBOUJuQixPQUFFLEdBQUcsWUFBWSxFQUFFLENBQUM7SUErQmpDLENBQUM7SUFFRSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRUQsdUZBQXVGO0lBQ2hGLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBZ0I7UUFDakMsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekUsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUM5QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLG1CQUFtQjthQUNsQyxrQkFBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxBQUFoRCxDQUFpRDtJQU85RSxZQUFtQixJQUFZLEVBQUUsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUNuRCxLQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFEakIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUhkLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUFlLENBQUM7UUFDaEQscUJBQWdCLEdBQXVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFJbkYsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdkIsd0RBQXdEO1FBQ3hELG1FQUFtRTtRQUNuRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFrQyxFQUFFLFVBQW1DLEVBQUUsT0FBZSxFQUFFLFlBQXNCLEVBQUUsUUFBaUM7UUFDakssTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ2hFLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEgsSUFBSSxlQUFlLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFhLEVBQUUsVUFBdUI7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hGLGlCQUFpQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuQyxDQUFDOztBQUdGLE1BQU0sT0FBTyxRQUFTLFNBQVEsbUJBQW1CO0lBS2hELFlBQ0MsT0FBa0MsRUFDbEMsUUFBNEIsRUFDWixNQUE0QixFQUM1QyxTQUE2QixFQUNiLElBQVksRUFDckIsWUFBZ0MsRUFDdkMsS0FBeUIsRUFDekIsY0FBa0MsRUFDbEMsZ0JBQW9DLEVBQ3BDLGVBQW1DLEVBQ25DLGdCQUFvRSxFQUNwRSxPQUEyQixTQUFTLEVBQ3BCLHNCQUEwQyxTQUFTLEVBQ25ELFlBQVksSUFBSSxFQUNoQyxnQkFBZ0IsR0FBRyxDQUFDLEVBQ3BCLGtCQUFrQixHQUFHLEVBQUUsRUFDUCwrQkFBbUQsU0FBUyxFQUM1RSx5QkFBNkMsU0FBUztRQUV0RCxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsWUFBWSxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBakIvTCxXQUFNLEdBQU4sTUFBTSxDQUFzQjtRQUU1QixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtRQU92Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQWdDO1FBQ25ELGNBQVMsR0FBVCxTQUFTLENBQU87UUFHaEIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUFnQztRQUk1RSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBYSxFQUFFLFVBQXVCO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSiwySkFBMko7WUFDM0osSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDNUgsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBdUIsSUFBSSxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNoSCxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQWEsRUFBRSxVQUF1QjtRQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN6QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hHLGlCQUFpQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDL0QsQ0FBQztJQUVrQixpQkFBaUIsQ0FBQyxRQUFnQztRQUNwRSxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUM7SUFDM0MsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPO1lBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2Ysa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDO1lBQ3ZDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQy9CLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sS0FBTSxTQUFRLG1CQUFtQjtJQUU3QyxZQUNpQixVQUF1QixFQUN2QyxFQUFVLEVBQ00sSUFBWSxFQUM1QixTQUFpQixFQUNWLFNBQWtCLEVBQ3pCLGNBQXVCLEVBQ3ZCLGdCQUF5QixFQUNULEtBQWM7UUFFOUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLElBQUksSUFBSSxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQVRqSCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXZCLFNBQUksR0FBSixJQUFJLENBQVE7UUFFckIsY0FBUyxHQUFULFNBQVMsQ0FBUztRQUdULFVBQUssR0FBTCxLQUFLLENBQVM7SUFHL0IsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQztZQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDekIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFXLFNBQVEsS0FBSztJQUVwQyxZQUNDLFVBQXVCLEVBQ3ZCLEtBQWEsRUFDYixPQUFlO1FBRWYsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFJdEIsWUFDaUIsTUFBYyxFQUNkLE9BQWUsRUFDZixNQUFjLEVBQ2QsSUFBWSxFQUNaLGdCQUFvQyxFQUNwQyxLQUFhLEVBQ1osS0FBYSxFQUNkLFVBQW1CLEVBQ25CLDJCQUFvQztRQVJwQyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1oscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUNwQyxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNkLGVBQVUsR0FBVixVQUFVLENBQVM7UUFDbkIsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFTO0lBQ2pELENBQUM7SUFFTCxLQUFLO1FBQ0osT0FBTyxjQUFjLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzlFLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM1RixJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzFELE9BQU8sRUFBRSxDQUFDO2dCQUNYLENBQUM7Z0JBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztnQkFDbEMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ3BDLDhEQUE4RDtvQkFDOUQsd0RBQXdEO29CQUN4RCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ1gsR0FBRyxDQUFDO3dCQUNILEVBQUUsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUMzRCxDQUFDLFFBQVEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFFMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDaEIsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLEVBQzlHLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRTVILENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLEtBQWE7UUFDeEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEMsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUQsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxrQkFBa0IsQ0FBQztRQUMzQixDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN0SCxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFNLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxLQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBTSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDdkosT0FBTyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztJQUNsRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbEgsTUFBTSxjQUFjLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBRWxILE9BQU8sY0FBYyxLQUFLLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssY0FBYyxHQUFHLENBQUM7SUFDakcsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBNkIsRUFBRSxhQUF1QixFQUFFLFVBQW9CLEVBQUUsTUFBZ0I7UUFDaEgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUQsSUFBSSxJQUFJLENBQUMsMkJBQTJCO1lBQ25DLENBQUMsZ0JBQWdCLEtBQUssd0JBQXdCO2dCQUM3QyxDQUFDLGdCQUFnQixLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixLQUFLLGFBQWEsQ0FBQztnQkFDdEYsYUFBYSxDQUFDLFlBQVksWUFBWSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDL0QsT0FBTyxhQUFhLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEcsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBa0I7UUFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNMLENBQUM7Q0FDRDtBQUVELE1BQU0sZ0NBQWdDLEdBQXNCLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBRTFHLE1BQU0sT0FBTyxNQUFNO0lBU2xCLFlBQTRCLE9BQXNCLEVBQVMsSUFBWSxFQUFrQixRQUFnQjtRQUE3RSxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFrQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBTmpHLGdDQUEyQixHQUE4QixFQUFFLENBQUM7UUFHN0QsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBSXBDLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzFELENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO0lBQzVCLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDL0Msd0hBQXdIO1FBQ3hILE1BQU0sd0JBQXdCLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUFDLENBQUMsVUFBVSxLQUFLLHdCQUF3QixJQUFJLENBQUMsVUFBVSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsdUJBQXVCLEtBQUssYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsMkJBQTJCLENBQUM7WUFDMUosQ0FBQyxFQUFFLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLFVBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5SCxPQUFPLHdCQUF3QixDQUFDO0lBQ2pDLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVztnQkFDckMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsMkNBQTJDLENBQUMsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzNNLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsRUFBRTtRQUMvQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUNwQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQ3ZELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ25DLGlJQUFpSTtnQkFDakksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN4RCxJQUFJLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxXQUFXLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZILElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQWtCLEVBQUUsTUFBYztRQUNoRSxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dCQUM5RSxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDN0QsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNuRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWxELE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixFQUFFLElBQUksS0FBSyxDQUNwRixHQUFHLENBQUMsSUFBSSxFQUNSLEdBQUcsQ0FBQyxNQUFNLEVBQ1YsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsSUFBSSxFQUN2QixHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQzNCLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBRSxPQUFPLEdBQUcsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDdEgsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7WUFDdEQsQ0FBQztZQUVELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksYUFBYTtRQUNoQixJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDdkUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUN0QixXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJO2dCQUNyQyxTQUFTLEVBQUUsSUFBSTthQUNmLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQyxXQUErQztRQUNuRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUErQztRQUNyRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxPQUFPLENBQUMsV0FBK0M7UUFDdEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxRQUFRLENBQUMsV0FBK0M7UUFDdkQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUNuQyxTQUFpQixFQUNqQixlQUF1QixFQUN2QixLQUFnRCxFQUNoRCxXQUFXLEdBQUcsUUFBUSxFQUNyQixFQUFFO0lBQ0gsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLG1CQUFtQjtRQUMzQixTQUFTLEVBQUUsU0FBUztRQUNwQixJQUFJLEVBQUUsR0FBRyxHQUFHLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLE1BQU07UUFDM0YsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztLQUN6RSxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sWUFBYSxTQUFRLFVBQVU7SUFTM0MsWUFBNkIsZUFBdUIsRUFBbUIsT0FBc0I7UUFDNUYsS0FBSyxFQUFFLENBQUM7UUFEb0Isb0JBQWUsR0FBZixlQUFlLENBQVE7UUFBbUIsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQVI1RSxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE0QixDQUFDLENBQUM7UUFFN0Ysa0JBQWtCO1FBQ0Ysb0JBQWUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRS9ELGtCQUFrQjtRQUNGLGFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUM7UUFJakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtRQUNyRCxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQztRQUMxQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5GLElBQUksTUFBTSxLQUFLLFNBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDaEQsT0FBTyxDQUFDLEVBQUUsSUFBSSxvQ0FBNEIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsSUFBSSxJQUFjLENBQUM7UUFDbkIsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPLENBQUMsRUFBRSxJQUFJLCtCQUF1QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLHdDQUF3QyxFQUFFLENBQUMsQ0FBQztRQUMzRyxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDO1FBQ3BELE1BQU0sVUFBVSxHQUFHLE1BQU0sR0FBRyxVQUFVLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6RCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQixJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqRCxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQ3pDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxFQUFFLElBQUksK0JBQXVCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCxPQUFPO1lBQ04sRUFBRSxJQUFJLCtCQUF1QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRTtZQUNqRSxFQUFFLElBQUksb0NBQTRCLEVBQUUsTUFBTSxFQUFFLE1BQU0sR0FBRyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRTtTQUNyRixDQUFDO0lBQ0gsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBYyxFQUFFLElBQWM7UUFDaEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEcsTUFBTSxPQUFPLEdBQUcsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUM5RCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDMUMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTyxVQUFVLENBQUMsVUFBa0IsRUFBRSxRQUFnQjtRQUN0RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDdkQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFDdEIsWUFDUSxPQUFnQixFQUNOLEVBQVU7UUFEcEIsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNOLE9BQUUsR0FBRixFQUFFLENBQVE7SUFDeEIsQ0FBQztJQUVMLEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUNEO0FBWUQsU0FBUyx1QkFBdUIsQ0FBQyxJQUE4QixFQUFFLFlBQXdDO0lBQ3hHLE9BQU8sS0FBSyxDQUFDO1FBQ1osOEJBQThCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyw4QkFBOEI7UUFDN0UsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxpQ0FBaUM7UUFDbkYsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxpQkFBaUI7UUFDbkQsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQywyQkFBMkI7UUFDdkUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyx1QkFBdUI7UUFDL0QsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyw4QkFBOEI7S0FDN0UsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNWLENBQUM7QUFXRCxNQUFNLE9BQWdCLGNBQWUsU0FBUSxVQUFVO0lBVXRELFlBQ0MsRUFBVSxFQUNWLElBQTRCO1FBRTVCLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQVp6QixnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1FBYS9ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFpQixFQUFFLElBQXdDO1FBQ3pFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM3RixJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6Qix3SUFBd0k7WUFDeEksSUFBSSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDckUsQ0FBQzthQUFNLENBQUM7WUFDUCxxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUM5QyxDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdkIsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO1FBQ2hDLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25CLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNuQixDQUFDO0lBSUQsZ0JBQWdCLENBQUMsU0FBaUI7UUFDakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsMEJBQTBCLENBQUMsU0FBaUI7UUFDM0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLE1BQU0sRUFBRSxHQUE2QjtnQkFDcEMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUNYLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUN6QixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO2dCQUMvQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07YUFDbkIsQ0FBQztZQUNGLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7U0FDekIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQVVELE1BQU0sT0FBTyxVQUFXLFNBQVEsY0FBYztJQVE3QyxZQUNDLElBQXdCLEVBQ1AsZUFBaUMsRUFDakMsa0JBQXVDLEVBQ3ZDLFVBQXVCLEVBQ3hDLEVBQUUsR0FBRyxZQUFZLEVBQUU7UUFFbkIsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUxDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUNyQyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVU7WUFDekMsTUFBTSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtTQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDN0csQ0FBQztJQUVELElBQWEsUUFBUTtRQUNwQixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQzlMLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDN0csQ0FBQztJQUVELElBQWEsT0FBTztRQUNuQixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx3RUFBd0UsQ0FBQyxDQUFDO1FBQ3hILENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUN6SCxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ25FLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDdEIsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM1QixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDcEIsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7WUFDakUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVRLGNBQWMsQ0FBQyxTQUFpQixFQUFFLElBQXdDO1FBQ2xGLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2QsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzVCLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNwQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1NBQzdCLENBQUM7SUFDSCxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDeEUsQ0FBQztJQUVNLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsVUFBVSxHQUFHLElBQUk7UUFDL0QsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsa0JBQWtCLEtBQUssSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVNLG9CQUFvQixDQUFDLFNBQWlCO1FBQzVDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUEyQjtRQUNqQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDcEMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM1QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdkMsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7UUFDckMsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQU1ELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxjQUFjO0lBR3JELFlBQ0MsSUFBZ0MsRUFDaEMsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUVuQixLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQy9CLENBQUM7SUFDSCxDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ2YsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQztJQUM5QyxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBV0QsTUFBTSxPQUFPLGNBQWUsU0FBUSxjQUFjO0lBU2pELFlBQ0MsSUFBNEIsRUFDNUIsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUVuQixLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBWkEseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQWdDLENBQUM7UUFhbkYsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3BDLElBQUksUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsZ0RBQWdEO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLHdDQUFnQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBZ0IsRUFBRSxDQUFDO1FBQ3BGLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hHLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFzQjtRQUNqQyxJQUFJLE1BQWMsQ0FBQztRQUNuQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSwyQ0FBbUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixhQUFhLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO2dCQUNsRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sU0FBUyxDQUFDO2dCQUNsQixDQUFDO2dCQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3ZELENBQUM7WUFDRCxNQUFNLEdBQUcsYUFBYSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxPQUFPO1lBQ04sTUFBTTtZQUNOLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1NBQy9CLENBQUM7SUFDSCxDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1NBQzNCLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUM7SUFDMUMsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7Q0FDRDtBQVdELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxjQUFjO0lBV3RELFlBQ0MsSUFBaUMsRUFDakMsRUFBRSxHQUFHLFlBQVksRUFBRTtRQUVuQixLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBYlQsc0JBQWlCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFPM0MsYUFBUSxHQUFZLEtBQUssQ0FBQztRQU9qQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUM7UUFDaEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQztJQUN4QyxDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQy9DLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1NBQzdCLENBQUM7SUFDSCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsU0FBaUIsRUFBRSxTQUFrQjtRQUN4RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxDQUFDO2FBQ0ksQ0FBQztZQUNMLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxXQUFXLENBQUMsVUFBbUI7UUFDOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOzs7T0FHRztJQUNILGtCQUFrQixDQUFDLFNBQWtCO1FBQ3BDLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLENBQUMsTUFBZ0Q7UUFDdkQsT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNO2VBQ2hDLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUs7ZUFDM0IsSUFBSSxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCO2VBQ3JELElBQUksQ0FBQyxvQkFBb0IsS0FBSyxNQUFNLENBQUMsb0JBQW9CO2VBQ3pELElBQUksQ0FBQyxXQUFXLEtBQUssTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUM3QyxDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztDQUNEO0FBU0QsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGNBQWM7SUFNeEQsWUFDQyxJQUFtQyxFQUNuQyxFQUFFLEdBQUcsWUFBWSxFQUFFO1FBRW5CLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztRQUN0RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87WUFDTixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO1lBQy9DLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ25CLENBQUM7SUFDSCxDQUFDO0lBRVEsTUFBTTtRQUNkLE9BQU87WUFDTixHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDakIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUMvQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDO0lBQ2pELENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFBbUIsU0FBaUIsRUFBUyxRQUFnQjtRQUExQyxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQVMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUFJLENBQUM7SUFFbEUsS0FBSztRQUNKLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0NBQ0Q7QUFNTSxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEsVUFBVTtJQWlCekMsWUFDQyxZQUEwQixFQUNSLGVBQWtELEVBQy9DLGtCQUF3RCxFQUNoRSxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUoyQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDOUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUMvQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBbEI5QyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQW9GLENBQUM7UUFDekcseUJBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ25CLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXVDLENBQUMsQ0FBQztRQUM3RiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM1RCxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUEyQixDQUFDLENBQUM7UUFDdEYscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMkIsQ0FBQyxDQUFDO1FBQzFGLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1FBZ0I5RSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxZQUFZLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNFLElBQUksQ0FBQyxlQUFlLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQzdCLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUNwQyxJQUFJLENBQUMsMkJBQTJCLEVBQ2hDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNsRixDQUFDO1FBRUYsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUE2QixFQUFFLGVBQWUsR0FBRyxLQUFLO1FBQ2hFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsV0FBVyxDQUFDLGVBQWUsR0FBRyxLQUFLO1FBQ2xDLDhDQUE4QztRQUM5QyxrSEFBa0g7UUFDbEgsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsS0FBSywyQkFBbUIsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBc0I7UUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4QyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsOEhBQThIO2dCQUM5SCxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxLQUFLLDJCQUFtQixJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZGLHFHQUFxRztnQkFDckcsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNmLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzNCLG9FQUFvRTtZQUNwRSxLQUFLLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLE9BQU8sQ0FBQyxhQUFhLElBQUksQ0FBQyxLQUFLLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNuSCxDQUFDO1FBQ0QsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0MsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO0lBQzNDLENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7SUFDekMsQ0FBQztJQUVELElBQUksMkJBQTJCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUNoRCxDQUFDO0lBRUQsSUFBSSwrQkFBK0I7UUFDbEMsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDO0lBQ3BELENBQUM7SUFFRCxTQUFTLENBQUMsSUFBcUI7UUFDOUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsRUFBVSxFQUFFLGFBQXNCLEVBQUUsWUFBZ0MsU0FBUztRQUN6RixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMvQixLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFeEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBZSxFQUFFLE1BQWU7UUFFcEQsSUFBYSxNQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDO1FBQ3ZELE1BQU0sZUFBZSxHQUFHLENBQUMsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXJILElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxlQUFlLElBQUksTUFBTSxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDOUQsTUFBTSxHQUFHLGVBQWUsQ0FBQztRQUMxQixDQUFDO1FBRUQsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQWUsTUFBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU87SUFDUixDQUFDO0lBRUQscUJBQXFCLENBQUMsTUFBYyxFQUFFLGNBQWMsR0FBRyxJQUFJO1FBQzFELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUNsRSxvRkFBb0Y7WUFDcEYsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNqRCxZQUFZLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNqRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQ3JCLENBQUMsRUFBRSxDQUFDO3dCQUNKLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDbEMsT0FBTztvQkFDUixDQUFDO29CQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO3dCQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUU7NEJBQ25DLGdCQUFnQixFQUFFLFFBQVE7NEJBQzFCLFNBQVMsRUFBRSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQ0FDcEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO29DQUNuQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQ0FDekMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO29DQUN0QyxJQUFJLHdCQUF3QixHQUFHLEtBQUssQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLE1BQU0sQ0FBQztvQ0FDL0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dDQUNwRSx3QkFBd0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQ3pELENBQUM7b0NBRUQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO3dDQUM5QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7b0NBQ25DLENBQUM7Z0NBQ0YsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtvQ0FDZixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7b0NBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dDQUN4QyxDQUFDLENBQUMsQ0FBQzs0QkFDSixDQUFDLEVBQUUsR0FBRyxDQUFDO3lCQUNQLENBQUMsQ0FBQztvQkFDSixDQUFDO29CQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBRSxDQUFDO29CQUNuRCxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMzQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLENBQUM7UUFDekMsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0lBRUQsY0FBYyxDQUFDLE1BQStIO1FBQzdJLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDbkMsSUFBSSxNQUFNLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDNUMsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztnQkFDRCxJQUFJLGNBQWMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLGNBQWMsRUFBRSxDQUFDO29CQUNwRSxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUNELElBQUksTUFBTSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDOUQsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztnQkFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2xELE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7Z0JBQ0QsSUFBSSxNQUFNLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDdkUsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztnQkFDRCxJQUFJLE1BQU0sQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDMUQsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztnQkFFRCxPQUFPLElBQUksQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdCLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztJQUVELGlDQUFpQyxDQUFDLFNBQWtCO1FBQ25ELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFRCx5QkFBeUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUM7SUFDcEMsQ0FBQztJQUVELGlDQUFpQyxDQUFDLFNBQWlCLEVBQUUsT0FBbUQ7UUFDdkcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLG9CQUFvQixHQUFHLEtBQUssQ0FBQztRQUNqQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDckIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTVFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDVixvQkFBb0IsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDO29CQUM3QixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU07b0JBQ2hCLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztvQkFDZCxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO29CQUNwQixpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtvQkFDeEMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO29CQUMxQixvQkFBb0IsRUFBRSxDQUFDLENBQUMsb0JBQW9CO2lCQUM1QyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQyxDQUFDO1lBRUQsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLENBQUM7SUFDRixDQUFDO0lBRUQsb0NBQW9DLENBQUMsU0FBaUI7UUFDckQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELDZGQUE2RjtJQUM3RixxQ0FBcUMsQ0FBQyxTQUFpQjtRQUN0RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxtQkFBeUMsRUFBRSxTQUE2QjtRQUN0RyxtQkFBMkMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQ25FLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztJQUNsQyxDQUFDO0lBRUQsdUJBQXVCLENBQUMsU0FBa0I7UUFDekMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQztRQUN0QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxjQUFjLENBQUMsR0FBUSxFQUFFLE9BQTBCLEVBQUUsU0FBUyxHQUFHLElBQUk7UUFDcEUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMxQyxPQUFPLElBQUksVUFBVSxDQUFDO2dCQUNyQixHQUFHO2dCQUNILFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtnQkFDNUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO2dCQUNwQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sSUFBSSxJQUFJO2dCQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzFCLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWTtnQkFDaEMsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO2dCQUM1QixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7Z0JBQzlCLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7Z0JBQ2hCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUzthQUMxQixFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbEYsQ0FBQztRQUVELE9BQU8sY0FBYyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxRQUF1QjtRQUN4QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUVELGlCQUFpQixDQUFDLElBQXdDO1FBQ3pELE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNwQyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxTQUFpQixFQUFFLFdBQXVDLEVBQUUsSUFBdUQ7UUFDM0ksSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM1RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN0QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzlFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzlFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDYixHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDOUUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNiLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM5RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQztZQUNqQyxXQUFXLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsMEJBQTBCLENBQUMsWUFBb0IsRUFBRSxTQUFpQjtRQUNqRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxZQUFZLENBQUMsQ0FBQztRQUNwRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ1IsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxpQkFBa0U7UUFDcEYsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQ3ZHLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxTQUFpQixFQUFFLEtBQXFDO1FBQy9FLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDNUIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNyRyxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNmLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxTQUFTLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDO2dCQUMxRSxDQUFDO2dCQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO29CQUM5QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ2YsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztvQkFDOUQsa0JBQWtCLEVBQUUsU0FBUztvQkFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO29CQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSx3QkFBd0I7aUJBQzNELENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVk7UUFDbkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMxRCxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNwRCxPQUFPLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxRyxDQUFDO1lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ3JDLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVELGFBQWEsQ0FBQyxPQUFvQixFQUFFLE1BQWU7UUFDbEQsSUFBSSxPQUFPLFlBQVksVUFBVSxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsSUFBSSxPQUFPLFlBQVksbUJBQW1CLElBQUksT0FBTyxZQUFZLGNBQWMsSUFBSSxPQUFPLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztZQUN2TSxNQUFNLE9BQU8sR0FBd0YsRUFBRSxDQUFDO1lBQ3hHLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxNQUFNLElBQUksQ0FBQyxPQUFPLFlBQVksVUFBVSxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsSUFBSSxPQUFPLFlBQVksY0FBYyxJQUFJLE9BQU8sWUFBWSxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7Z0JBQzdMLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkIsQ0FBQztZQUVELE9BQU8sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ3pCLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztZQUNsQyxDQUFDO1lBRUQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNGLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxNQUFlO1FBQzVDLE1BQU0sT0FBTyxHQUF3RixFQUFFLENBQUM7UUFFeEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDN0IsSUFBSSxFQUFFLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxFQUFFLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxHQUFHLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLENBQUM7WUFDRCxHQUFHLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xDLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixDQUFDO1lBQ0QsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pDLElBQUksR0FBRyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixDQUFDO1lBQ0QsR0FBRyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELHFCQUFxQixDQUFDLElBQWdDLEVBQUUsRUFBVztRQUNsRSxNQUFNLHFCQUFxQixHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUUxRixPQUFPLHFCQUFxQixDQUFDO0lBQzlCLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxFQUFVLEVBQUUsTUFBb0U7UUFDeEcsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixJQUFJLE9BQU8sTUFBTSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsa0JBQWtCLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDdkMsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNqRCxDQUFDO1lBQ0QsSUFBSSxPQUFPLE1BQU0sQ0FBQyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzdDLGtCQUFrQixDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1lBQ3ZELENBQUM7WUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMxRixDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLEVBQVc7UUFDcEMsSUFBSSxPQUE2QixDQUFDO1FBQ2xDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN2RixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUM7WUFDbkMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsaUJBQWlCLENBQUMsSUFBNEIsRUFBRSxFQUFXO1FBQzFELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELG9CQUFvQixDQUFDLEVBQVUsRUFBRSxNQUFxRDtRQUNyRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1RSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLElBQUksT0FBTyxNQUFNLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxjQUFjLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDN0MsQ0FBQztZQUNELElBQUksT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM3QyxjQUFjLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDbkQsQ0FBQztZQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RixDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQixDQUFDLEVBQVc7UUFDaEMsSUFBSSxPQUF5QixDQUFDO1FBQzlCLElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMvRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQy9CLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxJQUFtQztRQUMzRCxNQUFNLHdCQUF3QixHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxvQkFBNkIsRUFBRSxNQUFlO1FBQzFFLElBQUksT0FBTyxHQUE0QixFQUFFLENBQUM7UUFDMUMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxHQUFHLENBQUMsb0JBQW9CLEtBQUssb0JBQW9CLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDMUcsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUM7WUFDdEMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUFhO1FBQy9CLE1BQU0sRUFBRSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFM0MsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQscUJBQXFCLENBQUMsRUFBVSxFQUFFLE9BQWU7UUFDaEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN2RSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7WUFDM0IsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQUVELHNCQUFzQixDQUFDLEtBQW9CLElBQUk7UUFDOUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3hGLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELG1CQUFtQixDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUMvQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM5RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbkgsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVELG9CQUFvQixDQUFDLEdBQVE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNELENBQUE7QUFocEJZLFVBQVU7SUFtQnBCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtHQXJCRCxVQUFVLENBZ3BCdEIifQ==