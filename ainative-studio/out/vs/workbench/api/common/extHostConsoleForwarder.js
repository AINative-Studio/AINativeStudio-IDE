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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { safeStringify } from '../../../base/common/objects.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
let AbstractExtHostConsoleForwarder = class AbstractExtHostConsoleForwarder {
    constructor(extHostRpc, initData) {
        this._mainThreadConsole = extHostRpc.getProxy(MainContext.MainThreadConsole);
        this._includeStack = initData.consoleForward.includeStack;
        this._logNative = initData.consoleForward.logNative;
        // Pass console logging to the outside so that we have it in the main side if told so
        this._wrapConsoleMethod('info', 'log');
        this._wrapConsoleMethod('log', 'log');
        this._wrapConsoleMethod('warn', 'warn');
        this._wrapConsoleMethod('debug', 'debug');
        this._wrapConsoleMethod('error', 'error');
    }
    /**
     * Wraps a console message so that it is transmitted to the renderer. If
     * native logging is turned on, the original console message will be written
     * as well. This is needed since the console methods are "magic" in V8 and
     * are the only methods that allow later introspection of logged variables.
     *
     * The wrapped property is not defined with `writable: false` to avoid
     * throwing errors, but rather a no-op setting. See https://github.com/microsoft/vscode-extension-telemetry/issues/88
     */
    _wrapConsoleMethod(method, severity) {
        const that = this;
        const original = console[method];
        Object.defineProperty(console, method, {
            set: () => { },
            get: () => function () {
                that._handleConsoleCall(method, severity, original, arguments);
            },
        });
    }
    _handleConsoleCall(method, severity, original, args) {
        this._mainThreadConsole.$logExtensionHostMessage({
            type: '__$console',
            severity,
            arguments: safeStringifyArgumentsToArray(args, this._includeStack)
        });
        if (this._logNative) {
            this._nativeConsoleLogMessage(method, original, args);
        }
    }
};
AbstractExtHostConsoleForwarder = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], AbstractExtHostConsoleForwarder);
export { AbstractExtHostConsoleForwarder };
const MAX_LENGTH = 100000;
/**
 * Prevent circular stringify and convert arguments to real array
 */
function safeStringifyArgumentsToArray(args, includeStack) {
    const argsArray = [];
    // Massage some arguments with special treatment
    if (args.length) {
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            // Any argument of type 'undefined' needs to be specially treated because
            // JSON.stringify will simply ignore those. We replace them with the string
            // 'undefined' which is not 100% right, but good enough to be logged to console
            if (typeof arg === 'undefined') {
                arg = 'undefined';
            }
            // Any argument that is an Error will be changed to be just the error stack/message
            // itself because currently cannot serialize the error over entirely.
            else if (arg instanceof Error) {
                const errorObj = arg;
                if (errorObj.stack) {
                    arg = errorObj.stack;
                }
                else {
                    arg = errorObj.toString();
                }
            }
            argsArray.push(arg);
        }
    }
    // Add the stack trace as payload if we are told so. We remove the message and the 2 top frames
    // to start the stacktrace where the console message was being written
    if (includeStack) {
        const stack = new Error().stack;
        if (stack) {
            argsArray.push({ __$stack: stack.split('\n').slice(3).join('\n') });
        }
    }
    try {
        const res = safeStringify(argsArray);
        if (res.length > MAX_LENGTH) {
            return 'Output omitted for a large object that exceeds the limits';
        }
        return res;
    }
    catch (error) {
        return `Output omitted for an object that cannot be inspected ('${error.toString()}')`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQTBCLE1BQU0sdUJBQXVCLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFckQsSUFBZSwrQkFBK0IsR0FBOUMsTUFBZSwrQkFBK0I7SUFNcEQsWUFDcUIsVUFBOEIsRUFDekIsUUFBaUM7UUFFMUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQztRQUMxRCxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBRXBELHFGQUFxRjtRQUNyRixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFD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