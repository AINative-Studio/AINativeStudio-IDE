/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../common/event.js';
import { DisposableStore, dispose, markAsSingleton, ReferenceCollection, SafeDisposable, thenIfNotDisposed, toDisposable } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite, throwIfDisposablesAreLeaked } from './utils.js';
class Disposable {
    constructor() {
        this.isDisposed = false;
    }
    dispose() { this.isDisposed = true; }
}
// Leaks are allowed here since we test lifecycle stuff:
// eslint-disable-next-line local/code-ensure-no-disposables-leak-in-test
suite('Lifecycle', () => {
    test('dispose single disposable', () => {
        const disposable = new Disposable();
        assert(!disposable.isDisposed);
        dispose(disposable);
        assert(disposable.isDisposed);
    });
    test('dispose disposable array', () => {
        const disposable = new Disposable();
        const disposable2 = new Disposable();
        assert(!disposable.isDisposed);
        assert(!disposable2.isDisposed);
        dispose([disposable, disposable2]);
        assert(disposable.isDisposed);
        assert(disposable2.isDisposed);
    });
    test('dispose disposables', () => {
        const disposable = new Disposable();
        const disposable2 = new Disposable();
        assert(!disposable.isDisposed);
        assert(!disposable2.isDisposed);
        dispose(disposable);
        dispose(disposable2);
        assert(disposable.isDisposed);
        assert(disposable2.isDisposed);
    });
    test('dispose array should dispose all if a child throws on dispose', () => {
        const disposedValues = new Set();
        let thrownError;
        try {
            dispose([
                toDisposable(() => { disposedValues.add(1); }),
                toDisposable(() => { throw new Error('I am error'); }),
                toDisposable(() => { disposedValues.add(3); }),
            ]);
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(3));
        assert.strictEqual(thrownError.message, 'I am error');
    });
    test('dispose array should rethrow composite error if multiple entries throw on dispose', () => {
        const disposedValues = new Set();
        let thrownError;
        try {
            dispose([
                toDisposable(() => { disposedValues.add(1); }),
                toDisposable(() => { throw new Error('I am error 1'); }),
                toDisposable(() => { throw new Error('I am error 2'); }),
                toDisposable(() => { disposedValues.add(4); }),
            ]);
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(4));
        assert.ok(thrownError instanceof AggregateError);
        assert.strictEqual(thrownError.errors.length, 2);
        assert.strictEqual(thrownError.errors[0].message, 'I am error 1');
        assert.strictEqual(thrownError.errors[1].message, 'I am error 2');
    });
    test('Action bar has broken accessibility #100273', function () {
        const array = [{ dispose() { } }, { dispose() { } }];
        const array2 = dispose(array);
        assert.strictEqual(array.length, 2);
        assert.strictEqual(array2.length, 0);
        assert.ok(array !== array2);
        const set = new Set([{ dispose() { } }, { dispose() { } }]);
        const setValues = set.values();
        const setValues2 = dispose(setValues);
        assert.ok(setValues === setValues2);
    });
    test('SafeDisposable, dispose', function () {
        let disposed = 0;
        const actual = () => disposed += 1;
        const d = new SafeDisposable();
        d.set(actual);
        d.dispose();
        assert.strictEqual(disposed, 1);
    });
    test('SafeDisposable, unset', function () {
        let disposed = 0;
        const actual = () => disposed += 1;
        const d = new SafeDisposable();
        d.set(actual);
        d.unset();
        d.dispose();
        assert.strictEqual(disposed, 0);
    });
});
suite('DisposableStore', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose should call all child disposes even if a child throws on dispose', () => {
        const disposedValues = new Set();
        const store = new DisposableStore();
        store.add(toDisposable(() => { disposedValues.add(1); }));
        store.add(toDisposable(() => { throw new Error('I am error'); }));
        store.add(toDisposable(() => { disposedValues.add(3); }));
        let thrownError;
        try {
            store.dispose();
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(3));
        assert.strictEqual(thrownError.message, 'I am error');
    });
    test('dispose should throw composite error if multiple children throw on dispose', () => {
        const disposedValues = new Set();
        const store = new DisposableStore();
        store.add(toDisposable(() => { disposedValues.add(1); }));
        store.add(toDisposable(() => { throw new Error('I am error 1'); }));
        store.add(toDisposable(() => { throw new Error('I am error 2'); }));
        store.add(toDisposable(() => { disposedValues.add(4); }));
        let thrownError;
        try {
            store.dispose();
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(4));
        assert.ok(thrownError instanceof AggregateError);
        assert.strictEqual(thrownError.errors.length, 2);
        assert.strictEqual(thrownError.errors[0].message, 'I am error 1');
        assert.strictEqual(thrownError.errors[1].message, 'I am error 2');
    });
    test('delete should evict and dispose of the disposables', () => {
        const disposedValues = new Set();
        const disposables = [
            toDisposable(() => { disposedValues.add(1); }),
            toDisposable(() => { disposedValues.add(2); })
        ];
        const store = new DisposableStore();
        store.add(disposables[0]);
        store.add(disposables[1]);
        store.delete(disposables[0]);
        assert.ok(disposedValues.has(1));
        assert.ok(!disposedValues.has(2));
        store.dispose();
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(2));
    });
    test('deleteAndLeak should evict and not dispose of the disposables', () => {
        const disposedValues = new Set();
        const disposables = [
            toDisposable(() => { disposedValues.add(1); }),
            toDisposable(() => { disposedValues.add(2); })
        ];
        const store = new DisposableStore();
        store.add(disposables[0]);
        store.add(disposables[1]);
        store.deleteAndLeak(disposables[0]);
        assert.ok(!disposedValues.has(1));
        assert.ok(!disposedValues.has(2));
        store.dispose();
        assert.ok(!disposedValues.has(1));
        assert.ok(disposedValues.has(2));
        disposables[0].dispose();
    });
});
suite('Reference Collection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Collection extends ReferenceCollection {
        constructor() {
            super(...arguments);
            this._count = 0;
        }
        get count() { return this._count; }
        createReferencedObject(key) { this._count++; return key.length; }
        destroyReferencedObject(key, object) { this._count--; }
    }
    test('simple', () => {
        const collection = new Collection();
        const ref1 = collection.acquire('test');
        assert(ref1);
        assert.strictEqual(ref1.object, 4);
        assert.strictEqual(collection.count, 1);
        ref1.dispose();
        assert.strictEqual(collection.count, 0);
        const ref2 = collection.acquire('test');
        const ref3 = collection.acquire('test');
        assert.strictEqual(ref2.object, ref3.object);
        assert.strictEqual(collection.count, 1);
        const ref4 = collection.acquire('monkey');
        assert.strictEqual(ref4.object, 6);
        assert.strictEqual(collection.count, 2);
        ref2.dispose();
        assert.strictEqual(collection.count, 2);
        ref3.dispose();
        assert.strictEqual(collection.count, 1);
        ref4.dispose();
        assert.strictEqual(collection.count, 0);
    });
});
function assertThrows(fn, test) {
    try {
        fn();
        assert.fail('Expected function to throw, but it did not.');
    }
    catch (e) {
        assert.ok(test(e));
    }
}
suite('No Leakage Utilities', () => {
    suite('throwIfDisposablesAreLeaked', () => {
        test('throws if an event subscription is not cleaned up', () => {
            const eventEmitter = new Emitter();
            assertThrows(() => {
                throwIfDisposablesAreLeaked(() => {
                    eventEmitter.event(() => {
                        // noop
                    });
                }, false);
            }, e => e.message.indexOf('undisposed disposables') !== -1);
        });
        test('throws if a disposable is not disposed', () => {
            assertThrows(() => {
                throwIfDisposablesAreLeaked(() => {
                    new DisposableStore();
                }, false);
            }, e => e.message.indexOf('undisposed disposables') !== -1);
        });
        test('does not throw if all event subscriptions are cleaned up', () => {
            const eventEmitter = new Emitter();
            throwIfDisposablesAreLeaked(() => {
                eventEmitter.event(() => {
                    // noop
                }).dispose();
            });
        });
        test('does not throw if all disposables are disposed', () => {
            // This disposable is reported before the test and not tracked.
            toDisposable(() => { });
            throwIfDisposablesAreLeaked(() => {
                // This disposable is marked as singleton
                markAsSingleton(toDisposable(() => { }));
                // These disposables are also marked as singleton
                const disposableStore = new DisposableStore();
                disposableStore.add(toDisposable(() => { }));
                markAsSingleton(disposableStore);
                toDisposable(() => { }).dispose();
            });
        });
    });
    suite('ensureNoDisposablesAreLeakedInTest', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        test('Basic Test', () => {
            toDisposable(() => { }).dispose();
        });
    });
    suite('thenIfNotDisposed', () => {
        const store = ensureNoDisposablesAreLeakedInTestSuite();
        test('normal case', async () => {
            let called = false;
            store.add(thenIfNotDisposed(Promise.resolve(123), (result) => {
                assert.strictEqual(result, 123);
                called = true;
            }));
            await new Promise(resolve => setTimeout(resolve, 0));
            assert.strictEqual(called, true);
        });
        test('disposed before promise resolves', async () => {
            let called = false;
            const disposable = thenIfNotDisposed(Promise.resolve(123), () => {
                called = true;
            });
            disposable.dispose();
            await new Promise(resolve => setTimeout(resolve, 0));
            assert.strictEqual(called, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9saWZlY3ljbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekssT0FBTyxFQUFFLHVDQUF1QyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWxHLE1BQU0sVUFBVTtJQUFoQjtRQUNDLGVBQVUsR0FBRyxLQUFLLENBQUM7SUFFcEIsQ0FBQztJQURBLE9BQU8sS0FBSyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDckM7QUFFRCx3REFBd0Q7QUFDeEQseUVBQXlFO0FBQ3pFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUVwQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFL0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFH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