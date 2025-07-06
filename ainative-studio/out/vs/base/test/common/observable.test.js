/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setUnexpectedErrorHandler } from '../../common/errors.js';
import { Emitter, Event } from '../../common/event.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { autorun, autorunHandleChanges, derived, derivedDisposable, keepObserved, observableFromEvent, observableSignal, observableValue, transaction, waitForState } from '../../common/observable.js';
import { BaseObservable } from '../../common/observableInternal/base.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('observables', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Reads these tests to understand how to use observables.
     */
    suite('tutorial', () => {
        test('observable + autorun', () => {
            const log = new Log();
            // This creates a variable that stores a value and whose value changes can be observed.
            // The name is only used for debugging purposes.
            // The second arg is the initial value.
            const myObservable = observableValue('myObservable', 0);
            // This creates an autorun: It runs immediately and then again whenever any of the
            // dependencies change. Dependencies are tracked by reading observables with the `reader` parameter.
            //
            // The @description is only used for debugging purposes.
            // The autorun has to be disposed! This is very important.
            ds.add(autorun(reader => {
                /** @description myAutorun */
                // This code is run immediately.
                // Use the `reader` to read observable values and track the dependency to them.
                // If you use `observable.get()` instead of `observable.read(reader)`, you will just
                // get the value and not subscribe to it.
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
                // Now that all dependencies are tracked, the autorun is re-run whenever any of the
                // dependencies change.
            }));
            // The autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            // We set the observable.
            myObservable.set(1, undefined);
            // -> The autorun runs again when any read observable changed
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 1)']);
            // We set the observable again.
            myObservable.set(1, undefined);
            // -> The autorun does not run again, because the observable didn't change.
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // Transactions batch autorun runs
            transaction((tx) => {
                myObservable.set(2, tx);
                // No auto-run ran yet, even though the value changed!
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(3, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Only at the end of the transaction the autorun re-runs
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 3)']);
            // Note that the autorun did not see the intermediate value `2`!
        });
        test('derived + autorun', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            // A derived value is an observable that is derived from other observables.
            const myDerived = derived(reader => {
                /** @description myDerived */
                const value1 = observable1.read(reader); // Use the reader to track dependencies.
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            // We create an autorun that reacts on changes to our derived value.
            ds.add(autorun(reader => {
                /** @description myAutorun */
                // Autoruns work with observable values and deriveds - in short, they work with any observable.
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 0 + 0 = 0",
                "myAutorun(myDerived: 0)",
            ]);
            observable1.set(1, undefined);
            // and on changes...
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 1 + 0 = 1",
                "myAutorun(myDerived: 1)",
            ]);
            observable2.set(1, undefined);
            // ... of any dependency.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 1 + 1 = 2",
                "myAutorun(myDerived: 2)",
            ]);
            // Now we change multiple observables in a transaction to batch process the effects.
            transaction((tx) => {
                observable1.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // When changing multiple observables in a transaction,
            // deriveds are only recomputed on demand.
            // (Note that you cannot see the intermediate value when `obs1 == 5` and `obs2 == 1`)
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 5 + 5 = 10",
                "myAutorun(myDerived: 10)",
            ]);
            transaction((tx) => {
                observable1.set(6, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(4, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Now the autorun didn't run again, because its dependency changed from 10 to 10 (= no change).
            assert.deepStrictEqual(log.getAndClearEntries(), (["myDerived.recompute: 6 + 4 = 10"]));
        });
        test('read during transaction', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const value1 = observable1.read(reader);
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 0 + 0 = 0",
                "myAutorun(myDerived: 0)",
            ]);
            transaction((tx) => {
                observable1.set(-10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This forces a (sync) recomputation of the current value!
                assert.deepStrictEqual(log.getAndClearEntries(), (["myDerived.recompute: -10 + 0 = -10"]));
                // This means, that even in transactions you can assume that all values you can read with `get` and `read` are up-to-date.
                // Read these values just might cause additional (potentially unneeded) recomputations.
                observable2.set(10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // This autorun runs again, because its dependency changed from 0 to -10 and then back to 0.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: -10 + 10 = 0",
                "myAutorun(myDerived: 0)",
            ]);
        });
        test('get without observers', () => {
            const log = new Log();
            const observable1 = observableValue('myObservableValue1', 0);
            // We set up some computeds.
            const computed1 = derived((reader) => {
                /** @description computed */
                const value1 = observable1.read(reader);
                const result = value1 % 3;
                log.log(`recompute1: ${value1} % 3 = ${result}`);
                return result;
            });
            const computed2 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 2;
                log.log(`recompute2: ${value1} * 2 = ${result}`);
                return result;
            });
            const computed3 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 3;
                log.log(`recompute3: ${value1} * 3 = ${result}`);
                return result;
            });
            const computedSum = derived((reader) => {
                /** @description computed */
                const value1 = computed2.read(reader);
                const value2 = computed3.read(reader);
                const result = value1 + value2;
                log.log(`recompute4: ${value1} + ${value2} = ${result}`);
                return result;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            observable1.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // And now read the computed that dependens on all the others.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            // Because there are no observers, the derived values are not cached (!), but computed from scratch.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            const disposable = keepObserved(computedSum); // Use keepObserved to keep the cache.
            // You can also use `computedSum.keepObserved(store)` for an inline experience.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'value: 5',
            ]);
            // Tada, no recomputations!
            observable1.set(2, undefined);
            // The keepObserved does not force deriveds to be recomputed! They are still lazy.
            assert.deepStrictEqual(log.getAndClearEntries(), ([]));
            log.log(`value: ${computedSum.get()}`);
            // Those deriveds are recomputed on demand, i.e. when someone reads them.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            log.log(`value: ${computedSum.get()}`);
            // ... and then cached again
            assert.deepStrictEqual(log.getAndClearEntries(), (["value: 10"]));
            disposable.dispose(); // Don't forget to dispose the keepAlive to prevent memory leaks!
            log.log(`value: ${computedSum.get()}`);
            // Which disables the cache again
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            // Why don't we just always keep the cache alive?
            // This is because in order to keep the cache alive, we have to keep our subscriptions to our dependencies alive,
            // which could cause memory-leaks.
            // So instead, when the last observer of a derived is disposed, we dispose our subscriptions to our dependencies.
            // `keepObserved` just prevents this from happening.
        });
        test('autorun that receives deltas of signals', () => {
            const log = new Log();
            // A signal is an observable without a value.
            // However, it can ship change information when it is triggered.
            // Readers can process/aggregate this change information.
            const signal = observableSignal('signal');
            const disposable = autorunHandleChanges({
                // The change summary is used to collect the changes
                createEmptyChangeSummary: () => ({ msgs: [] }),
                handleChange(context, changeSummary) {
                    if (context.didChange(signal)) {
                        // We just push the changes into an array
                        changeSummary.msgs.push(context.change.msg);
                    }
                    return true; // We want to handle the change
                },
            }, (reader, changeSummary) => {
                // When handling the change, make sure to read the signal!
                signal.read(reader);
                log.log('msgs: ' + changeSummary.msgs.join(', '));
            });
            signal.trigger(undefined, { msg: 'foobar' });
            transaction(tx => {
                // You can batch triggering signals.
                // No delta information is lost!
                signal.trigger(tx, { msg: 'hello' });
                signal.trigger(tx, { msg: 'world' });
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'msgs: ',
                'msgs: foobar',
                'msgs: hello, world'
            ]);
            disposable.dispose();
        });
        // That is the end of the tutorial.
        // There are lots of utilities you can explore now, like `observableFromEvent`, `Event.fromObservableLight`,
        // autorunWithStore, observableWithStore and so on.
    });
    test('topological order', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myComputed1 = derived(reader => {
            /** @description myComputed1 */
            const value1 = myObservable1.read(reader);
            const value2 = myObservable2.read(reader);
            const sum = value1 + value2;
            log.log(`myComputed1.recompute(myObservable1: ${value1} + myObservable2: ${value2} = ${sum})`);
            return sum;
        });
        const myComputed2 = derived(reader => {
            /** @description myComputed2 */
            const value1 = myComputed1.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed2.recompute(myComputed1: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        const myComputed3 = derived(reader => {
            /** @description myComputed3 */
            const value1 = myComputed2.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed3.recompute(myComputed2: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            log.log(`myAutorun.run(myComputed3: ${myComputed3.read(reader)})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed1.recompute(myObservable1: 0 + myObservable2: 0 = 0)",
            "myComputed2.recompute(myComputed1: 0 + myObservable1: 0 + myObservable2: 0 = 0)",
            "myComputed3.recompute(myComputed2: 0 + myObservable1: 0 + myObservable2: 0 = 0)",
            "myAutorun.run(myComputed3: 0)",
        ]);
        myObservable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed1.recompute(myObservable1: 1 + myObservable2: 0 = 1)",
            "myComputed2.recompute(myComputed1: 1 + myObservable1: 1 + myObservable2: 0 = 2)",
            "myComputed3.recompute(myComputed2: 2 + myObservable1: 1 + myObservable2: 0 = 3)",
            "myAutorun.run(myComputed3: 3)",
        ]);
        transaction((tx) => {
            myObservable1.set(2, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed1.recompute(myObservable1: 2 + myObservable2: 0 = 2)",
                "myComputed2.recompute(myComputed1: 2 + myObservable1: 2 + myObservable2: 0 = 4)",
            ]);
            myObservable1.set(3, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed1.recompute(myObservable1: 3 + myObservable2: 0 = 3)",
                "myComputed2.recompute(myComputed1: 3 + myObservable1: 3 + myObservable2: 0 = 6)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed3.recompute(myComputed2: 6 + myObservable1: 3 + myObservable2: 0 = 9)",
            "myAutorun.run(myComputed3: 9)",
        ]);
    });
    suite('from event', () => {
        function init() {
            const log = new Log();
            let value = 0;
            const eventEmitter = new Emitter();
            let id = 0;
            const observable = observableFromEvent((handler) => {
                const curId = id++;
                log.log(`subscribed handler ${curId}`);
                const disposable = eventEmitter.event(handler);
                return {
                    dispose: () => {
                        log.log(`unsubscribed handler ${curId}`);
                        disposable.dispose();
                    },
                };
            }, () => {
                log.log(`compute value ${value}`);
                return value;
            });
            return {
                log,
                setValue: (newValue) => {
                    value = newValue;
                    eventEmitter.fire();
                },
                observable,
            };
        }
        test('Handle undefined', () => {
            const { log, setValue, observable } = init();
            setValue(undefined);
            const autorunDisposable = autorun(reader => {
                /** @description MyAutorun */
                observable.read(reader);
                log.log(`autorun, value: ${observable.read(reader)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "subscribed handler 0",
                "compute value undefined",
                "autorun, value: undefined",
            ]);
            setValue(1);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "compute value 1",
                "autorun, value: 1"
            ]);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "unsubscribed handler 0"
            ]);
        });
        test('basic', () => {
            const { log, setValue, observable } = init();
            const shouldReadObservable = observableValue('shouldReadObservable', true);
            const autorunDisposable = autorun(reader => {
                /** @description MyAutorun */
                if (shouldReadObservable.read(reader)) {
                    observable.read(reader);
                    log.log(`autorun, should read: true, value: ${observable.read(reader)}`);
                }
                else {
                    log.log(`autorun, should read: false`);
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 0',
                'compute value 0',
                'autorun, should read: true, value: 0',
            ]);
            // Cached get
            log.log(`get value: ${observable.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), ['get value: 0']);
            setValue(1);
            // Trigger autorun, no unsub/sub
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            // Unsubscribe when not read
            shouldReadObservable.set(false, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'autorun, should read: false',
                'unsubscribed handler 0',
            ]);
            shouldReadObservable.set(true, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 1',
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'unsubscribed handler 1',
            ]);
        });
        test('get without observers', () => {
            const { log, observable } = init();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            log.log(`get value: ${observable.get()}`);
            // Not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 0',
                'get value: 0',
            ]);
            log.log(`get value: ${observable.get()}`);
            // Still not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 0',
                'get value: 0',
            ]);
        });
    });
    test('reading derived in transaction unsubscribes unnecessary observables', () => {
        const log = new Log();
        const shouldReadObservable = observableValue('shouldReadMyObs1', true);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed = derived(reader => {
            /** @description myComputed */
            log.log('myComputed.recompute');
            if (shouldReadObservable.read(reader)) {
                return myObs1.read(reader);
            }
            return 1;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun: ${value}`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed.recompute",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myAutorun: 0",
        ]);
        transaction(tx => {
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), (["myObs1.set (value 1)"]));
            shouldReadObservable.set(false, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ([]));
            myComputed.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed.recompute",
                "myObs1.lastObserverRemoved",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), (["myAutorun: 1"]));
    });
    test('avoid recomputation of deriveds that are no longer read', () => {
        const log = new Log();
        const myObsShouldRead = new LoggingObservableValue('myObsShouldRead', true, log);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed1 = derived(reader => {
            /** @description myComputed1 */
            const myObs1Val = myObs1.read(reader);
            const result = myObs1Val % 10;
            log.log(`myComputed1(myObs1: ${myObs1Val}): Computed ${result}`);
            return myObs1Val;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const shouldRead = myObsShouldRead.read(reader);
            if (shouldRead) {
                const v = myComputed1.read(reader);
                log.log(`myAutorun(shouldRead: true, myComputed1: ${v}): run`);
            }
            else {
                log.log(`myAutorun(shouldRead: false): run`);
            }
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.firstObserverAdded",
            "myObsShouldRead.get",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myComputed1(myObs1: 0): Computed 0",
            "myAutorun(shouldRead: true, myComputed1: 0): run",
        ]);
        transaction(tx => {
            myObsShouldRead.set(false, tx);
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObsShouldRead.set (value false)",
                "myObs1.set (value 1)",
            ]);
        });
        // myComputed1 should not be recomputed here, even though its dependency myObs1 changed!
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.get",
            "myAutorun(shouldRead: false): run",
            "myObs1.lastObserverRemoved",
        ]);
        transaction(tx => {
            myObsShouldRead.set(true, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObsShouldRead.set (value true)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.get",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myComputed1(myObs1: 1): Computed 1",
            "myAutorun(shouldRead: true, myComputed1: 1): run",
        ]);
    });
    suite('autorun rerun on neutral change', () => {
        test('autorun reruns on neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
        });
        test('autorun does not rerun on indirect neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived(reader => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)"
            ]);
        });
        test('autorun reruns on indirect neutral observable double change when changes propagate', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived(reader => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This marks the auto-run as changed
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myDerived.read(myObservable: 2)"
                ]);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
        });
    });
    test('self-disposing autorun', () => {
        const log = new Log();
        const observable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myObservable3 = new LoggingObservableValue('myObservable3', 0, log);
        const d = autorun(reader => {
            /** @description autorun */
            if (observable1.read(reader) >= 2) {
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable1.set (value 2)",
                    "myObservable1.get",
                ]);
                myObservable2.read(reader);
                // First time this observable is read
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable2.firstObserverAdded",
                    "myObservable2.get",
                ]);
                d.dispose();
                // Disposing removes all observers
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable1.lastObserverRemoved",
                    "myObservable2.lastObserverRemoved",
                ]);
                myObservable3.read(reader);
                // This does not subscribe the observable, because the autorun is disposed
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable3.get",
                ]);
            }
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.firstObserverAdded',
            'myObservable1.get',
        ]);
        observable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.set (value 1)',
            'myObservable1.get',
        ]);
        observable1.set(2, undefined);
        // See asserts in the autorun
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
    });
    test('changing observables in endUpdate', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            const val = myObservable1.read(reader);
            log.log(`myDerived1.read(myObservable: ${val})`);
            return val;
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            if (val === 1) {
                myDerived1.read(reader);
            }
            log.log(`myDerived2.read(myObservable: ${val})`);
            return val;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const myDerived1Val = myDerived1.read(reader);
            const myDerived2Val = myDerived2.read(reader);
            log.log(`myAutorun.run(myDerived1: ${myDerived1Val}, myDerived2: ${myDerived2Val})`);
        }));
        transaction(tx => {
            myObservable2.set(1, tx);
            // end update of this observable will trigger endUpdate of myDerived1 and
            // the autorun and the autorun will add myDerived2 as observer to myDerived1
            myObservable1.set(1, tx);
        });
    });
    test('set dependency in derived', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myComputed = derived(reader => {
            /** @description myComputed */
            let value = myObservable.read(reader);
            const origValue = value;
            log.log(`myComputed(myObservable: ${origValue}): start computing`);
            if (value % 3 !== 0) {
                value++;
                myObservable.set(value, undefined);
            }
            log.log(`myComputed(myObservable: ${origValue}): finished computing`);
            return value;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun(myComputed: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myComputed(myObservable: 0): start computing",
            "myComputed(myObservable: 0): finished computing",
            "myAutorun(myComputed: 0)"
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.set (value 1)",
            "myObservable.get",
            "myComputed(myObservable: 1): start computing",
            "myObservable.set (value 2)",
            "myComputed(myObservable: 1): finished computing",
            "myObservable.get",
            "myComputed(myObservable: 2): start computing",
            "myObservable.set (value 3)",
            "myComputed(myObservable: 2): finished computing",
            "myObservable.get",
            "myComputed(myObservable: 3): start computing",
            "myComputed(myObservable: 3): finished computing",
            "myAutorun(myComputed: 3)",
        ]);
    });
    test('set dependency in autorun', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myObservable.read(reader);
            log.log(`myAutorun(myObservable: ${value}): start`);
            if (value !== 0 && value < 4) {
                myObservable.set(value + 1, undefined);
            }
            log.log(`myAutorun(myObservable: ${value}): end`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myAutorun(myObservable: 0): start",
            "myAutorun(myObservable: 0): end",
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.set (value 1)",
            "myObservable.get",
            "myAutorun(myObservable: 1): start",
            "myObservable.set (value 2)",
            "myAutorun(myObservable: 1): end",
            "myObservable.get",
            "myAutorun(myObservable: 2): start",
            "myObservable.set (value 3)",
            "myAutorun(myObservable: 2): end",
            "myObservable.get",
            "myAutorun(myObservable: 3): start",
            "myObservable.set (value 4)",
            "myAutorun(myObservable: 3): end",
            "myObservable.get",
            "myAutorun(myObservable: 4): start",
            "myAutorun(myObservable: 4): end",
        ]);
    });
    test('get in transaction between sets', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            const value = myObservable.read(reader);
            log.log(`myDerived1(myObservable: ${value}): start computing`);
            return value;
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const value = myDerived1.read(reader);
            log.log(`myDerived2(myDerived1: ${value}): start computing`);
            return value;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myDerived2.read(reader);
            log.log(`myAutorun(myDerived2: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myDerived1(myObservable: 0): start computing",
            "myDerived2(myDerived1: 0): start computing",
            "myAutorun(myDerived2: 0)",
        ]);
        transaction(tx => {
            myObservable.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
            ]);
            myDerived2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.get",
                "myDerived1(myObservable: 1): start computing",
                "myDerived2(myDerived1: 1): start computing",
            ]);
            myObservable.set(2, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 2)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.get",
            "myDerived1(myObservable: 2): start computing",
            "myDerived2(myDerived1: 2): start computing",
            "myAutorun(myDerived2: 2)",
        ]);
    });
    test('bug: Dont reset states', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            log.log(`myDerived2.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const myDerived3 = derived(reader => {
            /** @description myDerived3 */
            const val1 = myObservable1.read(reader);
            const val2 = myDerived2.read(reader);
            log.log(`myDerived3.computed(myDerived1: ${val1}, myDerived2: ${val2})`);
            return `${val1} + ${val2}`;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const val = myDerived3.read(reader);
            log.log(`myAutorun(myDerived3: ${val})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable1.firstObserverAdded",
            "myObservable1.get",
            "myObservable2.firstObserverAdded",
            "myObservable2.get",
            "myDerived2.computed(myObservable2: 0)",
            "myDerived3.computed(myDerived1: 0, myDerived2: 0)",
            "myAutorun(myDerived3: 0 + 0)",
        ]);
        transaction(tx => {
            myObservable1.set(1, tx); // Mark myDerived 3 as stale
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable1.set (value 1)",
            ]);
            myObservable2.set(10, tx); // This is a non-change. myDerived3 should not be marked as possibly-depedency-changed!
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable2.set (value 10)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable1.get",
            "myObservable2.get",
            "myDerived2.computed(myObservable2: 10)",
            'myDerived3.computed(myDerived1: 1, myDerived2: 0)',
            'myAutorun(myDerived3: 1 + 0)',
        ]);
    });
    test('bug: Add observable in endUpdate', () => {
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            return myObservable1.read(reader);
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            return myObservable2.read(reader);
        });
        const myDerivedA1 = derived(reader => /** @description myDerivedA1 */ {
            const d1 = myDerived1.read(reader);
            if (d1 === 1) {
                // This adds an observer while myDerived is still in update mode.
                // When myDerived exits update mode, the observer shouldn't receive
                // more endUpdate than beginUpdate calls.
                myDerived2.read(reader);
            }
        });
        ds.add(autorun(reader => {
            /** @description myAutorun1 */
            myDerivedA1.read(reader);
        }));
        ds.add(autorun(reader => {
            /** @description myAutorun2 */
            myDerived2.read(reader);
        }));
        transaction(tx => {
            myObservable1.set(1, tx);
            myObservable2.set(1, tx);
        });
    });
    test('bug: fromObservableLight doesnt subscribe', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived = derived(reader => /** @description myDerived */ {
            const val = myObservable.read(reader);
            log.log(`myDerived.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const e = Event.fromObservableLight(myDerived);
        log.log('event created');
        e(() => {
            log.log('event fired');
        });
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'event created',
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myDerived.computed(myObservable2: 0)',
            'myObservable.set (value 1)',
            'myObservable.get',
            'myDerived.computed(myObservable2: 1)',
            'event fired',
        ]);
    });
    test('bug: Event.fromObservable always should get events', () => {
        const emitter = new Emitter();
        const log = new Log();
        let i = 0;
        const obs = observableFromEvent(emitter.event, () => i);
        i++;
        emitter.fire(1);
        const evt2 = Event.fromObservable(obs);
        const d = evt2(e => {
            log.log(`event fired ${e}`);
        });
        i++;
        emitter.fire(2);
        assert.deepStrictEqual(log.getAndClearEntries(), ["event fired 2"]);
        i++;
        emitter.fire(3);
        assert.deepStrictEqual(log.getAndClearEntries(), ["event fired 3"]);
        d.dispose();
    });
    test('dont run autorun after dispose', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const d = autorun(reader => {
            /** @description update */
            const v = myObservable.read(reader);
            log.log('autorun, myObservable:' + v);
        });
        transaction(tx => {
            myObservable.set(1, tx);
            d.dispose();
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'autorun, myObservable:0',
            'myObservable.set (value 1)',
            'myObservable.lastObserverRemoved',
        ]);
    });
    suite('waitForState', () => {
        test('resolve', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'ready' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'resolved {\"state\":\"ready\"}',
            ]);
        });
        test('resolveImmediate', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'ready' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'resolved {\"state\":\"ready\"}',
            ]);
        });
        test('reject', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'rejected {\"state\":\"error\"}'
            ]);
        });
        test('derived as lazy', () => {
            const store = new DisposableStore();
            const log = new Log();
            let i = 0;
            const d = derivedDisposable(() => {
                const id = i++;
                log.log('myDerived ' + id);
                return {
                    dispose: () => log.log(`disposed ${id}`)
                };
            });
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 0', 'disposed 0']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 1', 'disposed 1']);
            d.keepObserved(store);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 2']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            store.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ['disposed 2']);
        });
    });
    test('observableValue', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const d = autorun(reader => {
            /** @description update */
            const v1 = myObservable1.read(reader);
            const v2 = myObservable2.read(reader);
            log.log('autorun, myObservable1:' + v1 + ', myObservable2:' + v2);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'autorun, myObservable1:0, myObservable2:0'
        ]);
        // Doesn't trigger the autorun, because no delta was provided and the value did not change
        myObservable1.set(0, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), []);
        // Triggers the autorun. The value did not change, but a delta value was provided
        myObservable2.set(0, undefined, { message: 'change1' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'autorun, myObservable1:0, myObservable2:0'
        ]);
        d.dispose();
    });
    suite('autorun error handling', () => {
        test('immediate throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler(e => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun(reader => {
                myObservable.read(reader);
                throw new Error('foobar');
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.firstObserverAdded",
                "myObservable.get",
                "error: foobar"
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
                "myObservable.get",
                "error: foobar",
            ]);
            d.dispose();
        });
        test('late throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler(e => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun(reader => {
                const value = myObservable.read(reader);
                if (value >= 1) {
                    throw new Error('foobar');
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.firstObserverAdded",
                "myObservable.get",
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
                "myObservable.get",
                "error: foobar",
            ]);
            myObservable.set(2, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 2)",
                "myObservable.get",
                "error: foobar",
            ]);
            d.dispose();
        });
    });
    test('recomputeInitiallyAndOnChange should work when a dependency sets an observable', () => {
        const store = new DisposableStore();
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        let shouldUpdate = true;
        const myDerived = derived(reader => {
            /** @description myDerived */
            log.log('myDerived.computed start');
            const val = myObservable.read(reader);
            if (shouldUpdate) {
                shouldUpdate = false;
                myObservable.set(1, undefined);
            }
            log.log('myDerived.computed end');
            return val;
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
        myDerived.recomputeInitiallyAndOnChange(store, val => {
            log.log(`recomputeInitiallyAndOnChange, myDerived: ${val}`);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myDerived.computed start",
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myObservable.set (value 1)",
            "myDerived.computed end",
            "myDerived.computed start",
            "myObservable.get",
            "myDerived.computed end",
            "recomputeInitiallyAndOnChange, myDerived: 1",
        ]);
        myDerived.get();
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
        store.dispose();
    });
    suite('prevent invalid usage', () => {
        suite('reading outside of compute function', () => {
            test('derived', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const d = derived(reader => {
                    fn = () => { obs.read(reader); };
                    return obs.read(reader);
                });
                const disp = autorun(reader => {
                    d.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
            test('autorun', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const disp = autorun(reader => {
                    fn = () => { obs.read(reader); };
                    obs.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
        });
        test.skip('catches cyclic dependencies', () => {
            const log = new Log();
            setUnexpectedErrorHandler((e) => {
                log.log(e.toString());
            });
            const obs = observableValue('obs', 0);
            const d1 = derived(reader => {
                log.log('d1.computed start');
                const x = obs.read(reader) + d2.read(reader);
                log.log('d1.computed end');
                return x;
            });
            const d2 = derived(reader => {
                log.log('d2.computed start');
                d1.read(reader);
                log.log('d2.computed end');
                return 0;
            });
            const disp = autorun(reader => {
                log.log('autorun start');
                d1.read(reader);
                log.log('autorun end');
                return 0;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "autorun start",
                "d1.computed start",
                "d2.computed start",
                "Error: Cyclic deriveds are not supported yet!",
                "d1.computed end",
                "autorun end"
            ]));
            disp.dispose();
        });
    });
});
export class LoggingObserver {
    constructor(debugName, log) {
        this.debugName = debugName;
        this.log = log;
        this.count = 0;
    }
    beginUpdate(observable) {
        this.count++;
        this.log.log(`${this.debugName}.beginUpdate (count ${this.count})`);
    }
    endUpdate(observable) {
        this.log.log(`${this.debugName}.endUpdate (count ${this.count})`);
        this.count--;
    }
    handleChange(observable, change) {
        this.log.log(`${this.debugName}.handleChange (count ${this.count})`);
    }
    handlePossibleChange(observable) {
        this.log.log(`${this.debugName}.handlePossibleChange`);
    }
}
export class LoggingObservableValue extends BaseObservable {
    constructor(debugName, initialValue, logger) {
        super();
        this.debugName = debugName;
        this.logger = logger;
        this.value = initialValue;
    }
    onFirstObserverAdded() {
        this.logger.log(`${this.debugName}.firstObserverAdded`);
    }
    onLastObserverRemoved() {
        this.logger.log(`${this.debugName}.lastObserverRemoved`);
    }
    get() {
        this.logger.log(`${this.debugName}.get`);
        return this.value;
    }
    set(value, tx, change) {
        if (this.value === value) {
            return;
        }
        if (!tx) {
            transaction((tx) => {
                this.set(value, tx, change);
            }, () => `Setting ${this.debugName}`);
            return;
        }
        this.logger.log(`${this.debugName}.set (value ${value})`);
        this.value = value;
        for (const observer of this._observers) {
            tx.updateObserver(observer, this);
            observer.handleChange(this, change);
        }
    }
    toString() {
        return `${this.debugName}: ${this.value}`;
    }
}
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9vYnNlcnZhYmxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUE2RCxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuUSxPQUFPLEVBQUUsY0FBYyxFQUF5QixNQUFNLHlDQUF5QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6QixNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXJEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDdEIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtZQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLHVGQUF1RjtZQUN2RixnREFBZ0Q7WUFDaEQsdUNBQXVDO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFD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