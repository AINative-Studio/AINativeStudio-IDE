/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as performance from './vs/base/common/performance.js';
import { removeGlobalNodeJsModuleLookupPaths, devInjectNodeModuleLookupPath } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
performance.mark('code/fork/start');
//#region Helpers
function pipeLoggingToParent() {
    const MAX_STREAM_BUFFER_LENGTH = 1024 * 1024;
    const MAX_LENGTH = 100000;
    /**
     * Prevent circular stringify and convert arguments to real array
     */
    function safeToString(args) {
        const seen = [];
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
        try {
            const res = JSON.stringify(argsArray, function (key, value) {
                // Objects get special treatment to prevent circles
                if (isObject(value) || Array.isArray(value)) {
                    if (seen.indexOf(value) !== -1) {
                        return '[Circular]';
                    }
                    seen.push(value);
                }
                return value;
            });
            if (res.length > MAX_LENGTH) {
                return 'Output omitted for a large object that exceeds the limits';
            }
            return res;
        }
        catch (error) {
            return `Output omitted for an object that cannot be inspected ('${error.toString()}')`;
        }
    }
    function safeSend(arg) {
        try {
            if (process.send) {
                process.send(arg);
            }
        }
        catch (error) {
            // Can happen if the parent channel is closed meanwhile
        }
    }
    function isObject(obj) {
        return typeof obj === 'object'
            && obj !== null
            && !Array.isArray(obj)
            && !(obj instanceof RegExp)
            && !(obj instanceof Date);
    }
    function safeSendConsoleMessage(severity, args) {
        safeSend({ type: '__$console', severity, arguments: args });
    }
    /**
     * Wraps a console message so that it is transmitted to the renderer.
     *
     * The wrapped property is not defined with `writable: false` to avoid
     * throwing errors, but rather a no-op setting. See https://github.com/microsoft/vscode-extension-telemetry/issues/88
     */
    function wrapConsoleMethod(method, severity) {
        Object.defineProperty(console, method, {
            set: () => { },
            get: () => function () { safeSendConsoleMessage(severity, safeToString(arguments)); },
        });
    }
    /**
     * Wraps process.stderr/stdout.write() so that it is transmitted to the
     * renderer or CLI. It both calls through to the original method as well
     * as to console.log with complete lines so that they're made available
     * to the debugger/CLI.
     */
    function wrapStream(streamName, severity) {
        const stream = process[streamName];
        const original = stream.write;
        let buf = '';
        Object.defineProperty(stream, 'write', {
            set: () => { },
            get: () => (chunk, encoding, callback) => {
                buf += chunk.toString(encoding);
                const eol = buf.length > MAX_STREAM_BUFFER_LENGTH ? buf.length : buf.lastIndexOf('\n');
                if (eol !== -1) {
                    console[severity](buf.slice(0, eol));
                    buf = buf.slice(eol + 1);
                }
                original.call(stream, chunk, encoding, callback);
            },
        });
    }
    // Pass console logging to the outside so that we have it in the main side if told so
    if (process.env['VSCODE_VERBOSE_LOGGING'] === 'true') {
        wrapConsoleMethod('info', 'log');
        wrapConsoleMethod('log', 'log');
        wrapConsoleMethod('warn', 'warn');
        wrapConsoleMethod('error', 'error');
    }
    else {
        console.log = function () { };
        console.warn = function () { };
        console.info = function () { };
        wrapConsoleMethod('error', 'error');
    }
    wrapStream('stderr', 'error');
    wrapStream('stdout', 'log');
}
function handleExceptions() {
    // Handle uncaught exceptions
    process.on('uncaughtException', function (err) {
        console.error('Uncaught Exception: ', err);
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', function (reason) {
        console.error('Unhandled Promise Rejection: ', reason);
    });
}
function terminateWhenParentTerminates() {
    const parentPid = Number(process.env['VSCODE_PARENT_PID']);
    if (typeof parentPid === 'number' && !isNaN(parentPid)) {
        setInterval(function () {
            try {
                process.kill(parentPid, 0); // throws an exception if the main process doesn't exist anymore.
            }
            catch (e) {
                process.exit();
            }
        }, 5000);
    }
}
function configureCrashReporter() {
    const crashReporterProcessType = process.env['VSCODE_CRASH_REPORTER_PROCESS_TYPE'];
    if (crashReporterProcessType) {
        try {
            //@ts-ignore
            if (process['crashReporter'] && typeof process['crashReporter'].addExtraParameter === 'function' /* Electron only */) {
                //@ts-ignore
                process['crashReporter'].addExtraParameter('processType', crashReporterProcessType);
            }
        }
        catch (error) {
            console.error(error);
        }
    }
}
//#endregion
// Crash reporter
configureCrashReporter();
// Remove global paths from the node module lookup (node.js only)
removeGlobalNodeJsModuleLookupPaths();
if (process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']) {
    devInjectNodeModuleLookupPath(process.env['VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH']);
}
// Configure: pipe logging to parent process
if (!!process.send && process.env['VSCODE_PIPE_LOGGING'] === 'true') {
    pipeLoggingToParent();
}
// Handle Exceptions
if (!process.env['VSCODE_HANDLES_UNCAUGHT_ERRORS']) {
    handleExceptions();
}
// Terminate when parent terminates
if (process.env['VSCODE_PARENT_PID']) {
    terminateWhenParentTerminates();
}
// Bootstrap ESM
await bootstrapESM();
// Load ESM entry point
await import([`./${process.env['VSCODE_ESM_ENTRYPOINT']}.js`].join('/') /* workaround: esbuild prints some strange warnings when trying to inline? */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWZvcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsiYm9vdHN0cmFwLWZvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFdBQVcsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFbEQsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRXBDLGlCQUFpQjtBQUVqQixTQUFTLG1CQUFtQjtJQUMzQixNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7SUFDN0MsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDO0lBRTFCOztPQUVHO0lBQ0gsU0FBUyxZQUFZLENBQUMsSUFBd0I7UUFDN0MsTUFBTSxJQUFJLEdBQWMsRUFBRSxDQUFDO1FBQzNCLE1BQU0sU0FBUyxHQUFjLEVBQUUsQ0FBQztRQUVoQyxnREFBZ0Q7UUFDaEQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVsQix5RUFBeUU7Z0JBQ3pFLDJFQUEyRTtnQkFDM0UsK0VBQStFO2dCQUMvRSxJQUFJLE9BQU8sR0FBRyxLQUFLLFdBQVcsRUFBRSxDQUFDO29CQUNoQyxHQUFHLEdBQUcsV0FBVyxDQUFDO2dCQUNuQixDQUFDO2dCQUVELG1GQUFtRjtnQkFDbkYscUVBQXFFO3FCQUNoRSxJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO29CQUNyQixJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDcEIsR0FBRyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQ3RCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxHQUFHLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUMzQixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFVBQVUsR0FBRyxFQUFFLEtBQWM7Z0JBRWxFLG1EQUFtRDtnQkFDbkQsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM3QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEMsT0FBTyxZQUFZLENBQUM7b0JBQ3JCLENBQUM7b0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEIsQ0FBQztnQkFFRCxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUM3QixPQUFPLDJEQUEyRCxDQUFDO1lBQ3BFLENBQUM7WUFFRCxPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sMkRBQTJELEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO1FBQ3hGLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxRQUFRLENBQUMsR0FBMEQ7UUFDM0UsSUFBSSxDQUFDO1lBQ0osSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLHVEQUF1RDtRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsUUFBUSxDQUFDLEdBQVk7UUFDN0IsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRO2VBQzFCLEdBQUcsS0FBSyxJQUFJO2VBQ1osQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztlQUNuQixDQUFDLENBQUMsR0FBRyxZQUFZLE1BQU0sQ0FBQztlQUN4QixDQUFDLENBQUMsR0FBRyxZQUFZLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFDLFFBQWtDLEVBQUUsSUFBWTtRQUMvRSxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLGlCQUFpQixDQUFDLE1BQXlDLEVBQUUsUUFBa0M7UUFDdkcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFO1lBQ3RDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ2QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLGNBQWMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLFVBQVUsQ0FBQyxVQUErQixFQUFFLFFBQWtDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBRTlCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUViLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRTtZQUN0QyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztZQUNkLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEtBQW1DLEVBQUUsUUFBb0MsRUFBRSxRQUF5RCxFQUFFLEVBQUU7Z0JBQ25KLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNoQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2RixJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNoQixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDckMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixDQUFDO2dCQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEQsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxxRkFBcUY7SUFDckYsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDdEQsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxDQUFDLEdBQUcsR0FBRyxjQUEyQixDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLElBQUksR0FBRyxjQUEyQixDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLElBQUksR0FBRyxjQUEyQixDQUFDLENBQUM7UUFDNUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxVQUFVLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0IsQ0FBQztBQUVELFNBQVMsZ0JBQWdCO0lBRXhCLDZCQUE2QjtJQUM3QixPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLFVBQVUsR0FBRztRQUM1QyxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBRUgsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxNQUFNO1FBQ2hELE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyw2QkFBNkI7SUFDckMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBRTNELElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDeEQsV0FBVyxDQUFDO1lBQ1gsSUFBSSxDQUFDO2dCQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsaUVBQWlFO1lBQzlGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixDQUFDO1FBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLHNCQUFzQjtJQUM5QixNQUFNLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztJQUNuRixJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDO1lBQ0osWUFBWTtZQUNaLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLE9BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLGlCQUFpQixLQUFLLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUN0SCxZQUFZO2dCQUNaLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUNyRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxZQUFZO0FBRVosaUJBQWlCO0FBQ2pCLHNCQUFzQixFQUFFLENBQUM7QUFFekIsaUVBQWlFO0FBQ2pFLG1DQUFtQyxFQUFFLENBQUM7QUFFdEMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLEVBQUUsQ0FBQztJQUM5RCw2QkFBNkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsQ0FBQztBQUN6RixDQUFDO0FBRUQsNENBQTRDO0FBQzVDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLG1CQUFtQixFQUFFLENBQUM7QUFDdkIsQ0FBQztBQUVELG9CQUFvQjtBQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLENBQUM7SUFDcEQsZ0JBQWdCLEVBQUUsQ0FBQztBQUNwQixDQUFDO0FBRUQsbUNBQW1DO0FBQ25DLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDdEMsNkJBQTZCLEVBQUUsQ0FBQztBQUNqQyxDQUFDO0FBRUQsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxFQUFFLENBQUM7QUFFckIsdUJBQXVCO0FBQ3ZCLE1BQU0sTUFBTSxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyw2RUFBNkUsQ0FBQyxDQUFDIn0=