/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from './cancellation.js';
import { BugIndicatingError, CancellationError } from './errors.js';
import { Emitter, Event } from './event.js';
import { Disposable, DisposableMap, MutableDisposable, toDisposable } from './lifecycle.js';
import { extUri as defaultExtUri } from './resources.js';
import { setTimeout0 } from './platform.js';
import { MicrotaskDelay } from './symbols.js';
import { Lazy } from './lazy.js';
export function isThenable(obj) {
    return !!obj && typeof obj.then === 'function';
}
export function createCancelablePromise(callback) {
    const source = new CancellationTokenSource();
    const thenable = callback(source.token);
    const promise = new Promise((resolve, reject) => {
        const subscription = source.token.onCancellationRequested(() => {
            subscription.dispose();
            reject(new CancellationError());
        });
        Promise.resolve(thenable).then(value => {
            subscription.dispose();
            source.dispose();
            resolve(value);
        }, err => {
            subscription.dispose();
            source.dispose();
            reject(err);
        });
    });
    return new class {
        cancel() {
            source.cancel();
            source.dispose();
        }
        then(resolve, reject) {
            return promise.then(resolve, reject);
        }
        catch(reject) {
            return this.then(undefined, reject);
        }
        finally(onfinally) {
            return promise.finally(onfinally);
        }
    };
}
export function raceCancellation(promise, token, defaultValue) {
    return new Promise((resolve, reject) => {
        const ref = token.onCancellationRequested(() => {
            ref.dispose();
            resolve(defaultValue);
        });
        promise.then(resolve, reject).finally(() => ref.dispose());
    });
}
/**
 * Returns a promise that rejects with an {@CancellationError} as soon as the passed token is cancelled.
 * @see {@link raceCancellation}
 */
export function raceCancellationError(promise, token) {
    return new Promise((resolve, reject) => {
        const ref = token.onCancellationRequested(() => {
            ref.dispose();
            reject(new CancellationError());
        });
        promise.then(resolve, reject).finally(() => ref.dispose());
    });
}
/**
 * Returns as soon as one of the promises resolves or rejects and cancels remaining promises
 */
export async function raceCancellablePromises(cancellablePromises) {
    let resolvedPromiseIndex = -1;
    const promises = cancellablePromises.map((promise, index) => promise.then(result => { resolvedPromiseIndex = index; return result; }));
    try {
        const result = await Promise.race(promises);
        return result;
    }
    finally {
        cancellablePromises.forEach((cancellablePromise, index) => {
            if (index !== resolvedPromiseIndex) {
                cancellablePromise.cancel();
            }
        });
    }
}
export function raceTimeout(promise, timeout, onTimeout) {
    let promiseResolve = undefined;
    const timer = setTimeout(() => {
        promiseResolve?.(undefined);
        onTimeout?.();
    }, timeout);
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise(resolve => promiseResolve = resolve)
    ]);
}
export function raceFilter(promises, filter) {
    return new Promise((resolve, reject) => {
        if (promises.length === 0) {
            resolve(undefined);
            return;
        }
        let resolved = false;
        let unresolvedCount = promises.length;
        for (const promise of promises) {
            promise.then(result => {
                unresolvedCount--;
                if (!resolved) {
                    if (filter(result)) {
                        resolved = true;
                        resolve(result);
                    }
                    else if (unresolvedCount === 0) {
                        // Last one has to resolve the promise
                        resolve(undefined);
                    }
                }
            }).catch(reject);
        }
    });
}
export function asPromise(callback) {
    return new Promise((resolve, reject) => {
        const item = callback();
        if (isThenable(item)) {
            item.then(resolve, reject);
        }
        else {
            resolve(item);
        }
    });
}
/**
 * Creates and returns a new promise, plus its `resolve` and `reject` callbacks.
 *
 * Replace with standardized [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) once it is supported
 */
export function promiseWithResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve, reject: reject };
}
/**
 * A helper to prevent accumulation of sequential async tasks.
 *
 * Imagine a mail man with the sole task of delivering letters. As soon as
 * a letter submitted for delivery, he drives to the destination, delivers it
 * and returns to his base. Imagine that during the trip, N more letters were submitted.
 * When the mail man returns, he picks those N letters and delivers them all in a
 * single trip. Even though N+1 submissions occurred, only 2 deliveries were made.
 *
 * The throttler implements this via the queue() method, by providing it a task
 * factory. Following the example:
 *
 * 		const throttler = new Throttler();
 * 		const letters = [];
 *
 * 		function deliver() {
 * 			const lettersToDeliver = letters;
 * 			letters = [];
 * 			return makeTheTrip(lettersToDeliver);
 * 		}
 *
 * 		function onLetterReceived(l) {
 * 			letters.push(l);
 * 			throttler.queue(deliver);
 * 		}
 */
export class Throttler {
    constructor() {
        this.isDisposed = false;
        this.activePromise = null;
        this.queuedPromise = null;
        this.queuedPromiseFactory = null;
    }
    queue(promiseFactory) {
        if (this.isDisposed) {
            return Promise.reject(new Error('Throttler is disposed'));
        }
        if (this.activePromise) {
            this.queuedPromiseFactory = promiseFactory;
            if (!this.queuedPromise) {
                const onComplete = () => {
                    this.queuedPromise = null;
                    if (this.isDisposed) {
                        return;
                    }
                    const result = this.queue(this.queuedPromiseFactory);
                    this.queuedPromiseFactory = null;
                    return result;
                };
                this.queuedPromise = new Promise(resolve => {
                    this.activePromise.then(onComplete, onComplete).then(resolve);
                });
            }
            return new Promise((resolve, reject) => {
                this.queuedPromise.then(resolve, reject);
            });
        }
        this.activePromise = promiseFactory();
        return new Promise((resolve, reject) => {
            this.activePromise.then((result) => {
                this.activePromise = null;
                resolve(result);
            }, (err) => {
                this.activePromise = null;
                reject(err);
            });
        });
    }
    dispose() {
        this.isDisposed = true;
    }
}
export class Sequencer {
    constructor() {
        this.current = Promise.resolve(null);
    }
    queue(promiseTask) {
        return this.current = this.current.then(() => promiseTask(), () => promiseTask());
    }
}
export class SequencerByKey {
    constructor() {
        this.promiseMap = new Map();
    }
    queue(key, promiseTask) {
        const runningPromise = this.promiseMap.get(key) ?? Promise.resolve();
        const newPromise = runningPromise
            .catch(() => { })
            .then(promiseTask)
            .finally(() => {
            if (this.promiseMap.get(key) === newPromise) {
                this.promiseMap.delete(key);
            }
        });
        this.promiseMap.set(key, newPromise);
        return newPromise;
    }
    keys() {
        return this.promiseMap.keys();
    }
}
const timeoutDeferred = (timeout, fn) => {
    let scheduled = true;
    const handle = setTimeout(() => {
        scheduled = false;
        fn();
    }, timeout);
    return {
        isTriggered: () => scheduled,
        dispose: () => {
            clearTimeout(handle);
            scheduled = false;
        },
    };
};
const microtaskDeferred = (fn) => {
    let scheduled = true;
    queueMicrotask(() => {
        if (scheduled) {
            scheduled = false;
            fn();
        }
    });
    return {
        isTriggered: () => scheduled,
        dispose: () => { scheduled = false; },
    };
};
/**
 * A helper to delay (debounce) execution of a task that is being requested often.
 *
 * Following the throttler, now imagine the mail man wants to optimize the number of
 * trips proactively. The trip itself can be long, so he decides not to make the trip
 * as soon as a letter is submitted. Instead he waits a while, in case more
 * letters are submitted. After said waiting period, if no letters were submitted, he
 * decides to make the trip. Imagine that N more letters were submitted after the first
 * one, all within a short period of time between each other. Even though N+1
 * submissions occurred, only 1 delivery was made.
 *
 * The delayer offers this behavior via the trigger() method, into which both the task
 * to be executed and the waiting period (delay) must be passed in as arguments. Following
 * the example:
 *
 * 		const delayer = new Delayer(WAITING_PERIOD);
 * 		const letters = [];
 *
 * 		function letterReceived(l) {
 * 			letters.push(l);
 * 			delayer.trigger(() => { return makeTheTrip(); });
 * 		}
 */
export class Delayer {
    constructor(defaultDelay) {
        this.defaultDelay = defaultDelay;
        this.deferred = null;
        this.completionPromise = null;
        this.doResolve = null;
        this.doReject = null;
        this.task = null;
    }
    trigger(task, delay = this.defaultDelay) {
        this.task = task;
        this.cancelTimeout();
        if (!this.completionPromise) {
            this.completionPromise = new Promise((resolve, reject) => {
                this.doResolve = resolve;
                this.doReject = reject;
            }).then(() => {
                this.completionPromise = null;
                this.doResolve = null;
                if (this.task) {
                    const task = this.task;
                    this.task = null;
                    return task();
                }
                return undefined;
            });
        }
        const fn = () => {
            this.deferred = null;
            this.doResolve?.(null);
        };
        this.deferred = delay === MicrotaskDelay ? microtaskDeferred(fn) : timeoutDeferred(delay, fn);
        return this.completionPromise;
    }
    isTriggered() {
        return !!this.deferred?.isTriggered();
    }
    cancel() {
        this.cancelTimeout();
        if (this.completionPromise) {
            this.doReject?.(new CancellationError());
            this.completionPromise = null;
        }
    }
    cancelTimeout() {
        this.deferred?.dispose();
        this.deferred = null;
    }
    dispose() {
        this.cancel();
    }
}
/**
 * A helper to delay execution of a task that is being requested often, while
 * preventing accumulation of consecutive executions, while the task runs.
 *
 * The mail man is clever and waits for a certain amount of time, before going
 * out to deliver letters. While the mail man is going out, more letters arrive
 * and can only be delivered once he is back. Once he is back the mail man will
 * do one more trip to deliver the letters that have accumulated while he was out.
 */
export class ThrottledDelayer {
    constructor(defaultDelay) {
        this.delayer = new Delayer(defaultDelay);
        this.throttler = new Throttler();
    }
    trigger(promiseFactory, delay) {
        return this.delayer.trigger(() => this.throttler.queue(promiseFactory), delay);
    }
    isTriggered() {
        return this.delayer.isTriggered();
    }
    cancel() {
        this.delayer.cancel();
    }
    dispose() {
        this.delayer.dispose();
        this.throttler.dispose();
    }
}
/**
 * A barrier that is initially closed and then becomes opened permanently.
 */
export class Barrier {
    constructor() {
        this._isOpen = false;
        this._promise = new Promise((c, e) => {
            this._completePromise = c;
        });
    }
    isOpen() {
        return this._isOpen;
    }
    open() {
        this._isOpen = true;
        this._completePromise(true);
    }
    wait() {
        return this._promise;
    }
}
/**
 * A barrier that is initially closed and then becomes opened permanently after a certain period of
 * time or when open is called explicitly
 */
export class AutoOpenBarrier extends Barrier {
    constructor(autoOpenTimeMs) {
        super();
        this._timeout = setTimeout(() => this.open(), autoOpenTimeMs);
    }
    open() {
        clearTimeout(this._timeout);
        super.open();
    }
}
export function timeout(millis, token) {
    if (!token) {
        return createCancelablePromise(token => timeout(millis, token));
    }
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            disposable.dispose();
            resolve();
        }, millis);
        const disposable = token.onCancellationRequested(() => {
            clearTimeout(handle);
            disposable.dispose();
            reject(new CancellationError());
        });
    });
}
/**
 * Creates a timeout that can be disposed using its returned value.
 * @param handler The timeout handler.
 * @param timeout An optional timeout in milliseconds.
 * @param store An optional {@link DisposableStore} that will have the timeout disposable managed automatically.
 *
 * @example
 * const store = new DisposableStore;
 * // Call the timeout after 1000ms at which point it will be automatically
 * // evicted from the store.
 * const timeoutDisposable = disposableTimeout(() => {}, 1000, store);
 *
 * if (foo) {
 *   // Cancel the timeout and evict it from store.
 *   timeoutDisposable.dispose();
 * }
 */
export function disposableTimeout(handler, timeout = 0, store) {
    const timer = setTimeout(() => {
        handler();
        if (store) {
            disposable.dispose();
        }
    }, timeout);
    const disposable = toDisposable(() => {
        clearTimeout(timer);
        store?.delete(disposable);
    });
    store?.add(disposable);
    return disposable;
}
/**
 * Runs the provided list of promise factories in sequential order. The returned
 * promise will complete to an array of results from each promise.
 */
export function sequence(promiseFactories) {
    const results = [];
    let index = 0;
    const len = promiseFactories.length;
    function next() {
        return index < len ? promiseFactories[index++]() : null;
    }
    function thenHandler(result) {
        if (result !== undefined && result !== null) {
            results.push(result);
        }
        const n = next();
        if (n) {
            return n.then(thenHandler);
        }
        return Promise.resolve(results);
    }
    return Promise.resolve(null).then(thenHandler);
}
export function first(promiseFactories, shouldStop = t => !!t, defaultValue = null) {
    let index = 0;
    const len = promiseFactories.length;
    const loop = () => {
        if (index >= len) {
            return Promise.resolve(defaultValue);
        }
        const factory = promiseFactories[index++];
        const promise = Promise.resolve(factory());
        return promise.then(result => {
            if (shouldStop(result)) {
                return Promise.resolve(result);
            }
            return loop();
        });
    };
    return loop();
}
export function firstParallel(promiseList, shouldStop = t => !!t, defaultValue = null) {
    if (promiseList.length === 0) {
        return Promise.resolve(defaultValue);
    }
    let todo = promiseList.length;
    const finish = () => {
        todo = -1;
        for (const promise of promiseList) {
            promise.cancel?.();
        }
    };
    return new Promise((resolve, reject) => {
        for (const promise of promiseList) {
            promise.then(result => {
                if (--todo >= 0 && shouldStop(result)) {
                    finish();
                    resolve(result);
                }
                else if (todo === 0) {
                    resolve(defaultValue);
                }
            })
                .catch(err => {
                if (--todo >= 0) {
                    finish();
                    reject(err);
                }
            });
        }
    });
}
/**
 * A helper to queue N promises and run them all with a max degree of parallelism. The helper
 * ensures that at any time no more than M promises are running at the same time.
 */
export class Limiter {
    constructor(maxDegreeOfParalellism) {
        this._size = 0;
        this._isDisposed = false;
        this.maxDegreeOfParalellism = maxDegreeOfParalellism;
        this.outstandingPromises = [];
        this.runningPromises = 0;
        this._onDrained = new Emitter();
    }
    /**
     *
     * @returns A promise that resolved when all work is done (onDrained) or when
     * there is nothing to do
     */
    whenIdle() {
        return this.size > 0
            ? Event.toPromise(this.onDrained)
            : Promise.resolve();
    }
    get onDrained() {
        return this._onDrained.event;
    }
    get size() {
        return this._size;
    }
    queue(factory) {
        if (this._isDisposed) {
            throw new Error('Object has been disposed');
        }
        this._size++;
        return new Promise((c, e) => {
            this.outstandingPromises.push({ factory, c, e });
            this.consume();
        });
    }
    consume() {
        while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
            const iLimitedTask = this.outstandingPromises.shift();
            this.runningPromises++;
            const promise = iLimitedTask.factory();
            promise.then(iLimitedTask.c, iLimitedTask.e);
            promise.then(() => this.consumed(), () => this.consumed());
        }
    }
    consumed() {
        if (this._isDisposed) {
            return;
        }
        this.runningPromises--;
        if (--this._size === 0) {
            this._onDrained.fire();
        }
        if (this.outstandingPromises.length > 0) {
            this.consume();
        }
    }
    clear() {
        if (this._isDisposed) {
            throw new Error('Object has been disposed');
        }
        this.outstandingPromises.length = 0;
        this._size = this.runningPromises;
    }
    dispose() {
        this._isDisposed = true;
        this.outstandingPromises.length = 0; // stop further processing
        this._size = 0;
        this._onDrained.dispose();
    }
}
/**
 * A queue is handles one promise at a time and guarantees that at any time only one promise is executing.
 */
export class Queue extends Limiter {
    constructor() {
        super(1);
    }
}
/**
 * Same as `Queue`, ensures that only 1 task is executed at the same time. The difference to `Queue` is that
 * there is only 1 task about to be scheduled next. As such, calling `queue` while a task is executing will
 * replace the currently queued task until it executes.
 *
 * As such, the returned promise may not be from the factory that is passed in but from the next factory that
 * is running after having called `queue`.
 */
export class LimitedQueue {
    constructor() {
        this.sequentializer = new TaskSequentializer();
        this.tasks = 0;
    }
    queue(factory) {
        if (!this.sequentializer.isRunning()) {
            return this.sequentializer.run(this.tasks++, factory());
        }
        return this.sequentializer.queue(() => {
            return this.sequentializer.run(this.tasks++, factory());
        });
    }
}
/**
 * A helper to organize queues per resource. The ResourceQueue makes sure to manage queues per resource
 * by disposing them once the queue is empty.
 */
export class ResourceQueue {
    constructor() {
        this.queues = new Map();
        this.drainers = new Set();
        this.drainListeners = undefined;
        this.drainListenerCount = 0;
    }
    async whenDrained() {
        if (this.isDrained()) {
            return;
        }
        const promise = new DeferredPromise();
        this.drainers.add(promise);
        return promise.p;
    }
    isDrained() {
        for (const [, queue] of this.queues) {
            if (queue.size > 0) {
                return false;
            }
        }
        return true;
    }
    queueSize(resource, extUri = defaultExtUri) {
        const key = extUri.getComparisonKey(resource);
        return this.queues.get(key)?.size ?? 0;
    }
    queueFor(resource, factory, extUri = defaultExtUri) {
        const key = extUri.getComparisonKey(resource);
        let queue = this.queues.get(key);
        if (!queue) {
            queue = new Queue();
            const drainListenerId = this.drainListenerCount++;
            const drainListener = Event.once(queue.onDrained)(() => {
                queue?.dispose();
                this.queues.delete(key);
                this.onDidQueueDrain();
                this.drainListeners?.deleteAndDispose(drainListenerId);
                if (this.drainListeners?.size === 0) {
                    this.drainListeners.dispose();
                    this.drainListeners = undefined;
                }
            });
            if (!this.drainListeners) {
                this.drainListeners = new DisposableMap();
            }
            this.drainListeners.set(drainListenerId, drainListener);
            this.queues.set(key, queue);
        }
        return queue.queue(factory);
    }
    onDidQueueDrain() {
        if (!this.isDrained()) {
            return; // not done yet
        }
        this.releaseDrainers();
    }
    releaseDrainers() {
        for (const drainer of this.drainers) {
            drainer.complete();
        }
        this.drainers.clear();
    }
    dispose() {
        for (const [, queue] of this.queues) {
            queue.dispose();
        }
        this.queues.clear();
        // Even though we might still have pending
        // tasks queued, after the queues have been
        // disposed, we can no longer track them, so
        // we release drainers to prevent hanging
        // promises when the resource queue is being
        // disposed.
        this.releaseDrainers();
        this.drainListeners?.dispose();
    }
}
export class TimeoutTimer {
    constructor(runner, timeout) {
        this._isDisposed = false;
        this._token = -1;
        if (typeof runner === 'function' && typeof timeout === 'number') {
            this.setIfNotSet(runner, timeout);
        }
    }
    dispose() {
        this.cancel();
        this._isDisposed = true;
    }
    cancel() {
        if (this._token !== -1) {
            clearTimeout(this._token);
            this._token = -1;
        }
    }
    cancelAndSet(runner, timeout) {
        if (this._isDisposed) {
            throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed TimeoutTimer`);
        }
        this.cancel();
        this._token = setTimeout(() => {
            this._token = -1;
            runner();
        }, timeout);
    }
    setIfNotSet(runner, timeout) {
        if (this._isDisposed) {
            throw new BugIndicatingError(`Calling 'setIfNotSet' on a disposed TimeoutTimer`);
        }
        if (this._token !== -1) {
            // timer is already set
            return;
        }
        this._token = setTimeout(() => {
            this._token = -1;
            runner();
        }, timeout);
    }
}
export class IntervalTimer {
    constructor() {
        this.disposable = undefined;
        this.isDisposed = false;
    }
    cancel() {
        this.disposable?.dispose();
        this.disposable = undefined;
    }
    cancelAndSet(runner, interval, context = globalThis) {
        if (this.isDisposed) {
            throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed IntervalTimer`);
        }
        this.cancel();
        const handle = context.setInterval(() => {
            runner();
        }, interval);
        this.disposable = toDisposable(() => {
            context.clearInterval(handle);
            this.disposable = undefined;
        });
    }
    dispose() {
        this.cancel();
        this.isDisposed = true;
    }
}
export class RunOnceScheduler {
    constructor(runner, delay) {
        this.timeoutToken = -1;
        this.runner = runner;
        this.timeout = delay;
        this.timeoutHandler = this.onTimeout.bind(this);
    }
    /**
     * Dispose RunOnceScheduler
     */
    dispose() {
        this.cancel();
        this.runner = null;
    }
    /**
     * Cancel current scheduled runner (if any).
     */
    cancel() {
        if (this.isScheduled()) {
            clearTimeout(this.timeoutToken);
            this.timeoutToken = -1;
        }
    }
    /**
     * Cancel previous runner (if any) & schedule a new runner.
     */
    schedule(delay = this.timeout) {
        this.cancel();
        this.timeoutToken = setTimeout(this.timeoutHandler, delay);
    }
    get delay() {
        return this.timeout;
    }
    set delay(value) {
        this.timeout = value;
    }
    /**
     * Returns true if scheduled.
     */
    isScheduled() {
        return this.timeoutToken !== -1;
    }
    flush() {
        if (this.isScheduled()) {
            this.cancel();
            this.doRun();
        }
    }
    onTimeout() {
        this.timeoutToken = -1;
        if (this.runner) {
            this.doRun();
        }
    }
    doRun() {
        this.runner?.();
    }
}
/**
 * Same as `RunOnceScheduler`, but doesn't count the time spent in sleep mode.
 * > **NOTE**: Only offers 1s resolution.
 *
 * When calling `setTimeout` with 3hrs, and putting the computer immediately to sleep
 * for 8hrs, `setTimeout` will fire **as soon as the computer wakes from sleep**. But
 * this scheduler will execute 3hrs **after waking the computer from sleep**.
 */
export class ProcessTimeRunOnceScheduler {
    constructor(runner, delay) {
        if (delay % 1000 !== 0) {
            console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
        }
        this.runner = runner;
        this.timeout = delay;
        this.counter = 0;
        this.intervalToken = -1;
        this.intervalHandler = this.onInterval.bind(this);
    }
    dispose() {
        this.cancel();
        this.runner = null;
    }
    cancel() {
        if (this.isScheduled()) {
            clearInterval(this.intervalToken);
            this.intervalToken = -1;
        }
    }
    /**
     * Cancel previous runner (if any) & schedule a new runner.
     */
    schedule(delay = this.timeout) {
        if (delay % 1000 !== 0) {
            console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
        }
        this.cancel();
        this.counter = Math.ceil(delay / 1000);
        this.intervalToken = setInterval(this.intervalHandler, 1000);
    }
    /**
     * Returns true if scheduled.
     */
    isScheduled() {
        return this.intervalToken !== -1;
    }
    onInterval() {
        this.counter--;
        if (this.counter > 0) {
            // still need to wait
            return;
        }
        // time elapsed
        clearInterval(this.intervalToken);
        this.intervalToken = -1;
        this.runner?.();
    }
}
export class RunOnceWorker extends RunOnceScheduler {
    constructor(runner, timeout) {
        super(runner, timeout);
        this.units = [];
    }
    work(unit) {
        this.units.push(unit);
        if (!this.isScheduled()) {
            this.schedule();
        }
    }
    doRun() {
        const units = this.units;
        this.units = [];
        this.runner?.(units);
    }
    dispose() {
        this.units = [];
        super.dispose();
    }
}
/**
 * The `ThrottledWorker` will accept units of work `T`
 * to handle. The contract is:
 * * there is a maximum of units the worker can handle at once (via `maxWorkChunkSize`)
 * * there is a maximum of units the worker will keep in memory for processing (via `maxBufferedWork`)
 * * after having handled `maxWorkChunkSize` units, the worker needs to rest (via `throttleDelay`)
 */
export class ThrottledWorker extends Disposable {
    constructor(options, handler) {
        super();
        this.options = options;
        this.handler = handler;
        this.pendingWork = [];
        this.throttler = this._register(new MutableDisposable());
        this.disposed = false;
        this.lastExecutionTime = 0;
    }
    /**
     * The number of work units that are pending to be processed.
     */
    get pending() { return this.pendingWork.length; }
    /**
     * Add units to be worked on. Use `pending` to figure out
     * how many units are not yet processed after this method
     * was called.
     *
     * @returns whether the work was accepted or not. If the
     * worker is disposed, it will not accept any more work.
     * If the number of pending units would become larger
     * than `maxPendingWork`, more work will also not be accepted.
     */
    work(units) {
        if (this.disposed) {
            return false; // work not accepted: disposed
        }
        // Check for reaching maximum of pending work
        if (typeof this.options.maxBufferedWork === 'number') {
            // Throttled: simple check if pending + units exceeds max pending
            if (this.throttler.value) {
                if (this.pending + units.length > this.options.maxBufferedWork) {
                    return false; // work not accepted: too much pending work
                }
            }
            // Unthrottled: same as throttled, but account for max chunk getting
            // worked on directly without being pending
            else {
                if (this.pending + units.length - this.options.maxWorkChunkSize > this.options.maxBufferedWork) {
                    return false; // work not accepted: too much pending work
                }
            }
        }
        // Add to pending units first
        for (const unit of units) {
            this.pendingWork.push(unit);
        }
        const timeSinceLastExecution = Date.now() - this.lastExecutionTime;
        if (!this.throttler.value && (!this.options.waitThrottleDelayBetweenWorkUnits || timeSinceLastExecution >= this.options.throttleDelay)) {
            // Work directly if we are not throttling and we are not
            // enforced to throttle between `work()` calls.
            this.doWork();
        }
        else if (!this.throttler.value && this.options.waitThrottleDelayBetweenWorkUnits) {
            // Otherwise, schedule the throttler to work.
            this.scheduleThrottler(Math.max(this.options.throttleDelay - timeSinceLastExecution, 0));
        }
        else {
            // Otherwise, our work will be picked up by the running throttler
        }
        return true; // work accepted
    }
    doWork() {
        this.lastExecutionTime = Date.now();
        // Extract chunk to handle and handle it
        this.handler(this.pendingWork.splice(0, this.options.maxWorkChunkSize));
        // If we have remaining work, schedule it after a delay
        if (this.pendingWork.length > 0) {
            this.scheduleThrottler();
        }
    }
    scheduleThrottler(delay = this.options.throttleDelay) {
        this.throttler.value = new RunOnceScheduler(() => {
            this.throttler.clear();
            this.doWork();
        }, delay);
        this.throttler.value.schedule();
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
}
/**
 * Execute the callback the next time the browser is idle, returning an
 * {@link IDisposable} that will cancel the callback when disposed. This wraps
 * [requestIdleCallback] so it will fallback to [setTimeout] if the environment
 * doesn't support it.
 *
 * @param callback The callback to run when idle, this includes an
 * [IdleDeadline] that provides the time alloted for the idle callback by the
 * browser. Not respecting this deadline will result in a degraded user
 * experience.
 * @param timeout A timeout at which point to queue no longer wait for an idle
 * callback but queue it on the regular event loop (like setTimeout). Typically
 * this should not be used.
 *
 * [IdleDeadline]: https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 * [requestIdleCallback]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 * [setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 *
 * **Note** that there is `dom.ts#runWhenWindowIdle` which is better suited when running inside a browser
 * context
 */
export let runWhenGlobalIdle;
export let _runWhenIdle;
(function () {
    if (typeof globalThis.requestIdleCallback !== 'function' || typeof globalThis.cancelIdleCallback !== 'function') {
        _runWhenIdle = (_targetWindow, runner, timeout) => {
            setTimeout0(() => {
                if (disposed) {
                    return;
                }
                const end = Date.now() + 15; // one frame at 64fps
                const deadline = {
                    didTimeout: true,
                    timeRemaining() {
                        return Math.max(0, end - Date.now());
                    }
                };
                runner(Object.freeze(deadline));
            });
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                }
            };
        };
    }
    else {
        _runWhenIdle = (targetWindow, runner, timeout) => {
            const handle = targetWindow.requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined);
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                    targetWindow.cancelIdleCallback(handle);
                }
            };
        };
    }
    runWhenGlobalIdle = (runner, timeout) => _runWhenIdle(globalThis, runner, timeout);
})();
export class AbstractIdleValue {
    constructor(targetWindow, executor) {
        this._didRun = false;
        this._executor = () => {
            try {
                this._value = executor();
            }
            catch (err) {
                this._error = err;
            }
            finally {
                this._didRun = true;
            }
        };
        this._handle = _runWhenIdle(targetWindow, () => this._executor());
    }
    dispose() {
        this._handle.dispose();
    }
    get value() {
        if (!this._didRun) {
            this._handle.dispose();
            this._executor();
        }
        if (this._error) {
            throw this._error;
        }
        return this._value;
    }
    get isInitialized() {
        return this._didRun;
    }
}
/**
 * An `IdleValue` that always uses the current window (which might be throttled or inactive)
 *
 * **Note** that there is `dom.ts#WindowIdleValue` which is better suited when running inside a browser
 * context
 */
export class GlobalIdleValue extends AbstractIdleValue {
    constructor(executor) {
        super(globalThis, executor);
    }
}
//#endregion
export async function retry(task, delay, retries) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await task();
        }
        catch (error) {
            lastError = error;
            await timeout(delay);
        }
    }
    throw lastError;
}
/**
 * @deprecated use `LimitedQueue` instead for an easier to use API
 */
export class TaskSequentializer {
    isRunning(taskId) {
        if (typeof taskId === 'number') {
            return this._running?.taskId === taskId;
        }
        return !!this._running;
    }
    get running() {
        return this._running?.promise;
    }
    cancelRunning() {
        this._running?.cancel();
    }
    run(taskId, promise, onCancel) {
        this._running = { taskId, cancel: () => onCancel?.(), promise };
        promise.then(() => this.doneRunning(taskId), () => this.doneRunning(taskId));
        return promise;
    }
    doneRunning(taskId) {
        if (this._running && taskId === this._running.taskId) {
            // only set running to done if the promise finished that is associated with that taskId
            this._running = undefined;
            // schedule the queued task now that we are free if we have any
            this.runQueued();
        }
    }
    runQueued() {
        if (this._queued) {
            const queued = this._queued;
            this._queued = undefined;
            // Run queued task and complete on the associated promise
            queued.run().then(queued.promiseResolve, queued.promiseReject);
        }
    }
    /**
     * Note: the promise to schedule as next run MUST itself call `run`.
     *       Otherwise, this sequentializer will report `false` for `isRunning`
     *       even when this task is running. Missing this detail means that
     *       suddenly multiple tasks will run in parallel.
     */
    queue(run) {
        // this is our first queued task, so we create associated promise with it
        // so that we can return a promise that completes when the task has
        // completed.
        if (!this._queued) {
            const { promise, resolve: promiseResolve, reject: promiseReject } = promiseWithResolvers();
            this._queued = {
                run,
                promise,
                promiseResolve: promiseResolve,
                promiseReject: promiseReject
            };
        }
        // we have a previous queued task, just overwrite it
        else {
            this._queued.run = run;
        }
        return this._queued.promise;
    }
    hasQueued() {
        return !!this._queued;
    }
    async join() {
        return this._queued?.promise ?? this._running?.promise;
    }
}
//#endregion
//#region
/**
 * The `IntervalCounter` allows to count the number
 * of calls to `increment()` over a duration of
 * `interval`. This utility can be used to conditionally
 * throttle a frequent task when a certain threshold
 * is reached.
 */
export class IntervalCounter {
    constructor(interval, nowFn = () => Date.now()) {
        this.interval = interval;
        this.nowFn = nowFn;
        this.lastIncrementTime = 0;
        this.value = 0;
    }
    increment() {
        const now = this.nowFn();
        // We are outside of the range of `interval` and as such
        // start counting from 0 and remember the time
        if (now - this.lastIncrementTime > this.interval) {
            this.lastIncrementTime = now;
            this.value = 0;
        }
        this.value++;
        return this.value;
    }
}
var DeferredOutcome;
(function (DeferredOutcome) {
    DeferredOutcome[DeferredOutcome["Resolved"] = 0] = "Resolved";
    DeferredOutcome[DeferredOutcome["Rejected"] = 1] = "Rejected";
})(DeferredOutcome || (DeferredOutcome = {}));
/**
 * Creates a promise whose resolution or rejection can be controlled imperatively.
 */
export class DeferredPromise {
    get isRejected() {
        return this.outcome?.outcome === 1 /* DeferredOutcome.Rejected */;
    }
    get isResolved() {
        return this.outcome?.outcome === 0 /* DeferredOutcome.Resolved */;
    }
    get isSettled() {
        return !!this.outcome;
    }
    get value() {
        return this.outcome?.outcome === 0 /* DeferredOutcome.Resolved */ ? this.outcome?.value : undefined;
    }
    constructor() {
        this.p = new Promise((c, e) => {
            this.completeCallback = c;
            this.errorCallback = e;
        });
    }
    complete(value) {
        return new Promise(resolve => {
            this.completeCallback(value);
            this.outcome = { outcome: 0 /* DeferredOutcome.Resolved */, value };
            resolve();
        });
    }
    error(err) {
        return new Promise(resolve => {
            this.errorCallback(err);
            this.outcome = { outcome: 1 /* DeferredOutcome.Rejected */, value: err };
            resolve();
        });
    }
    cancel() {
        return this.error(new CancellationError());
    }
}
//#endregion
//#region Promises
export var Promises;
(function (Promises) {
    /**
     * A drop-in replacement for `Promise.all` with the only difference
     * that the method awaits every promise to either fulfill or reject.
     *
     * Similar to `Promise.all`, only the first error will be returned
     * if any.
     */
    async function settled(promises) {
        let firstError = undefined;
        const result = await Promise.all(promises.map(promise => promise.then(value => value, error => {
            if (!firstError) {
                firstError = error;
            }
            return undefined; // do not rethrow so that other promises can settle
        })));
        if (typeof firstError !== 'undefined') {
            throw firstError;
        }
        return result; // cast is needed and protected by the `throw` above
    }
    Promises.settled = settled;
    /**
     * A helper to create a new `Promise<T>` with a body that is a promise
     * itself. By default, an error that raises from the async body will
     * end up as a unhandled rejection, so this utility properly awaits the
     * body and rejects the promise as a normal promise does without async
     * body.
     *
     * This method should only be used in rare cases where otherwise `async`
     * cannot be used (e.g. when callbacks are involved that require this).
     */
    function withAsyncBody(bodyFn) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                await bodyFn(resolve, reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    Promises.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
export class StatefulPromise {
    get value() { return this._value; }
    get error() { return this._error; }
    get isResolved() { return this._isResolved; }
    constructor(promise) {
        this._value = undefined;
        this._error = undefined;
        this._isResolved = false;
        this.promise = promise.then(value => {
            this._value = value;
            this._isResolved = true;
            return value;
        }, error => {
            this._error = error;
            this._isResolved = true;
            throw error;
        });
    }
    /**
     * Returns the resolved value.
     * Throws if the promise is not resolved yet.
     */
    requireValue() {
        if (!this._isResolved) {
            throw new BugIndicatingError('Promise is not resolved yet');
        }
        if (this._error) {
            throw this._error;
        }
        return this._value;
    }
}
export class LazyStatefulPromise {
    constructor(_compute) {
        this._compute = _compute;
        this._promise = new Lazy(() => new StatefulPromise(this._compute()));
    }
    /**
     * Returns the resolved value.
     * Throws if the promise is not resolved yet.
     */
    requireValue() {
        return this._promise.value.requireValue();
    }
    /**
     * Returns the promise (and triggers a computation of the promise if not yet done so).
     */
    getPromise() {
        return this._promise.value.promise;
    }
    /**
     * Reads the current value without triggering a computation of the promise.
     */
    get currentValue() {
        return this._promise.rawValue?.value;
    }
}
//#endregion
//#region
var AsyncIterableSourceState;
(function (AsyncIterableSourceState) {
    AsyncIterableSourceState[AsyncIterableSourceState["Initial"] = 0] = "Initial";
    AsyncIterableSourceState[AsyncIterableSourceState["DoneOK"] = 1] = "DoneOK";
    AsyncIterableSourceState[AsyncIterableSourceState["DoneError"] = 2] = "DoneError";
})(AsyncIterableSourceState || (AsyncIterableSourceState = {}));
/**
 * A rich implementation for an `AsyncIterable<T>`.
 */
export class AsyncIterableObject {
    static fromArray(items) {
        return new AsyncIterableObject((writer) => {
            writer.emitMany(items);
        });
    }
    static fromPromise(promise) {
        return new AsyncIterableObject(async (emitter) => {
            emitter.emitMany(await promise);
        });
    }
    static fromPromisesResolveOrder(promises) {
        return new AsyncIterableObject(async (emitter) => {
            await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
        });
    }
    static merge(iterables) {
        return new AsyncIterableObject(async (emitter) => {
            await Promise.all(iterables.map(async (iterable) => {
                for await (const item of iterable) {
                    emitter.emitOne(item);
                }
            }));
        });
    }
    static { this.EMPTY = AsyncIterableObject.fromArray([]); }
    constructor(executor, onReturn) {
        this._state = 0 /* AsyncIterableSourceState.Initial */;
        this._results = [];
        this._error = null;
        this._onReturn = onReturn;
        this._onStateChanged = new Emitter();
        queueMicrotask(async () => {
            const writer = {
                emitOne: (item) => this.emitOne(item),
                emitMany: (items) => this.emitMany(items),
                reject: (error) => this.reject(error)
            };
            try {
                await Promise.resolve(executor(writer));
                this.resolve();
            }
            catch (err) {
                this.reject(err);
            }
            finally {
                writer.emitOne = undefined;
                writer.emitMany = undefined;
                writer.reject = undefined;
            }
        });
    }
    [Symbol.asyncIterator]() {
        let i = 0;
        return {
            next: async () => {
                do {
                    if (this._state === 2 /* AsyncIterableSourceState.DoneError */) {
                        throw this._error;
                    }
                    if (i < this._results.length) {
                        return { done: false, value: this._results[i++] };
                    }
                    if (this._state === 1 /* AsyncIterableSourceState.DoneOK */) {
                        return { done: true, value: undefined };
                    }
                    await Event.toPromise(this._onStateChanged.event);
                } while (true);
            },
            return: async () => {
                this._onReturn?.();
                return { done: true, value: undefined };
            }
        };
    }
    static map(iterable, mapFn) {
        return new AsyncIterableObject(async (emitter) => {
            for await (const item of iterable) {
                emitter.emitOne(mapFn(item));
            }
        });
    }
    map(mapFn) {
        return AsyncIterableObject.map(this, mapFn);
    }
    static filter(iterable, filterFn) {
        return new AsyncIterableObject(async (emitter) => {
            for await (const item of iterable) {
                if (filterFn(item)) {
                    emitter.emitOne(item);
                }
            }
        });
    }
    filter(filterFn) {
        return AsyncIterableObject.filter(this, filterFn);
    }
    static coalesce(iterable) {
        return AsyncIterableObject.filter(iterable, item => !!item);
    }
    coalesce() {
        return AsyncIterableObject.coalesce(this);
    }
    static async toPromise(iterable) {
        const result = [];
        for await (const item of iterable) {
            result.push(item);
        }
        return result;
    }
    toPromise() {
        return AsyncIterableObject.toPromise(this);
    }
    /**
     * The value will be appended at the end.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    emitOne(value) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        // it is important to add new values at the end,
        // as we may have iterators already running on the array
        this._results.push(value);
        this._onStateChanged.fire();
    }
    /**
     * The values will be appended at the end.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    emitMany(values) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        // it is important to add new values at the end,
        // as we may have iterators already running on the array
        this._results = this._results.concat(values);
        this._onStateChanged.fire();
    }
    /**
     * Calling `resolve()` will mark the result array as complete.
     *
     * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    resolve() {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        this._state = 1 /* AsyncIterableSourceState.DoneOK */;
        this._onStateChanged.fire();
    }
    /**
     * Writing an error will permanently invalidate this iterable.
     * The current users will receive an error thrown, as will all future users.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    reject(error) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        this._state = 2 /* AsyncIterableSourceState.DoneError */;
        this._error = error;
        this._onStateChanged.fire();
    }
}
export class CancelableAsyncIterableObject extends AsyncIterableObject {
    constructor(_source, executor) {
        super(executor);
        this._source = _source;
    }
    cancel() {
        this._source.cancel();
    }
}
export function createCancelableAsyncIterable(callback) {
    const source = new CancellationTokenSource();
    const innerIterable = callback(source.token);
    return new CancelableAsyncIterableObject(source, async (emitter) => {
        const subscription = source.token.onCancellationRequested(() => {
            subscription.dispose();
            source.dispose();
            emitter.reject(new CancellationError());
        });
        try {
            for await (const item of innerIterable) {
                if (source.token.isCancellationRequested) {
                    // canceled in the meantime
                    return;
                }
                emitter.emitOne(item);
            }
            subscription.dispose();
            source.dispose();
        }
        catch (err) {
            subscription.dispose();
            source.dispose();
            emitter.reject(err);
        }
    });
}
export class AsyncIterableSource {
    /**
     *
     * @param onReturn A function that will be called when consuming the async iterable
     * has finished by the consumer, e.g the for-await-loop has be existed (break, return) early.
     * This is NOT called when resolving this source by its owner.
     */
    constructor(onReturn) {
        this._deferred = new DeferredPromise();
        this._asyncIterable = new AsyncIterableObject(emitter => {
            if (earlyError) {
                emitter.reject(earlyError);
                return;
            }
            if (earlyItems) {
                emitter.emitMany(earlyItems);
            }
            this._errorFn = (error) => emitter.reject(error);
            this._emitFn = (item) => emitter.emitOne(item);
            return this._deferred.p;
        }, onReturn);
        let earlyError;
        let earlyItems;
        this._emitFn = (item) => {
            if (!earlyItems) {
                earlyItems = [];
            }
            earlyItems.push(item);
        };
        this._errorFn = (error) => {
            if (!earlyError) {
                earlyError = error;
            }
        };
    }
    get asyncIterable() {
        return this._asyncIterable;
    }
    resolve() {
        this._deferred.complete();
    }
    reject(error) {
        this._errorFn(error);
        this._deferred.complete();
    }
    emitOne(item) {
        this._emitFn(item);
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vYXN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZ0MsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUgsT0FBTyxFQUFFLE1BQU0sSUFBSSxhQUFhLEVBQVcsTUFBTSxnQkFBZ0IsQ0FBQztBQUVsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDOUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVqQyxNQUFNLFVBQVUsVUFBVSxDQUFJLEdBQVk7SUFDekMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLE9BQVEsR0FBNkIsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDO0FBQzNFLENBQUM7QUFNRCxNQUFNLFVBQVUsdUJBQXVCLENBQUksUUFBa0Q7SUFDNUYsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO0lBRTdDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFD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