/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
/**
 * Disposable object that tracks its {@linkcode disposed} state
 * as a public attribute and provides the {@linkcode onDispose}
 * event to subscribe to.
 */
export class ObservableDisposable extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * Private emitter for the `onDispose` event.
         */
        this._onDispose = this._register(new Emitter());
        /**
         * Tracks disposed state of this object.
         */
        this._disposed = false;
    }
    /**
     * The event is fired when this object is disposed.
     * Note! Executes the callback immediately if already disposed.
     *
     * @param callback The callback function to be called on updates.
     */
    onDispose(callback) {
        // if already disposed, execute the callback immediately
        if (this.disposed) {
            callback();
            return this;
        }
        // otherwise subscribe to the event
        this._register(this._onDispose.event(callback));
        return this;
    }
    /**
     * Check if the current object was already disposed.
     */
    get disposed() {
        return this._disposed;
    }
    /**
     * Dispose current object if not already disposed.
     * @returns
     */
    dispose() {
        if (this.disposed) {
            return;
        }
        this._disposed = true;
        this._onDispose.fire();
        super.dispose();
    }
    /**
     * Assert that the current object was not yet disposed.
     *
     * @throws If the current object was already disposed.
     * @param error Error message or error object to throw if assertion fails.
     */
    assertNotDisposed(error) {
        assertNotDisposed(this, error);
    }
}
/**
 * Asserts that a provided `object` is not `disposed` yet,
 * e.g., its `disposed` property is `false`.
 *
 * @throws if the provided `object.disposed` equal to `false`.
 * @param error Error message or error object to throw if assertion fails.
 */
export function assertNotDisposed(object, error) {
    if (!object.disposed) {
        return;
    }
    const errorToThrow = typeof error === 'string'
        ? new Error(error)
        : error;
    throw errorToThrow;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlRGlzcG9zYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU1Qzs7OztHQUlHO0FBQ0gsTUFBTSxPQUFnQixvQkFBcUIsU0FBUSxVQUFVO0lBQTdEOztRQUNDOztXQUVHO1FBQ2MsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBcUJsRTs7V0FFRztRQUNLLGNBQVMsR0FBRyxLQUFLLENBQUM7SUFrQzNCLENBQUM7SUF4REE7Ozs7O09BS0c7SUFDSSxTQUFTLENBQUMsUUFBb0I7UUFDcEMsd0RBQXdEO1FBQ3hELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLFFBQVEsRUFBRSxDQUFDO1lBRVgsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFPRDs7T0FFRztJQUNILElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNhLE9BQU87UUFDdEIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxpQkFBaUIsQ0FDdkIsS0FBcUI7UUFFckIsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLENBQUM7Q0FDRDtBQU9EOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsTUFBZSxFQUNmLEtBQXFCO0lBRXJCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEIsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQzdDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDbEIsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUVULE1BQU0sWUFBWSxDQUFDO0FBQ3BCLENBQUMifQ==