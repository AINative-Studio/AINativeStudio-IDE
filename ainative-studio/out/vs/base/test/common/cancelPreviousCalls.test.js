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
import assert from 'assert';
import { Disposable } from '../../common/lifecycle.js';
import { CancellationToken } from '../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { cancelPreviousCalls } from '../../common/decorators/cancelPreviousCalls.js';
suite('cancelPreviousCalls decorator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    class MockDisposable extends Disposable {
        constructor() {
            super(...arguments);
            /**
             * Arguments that the {@linkcode doSomethingAsync} method was called with.
             */
            this.callArgs1 = [];
            /**
             * Arguments that the {@linkcode doSomethingElseAsync} method was called with.
             */
            this.callArgs2 = [];
        }
        /**
         * Returns the arguments that the {@linkcode doSomethingAsync} method was called with.
         */
        get callArguments1() {
            return this.callArgs1;
        }
        /**
         * Returns the arguments that the {@linkcode doSomethingElseAsync} method was called with.
         */
        get callArguments2() {
            return this.callArgs2;
        }
        async doSomethingAsync(arg1, arg2, cancellationToken) {
            this.callArgs1.push([arg1, arg2, cancellationToken]);
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        async doSomethingElseAsync(arg1, arg2, cancellationToken) {
            this.callArgs2.push([arg1, arg2, cancellationToken]);
            await new Promise(resolve => setTimeout(resolve, 25));
        }
    }
    __decorate([
        cancelPreviousCalls
    ], MockDisposable.prototype, "doSomethingAsync", null);
    __decorate([
        cancelPreviousCalls
    ], MockDisposable.prototype, "doSomethingElseAsync", null);
    test('should call method with CancellationToken', async () => {
        const instance = disposables.add(new MockDisposable());
        await instance.doSomethingAsync(1, 'foo');
        const callArguments = instance.callArguments1;
        assert.strictEqual(callArguments.length, 1, `The 'doSomethingAsync' method must be called just once.`);
        const args = callArguments[0];
        assert(args.length === 3, `The 'doSomethingAsync' method must be called with '3' arguments, got '${args.length}'.`);
        const arg1 = args[0];
        const arg2 = args[1];
        const arg3 = args[2];
        assert.strictEqual(arg1, 1, `The 'doSomethingAsync' method call must have the correct 1st argument.`);
        assert.strictEqual(arg2, 'foo', `The 'doSomethingAsync' method call must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(arg3), `The last argument of the 'doSomethingAsync' method must be a 'CancellationToken', got '${arg3}'.`);
        assert(arg3.isCancellationRequested === false, `The 'CancellationToken' argument must not yet be cancelled.`);
        assert(instance.callArguments2.length === 0, `The 'doSomethingElseAsync' method must not be called.`);
    });
    test('cancel token of the previous call when method is called again', async () => {
        const instance = disposables.add(new MockDisposable());
        instance.doSomethingAsync(1, 'foo');
        await new Promise(resolve => setTimeout(resolve, 10));
        instance.doSomethingAsync(2, 'bar');
        const callArguments = instance.callArguments1;
        assert.strictEqual(callArguments.length, 2, `The 'doSomethingAsync' method must be called twice.`);
        const call1Args = callArguments[0];
        assert(call1Args.length === 3, `The first call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call1Args[0], 1, `The first call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call1Args[1], 'foo', `The first call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call1Args[2]), `The first call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call1Args[2].isCancellationRequested === true, `The 'CancellationToken' of the first call must be cancelled.`);
        const call2Args = callArguments[1];
        assert(call2Args.length === 3, `The second call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call2Args[0], 2, `The second call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call2Args[1], 'bar', `The second call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call2Args[2]), `The second call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call2Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must be cancelled.`);
        assert(instance.callArguments2.length === 0, `The 'doSomethingElseAsync' method must not be called.`);
    });
    test('different method calls must not interfere with each other', async () => {
        const instance = disposables.add(new MockDisposable());
        instance.doSomethingAsync(10, 'baz');
        await new Promise(resolve => setTimeout(resolve, 10));
        instance.doSomethingElseAsync(25, 'qux');
        assert.strictEqual(instance.callArguments1.length, 1, `The 'doSomethingAsync' method must be called once.`);
        const call1Args = instance.callArguments1[0];
        assert(call1Args.length === 3, `The first call of the 'doSomethingAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call1Args[0], 10, `The first call of the 'doSomethingAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call1Args[1], 'baz', `The first call of the 'doSomethingAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call1Args[2]), `The first call of the 'doSomethingAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call1Args[2].isCancellationRequested === false, `The 'CancellationToken' of the first call must not be cancelled.`);
        assert.strictEqual(instance.callArguments2.length, 1, `The 'doSomethingElseAsync' method must be called once.`);
        const call2Args = instance.callArguments2[0];
        assert(call2Args.length === 3, `The first call of the 'doSomethingElseAsync' method must have '3' arguments, got '${call1Args.length}'.`);
        assert.strictEqual(call2Args[0], 25, `The first call of the 'doSomethingElseAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call2Args[1], 'qux', `The first call of the 'doSomethingElseAsync' method must have the correct 2nd argument.`);
        assert(CancellationToken.isCancellationToken(call2Args[2]), `The first call of the 'doSomethingElseAsync' method must have the 'CancellationToken' as the 3rd argument.`);
        assert(call2Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must be cancelled.`);
        instance.doSomethingElseAsync(105, 'uxi');
        assert.strictEqual(instance.callArguments1.length, 1, `The 'doSomethingAsync' method must be called once.`);
        assert.strictEqual(instance.callArguments2.length, 2, `The 'doSomethingElseAsync' method must be called twice.`);
        assert(call1Args[2].isCancellationRequested === false, `The 'CancellationToken' of the first call must not be cancelled.`);
        const call3Args = instance.callArguments2[1];
        assert(CancellationToken.isCancellationToken(call3Args[2]), `The last argument of the second call of the 'doSomethingElseAsync' method must be a 'CancellationToken'.`);
        assert(call2Args[2].isCancellationRequested, `The 'CancellationToken' of the first call must be cancelled.`);
        assert(call3Args[2].isCancellationRequested === false, `The 'CancellationToken' of the second call must not be cancelled.`);
        assert.strictEqual(call3Args[0], 105, `The second call of the 'doSomethingElseAsync' method must have the correct 1st argument.`);
        assert.strictEqual(call3Args[1], 'uxi', `The second call of the 'doSomethingElseAsync' method must have the correct 2nd argument.`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsUHJldmlvdXNDYWxscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2NhbmNlbFByZXZpb3VzQ2FsbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVyRixLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzNDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsTUFBTSxjQUFlLFNBQVEsVUFBVTtRQUF2Qzs7WUFDQzs7ZUFFRztZQUNjLGNBQVMsR0FBd0QsRUFBRSxDQUFDO1lBRXJGOztlQUVHO1lBQ2MsY0FBUyxHQUF3RCxFQUFFLENBQUM7UUE2QnRGLENBQUM7UUEzQkE7O1dBRUc7UUFDSCxJQUFXLGNBQWM7WUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3ZCLENBQUM7UUFFRDs7V0FFRztRQUNILElBQVcsY0FBYztZQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDdkIsQ0FBQztRQUdLLEFBQU4sS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQVksRUFBRSxJQUFZLEVBQUUsaUJBQXFDO1lBQ3ZGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxp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