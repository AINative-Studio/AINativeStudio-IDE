/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Avoid circular dependency on EventEmitter by implementing a subset of the interface.
export class ErrorHandler {
    constructor() {
        this.listeners = [];
        this.unexpectedErrorHandler = function (e) {
            setTimeout(() => {
                if (e.stack) {
                    if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
                        throw new ErrorNoTelemetry(e.message + '\n\n' + e.stack);
                    }
                    throw new Error(e.message + '\n\n' + e.stack);
                }
                throw e;
            }, 0);
        };
    }
    addListener(listener) {
        this.listeners.push(listener);
        return () => {
            this._removeListener(listener);
        };
    }
    emit(e) {
        this.listeners.forEach((listener) => {
            listener(e);
        });
    }
    _removeListener(listener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }
    setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
        this.unexpectedErrorHandler = newUnexpectedErrorHandler;
    }
    getUnexpectedErrorHandler() {
        return this.unexpectedErrorHandler;
    }
    onUnexpectedError(e) {
        this.unexpectedErrorHandler(e);
        this.emit(e);
    }
    // For external errors, we don't want the listeners to be called
    onUnexpectedExternalError(e) {
        this.unexpectedErrorHandler(e);
    }
}
export const errorHandler = new ErrorHandler();
/** @skipMangle */
export function setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}
/**
 * Returns if the error is a SIGPIPE error. SIGPIPE errors should generally be
 * logged at most once, to avoid a loop.
 *
 * @see https://github.com/microsoft/vscode-remote-release/issues/6481
 */
export function isSigPipeError(e) {
    if (!e || typeof e !== 'object') {
        return false;
    }
    const cast = e;
    return cast.code === 'EPIPE' && cast.syscall?.toUpperCase() === 'WRITE';
}
/**
 * This function should only be called with errors that indicate a bug in the product.
 * E.g. buggy extensions/invalid user-input/network issues should not be able to trigger this code path.
 * If they are, this indicates there is also a bug in the product.
*/
export function onBugIndicatingError(e) {
    errorHandler.onUnexpectedError(e);
    return undefined;
}
export function onUnexpectedError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedError(e);
    }
    return undefined;
}
export function onUnexpectedExternalError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedExternalError(e);
    }
    return undefined;
}
export function transformErrorForSerialization(error) {
    if (error instanceof Error) {
        const { name, message, cause } = error;
        const stack = error.stacktrace || error.stack;
        return {
            $isError: true,
            name,
            message,
            stack,
            noTelemetry: ErrorNoTelemetry.isErrorNoTelemetry(error),
            cause: cause ? transformErrorForSerialization(cause) : undefined,
            code: error.code
        };
    }
    // return as is
    return error;
}
export function transformErrorFromSerialization(data) {
    let error;
    if (data.noTelemetry) {
        error = new ErrorNoTelemetry();
    }
    else {
        error = new Error();
        error.name = data.name;
    }
    error.message = data.message;
    error.stack = data.stack;
    if (data.code) {
        error.code = data.code;
    }
    if (data.cause) {
        error.cause = transformErrorFromSerialization(data.cause);
    }
    return error;
}
const canceledName = 'Canceled';
/**
 * Checks if the given error is a promise in canceled state
 */
export function isCancellationError(error) {
    if (error instanceof CancellationError) {
        return true;
    }
    return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
// !!!IMPORTANT!!!
// Do NOT change this class because it is also used as an API-type.
export class CancellationError extends Error {
    constructor() {
        super(canceledName);
        this.name = this.message;
    }
}
/**
 * @deprecated use {@link CancellationError `new CancellationError()`} instead
 */
export function canceled() {
    const error = new Error(canceledName);
    error.name = error.message;
    return error;
}
export function illegalArgument(name) {
    if (name) {
        return new Error(`Illegal argument: ${name}`);
    }
    else {
        return new Error('Illegal argument');
    }
}
export function illegalState(name) {
    if (name) {
        return new Error(`Illegal state: ${name}`);
    }
    else {
        return new Error('Illegal state');
    }
}
export class ReadonlyError extends TypeError {
    constructor(name) {
        super(name ? `${name} is read-only and cannot be changed` : 'Cannot change read-only property');
    }
}
export function getErrorMessage(err) {
    if (!err) {
        return 'Error';
    }
    if (err.message) {
        return err.message;
    }
    if (err.stack) {
        return err.stack.split('\n')[0];
    }
    return String(err);
}
export class NotImplementedError extends Error {
    constructor(message) {
        super('NotImplemented');
        if (message) {
            this.message = message;
        }
    }
}
export class NotSupportedError extends Error {
    constructor(message) {
        super('NotSupported');
        if (message) {
            this.message = message;
        }
    }
}
export class ExpectedError extends Error {
    constructor() {
        super(...arguments);
        this.isExpected = true;
    }
}
/**
 * Error that when thrown won't be logged in telemetry as an unhandled error.
 */
export class ErrorNoTelemetry extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'CodeExpectedError';
    }
    static fromError(err) {
        if (err instanceof ErrorNoTelemetry) {
            return err;
        }
        const result = new ErrorNoTelemetry();
        result.message = err.message;
        result.stack = err.stack;
        return result;
    }
    static isErrorNoTelemetry(err) {
        return err.name === 'CodeExpectedError';
    }
}
/**
 * This error indicates a bug.
 * Do not throw this for invalid user input.
 * Only catch this error to recover gracefully from bugs.
 */
export class BugIndicatingError extends Error {
    constructor(message) {
        super(message || 'An unexpected bug occurred.');
        Object.setPrototypeOf(this, BugIndicatingError.prototype);
        // Because we know for sure only buggy code throws this,
        // we definitely want to break here and fix the bug.
        // debugger;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Vycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyx1RkFBdUY7QUFDdkYsTUFBTSxPQUFPLFlBQVk7SUFJeEI7UUFFQyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVwQixJQUFJLENBQUMsc0JBQXNCLEdBQUcsVUFBVSxDQUFNO1lBQzdDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUM1QyxNQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMxRCxDQUFDO29CQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO2dCQUVELE1BQU0sQ0FBQyxDQUFDO1lBQ1QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUErQjtRQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QixPQUFPLEdBQUcsRUFBRTtZQUNYLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLElBQUksQ0FBQyxDQUFNO1FBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENB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