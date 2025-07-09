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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsUHJldmlvdXNDYWxscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vY2FuY2VsUHJldmlvdXNDYWxscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXJGLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDM0MsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxNQUFNLGNBQWUsU0FBUSxVQUFVO1FBQXZDOztZQUNDOztlQUVHO1lBQ2MsY0FBUyxHQUF3RCxFQUFFLENBQUM7WUFFckY7O2VBRUc7WUFDYyxjQUFTLEdBQXdELEVBQUUsQ0FBQztRQTZCdEYsQ0FBQztRQTNCQTs7V0FFRztRQUNILElBQVcsY0FBYztZQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDdkIsQ0FBQztRQUVEOztXQUVHO1FBQ0gsSUFBVyxjQUFjO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QixDQUFDO1FBR0ssQUFBTixLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxpQkFBcUM7WUFDdkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGlCQUFp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