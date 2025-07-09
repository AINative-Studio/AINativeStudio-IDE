/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertDefined } from '../types.js';
import { DisposableMap } from '../lifecycle.js';
import { CancellationTokenSource, CancellationToken } from '../cancellation.js';
/**
 * Decorator that provides a mechanism to cancel previous calls of the decorated method
 * by providing a `cancellation token` as the last argument of the method, which gets
 * cancelled immediately on subsequent call of the decorated method.
 *
 * Therefore to use this decorator, the two conditions must be met:
 *
 * - the decorated method must have an *optional* {@linkcode CancellationToken} argument at
 * 	 the end of the arguments list
 * - the object that the decorated method belongs to must implement the {@linkcode Disposable};
 *   this requirement comes from the internal implementation of the decorator that
 *   creates new resources that need to be eventually disposed by someone
 *
 * @typeparam `TObject` - Object type that the decorated method belongs to.
 * @typeparam `TArgs` - Argument list of the decorated method.
 * @typeparam `TReturn` - Return value type of the decorated method.
 *
 * ### Examples
 *
 * ```typescript
 * // let's say we have a class that implements the `Disposable` interface that we want
 * // to use the decorator on
 * class Example extends Disposable {
 * 		async doSomethingAsync(arg1: number, arg2: string): Promise<void> {
 * 			// do something async..
 * 			await new Promise(resolve => setTimeout(resolve, 1000));
 * 		}
 * }
 * ```
 *
 * ```typescript
 * // to do that we need to add the `CancellationToken` argument to the end of args list
 * class Example extends Disposable {
 * 		@cancelPreviousCalls
 * 		async doSomethingAsync(arg1: number, arg2: string, cancellationToken?: CancellationToken): Promise<void> {
 * 			console.log(`call with args ${arg1} and ${arg2} initiated`);
 *
 * 			// the decorator will create the cancellation token automatically
 * 			assertDefined(
 * 				cancellationToken,
 * 				`The method must now have the `CancellationToken` passed to it.`,
 * 			);
 *
 * 			cancellationToken.onCancellationRequested(() => {
 * 				console.log(`call with args ${arg1} and ${arg2} was cancelled`);
 * 			});
 *
 * 			// do something async..
 * 			await new Promise(resolve => setTimeout(resolve, 1000));
 *
 * 			// check cancellation token state after the async operations
 * 			console.log(
 * 				`call with args ${arg1} and ${arg2} completed, canceled?: ${cancellationToken.isCancellationRequested}`,
 * 			);
 * 		}
 * }
 *
 * const example = new Example();
 * // call the decorate method first time
 * example.doSomethingAsync(1, 'foo');
 * // wait for 500ms which is less than 1000ms of the async operation in the first call
 * await new Promise(resolve => setTimeout(resolve, 500));
 * // calling the decorate method second time cancels the token passed to the first call
 * example.doSomethingAsync(2, 'bar');
 * ```
 */
export function cancelPreviousCalls(_proto, methodName, descriptor) {
    const originalMethod = descriptor.value;
    assertDefined(originalMethod, `Method '${methodName}' is not defined.`);
    // we create the global map that contains `TObjectRecord` for each object instance that
    // uses this decorator, which itself contains a `{method name} -> TMethodRecord` mapping
    // for each decorated method on the object; the `TMethodRecord` record stores current
    // `cancellationTokenSource`, token of which was passed to the previous call of the method
    const objectRecords = new WeakMap();
    // decorate the original method with the following logic that upon a new invocation
    // of the method cancels the cancellation token that was passed to a previous call
    descriptor.value = function (...args) {
        // get or create a record for the current object instance
        // the creation is done once per each object instance
        let record = objectRecords.get(this);
        if (!record) {
            record = new DisposableMap();
            objectRecords.set(this, record);
            this._register({
                dispose: () => {
                    objectRecords.get(this)?.dispose();
                    objectRecords.delete(this);
                },
            });
        }
        // when the decorated method is called again and there is a cancellation token
        // source exists from a previous call, cancel and dispose it, then remove it
        record.get(methodName)?.dispose(true);
        // now we need to provide a cancellation token to the original method
        // as the last argument, there are two cases to consider:
        // 	- (common case) the arguments list does not have a cancellation token
        // 	   as the last argument, - in this case we need to add a new one
        //  - (possible case) - the arguments list already has a cancellation token
        //    as the last argument, - in this case we need to reuse the token when
        //    we create ours, and replace the old token with the new one
        // therefore,
        // get the last argument of the arguments list and if it is present,
        // reuse it as the token for the new cancellation token source
        const lastArgument = (args.length > 0)
            ? args[args.length - 1]
            : undefined;
        const token = CancellationToken.isCancellationToken(lastArgument)
            ? lastArgument
            : undefined;
        const cancellationSource = new CancellationTokenSource(token);
        record.set(methodName, cancellationSource);
        // then update or add cancelaltion token at the end of the arguments list
        if (CancellationToken.isCancellationToken(lastArgument)) {
            args[args.length - 1] = cancellationSource.token;
        }
        else {
            args.push(cancellationSource.token);
        }
        // finally invoke the original method passing original arguments and
        // the new cancellation token at the end of the arguments list
        return originalMethod.call(this, ...args);
    };
    return descriptor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsUHJldmlvdXNDYWxscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9kZWNvcmF0b3JzL2NhbmNlbFByZXZpb3VzQ2FsbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM1QyxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFhaEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUVHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUtsQyxNQUFlLEVBQ2YsVUFBa0IsRUFDbEIsVUFBZ0c7SUFFaEcsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztJQUV4QyxhQUFhLENBQ1osY0FBYyxFQUNkLFdBQVcsVUFBVSxtQkFBbUIsQ0FDeEMsQ0FBQztJQUVGLHVGQUF1RjtJQUN2Rix3RkFBd0Y7SUFDeEYscUZBQXFGO0lBQ3JGLDBGQUEwRjtJQUMxRixNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBMkQsQ0FBQztJQUU3RixtRkFBbUY7SUFDbkYsa0ZBQWtGO0lBQ2xGLFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFFbEIsR0FBRyxJQUF1QztRQUUxQyx5REFBeUQ7UUFDekQscURBQXFEO1FBQ3JELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7WUFDN0IsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDZCxPQUFPLEVBQUUsR0FBRyxFQUFFO29CQUNiLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7b0JBQ25DLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLENBQUM7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsOEVBQThFO1FBQzlFLDRFQUE0RTtRQUM1RSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QyxxRUFBcUU7UUFDckUseURBQXlEO1FBQ3pELHlFQUF5RTtRQUN6RSxvRUFBb0U7UUFDcEUsMkVBQTJFO1FBQzNFLDBFQUEwRTtRQUMxRSxnRUFBZ0U7UUFDaEUsYUFBYTtRQUViLG9FQUFvRTtRQUNwRSw4REFBOEQ7UUFDOUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDYixNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7WUFDaEUsQ0FBQyxDQUFDLFlBQVk7WUFDZCxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFM0MseUVBQXlFO1FBQ3pFLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFDbEQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsOERBQThEO1FBQzlELE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUM7SUFFRixPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDIn0=