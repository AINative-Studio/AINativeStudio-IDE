/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator, tieBreakComparators } from '../../common/arrays.js';
import { Emitter, Event } from '../../common/event.js';
import { Disposable } from '../../common/lifecycle.js';
import { setTimeout0, setTimeout0IsFaster } from '../../common/platform.js';
const scheduledTaskComparator = tieBreakComparators(compareBy(i => i.time, numberComparator), compareBy(i => i.id, numberComparator));
export class TimeTravelScheduler {
    constructor() {
        this.taskCounter = 0;
        this._now = 0;
        this.queue = new SimplePriorityQueue([], scheduledTaskComparator);
        this.taskScheduledEmitter = new Emitter();
        this.onTaskScheduled = this.taskScheduledEmitter.event;
    }
    schedule(task) {
        if (task.time < this._now) {
            throw new Error(`Scheduled time (${task.time}) must be equal to or greater than the current time (${this._now}).`);
        }
        const extendedTask = { ...task, id: this.taskCounter++ };
        this.queue.add(extendedTask);
        this.taskScheduledEmitter.fire({ task });
        return { dispose: () => this.queue.remove(extendedTask) };
    }
    get now() {
        return this._now;
    }
    get hasScheduledTasks() {
        return this.queue.length > 0;
    }
    getScheduledTasks() {
        return this.queue.toSortedArray();
    }
    runNext() {
        const task = this.queue.removeMin();
        if (task) {
            this._now = task.time;
            task.run();
        }
        return task;
    }
    installGlobally() {
        return overwriteGlobals(this);
    }
}
export class AsyncSchedulerProcessor extends Disposable {
    get history() { return this._history; }
    constructor(scheduler, options) {
        super();
        this.scheduler = scheduler;
        this.isProcessing = false;
        this._history = new Array();
        this.queueEmptyEmitter = new Emitter();
        this.onTaskQueueEmpty = this.queueEmptyEmitter.event;
        this.maxTaskCount = options && options.maxTaskCount ? options.maxTaskCount : 100;
        this.useSetImmediate = options && options.useSetImmediate ? options.useSetImmediate : false;
        this._register(scheduler.onTaskScheduled(() => {
            if (this.isProcessing) {
                return;
            }
            else {
                this.isProcessing = true;
                this.schedule();
            }
        }));
    }
    schedule() {
        // This allows promises created by a previous task to settle and schedule tasks before the next task is run.
        // Tasks scheduled in those promises might have to run before the current next task.
        Promise.resolve().then(() => {
            if (this.useSetImmediate) {
                originalGlobalValues.setImmediate(() => this.process());
            }
            else if (setTimeout0IsFaster) {
                setTimeout0(() => this.process());
            }
            else {
                originalGlobalValues.setTimeout(() => this.process());
            }
        });
    }
    process() {
        const executedTask = this.scheduler.runNext();
        if (executedTask) {
            this._history.push(executedTask);
            if (this.history.length >= this.maxTaskCount && this.scheduler.hasScheduledTasks) {
                const lastTasks = this._history.slice(Math.max(0, this.history.length - 10)).map(h => `${h.source.toString()}: ${h.source.stackTrace}`);
                const e = new Error(`Queue did not get empty after processing ${this.history.length} items. These are the last ${lastTasks.length} scheduled tasks:\n${lastTasks.join('\n\n\n')}`);
                this.lastError = e;
                throw e;
            }
        }
        if (this.scheduler.hasScheduledTasks) {
            this.schedule();
        }
        else {
            this.isProcessing = false;
            this.queueEmptyEmitter.fire();
        }
    }
    waitForEmptyQueue() {
        if (this.lastError) {
            const error = this.lastError;
            this.lastError = undefined;
            throw error;
        }
        if (!this.isProcessing) {
            return Promise.resolve();
        }
        else {
            return Event.toPromise(this.onTaskQueueEmpty).then(() => {
                if (this.lastError) {
                    throw this.lastError;
                }
            });
        }
    }
}
export async function runWithFakedTimers(options, fn) {
    const useFakeTimers = options.useFakeTimers === undefined ? true : options.useFakeTimers;
    if (!useFakeTimers) {
        return fn();
    }
    const scheduler = new TimeTravelScheduler();
    const schedulerProcessor = new AsyncSchedulerProcessor(scheduler, { useSetImmediate: options.useSetImmediate, maxTaskCount: options.maxTaskCount });
    const globalInstallDisposable = scheduler.installGlobally();
    let result;
    try {
        result = await fn();
    }
    finally {
        globalInstallDisposable.dispose();
        try {
            // We process the remaining scheduled tasks.
            // The global override is no longer active, so during this, no more tasks will be scheduled.
            await schedulerProcessor.waitForEmptyQueue();
        }
        finally {
            schedulerProcessor.dispose();
        }
    }
    return result;
}
export const originalGlobalValues = {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    setImmediate: globalThis.setImmediate?.bind(globalThis),
    clearImmediate: globalThis.clearImmediate?.bind(globalThis),
    requestAnimationFrame: globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrame: globalThis.cancelAnimationFrame?.bind(globalThis),
    Date: globalThis.Date,
};
function setTimeout(scheduler, handler, timeout = 0) {
    if (typeof handler === 'string') {
        throw new Error('String handler args should not be used and are not supported');
    }
    return scheduler.schedule({
        time: scheduler.now + timeout,
        run: () => {
            handler();
        },
        source: {
            toString() { return 'setTimeout'; },
            stackTrace: new Error().stack,
        }
    });
}
function setInterval(scheduler, handler, interval) {
    if (typeof handler === 'string') {
        throw new Error('String handler args should not be used and are not supported');
    }
    const validatedHandler = handler;
    let iterCount = 0;
    const stackTrace = new Error().stack;
    let disposed = false;
    let lastDisposable;
    function schedule() {
        iterCount++;
        const curIter = iterCount;
        lastDisposable = scheduler.schedule({
            time: scheduler.now + interval,
            run() {
                if (!disposed) {
                    schedule();
                    validatedHandler();
                }
            },
            source: {
                toString() { return `setInterval (iteration ${curIter})`; },
                stackTrace,
            }
        });
    }
    schedule();
    return {
        dispose: () => {
            if (disposed) {
                return;
            }
            disposed = true;
            lastDisposable.dispose();
        }
    };
}
function overwriteGlobals(scheduler) {
    globalThis.setTimeout = ((handler, timeout) => setTimeout(scheduler, handler, timeout));
    globalThis.clearTimeout = (timeoutId) => {
        if (typeof timeoutId === 'object' && timeoutId && 'dispose' in timeoutId) {
            timeoutId.dispose();
        }
        else {
            originalGlobalValues.clearTimeout(timeoutId);
        }
    };
    globalThis.setInterval = ((handler, timeout) => setInterval(scheduler, handler, timeout));
    globalThis.clearInterval = (timeoutId) => {
        if (typeof timeoutId === 'object' && timeoutId && 'dispose' in timeoutId) {
            timeoutId.dispose();
        }
        else {
            originalGlobalValues.clearInterval(timeoutId);
        }
    };
    globalThis.Date = createDateClass(scheduler);
    return {
        dispose: () => {
            Object.assign(globalThis, originalGlobalValues);
        }
    };
}
function createDateClass(scheduler) {
    const OriginalDate = originalGlobalValues.Date;
    function SchedulerDate(...args) {
        // the Date constructor called as a function, ref Ecma-262 Edition 5.1, section 15.9.2.
        // This remains so in the 10th edition of 2019 as well.
        if (!(this instanceof SchedulerDate)) {
            return new OriginalDate(scheduler.now).toString();
        }
        // if Date is called as a constructor with 'new' keyword
        if (args.length === 0) {
            return new OriginalDate(scheduler.now);
        }
        return new OriginalDate(...args);
    }
    for (const prop in OriginalDate) {
        if (OriginalDate.hasOwnProperty(prop)) {
            SchedulerDate[prop] = OriginalDate[prop];
        }
    }
    SchedulerDate.now = function now() {
        return scheduler.now;
    };
    SchedulerDate.toString = function toString() {
        return OriginalDate.toString();
    };
    SchedulerDate.prototype = OriginalDate.prototype;
    SchedulerDate.parse = OriginalDate.parse;
    SchedulerDate.UTC = OriginalDate.UTC;
    SchedulerDate.prototype.toUTCString = OriginalDate.prototype.toUTCString;
    return SchedulerDate;
}
class SimplePriorityQueue {
    constructor(items, compare) {
        this.compare = compare;
        this.isSorted = false;
        this.items = items;
    }
    get length() {
        return this.items.length;
    }
    add(value) {
        this.items.push(value);
        this.isSorted = false;
    }
    remove(value) {
        this.items.splice(this.items.indexOf(value), 1);
        this.isSorted = false;
    }
    removeMin() {
        this.ensureSorted();
        return this.items.shift();
    }
    getMin() {
        this.ensureSorted();
        return this.items[0];
    }
    toSortedArray() {
        this.ensureSorted();
        return [...this.items];
    }
    ensureSorted() {
        if (!this.isSorted) {
            this.items.sort(this.compare);
            this.isSorted = true;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZVRyYXZlbFNjaGVkdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3RpbWVUcmF2ZWxTY2hlZHVsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQXlCNUUsTUFBTSx1QkFBdUIsR0FBRyxtQkFBbUIsQ0FDbEQsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUN4QyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQ3RDLENBQUM7QUFFRixNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBQ1MsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEIsU0FBSSxHQUFlLENBQUMsQ0FBQztRQUNaLFVBQUssR0FBeUMsSUFBSSxtQkFBbUIsQ0FBd0IsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFMUgseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQTJCLENBQUM7UUFDL0Qsb0JBQWUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO0lBcUNuRSxDQUFDO0lBbkNBLFFBQVEsQ0FBQyxJQUFtQjtRQUMzQixJQUFJLElBQUksQ0FBQyxJ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