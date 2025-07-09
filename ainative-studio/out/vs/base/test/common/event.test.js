/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub } from 'sinon';
import { DeferredPromise, timeout } from '../../common/async.js';
import { CancellationToken } from '../../common/cancellation.js';
import { errorHandler, setUnexpectedErrorHandler } from '../../common/errors.js';
import { AsyncEmitter, DebounceEmitter, DynamicListEventMultiplexer, Emitter, Event, EventBufferer, EventMultiplexer, ListenerLeakError, ListenerRefusalError, MicrotaskEmitter, PauseableEmitter, Relay, createEventDeliveryQueue } from '../../common/event.js';
import { DisposableStore, isDisposable, setDisposableTracker, DisposableTracker } from '../../common/lifecycle.js';
import { observableValue, transaction } from '../../common/observable.js';
import { MicrotaskDelay } from '../../common/symbols.js';
import { runWithFakedTimers } from './timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { tail } from '../../common/arrays.js';
var Samples;
(function (Samples) {
    class EventCounter {
        constructor() {
            this.count = 0;
        }
        reset() {
            this.count = 0;
        }
        onEvent() {
            this.count += 1;
        }
    }
    Samples.EventCounter = EventCounter;
    class Document3 {
        constructor() {
            this._onDidChange = new Emitter();
            this.onDidChange = this._onDidChange.event;
        }
        setText(value) {
            //...
            this._onDidChange.fire(value);
        }
        dispose() {
            this._onDidChange.dispose();
        }
    }
    Samples.Document3 = Document3;
})(Samples || (Samples = {}));
suite('Event utils dispose', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let tracker = new DisposableTracker();
    function assertDisposablesCount(expected) {
        if (Array.isArray(expected)) {
            const instances = new Set(expected);
            const actualInstances = tracker.getTrackedDisposables();
            assert.strictEqual(actualInstances.length, expected.length);
            for (const item of actualInstances) {
                assert.ok(instances.has(item));
            }
        }
        else {
            assert.strictEqual(tracker.getTrackedDisposables().length, expected);
        }
    }
    setup(() => {
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    });
    teardown(function () {
        setDisposableTracker(null);
    });
    test('no leak with snapshot-utils', function () {
        const store = new DisposableStore();
        const emitter = ds.add(new Emitter());
        const evens = Event.filter(emitter.event, n => n % 2 === 0, store);
        assertDisposablesCount(1); // snaphot only listen when `evens` is being listened on
        let all = 0;
        const leaked = evens(n => all += n);
        assert.ok(isDisposable(leaked));
        assertDisposablesCount(3);
        emitter.dispose();
        store.dispose();
        assertDisposablesCount([leaked]); // leaked is still there
    });
    test('no leak with debounce-util', function () {
        const store = new DisposableStore();
        const emitter = ds.add(new Emitter());
        const debounced = Event.debounce(emitter.event, (l) => 0, undefined, undefined, undefined, undefined, store);
        assertDisposablesCount(1); // debounce only listens when `debounce` is being listened on
        let all = 0;
        const leaked = debounced(n => all += n);
        assert.ok(isDisposable(leaked));
        assertDisposablesCount(3);
        emitter.dispose();
        store.dispose();
        assertDisposablesCount([leaked]); // leaked is still there
    });
});
suite('Event', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const counter = new Samples.EventCounter();
    setup(() => counter.reset());
    test('Emitter plain', function () {
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('Emitter duplicate functions', () => {
        const calls = [];
        const a = (v) => calls.push(`a${v}`);
        const b = (v) => calls.push(`b${v}`);
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(a));
        ds.add(emitter.event(b));
        const s2 = emitter.event(a);
        emitter.fire('1');
        assert.deepStrictEqual(calls, ['a1', 'b1', 'a1']);
        s2.dispose();
        calls.length = 0;
        emitter.fire('2');
        assert.deepStrictEqual(calls, ['a2', 'b2']);
    });
    test('Emitter, dispose listener during emission', () => {
        for (let keepFirstMod = 1; keepFirstMod < 4; keepFirstMod++) {
            const emitter = ds.add(new Emitter());
            const calls = [];
            const disposables = Array.from({ length: 25 }, (_, n) => ds.add(emitter.event(() => {
                if (n % keepFirstMod === 0) {
                    disposables[n].dispose();
                }
                calls.push(n);
            })));
            emitter.fire();
            assert.deepStrictEqual(calls, Array.from({ length: 25 }, (_, n) => n));
        }
    });
    test('Emitter, dispose emitter during emission', () => {
        const emitter = ds.add(new Emitter());
        const calls = [];
        const disposables = Array.from({ length: 25 }, (_, n) => ds.add(emitter.event(() => {
            if (n === 10) {
                emitter.dispose();
            }
            calls.push(n);
        })));
        emitter.fire();
        disposables.forEach(d => d.dispose());
        assert.deepStrictEqual(calls, Array.from({ length: 11 }, (_, n) => n));
    });
    test('Emitter, shared delivery queue', () => {
        const deliveryQueue = createEventDeliveryQueue();
        const emitter1 = ds.add(new Emitter({ deliveryQueue }));
        const emitter2 = ds.add(new Emitter({ deliveryQueue }));
        const calls = [];
        ds.add(emitter1.event(d => { calls.push(`${d}a`); if (d === 1) {
            emitter2.fire(2);
        } }));
        ds.add(emitter1.event(d => { calls.push(`${d}b`); }));
        ds.add(emitter2.event(d => { calls.push(`${d}c`); emitter1.dispose(); }));
        ds.add(emitter2.event(d => { calls.push(`${d}d`); }));
        emitter1.fire(1);
        // 1. Check that 2 is not delivered before 1 finishes
        // 2. Check that 2 finishes getting delivered even if one emitter is disposed
        assert.deepStrictEqual(calls, ['1a', '1b', '2c', '2d']);
    });
    test('Emitter, handles removal during 3', () => {
        const fn1 = stub();
        const fn2 = stub();
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(fn1));
        const h = emitter.event(() => {
            h.dispose();
        });
        ds.add(emitter.event(fn2));
        emitter.fire('foo');
        assert.deepStrictEqual(fn2.args, [['foo']]);
        assert.deepStrictEqual(fn1.args, [['foo']]);
    });
    test('Emitter, handles removal during 2', () => {
        const fn1 = stub();
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(fn1));
        const h = emitter.event(() => {
            h.dispose();
        });
        emitter.fire('foo');
        assert.deepStrictEqual(fn1.args, [['foo']]);
    });
    test('Emitter, bucket', function () {
        const bucket = [];
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter, bucket);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        while (bucket.length) {
            bucket.pop().dispose();
        }
        doc.setText('boo');
        // noop
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('Emitter, store', function () {
        const bucket = ds.add(new DisposableStore());
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter, bucket);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        bucket.clear();
        doc.setText('boo');
        // noop
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('onFirstAdd|onLastRemove', () => {
        let firstCount = 0;
        let lastCount = 0;
        const a = ds.add(new Emitter({
            onWillAddFirstListener() { firstCount += 1; },
            onDidRemoveLastListener() { lastCount += 1; }
        }));
        assert.strictEqual(firstCount, 0);
        assert.strictEqual(lastCount, 0);
        let subscription1 = ds.add(a.event(function () { }));
        const subscription2 = ds.add(a.event(function () { }));
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 0);
        subscription1.dispose();
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 0);
        subscription2.dispose();
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 1);
        subscription1 = ds.add(a.event(function () { }));
        assert.strictEqual(firstCount, 2);
        assert.strictEqual(lastCount, 1);
    });
    test('onDidAddListener', () => {
        let count = 0;
        const a = ds.add(new Emitter({
            onDidAddListener() { count += 1; }
        }));
        assert.strictEqual(count, 0);
        let subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 1);
        subscription.dispose();
        assert.strictEqual(count, 1);
        subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 2);
        subscription.dispose();
        assert.strictEqual(count, 2);
    });
    test('onWillRemoveListener', () => {
        let count = 0;
        const a = ds.add(new Emitter({
            onWillRemoveListener() { count += 1; }
        }));
        assert.strictEqual(count, 0);
        let subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 0);
        subscription.dispose();
        assert.strictEqual(count, 1);
        subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 1);
    });
    test('throwingListener', () => {
        const origErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => null);
        try {
            const a = ds.add(new Emitter());
            let hit = false;
            ds.add(a.event(function () {
                // eslint-disable-next-line no-throw-literal
                throw 9;
            }));
            ds.add(a.event(function () {
                hit = true;
            }));
            a.fire(undefined);
            assert.strictEqual(hit, true);
        }
        finally {
            setUnexpectedErrorHandler(origErrorHandler);
        }
    });
    test('throwingListener (custom handler)', () => {
        const allError = [];
        const a = ds.add(new Emitter({
            onListenerError(e) { allError.push(e); }
        }));
        let hit = false;
        ds.add(a.event(function () {
            // eslint-disable-next-line no-throw-literal
            throw 9;
        }));
        ds.add(a.event(function () {
            hit = true;
        }));
        a.fire(undefined);
        assert.strictEqual(hit, true);
        assert.deepStrictEqual(allError, [9]);
    });
    test('throw ListenerLeakError', () => {
        const store = new DisposableStore();
        const allError = [];
        const a = ds.add(new Emitter({
            onListenerError(e) { allError.push(e); },
            leakWarningThreshold: 3,
        }));
        for (let i = 0; i < 11; i++) {
            a.event(() => { }, undefined, store);
        }
        assert.deepStrictEqual(allError.length, 5);
        const [start, rest] = tail(allError);
        assert.ok(rest instanceof ListenerRefusalError);
        for (const item of start) {
            assert.ok(item instanceof ListenerLeakError);
        }
        store.dispose();
    });
    test('reusing event function and context', function () {
        let counter = 0;
        function listener() {
            counter += 1;
        }
        const context = {};
        const emitter = ds.add(new Emitter());
        const reg1 = emitter.event(listener, context);
        const reg2 = emitter.event(listener, context);
        emitter.fire(undefined);
        assert.strictEqual(counter, 2);
        reg1.dispose();
        emitter.fire(undefined);
        assert.strictEqual(counter, 3);
        reg2.dispose();
        emitter.fire(undefined);
        assert.strictEqual(counter, 3);
    });
    test('DebounceEmitter', async function () {
        return runWithFakedTimers({}, async function () {
            let callCount = 0;
            let sum = 0;
            const emitter = new DebounceEmitter({
                merge: arr => {
                    callCount += 1;
                    return arr.reduce((p, c) => p + c);
                }
            });
            ds.add(emitter.event(e => { sum = e; }));
            const p = Event.toPromise(emitter.event);
            emitter.fire(1);
            emitter.fire(2);
            await p;
            assert.strictEqual(callCount, 1);
            assert.strictEqual(sum, 3);
        });
    });
    test('Microtask Emitter', (done) => {
        let count = 0;
        assert.strictEqual(count, 0);
        const emitter = new MicrotaskEmitter();
        const listener = emitter.event(() => {
            count++;
        });
        emitter.fire();
        assert.strictEqual(count, 0);
        emitter.fire();
        assert.strictEqual(count, 0);
        // Should wait until the event loop ends and therefore be the last thing called
        setTimeout(() => {
            assert.strictEqual(count, 3);
            done();
        }, 0);
        queueMicrotask(() => {
            assert.strictEqual(count, 2);
            count++;
            listener.dispose();
        });
    });
    test('Emitter - In Order Delivery', function () {
        const a = ds.add(new Emitter());
        const listener2Events = [];
        ds.add(a.event(function listener1(event) {
            if (event === 'e1') {
                a.fire('e2');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2']);
            }
        }));
        ds.add(a.event(function listener2(event) {
            listener2Events.push(event);
        }));
        a.fire('e1');
        // assert that all events are delivered in order
        assert.deepStrictEqual(listener2Events, ['e1', 'e2']);
    });
    test('Emitter, - In Order Delivery 3x', function () {
        const a = ds.add(new Emitter());
        const listener2Events = [];
        ds.add(a.event(function listener1(event) {
            if (event === 'e2') {
                a.fire('e3');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
            }
        }));
        ds.add(a.event(function listener1(event) {
            if (event === 'e1') {
                a.fire('e2');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
            }
        }));
        ds.add(a.event(function listener2(event) {
            listener2Events.push(event);
        }));
        a.fire('e1');
        // assert that all events are delivered in order
        assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
    });
    test('Cannot read property \'_actual\' of undefined #142204', function () {
        const e = ds.add(new Emitter());
        const dispo = e.event(() => { });
        dispo.dispose.call(undefined); // assert that disposable can be called with this
    });
});
suite('AsyncEmitter', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('event has waitUntil-function', async function () {
        const emitter = new AsyncEmitter();
        ds.add(emitter.event(e => {
            assert.strictEqual(e.foo, true);
            assert.strictEqual(e.bar, 1);
            assert.strictEqual(typeof e.waitUntil, 'function');
        }));
        emitter.fireAsync({ foo: true, bar: 1, }, CancellationToken.None);
        emitter.dispose();
    });
    test('sequential delivery', async function () {
        return runWithFakedTimers({}, async function () {
            let globalState = 0;
            const emitter = new AsyncEmitter();
            ds.add(emitter.event(e => {
                e.waitUntil(timeout(10).then(_ => {
                    assert.strictEqual(globalState, 0);
                    globalState += 1;
                }));
            }));
            ds.add(emitter.event(e => {
                e.waitUntil(timeout(1).then(_ => {
                    assert.strictEqual(globalState, 1);
                    globalState += 1;
                }));
            }));
            await emitter.fireAsync({ foo: true }, CancellationToken.None);
            assert.strictEqual(globalState, 2);
        });
    });
    test('sequential, in-order delivery', async function () {
        return runWithFakedTimers({}, async function () {
            const events = [];
            let done = false;
            const emitter = new AsyncEmitter();
            // e1
            ds.add(emitter.event(e => {
                e.waitUntil(timeout(10).then(async (_) => {
                    if (e.foo === 1) {
                        await emitter.fireAsync({ foo: 2 }, CancellationToken.None);
                        assert.deepStrictEqual(events, [1, 2]);
                        done = true;
                    }
                }));
            }));
            // e2
            ds.add(emitter.event(e => {
                events.push(e.foo);
                e.waitUntil(timeout(7));
            }));
            await emitter.fireAsync({ foo: 1 }, CancellationToken.None);
            assert.ok(done);
        });
    });
    test('catch errors', async function () {
        const origErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => null);
        let globalState = 0;
        const emitter = new AsyncEmitter();
        ds.add(emitter.event(e => {
            globalState += 1;
            e.waitUntil(new Promise((_r, reject) => reject(new Error())));
        }));
        ds.add(emitter.event(e => {
            globalState += 1;
            e.waitUntil(timeout(10));
            e.waitUntil(timeout(20).then(() => globalState++)); // multiple `waitUntil` are supported and awaited on
        }));
        await emitter.fireAsync({ foo: true }, CancellationToken.None).then(() => {
            assert.strictEqual(globalState, 3);
        }).catch(e => {
            console.log(e);
            assert.ok(false);
        });
        setUnexpectedErrorHandler(origErrorHandler);
    });
});
suite('PausableEmitter', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('basic', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event(e => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
    });
    test('pause/resume - no merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event(e => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
        emitter.fire(5);
        assert.deepStrictEqual(data, [1, 2, 3, 4, 5]);
    });
    test('pause/resume - merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter({ merge: (a) => a.reduce((p, c) => p + c, 0) }));
        ds.add(emitter.event(e => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 7]);
        emitter.fire(5);
        assert.deepStrictEqual(data, [1, 2, 7, 5]);
    });
    test('double pause/resume', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event(e => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
    });
    test('resume, no pause', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event(e => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        emitter.fire(3);
        assert.deepStrictEqual(data, [1, 2, 3]);
    });
    test('nested pause', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        let once = true;
        ds.add(emitter.event(e => {
            data.push(e);
            if (once) {
                emitter.pause();
                once = false;
            }
        }));
        ds.add(emitter.event(e => {
            data.push(e);
        }));
        emitter.pause();
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, []);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 1]); // paused after first event
        emitter.resume();
        assert.deepStrictEqual(data, [1, 1, 2, 2]); // remaing event delivered
        emitter.fire(3);
        assert.deepStrictEqual(data, [1, 1, 2, 2, 3, 3]);
    });
    test('empty pause with merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter({ merge: a => a[0] }));
        ds.add(emitter.event(e => data.push(1)));
        emitter.pause();
        emitter.resume();
        assert.deepStrictEqual(data, []);
    });
});
suite('Event utils - ensureNoDisposablesAreLeakedInTestSuite', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('fromObservable', function () {
        const obs = observableValue('test', 12);
        const event = Event.fromObservable(obs);
        const values = [];
        const d = event(n => { values.push(n); });
        obs.set(3, undefined);
        obs.set(13, undefined);
        obs.set(3, undefined);
        obs.set(33, undefined);
        obs.set(1, undefined);
        transaction(tx => {
            obs.set(334, tx);
            obs.set(99, tx);
        });
        assert.deepStrictEqual(values, ([3, 13, 3, 33, 1, 99]));
        d.dispose();
    });
});
suite('Event utils', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('EventBufferer', () => {
        test('should not buffer when not wrapped', () => {
            const bufferer = new EventBufferer();
            const counter = new Samples.EventCounter();
            const emitter = ds.add(new Emitter());
            const event = bufferer.wrapEvent(emitter.event);
            const listener = event(counter.onEvent, counter);
            assert.strictEqual(counter.count, 0);
            emitter.fire();
            assert.strictEqual(counter.count, 1);
            emitter.fire();
            assert.strictEqual(counter.count, 2);
            emitter.fire();
            assert.strictEqual(counter.count, 3);
            listener.dispose();
        });
        test('should buffer when wrapped', () => {
            const bufferer = new EventBufferer();
            const counter = new Samples.EventCounter();
            const emitter = ds.add(new Emitter());
            const event = bufferer.wrapEvent(emitter.event);
            const listener = event(counter.onEvent, counter);
            assert.strictEqual(counter.count, 0);
            emitter.fire();
            assert.strictEqual(counter.count, 1);
            bufferer.bufferEvents(() => {
                emitter.fire();
                assert.strictEqual(counter.count, 1);
                emitter.fire();
                assert.strictEqual(counter.count, 1);
            });
            assert.strictEqual(counter.count, 3);
            emitter.fire();
            assert.strictEqual(counter.count, 4);
            listener.dispose();
        });
        test('once', () => {
            const emitter = ds.add(new Emitter());
            let counter1 = 0, counter2 = 0, counter3 = 0;
            const listener1 = emitter.event(() => counter1++);
            const listener2 = Event.once(emitter.event)(() => counter2++);
            const listener3 = Event.once(emitter.event)(() => counter3++);
            assert.strictEqual(counter1, 0);
            assert.strictEqual(counter2, 0);
            assert.strictEqual(counter3, 0);
            listener3.dispose();
            emitter.fire();
            assert.strictEqual(counter1, 1);
            assert.strictEqual(counter2, 1);
            assert.strictEqual(counter3, 0);
            emitter.fire();
            assert.strictEqual(counter1, 2);
            assert.strictEqual(counter2, 1);
            assert.strictEqual(counter3, 0);
            listener1.dispose();
            listener2.dispose();
        });
    });
    suite('buffer', () => {
        test('should buffer events', () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            const listener = bufferedEvent(num => result.push(num));
            assert.deepStrictEqual(result, [1, 2, 3]);
            emitter.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
            listener.dispose();
            emitter.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
        });
        test('should buffer events on next tick', async () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event, true);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            const listener = bufferedEvent(num => result.push(num));
            assert.deepStrictEqual(result, []);
            await timeout(10);
            emitter.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
            listener.dispose();
            emitter.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
        });
        test('should fire initial buffer events', () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event, false, [-2, -1, 0]);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            ds.add(bufferedEvent(num => result.push(num)));
            assert.deepStrictEqual(result, [-2, -1, 0, 1, 2, 3]);
        });
    });
    suite('EventMultiplexer', () => {
        test('works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event(r => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('multiplexer dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event(r => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            m.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('event dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event(r => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            e1.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('mutliplexer event dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event(r => result.push(r)));
            const e1 = ds.add(new Emitter());
            const l1 = m.add(e1.event);
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            l1.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('hot start works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event(r => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            e1.fire(1);
            e2.fire(2);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('cold start works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            ds.add(m.event(r => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('late add works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            ds.add(m.event(r => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('add dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            ds.add(m.event(r => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            const e3 = ds.add(new Emitter());
            const l3 = m.add(e3.event);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
            l3.dispose();
            e3.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3]);
            e2.fire(4);
            e1.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
        });
    });
    suite('DynamicListEventMultiplexer', () => {
        let addEmitter;
        let removeEmitter;
        const recordedEvents = [];
        class TestItem {
            constructor() {
                this.onTestEventEmitter = ds.add(new Emitter());
                this.onTestEvent = this.onTestEventEmitter.event;
            }
        }
        let items;
        let m;
        setup(() => {
            addEmitter = ds.add(new Emitter());
            removeEmitter = ds.add(new Emitter());
            items = [new TestItem(), new TestItem()];
            for (const [i, item] of items.entries()) {
                ds.add(item.onTestEvent(e => `${i}:${e}`));
            }
            m = new DynamicListEventMultiplexer(items, addEmitter.event, removeEmitter.event, e => e.onTestEvent);
            ds.add(m.event(e => recordedEvents.push(e)));
            recordedEvents.length = 0;
        });
        teardown(() => m.dispose());
        test('should fire events for initial items', () => {
            items[0].onTestEventEmitter.fire(1);
            items[1].onTestEventEmitter.fire(2);
            items[0].onTestEventEmitter.fire(3);
            items[1].onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [1, 2, 3, 4]);
        });
        test('should fire events for added items', () => {
            const addedItem = new TestItem();
            addEmitter.fire(addedItem);
            addedItem.onTestEventEmitter.fire(1);
            items[0].onTestEventEmitter.fire(2);
            items[1].onTestEventEmitter.fire(3);
            addedItem.onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [1, 2, 3, 4]);
        });
        test('should not fire events for removed items', () => {
            removeEmitter.fire(items[0]);
            items[0].onTestEventEmitter.fire(1);
            items[1].onTestEventEmitter.fire(2);
            items[0].onTestEventEmitter.fire(3);
            items[1].onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [2, 4]);
        });
    });
    test('latch', () => {
        const emitter = ds.add(new Emitter());
        const event = Event.latch(emitter.event);
        const result = [];
        const listener = ds.add(event(num => result.push(num)));
        assert.deepStrictEqual(result, []);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1]);
        emitter.fire(2);
        assert.deepStrictEqual(result, [1, 2]);
        emitter.fire(2);
        assert.deepStrictEqual(result, [1, 2]);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1, 2, 1]);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1, 2, 1]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        listener.dispose();
    });
    test('dispose is reentrant', () => {
        const emitter = ds.add(new Emitter({
            onDidRemoveLastListener: () => {
                emitter.dispose();
            }
        }));
        const listener = emitter.event(() => undefined);
        listener.dispose(); // should not crash
    });
    suite('fromPromise', () => {
        test('not yet resolved', async function () {
            return new Promise(resolve => {
                let promise = new DeferredPromise();
                ds.add(Event.fromPromise(promise.p)(e => {
                    assert.strictEqual(e, 1);
                    promise = new DeferredPromise();
                    ds.add(Event.fromPromise(promise.p)(() => {
                        resolve();
                    }));
                    promise.error(undefined);
                }));
                promise.complete(1);
            });
        });
        test('already resolved', async function () {
            return new Promise(resolve => {
                let promise = new DeferredPromise();
                promise.complete(1);
                ds.add(Event.fromPromise(promise.p)(e => {
                    assert.strictEqual(e, 1);
                    promise = new DeferredPromise();
                    promise.error(undefined);
                    ds.add(Event.fromPromise(promise.p)(() => {
                        resolve();
                    }));
                }));
            });
        });
    });
    suite('Relay', () => {
        test('should input work', () => {
            const e1 = ds.add(new Emitter());
            const e2 = ds.add(new Emitter());
            const relay = new Relay();
            const result = [];
            const listener = (num) => result.push(num);
            const subscription = relay.event(listener);
            e1.fire(1);
            assert.deepStrictEqual(result, []);
            relay.input = e1.event;
            e1.fire(2);
            assert.deepStrictEqual(result, [2]);
            relay.input = e2.event;
            e1.fire(3);
            e2.fire(4);
            assert.deepStrictEqual(result, [2, 4]);
            subscription.dispose();
            e1.fire(5);
            e2.fire(6);
            assert.deepStrictEqual(result, [2, 4]);
        });
        test('should Relay dispose work', () => {
            const e1 = ds.add(new Emitter());
            const e2 = ds.add(new Emitter());
            const relay = new Relay();
            const result = [];
            const listener = (num) => result.push(num);
            ds.add(relay.event(listener));
            e1.fire(1);
            assert.deepStrictEqual(result, []);
            relay.input = e1.event;
            e1.fire(2);
            assert.deepStrictEqual(result, [2]);
            relay.input = e2.event;
            e1.fire(3);
            e2.fire(4);
            assert.deepStrictEqual(result, [2, 4]);
            relay.dispose();
            e1.fire(5);
            e2.fire(6);
            assert.deepStrictEqual(result, [2, 4]);
        });
    });
    suite('accumulate', () => {
        test('should not fire after a listener is disposed with undefined or []', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const calls1 = [];
            const calls2 = [];
            const listener1 = ds.add(accumulated((e) => calls1.push(e)));
            ds.add(accumulated((e) => calls2.push(e)));
            eventEmitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls1, [[1]]);
            assert.deepStrictEqual(calls2, [[1]]);
            listener1.dispose();
            await timeout(1);
            assert.deepStrictEqual(calls1, [[1]]);
            assert.deepStrictEqual(calls2, [[1]], 'should not fire after a listener is disposed with undefined or []');
        });
        test('should accumulate a single event', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const results1 = await new Promise(r => {
                ds.add(accumulated(r));
                eventEmitter.fire(1);
            });
            assert.deepStrictEqual(results1, [1]);
            const results2 = await new Promise(r => {
                ds.add(accumulated(r));
                eventEmitter.fire(2);
            });
            assert.deepStrictEqual(results2, [2]);
        });
        test('should accumulate multiple events', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const results1 = await new Promise(r => {
                ds.add(accumulated(r));
                eventEmitter.fire(1);
                eventEmitter.fire(2);
                eventEmitter.fire(3);
            });
            assert.deepStrictEqual(results1, [1, 2, 3]);
            const results2 = await new Promise(r => {
                ds.add(accumulated(r));
                eventEmitter.fire(4);
                eventEmitter.fire(5);
                eventEmitter.fire(6);
                eventEmitter.fire(7);
                eventEmitter.fire(8);
            });
            assert.deepStrictEqual(results2, [4, 5, 6, 7, 8]);
        });
    });
    suite('debounce', () => {
        test('simple', function (done) {
            const doc = ds.add(new Samples.Document3());
            const onDocDidChange = Event.debounce(doc.onDidChange, (prev, cur) => {
                if (!prev) {
                    prev = [cur];
                }
                else if (prev.indexOf(cur) < 0) {
                    prev.push(cur);
                }
                return prev;
            }, 10);
            let count = 0;
            ds.add(onDocDidChange(keys => {
                count++;
                assert.ok(keys, 'was not expecting keys.');
                if (count === 1) {
                    doc.setText('4');
                    assert.deepStrictEqual(keys, ['1', '2', '3']);
                }
                else if (count === 2) {
                    assert.deepStrictEqual(keys, ['4']);
                    done();
                }
            }));
            doc.setText('1');
            doc.setText('2');
            doc.setText('3');
        });
        test('microtask', function (done) {
            const doc = ds.add(new Samples.Document3());
            const onDocDidChange = Event.debounce(doc.onDidChange, (prev, cur) => {
                if (!prev) {
                    prev = [cur];
                }
                else if (prev.indexOf(cur) < 0) {
                    prev.push(cur);
                }
                return prev;
            }, MicrotaskDelay);
            let count = 0;
            ds.add(onDocDidChange(keys => {
                count++;
                assert.ok(keys, 'was not expecting keys.');
                if (count === 1) {
                    doc.setText('4');
                    assert.deepStrictEqual(keys, ['1', '2', '3']);
                }
                else if (count === 2) {
                    assert.deepStrictEqual(keys, ['4']);
                    done();
                }
            }));
            doc.setText('1');
            doc.setText('2');
            doc.setText('3');
        });
        test('leading', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => e, 0, /*leading=*/ true);
            let calls = 0;
            ds.add(debounced(() => {
                calls++;
            }));
            // If the source event is fired once, the debounced (on the leading edge) event should be fired only once
            emitter.fire();
            await timeout(1);
            assert.strictEqual(calls, 1);
        });
        test('leading (2)', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => e, 0, /*leading=*/ true);
            let calls = 0;
            ds.add(debounced(() => {
                calls++;
            }));
            // If the source event is fired multiple times, the debounced (on the leading edge) event should be fired twice
            emitter.fire();
            emitter.fire();
            emitter.fire();
            await timeout(1);
            assert.strictEqual(calls, 2);
        });
        test('leading reset', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => l ? l + 1 : 1, 0, /*leading=*/ true);
            const calls = [];
            ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, [1, 1]);
        });
        test('should not flush events when a listener is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => l ? l + 1 : 1, 0);
            const calls = [];
            const listener = ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            listener.dispose();
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, []);
        });
        test('flushOnListenerRemove - should flush events when a listener is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => l ? l + 1 : 1, 0, undefined, true);
            const calls = [];
            const listener = ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            listener.dispose();
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, [1], 'should fire with the first event, not the second (after listener dispose)');
        });
        test('should flush events when the emitter is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => l ? l + 1 : 1, 0);
            const calls = [];
            ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            emitter.dispose();
            await timeout(1);
            assert.deepStrictEqual(calls, [1]);
        });
    });
    test('issue #230401', () => {
        let count = 0;
        const emitter = ds.add(new Emitter());
        const disposables = ds.add(new DisposableStore());
        ds.add(emitter.event(() => {
            count++;
            disposables.add(emitter.event(() => {
                count++;
            }));
            disposables.add(emitter.event(() => {
                count++;
            }));
            disposables.clear();
        }));
        ds.add(emitter.event(() => {
            count++;
        }));
        emitter.fire();
        assert.deepStrictEqual(count, 2);
    });
    suite('chain2', () => {
        let em;
        let calls;
        setup(() => {
            em = ds.add(new Emitter());
            calls = [];
        });
        test('maps', () => {
            const ev = Event.chain(em.event, $ => $.map(v => v * 2));
            ds.add(ev(v => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            assert.deepStrictEqual(calls, [2, 4, 6]);
        });
        test('filters', () => {
            const ev = Event.chain(em.event, $ => $.filter(v => v % 2 === 0));
            ds.add(ev(v => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            assert.deepStrictEqual(calls, [2, 4]);
        });
        test('reduces', () => {
            const ev = Event.chain(em.event, $ => $.reduce((acc, v) => acc + v, 0));
            ds.add(ev(v => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            assert.deepStrictEqual(calls, [1, 3, 6, 10]);
        });
        test('latches', () => {
            const ev = Event.chain(em.event, $ => $.latch());
            ds.add(ev(v => calls.push(v)));
            em.fire(1);
            em.fire(1);
            em.fire(2);
            em.fire(2);
            em.fire(3);
            em.fire(3);
            em.fire(1);
            assert.deepStrictEqual(calls, [1, 2, 3, 1]);
        });
        test('does everything', () => {
            const ev = Event.chain(em.event, $ => $
                .filter(v => v % 2 === 0)
                .map(v => v * 2)
                .reduce((acc, v) => acc + v, 0)
                .latch());
            ds.add(ev(v => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            em.fire(0);
            assert.deepStrictEqual(calls, [4, 12]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2V2ZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDN0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsMkJBQTJCLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQWMsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOVEsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoSSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdCQUF3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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDNUIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDckMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3hCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2YsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQzlCLEtBQUssRUFBRSxDQUNSLENBQUM7WUFFRixFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==