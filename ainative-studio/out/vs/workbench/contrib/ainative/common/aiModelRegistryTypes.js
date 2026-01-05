/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * AI Model Registry Types
 * Defines interfaces for AI model management, selection, and invocation
 */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbFJlZ2lzdHJ5VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9haU1vZGVsUmVnaXN0cnlUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O0dBR0c7QUFFSDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFdBS1g7QUFMRCxXQUFZLFdBQVc7SUFDdEIsNEJBQWEsQ0FBQTtJQUNiLDJDQUE0QixDQUFBO0lBQzVCLDRDQUE2QixDQUFBO0lBQzdCLHdDQUF5QixDQUFBO0FBQzFCLENBQUMsRUFMVyxXQUFXLEtBQVgsV0FBVyxRQUt0QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksZUFVWDtBQVZELFdBQVksZUFBZTtJQUMxQixxREFBa0MsQ0FBQTtJQUNsQyxxREFBa0MsQ0FBQTtJQUNsQyxxREFBa0MsQ0FBQTtJQUNsQyxnQ0FBYSxDQUFBO0lBQ2IsdURBQW9DLENBQUE7SUFDcEMsb0NBQWlCLENBQUE7SUFDakIsMENBQXVCLENBQUE7SUFDdkIsMENBQXVCLENBQUE7SUFDdkIsdUNBQW9CLENBQUE7QUFDckIsQ0FBQyxFQVZXLGVBQWUsS0FBZixlQUFlLFFBVTFCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxrQkFNWDtBQU5ELFdBQVksa0JBQWtCO0lBQzdCLHVDQUFpQixDQUFBO0lBQ2pCLHVDQUFpQixDQUFBO0lBQ2pCLHlDQUFtQixDQUFBO0lBQ25CLHFDQUFlLENBQUE7SUFDZix1Q0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBTlcsa0JBQWtCLEtBQWxCLGtCQUFrQixRQU03QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksZ0JBTVg7QUFORCxXQUFZLGdCQUFnQjtJQUMzQix1Q0FBbUIsQ0FBQTtJQUNuQix1Q0FBbUIsQ0FBQTtJQUNuQiwyQ0FBdUIsQ0FBQTtJQUN2QixxQ0FBaUIsQ0FBQTtJQUNqQiwyQ0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBTlcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQU0zQjtBQWdjRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHNCQVFYO0FBUkQsV0FBWSxzQkFBc0I7SUFDakMsMkRBQWlDLENBQUE7SUFDakMsMERBQWdDLENBQUE7SUFDaEMsbUVBQXlDLENBQUE7SUFDekMsa0VBQXdDLENBQUE7SUFDeEMsNEVBQWtELENBQUE7SUFDbEQsd0RBQThCLENBQUE7SUFDOUIsd0RBQThCLENBQUE7QUFDL0IsQ0FBQyxFQVJXLHNCQUFzQixLQUF0QixzQkFBc0IsUUFRakM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxLQUFLO0lBQzVDLFlBQ2lCLElBQTRCLEVBQzVDLE9BQWUsRUFDQyxhQUFxQjtRQUVyQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFKQyxTQUFJLEdBQUosSUFBSSxDQUF3QjtRQUU1QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUdyQyxJQUFJLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDO0lBQ2xDLENBQUM7Q0FDRCJ9