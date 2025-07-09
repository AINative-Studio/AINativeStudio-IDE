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
import { DeferredPromise } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { language } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { refreshComputedState } from './getComputedState.js';
import { TestId } from './testId.js';
import { makeEmptyCounts, maxPriority, statesInOrder, terminalStatePriorities } from './testingStates.js';
import { getMarkId, TestResultItem } from './testTypes.js';
const emptyRawOutput = {
    buffers: [],
    length: 0,
    onDidWriteData: Event.None,
    endPromise: Promise.resolve(),
    getRange: () => VSBuffer.alloc(0),
    getRangeIter: () => [],
};
export class TaskRawOutput {
    constructor() {
        this.writeDataEmitter = new Emitter();
        this.endDeferred = new DeferredPromise();
        this.offset = 0;
        /** @inheritdoc */
        this.onDidWriteData = this.writeDataEmitter.event;
        /** @inheritdoc */
        this.endPromise = this.endDeferred.p;
        /** @inheritdoc */
        this.buffers = [];
    }
    /** @inheritdoc */
    get length() {
        return this.offset;
    }
    /** @inheritdoc */
    getRange(start, length) {
        const buf = VSBuffer.alloc(length);
        let bufLastWrite = 0;
        for (const chunk of this.getRangeIter(start, length)) {
            buf.buffer.set(chunk.buffer, bufLastWrite);
            bufLastWrite += chunk.byteLength;
        }
        return bufLastWrite < length ? buf.slice(0, bufLastWrite) : buf;
    }
    /** @inheritdoc */
    *getRangeIter(start, length) {
        let soFar = 0;
        let internalLastRead = 0;
        for (const b of this.buffers) {
            if (internalLastRead + b.byteLength <= start) {
                internalLastRead += b.byteLength;
                continue;
            }
            const bstart = Math.max(0, start - internalLastRead);
            const bend = Math.min(b.byteLength, bstart + length - soFar);
            yield b.slice(bstart, bend);
            soFar += bend - bstart;
            internalLastRead += b.byteLength;
            if (soFar === length) {
                break;
            }
        }
    }
    /**
     * Appends data to the output, returning the byte range where the data can be found.
     */
    append(data, marker) {
        const offset = this.offset;
        let length = data.byteLength;
        if (marker === undefined) {
            this.push(data);
            return { offset, length };
        }
        // Bytes that should be 'trimmed' off the end of data. This is done because
        // selections in the terminal are based on the entire line, and commonly
        // the interesting marked range has a trailing new line. We don't want to
        // select the trailing line (which might have other data)
        // so we place the marker before all trailing trimbytes.
        let TrimBytes;
        (function (TrimBytes) {
            TrimBytes[TrimBytes["CR"] = 13] = "CR";
            TrimBytes[TrimBytes["LF"] = 10] = "LF";
        })(TrimBytes || (TrimBytes = {}));
        const start = VSBuffer.fromString(getMarkCode(marker, true));
        const end = VSBuffer.fromString(getMarkCode(marker, false));
        length += start.byteLength + end.byteLength;
        this.push(start);
        let trimLen = data.byteLength;
        for (; trimLen > 0; trimLen--) {
            const last = data.buffer[trimLen - 1];
            if (last !== 13 /* TrimBytes.CR */ && last !== 10 /* TrimBytes.LF */) {
                break;
            }
        }
        this.push(data.slice(0, trimLen));
        this.push(end);
        this.push(data.slice(trimLen));
        return { offset, length };
    }
    push(data) {
        if (data.byteLength === 0) {
            return;
        }
        this.buffers.push(data);
        this.writeDataEmitter.fire(data);
        this.offset += data.byteLength;
    }
    /** Signals the output has ended. */
    end() {
        this.endDeferred.complete();
    }
}
export const resultItemParents = function* (results, item) {
    for (const id of TestId.fromString(item.item.extId).idsToRoot()) {
        yield results.getStateById(id.toString());
    }
};
export const maxCountPriority = (counts) => {
    for (const state of statesInOrder) {
        if (counts[state] > 0) {
            return state;
        }
    }
    return 0 /* TestResultState.Unset */;
};
const getMarkCode = (marker, start) => `\x1b]633;SetMark;Id=${getMarkId(marker, start)};Hidden\x07`;
const itemToNode = (controllerId, item, parent) => ({
    controllerId,
    expand: 0 /* TestItemExpandState.NotExpandable */,
    item: { ...item },
    children: [],
    tasks: [],
    ownComputedState: 0 /* TestResultState.Unset */,
    computedState: 0 /* TestResultState.Unset */,
});
export var TestResultItemChangeReason;
(function (TestResultItemChangeReason) {
    TestResultItemChangeReason[TestResultItemChangeReason["ComputedStateChange"] = 0] = "ComputedStateChange";
    TestResultItemChangeReason[TestResultItemChangeReason["OwnStateChange"] = 1] = "OwnStateChange";
    TestResultItemChangeReason[TestResultItemChangeReason["NewMessage"] = 2] = "NewMessage";
})(TestResultItemChangeReason || (TestResultItemChangeReason = {}));
/**
 * Results of a test. These are created when the test initially started running
 * and marked as "complete" when the run finishes.
 */
let LiveTestResult = class LiveTestResult extends Disposable {
    /**
     * @inheritdoc
     */
    get completedAt() {
        return this._completedAt;
    }
    /**
     * @inheritdoc
     */
    get tests() {
        return this.testById.values();
    }
    /** Gets an included test item by ID. */
    getTestById(id) {
        return this.testById.get(id)?.item;
    }
    constructor(id, persist, request, insertOrder, telemetry) {
        super();
        this.id = id;
        this.persist = persist;
        this.request = request;
        this.insertOrder = insertOrder;
        this.telemetry = telemetry;
        this.completeEmitter = this._register(new Emitter());
        this.newTaskEmitter = this._register(new Emitter());
        this.endTaskEmitter = this._register(new Emitter());
        this.changeEmitter = this._register(new Emitter());
        /** todo@connor4312: convert to a WellDefinedPrefixTree */
        this.testById = new Map();
        this.testMarkerCounter = 0;
        this.startedAt = Date.now();
        this.onChange = this.changeEmitter.event;
        this.onComplete = this.completeEmitter.event;
        this.onNewTask = this.newTaskEmitter.event;
        this.onEndTask = this.endTaskEmitter.event;
        this.tasks = [];
        this.name = localize('runFinished', 'Test run at {0}', new Date().toLocaleString(language));
        /**
         * @inheritdoc
         */
        this.counts = makeEmptyCounts();
        this.computedStateAccessor = {
            getOwnState: i => i.ownComputedState,
            getCurrentComputedState: i => i.computedState,
            setComputedState: (i, s) => i.computedState = s,
            getChildren: i => i.children,
            getParents: i => {
                const { testById: testByExtId } = this;
                return (function* () {
                    const parentId = TestId.fromString(i.item.extId).parentId;
                    if (parentId) {
                        for (const id of parentId.idsToRoot()) {
                            yield testByExtId.get(id.toString());
                        }
                    }
                })();
            },
        };
        this.doSerialize = new Lazy(() => ({
            id: this.id,
            completedAt: this.completedAt,
            tasks: this.tasks.map(t => ({ id: t.id, name: t.name, ctrlId: t.ctrlId, hasCoverage: !!t.coverage.get() })),
            name: this.name,
            request: this.request,
            items: [...this.testById.values()].map(TestResultItem.serializeWithoutMessages),
        }));
        this.doSerializeWithMessages = new Lazy(() => ({
            id: this.id,
            completedAt: this.completedAt,
            tasks: this.tasks.map(t => ({ id: t.id, name: t.name, ctrlId: t.ctrlId, hasCoverage: !!t.coverage.get() })),
            name: this.name,
            request: this.request,
            items: [...this.testById.values()].map(TestResultItem.serialize),
        }));
    }
    /**
     * @inheritdoc
     */
    getStateById(extTestId) {
        return this.testById.get(extTestId);
    }
    /**
     * Appends output that occurred during the test run.
     */
    appendOutput(output, taskId, location, testId) {
        const preview = output.byteLength > 100 ? output.slice(0, 100).toString() + '…' : output.toString();
        let marker;
        // currently, the UI only exposes jump-to-message from tests or locations,
        // so no need to mark outputs that don't come from either of those.
        if (testId || location) {
            marker = this.testMarkerCounter++;
        }
        const index = this.mustGetTaskIndex(taskId);
        const task = this.tasks[index];
        const { offset, length } = task.output.append(output, marker);
        const message = {
            location,
            message: preview,
            offset,
            length,
            marker,
            type: 1 /* TestMessageType.Output */,
        };
        const test = testId && this.testById.get(testId);
        if (test) {
            test.tasks[index].messages.push(message);
            this.changeEmitter.fire({ item: test, result: this, reason: 2 /* TestResultItemChangeReason.NewMessage */, message });
        }
        else {
            task.otherMessages.push(message);
        }
    }
    /**
     * Adds a new run task to the results.
     */
    addTask(task) {
        this.tasks.push({ ...task, coverage: observableValue(this, undefined), otherMessages: [], output: new TaskRawOutput() });
        for (const test of this.tests) {
            test.tasks.push({ duration: undefined, messages: [], state: 0 /* TestResultState.Unset */ });
        }
        this.newTaskEmitter.fire(this.tasks.length - 1);
    }
    /**
     * Add the chain of tests to the run. The first test in the chain should
     * be either a test root, or a previously-known test.
     */
    addTestChainToRun(controllerId, chain) {
        let parent = this.testById.get(chain[0].extId);
        if (!parent) { // must be a test root
            parent = this.addTestToRun(controllerId, chain[0], null);
        }
        for (let i = 1; i < chain.length; i++) {
            parent = this.addTestToRun(controllerId, chain[i], parent.item.extId);
        }
        return undefined;
    }
    /**
     * Updates the state of the test by its internal ID.
     */
    updateState(testId, taskId, state, duration) {
        const entry = this.testById.get(testId);
        if (!entry) {
            return;
        }
        const index = this.mustGetTaskIndex(taskId);
        const oldTerminalStatePrio = terminalStatePriorities[entry.tasks[index].state];
        const newTerminalStatePrio = terminalStatePriorities[state];
        // Ignore requests to set the state from one terminal state back to a
        // "lower" one, e.g. from failed back to passed:
        if (oldTerminalStatePrio !== undefined &&
            (newTerminalStatePrio === undefined || newTerminalStatePrio < oldTerminalStatePrio)) {
            return;
        }
        this.fireUpdateAndRefresh(entry, index, state, duration);
    }
    /**
     * Appends a message for the test in the run.
     */
    appendMessage(testId, taskId, message) {
        const entry = this.testById.get(testId);
        if (!entry) {
            return;
        }
        entry.tasks[this.mustGetTaskIndex(taskId)].messages.push(message);
        this.changeEmitter.fire({ item: entry, result: this, reason: 2 /* TestResultItemChangeReason.NewMessage */, message });
    }
    /**
     * Marks the task in the test run complete.
     */
    markTaskComplete(taskId) {
        const index = this.mustGetTaskIndex(taskId);
        const task = this.tasks[index];
        task.running = false;
        task.output.end();
        this.setAllToState(0 /* TestResultState.Unset */, taskId, t => t.state === 1 /* TestResultState.Queued */ || t.state === 2 /* TestResultState.Running */);
        this.endTaskEmitter.fire(index);
    }
    /**
     * Notifies the service that all tests are complete.
     */
    markComplete() {
        if (this._completedAt !== undefined) {
            throw new Error('cannot complete a test result multiple times');
        }
        for (const task of this.tasks) {
            if (task.running) {
                this.markTaskComplete(task.id);
            }
        }
        this._completedAt = Date.now();
        this.completeEmitter.fire();
        this.telemetry.publicLog2('test.outcomes', {
            failures: this.counts[6 /* TestResultState.Errored */] + this.counts[4 /* TestResultState.Failed */],
            passes: this.counts[3 /* TestResultState.Passed */],
            controller: this.request.targets.map(t => t.controllerId).join(',')
        });
    }
    /**
     * Marks the test and all of its children in the run as retired.
     */
    markRetired(testIds) {
        for (const [id, test] of this.testById) {
            if (!test.retired && (!testIds || testIds.hasKeyOrParent(TestId.fromString(id).path))) {
                test.retired = true;
                this.changeEmitter.fire({ reason: 0 /* TestResultItemChangeReason.ComputedStateChange */, item: test, result: this });
            }
        }
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return this.completedAt && this.persist ? this.doSerialize.value : undefined;
    }
    toJSONWithMessages() {
        return this.completedAt && this.persist ? this.doSerializeWithMessages.value : undefined;
    }
    /**
     * Updates all tests in the collection to the given state.
     */
    setAllToState(state, taskId, when) {
        const index = this.mustGetTaskIndex(taskId);
        for (const test of this.testById.values()) {
            if (when(test.tasks[index], test)) {
                this.fireUpdateAndRefresh(test, index, state);
            }
        }
    }
    fireUpdateAndRefresh(entry, taskIndex, newState, newOwnDuration) {
        const previousOwnComputed = entry.ownComputedState;
        const previousOwnDuration = entry.ownDuration;
        const changeEvent = {
            item: entry,
            result: this,
            reason: 1 /* TestResultItemChangeReason.OwnStateChange */,
            previousState: previousOwnComputed,
            previousOwnDuration: previousOwnDuration,
        };
        entry.tasks[taskIndex].state = newState;
        if (newOwnDuration !== undefined) {
            entry.tasks[taskIndex].duration = newOwnDuration;
            entry.ownDuration = Math.max(entry.ownDuration || 0, newOwnDuration);
        }
        const newOwnComputed = maxPriority(...entry.tasks.map(t => t.state));
        if (newOwnComputed === previousOwnComputed) {
            if (newOwnDuration !== previousOwnDuration) {
                this.changeEmitter.fire(changeEvent); // fire manually since state change won't do it
            }
            return;
        }
        entry.ownComputedState = newOwnComputed;
        this.counts[previousOwnComputed]--;
        this.counts[newOwnComputed]++;
        refreshComputedState(this.computedStateAccessor, entry).forEach(t => this.changeEmitter.fire(t === entry ? changeEvent : {
            item: t,
            result: this,
            reason: 0 /* TestResultItemChangeReason.ComputedStateChange */,
        }));
    }
    addTestToRun(controllerId, item, parent) {
        const node = itemToNode(controllerId, item, parent);
        this.testById.set(item.extId, node);
        this.counts[0 /* TestResultState.Unset */]++;
        if (parent) {
            this.testById.get(parent)?.children.push(node);
        }
        if (this.tasks.length) {
            for (let i = 0; i < this.tasks.length; i++) {
                node.tasks.push({ duration: undefined, messages: [], state: 0 /* TestResultState.Unset */ });
            }
        }
        return node;
    }
    mustGetTaskIndex(taskId) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index === -1) {
            throw new Error(`Unknown task ${taskId} in updateState`);
        }
        return index;
    }
};
LiveTestResult = __decorate([
    __param(4, ITelemetryService)
], LiveTestResult);
export { LiveTestResult };
/**
 * Test results hydrated from a previously-serialized test run.
 */
export class HydratedTestResult {
    /**
     * @inheritdoc
     */
    get tests() {
        return this.testById.values();
    }
    constructor(identity, serialized, persist = true) {
        this.serialized = serialized;
        this.persist = persist;
        /**
         * @inheritdoc
         */
        this.counts = makeEmptyCounts();
        this.testById = new Map();
        this.id = serialized.id;
        this.completedAt = serialized.completedAt;
        this.tasks = serialized.tasks.map((task, i) => ({
            id: task.id,
            name: task.name || localize('testUnnamedTask', 'Unnamed Task'),
            ctrlId: task.ctrlId,
            running: false,
            coverage: observableValue(this, undefined),
            output: emptyRawOutput,
            otherMessages: []
        }));
        this.name = serialized.name;
        this.request = serialized.request;
        for (const item of serialized.items) {
            const de = TestResultItem.deserialize(identity, item);
            this.counts[de.ownComputedState]++;
            this.testById.set(item.item.extId, de);
        }
    }
    /**
     * @inheritdoc
     */
    getStateById(extTestId) {
        return this.testById.get(extTestId);
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return this.persist ? this.serialized : undefined;
    }
    /**
     * @inheritdoc
     */
    toJSONWithMessages() {
        return this.toJSON();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0UmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLE9BQU8sRUFBMEIsb0JBQW9CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVyRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsRUFBa0IsTUFBTSxvQkFBb0IsQ0FBQztBQUMxSCxPQUFPLEVBQUUsU0FBUyxFQUFrTCxjQUFjLEVBQW1CLE1BQU0sZ0JBQWdCLENBQUM7QUF3RjVQLE1BQU0sY0FBYyxHQUFtQjtJQUN0QyxPQUFPLEVBQUUsRUFBRTtJQUNYLE1BQU0sRUFB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