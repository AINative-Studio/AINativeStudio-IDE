/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from './arrays.js';
import * as types from './types.js';
import * as nls from '../../nls.js';
function exceptionToErrorMessage(exception, verbose) {
    if (verbose && (exception.stack || exception.stacktrace)) {
        return nls.localize('stackTrace.format', "{0}: {1}", detectSystemErrorMessage(exception), stackToString(exception.stack) || stackToString(exception.stacktrace));
    }
    return detectSystemErrorMessage(exception);
}
function stackToString(stack) {
    if (Array.isArray(stack)) {
        return stack.join('\n');
    }
    return stack;
}
function detectSystemErrorMessage(exception) {
    // Custom node.js error from us
    if (exception.code === 'ERR_UNC_HOST_NOT_ALLOWED') {
        return `${exception.message}. Please update the 'security.allowedUNCHosts' setting if you want to allow this host.`;
    }
    // See https://nodejs.org/api/errors.html#errors_class_system_error
    if (typeof exception.code === 'string' && typeof exception.errno === 'number' && typeof exception.syscall === 'string') {
        return nls.localize('nodeExceptionMessage', "A system error occurred ({0})", exception.message);
    }
    return exception.message || nls.localize('error.defaultMessage', "An unknown error occurred. Please consult the log for more details.");
}
/**
 * Tries to generate a human readable error message out of the error. If the verbose parameter
 * is set to true, the error message will include stacktrace details if provided.
 *
 * @returns A string containing the error message.
 */
export function toErrorMessage(error = null, verbose = false) {
    if (!error) {
        return nls.localize('error.defaultMessage', "An unknown error occurred. Please consult the log for more details.");
    }
    if (Array.isArray(error)) {
        const errors = arrays.coalesce(error);
        const msg = toErrorMessage(errors[0], verbose);
        if (errors.length > 1) {
            return nls.localize('error.moreErrors', "{0} ({1} errors in total)", msg, errors.length);
        }
        return msg;
    }
    if (types.isString(error)) {
        return error;
    }
    if (error.detail) {
        const detail = error.detail;
        if (detail.error) {
            return exceptionToErrorMessage(detail.error, verbose);
        }
        if (detail.exception) {
            return exceptionToErrorMessage(detail.exception, verbose);
        }
    }
    if (error.stack) {
        return exceptionToErrorMessage(error, verbose);
    }
    if (error.message) {
        return error.message;
    }
    return nls.localize('error.defaultMessage', "An unknown error occurred. Please consult the log for more details.");
}
export function isErrorWithActions(obj) {
    const candidate = obj;
    return candidate instanceof Error && Array.isArray(candidate.actions);
}
export function createErrorWithActions(messageOrError, actions) {
    let error;
    if (typeof messageOrError === 'string') {
        error = new Error(messageOrError);
    }
    else {
        error = messageOrError;
    }
    error.actions = actions;
    return error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JNZXNzYWdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Vycm9yTWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGFBQWEsQ0FBQztBQUN0QyxPQUFPLEtBQUssS0FBSyxNQUFNLFlBQVksQ0FBQztBQUNwQyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUdwQyxTQUFTLHVCQUF1QixDQUFDLFNBQWMsRUFBRSxPQUFnQjtJQUNoRSxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDMUQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBRSx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxhQUFhLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNsSyxDQUFDO0lBRUQsT0FBTyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsS0FBb0M7SUFDMUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLFNBQWM7SUFFL0MsK0JBQStCO0lBQy9CLElBQUksU0FBUyxDQUFDLElBQUksS0FBSywwQkFBMEIsRUFBRSxDQUFDO1FBQ25ELE9BQU8s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