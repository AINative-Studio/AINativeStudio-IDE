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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2xpZmVjeWNsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6SyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFbEcsTUFBTSxVQUFVO0lBQWhCO1FBQ0MsZUFBVSxHQUFHLEtBQUssQ0FBQztJQUVwQixDQUFDO0lBREEsT0FBTyxLQUFLLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNyQztBQUVELHdEQUF3RDtBQUN4RCx5RUFBeUU7QUFDekUsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBRXBDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUvQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFcEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDckMsTUFBTSxVQUFVLEdBQUcs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