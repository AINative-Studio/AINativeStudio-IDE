/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Pricing tiers for AI models
 */
export var PricingTier;
(function (PricingTier) {
    PricingTier["Free"] = "free";
    PricingTier["PayAsYouGo"] = "pay_as_you_go";
    PricingTier["Subscription"] = "subscription";
    PricingTier["Enterprise"] = "enterprise";
})(PricingTier || (PricingTier = {}));
/**
 * Model capability types
 */
export var ModelCapability;
(function (ModelCapability) {
    ModelCapability["TextGeneration"] = "text_generation";
    ModelCapability["CodeGeneration"] = "code_generation";
    ModelCapability["CodeCompletion"] = "code_completion";
    ModelCapability["Chat"] = "chat";
    ModelCapability["FunctionCalling"] = "function_calling";
    ModelCapability["Vision"] = "vision";
    ModelCapability["Embedding"] = "embedding";
    ModelCapability["Streaming"] = "streaming";
    ModelCapability["ToolUse"] = "tool_use";
})(ModelCapability || (ModelCapability = {}));
/**
 * Model parameter types
 */
export var ModelParameterType;
(function (ModelParameterType) {
    ModelParameterType["Number"] = "number";
    ModelParameterType["String"] = "string";
    ModelParameterType["Boolean"] = "boolean";
    ModelParameterType["Array"] = "array";
    ModelParameterType["Object"] = "object";
})(ModelParameterType || (ModelParameterType = {}));
/**
 * Model invocation status
 */
export var InvocationStatus;
(function (InvocationStatus) {
    InvocationStatus["Pending"] = "pending";
    InvocationStatus["Running"] = "running";
    InvocationStatus["Completed"] = "completed";
    InvocationStatus["Failed"] = "failed";
    InvocationStatus["Cancelled"] = "cancelled";
})(InvocationStatus || (InvocationStatus = {}));
/**
 * Error codes for model registry operations
 */
export var ModelRegistryErrorCode;
(function (ModelRegistryErrorCode) {
    ModelRegistryErrorCode["ModelNotFound"] = "MODEL_NOT_FOUND";
    ModelRegistryErrorCode["QuotaExceeded"] = "QUOTA_EXCEEDED";
    ModelRegistryErrorCode["RateLimitExceeded"] = "RATE_LIMIT_EXCEEDED";
    ModelRegistryErrorCode["InvalidParameters"] = "INVALID_PARAMETERS";
    ModelRegistryErrorCode["AuthenticationRequired"] = "AUTHENTICATION_REQUIRED";
    ModelRegistryErrorCode["NetworkError"] = "NETWORK_ERROR";
    ModelRegistryErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(ModelRegistryErrorCode || (ModelRegistryErrorCode = {}));
/**
 * Model registry error
 */
export class ModelRegistryError extends Error {
    constructor(code, message, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'ModelRegistryError';
    }
}
/**
 * Service interface for AI Model Registry
 *
 * Declared here (rather than in aiModelRegistryService.ts, where the
 * implementation lives) to avoid a circular module dependency: this service
 * and usageTrackingService.ts each inject the other via constructor DI, and
 * decorator metadata evaluates at module load time, not lazily - so if both
 * decorators lived in their respective implementation files, whichever
 * module's exports load second would hit the other's in its temporal dead
 * zone. Importing a decorator from a dependency-free types file breaks the
 * cycle at the module level while the service-level circular dependency
 * (legitimate under VS Code's DI, which instantiates lazily) is unaffected.
 */
export const IAIModelRegistryService = createDecorator('aiModelRegistryService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbFJlZ2lzdHJ5VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haU1vZGVsUmVnaXN0cnlUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0Y7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxXQUtYO0FBTEQsV0FBWSxXQUFXO0lBQ3RCLDRCQUFhLENBQUE7SUFDYiwyQ0FBNEIsQ0FBQTtJQUM1Qiw0Q0FBNkIsQ0FBQTtJQUM3Qix3Q0FBeUIsQ0FBQTtBQUMxQixDQUFDLEVBTFcsV0FBVyxLQUFYLFdBQVcsUUFLdEI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGVBVVg7QUFWRCxXQUFZLGVBQWU7SUFDMUIscURBQWtDLENBQUE7SUFDbEMscURBQWtDLENBQUE7SUFDbEMscURBQWtDLENBQUE7SUFDbEMsZ0NBQWEsQ0FBQTtJQUNiLHVEQUFvQyxDQUFBO0lBQ3BDLG9DQUFpQixDQUFBO0lBQ2pCLDBDQUF1QixDQUFBO0lBQ3ZCLDBDQUF1QixDQUFBO0lBQ3ZCLHVDQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFWVyxlQUFlLEtBQWYsZUFBZSxRQVUxQjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksa0JBTVg7QUFORCxXQUFZLGtCQUFrQjtJQUM3Qix1Q0FBaUIsQ0FBQTtJQUNqQix1Q0FBaUIsQ0FBQTtJQUNqQix5Q0FBbUIsQ0FBQTtJQUNuQixxQ0FBZSxDQUFBO0lBQ2YsdUNBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQU5XLGtCQUFrQixLQUFsQixrQkFBa0IsUUFNN0I7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGdCQU1YO0FBTkQsV0FBWSxnQkFBZ0I7SUFDM0IsdUNBQW1CLENBQUE7SUFDbkIsdUNBQW1CLENBQUE7SUFDbkIsMkNBQXVCLENBQUE7SUFDdkIscUNBQWlCLENBQUE7SUFDakIsMkNBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQU5XLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFNM0I7QUFnY0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxzQkFRWDtBQVJELFdBQVksc0JBQXNCO0lBQ2pDLDJEQUFpQyxDQUFBO0lBQ2pDLDBEQUFnQyxDQUFBO0lBQ2hDLG1FQUF5QyxDQUFBO0lBQ3pDLGtFQUF3QyxDQUFBO0lBQ3hDLDRFQUFrRCxDQUFBO0lBQ2xELHdEQUE4QixDQUFBO0lBQzlCLHdEQUE4QixDQUFBO0FBQy9CLENBQUMsRUFSVyxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBUWpDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUM1QyxZQUNpQixJQUE0QixFQUM1QyxPQUFlLEVBQ0MsYUFBcUI7UUFFckMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBSkMsU0FBSSxHQUFKLElBQUksQ0FBd0I7UUFFNUIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFHckMsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztJQUNsQyxDQUFDO0NBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLHdCQUF3QixDQUFDLENBQUMifQ==