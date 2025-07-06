/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { ObjectCache } from '../../common/objectCache.js';
import { wait } from '../../../base/test/common/testUtils.js';
import { ObservableDisposable } from '../../common/observableDisposable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
/**
 * Test object class.
 */
class TestObject extends ObservableDisposable {
    constructor(ID) {
        super();
        this.ID = ID;
    }
    /**
     * Check if this object is equal to another one.
     */
    equal(other) {
        return this.ID === other.ID;
    }
}
suite('ObjectCache', function () {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('get', () => {
        /**
         * Common test funtion to test core logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testCoreLogic = async (key1, key2) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache using 2 objects.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            const obj2 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key1, '[obj2] Returned object must have the correct ID.');
            assert(obj1 === obj2 && obj1.equal(obj2), '[obj2] Returned object must be the same instance.');
            factory.resetHistory();
            const obj3 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj3] Must be called once with the correct arguments.');
            assert(obj3.ID === key2, '[obj3] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj4 = cache.get(key1);
            assert(factory.notCalled, '[obj4] Factory must not be called.');
            assert(obj4.ID === key1, '[obj4] Returned object must have the correct ID.');
            assert(obj1 === obj4 && obj1.equal(obj4), '[obj4] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Now test that the object is removed automatically from
             * the cache when it is disposed.
             */
            obj3.dispose();
            // the object is removed from the cache asynchronously
            // so add a small delay to ensure the object is removed
            await wait(5);
            const obj5 = cache.get(key1);
            assert(factory.notCalled, '[obj5] Factory must not be called.');
            assert(obj5.ID === key1, '[obj5] Returned object must have the correct ID.');
            assert(obj1 === obj5 && obj1.equal(obj5), '[obj5] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Test that the previously disposed object is recreated
             * on the new retrieval call.
             */
            const obj6 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj6] Must be called once with the correct arguments.');
            assert(obj6.ID === key2, '[obj6] Returned object must have the correct ID.');
        };
        test('strings as keys', async function () {
            await testCoreLogic('key1', 'key2');
        });
        test('numbers as keys', async function () {
            await testCoreLogic(10, 17065);
        });
        test('objects as keys', async function () {
            await testCoreLogic(disposables.add(new TestObject({})), disposables.add(new TestObject({})));
        });
    });
    suite('remove', () => {
        /**
         * Common test funtion to test remove logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testRemoveLogic = async (key1, key2, disposeOnRemove) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            // ObjectCache<TestObject<TKey>, TKey>
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj2 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key2, '[obj2] Returned object must have the correct ID.');
            cache.remove(key2, disposeOnRemove);
            const object2Disposed = obj2.disposed;
            // ensure we don't leak undisposed object in the tests
            if (!obj2.disposed) {
                obj2.dispose();
            }
            assert(object2Disposed === disposeOnRemove, `[obj2] Removed object must be disposed: ${disposeOnRemove}.`);
            factory.resetHistory();
            /**
             * Validate that another object is not disposed.
             */
            assert(!obj1.disposed, '[obj1] Object must not be disposed.');
            const obj3 = cache.get(key1);
            assert(factory.notCalled, '[obj3] Factory must not be called.');
            assert(obj3.ID === key1, '[obj3] Returned object must have the correct ID.');
            assert(obj1 === obj3 && obj1.equal(obj3), '[obj3] Returned object must be the same instance.');
            factory.resetHistory();
        };
        test('strings as keys', async function () {
            await testRemoveLogic('key1', 'key2', false);
            await testRemoveLogic('some-key', 'another-key', true);
        });
        test('numbers as keys', async function () {
            await testRemoveLogic(7, 2400700, false);
            await testRemoveLogic(1090, 2654, true);
        });
        test('objects as keys', async function () {
            await testRemoveLogic(disposables.add(new TestObject(1)), disposables.add(new TestObject(1)), false);
            await testRemoveLogic(disposables.add(new TestObject(2)), disposables.add(new TestObject(2)), true);
        });
    });
    test('throws if factory returns a disposed object', async function () {
        const factory = (key) => {
            const result = new TestObject(key);
            if (key === 'key2') {
                result.dispose();
            }
            // caution! explicit type casting below!
            return result;
        };
        // ObjectCache<TestObject>
        const cache = disposables.add(new ObjectCache(factory));
        assert.doesNotThrow(() => {
            cache.get('key1');
        });
        assert.throws(() => {
            cache.get('key2');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vb2JqZWN0Q2FjaGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdGOztHQUVHO0FBQ0gsTUFBTSxVQUF1RCxTQUFRLG9CQUFvQjtJQUN4RixZQUNpQixFQUFRO1FBRXhCLEtBQUssRUFBRSxDQUFDO1FBRlEsT0FBRSxHQUFGLEVBQUUsQ0FBTTtJQUd6QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsS0FBdUM7UUFDbkQsT0FBTyxJQUFJLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLGFBQWEsRUFBRTtJQUNwQixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQ2pCOzs7Ozs7V0FNRztRQUNILE1BQU0sYUFBYSxHQUFHLEtBQUssRUFBcUMsSUFBVSxFQUFFLElBQVUsRUFBRSxFQUFFO1lBQ3pGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUNuQixHQUFTLEVBQ1IsRUFBRTtnQkFD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