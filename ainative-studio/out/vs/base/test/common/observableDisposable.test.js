/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { wait, waitRandom } from './testUtils.js';
import { Disposable } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { assertNotDisposed, ObservableDisposable } from '../../common/observableDisposable.js';
suite('ObservableDisposable', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('tracks `disposed` state', () => {
        // this is an abstract class, so we have to create
        // an anonymous class that extends it
        const object = new class extends ObservableDisposable {
        }();
        disposables.add(object);
        assert(object instanceof ObservableDisposable, 'Object must be instance of ObservableDisposable.');
        assert(object instanceof Disposable, 'Object must be instance of Disposable.');
        assert(!object.disposed, 'Object must not be disposed yet.');
        object.dispose();
        assert(object.disposed, 'Object must be disposed.');
    });
    suite('onDispose', () => {
        test('fires the event on dispose', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(!object.disposed, 'Object must not be disposed yet.');
            const onDisposeSpy = spy(() => { });
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            await waitRandom(10);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            /**
             * Validate that the callback was called.
             */
            assert(object.disposed, 'Object must be disposed.');
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called.');
            /**
             * Validate that the callback is not called again.
             */
            object.dispose();
            object.dispose();
            await waitRandom(10);
            object.dispose();
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must not be called again.');
            assert(object.disposed, 'Object must be disposed.');
        });
        test('executes callback immediately if already disposed', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            const onDisposeSpy = spy(() => { });
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called immediately.');
            await waitRandom(10);
            object.onDispose(onDisposeSpy);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must be called immediately the second time.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must not be called again on dispose.');
        });
    });
    suite('asserts', () => {
        test('not disposed (method)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await waitRandom(10);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await waitRandom(10);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
        });
        test('not disposed (function)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await waitRandom(10);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await wait(1);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await waitRandom(10);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vb2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0YsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsa0RBQWtEO1FBQ2xELHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQU0sU0FBUSxvQkFBb0I7U0FBSSxFQUFFLENBQUM7UUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV4QixNQUFNLENBQ0wsTUFBTSxZQUFZLG9CQUFvQixFQUN0QyxrREFBa0QsQ0FDbEQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxNQUFNLFlBQVksVUFBVSxFQUM1Qix3Q0FBd0MsQ0FDeEMsQ0FBQztRQUVGLE1BQU0sQ0FDTCxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQ2hCLGtDQUFrQyxDQUNs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