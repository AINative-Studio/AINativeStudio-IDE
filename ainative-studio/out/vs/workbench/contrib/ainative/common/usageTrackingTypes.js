/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Usage tracking error codes
 */
export var UsageTrackingErrorCode;
(function (UsageTrackingErrorCode) {
    /**
     * Model not found in registry
     */
    UsageTrackingErrorCode["ModelNotFound"] = "MODEL_NOT_FOUND";
    /**
     * Cost calculation failed
     */
    UsageTrackingErrorCode["CostCalculationFailed"] = "COST_CALCULATION_FAILED";
    /**
     * Cloud sync failed
     */
    UsageTrackingErrorCode["SyncFailed"] = "SYNC_FAILED";
    /**
     * Storage operation failed
     */
    UsageTrackingErrorCode["StorageFailed"] = "STORAGE_FAILED";
    /**
     * Unknown error
     */
    UsageTrackingErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(UsageTrackingErrorCode || (UsageTrackingErrorCode = {}));
/**
 * Usage tracking error
 */
export class UsageTrackingError extends Error {
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'UsageTrackingError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNhZ2VUcmFja2luZ1R5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vdXNhZ2VUcmFja2luZ1R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa1BoRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHNCQXlCWDtBQXpCRCxXQUFZLHNCQUFzQjtJQUNqQzs7T0FFRztJQUNILDJEQUFpQyxDQUFBO0lBRWpDOztPQUVHO0lBQ0gsMkVBQWlELENBQUE7SUFFakQ7O09BRUc7SUFDSCxvREFBMEIsQ0FBQTtJQUUxQjs7T0FFRztJQUNILDBEQUFnQyxDQUFBO0lBRWhDOztPQUVHO0lBQ0gsd0RBQThCLENBQUE7QUFDL0IsQ0FBQyxFQXpCVyxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBeUJqQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLEtBQUs7SUFDNUMsWUFDaUIsSUFBNEIsRUFDNUMsT0FBZSxFQUNDLGFBQXFCO1FBRXJDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUpDLFNBQUksR0FBSixJQUFJLENBQXdCO1FBRTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBR3JDLElBQUksQ0FBQyxJQUFJLEdBQUcsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztDQUNEIn0=