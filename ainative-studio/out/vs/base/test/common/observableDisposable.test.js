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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL29ic2VydmFibGVEaXNwb3NhYmxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9GLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLGtEQUFrRDtRQUNsRCxxQ0FBcUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFNLFNBQVEsb0JBQW9CO1NBQUksRUFBRSxDQUFDO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFeEIsTUFBTSxDQUNMLE1BQU0sWUFBWSxvQkFBb0IsRUFDdEMsa0RBQWtELENBQ2xELENBQUM7UUFFRixNQUFNLENBQ0wsTUFBTSxZQUFZLFVBQVUsRUFDNUIsd0NBQXdDLENBQ3hDLENBQUM7UUFFRixNQUFNLENBQ0wsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUNoQixrQ0FBa0MsQ0FD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