/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
export default class ErrorTelemetry extends BaseErrorTelemetry {
    installErrorListeners() {
        let oldOnError;
        const that = this;
        if (typeof mainWindow.onerror === 'function') {
            oldOnError = mainWindow.onerror;
        }
        mainWindow.onerror = function (message, filename, line, column, error) {
            that._onUncaughtError(message, filename, line, column, error);
            oldOnError?.apply(this, [message, filename, line, column, error]);
        };
        this._disposables.add(toDisposable(() => {
            if (oldOnError) {
                mainWindow.onerror = oldOnError;
            }
        }));
    }
    _onUncaughtError(msg, file, line, column, err) {
        const data = {
            callstack: msg,
            msg,
            file,
            line,
            column
        };
        if (err) {
            // If it's the no telemetry error it doesn't get logged
            if (ErrorNoTelemetry.isErrorNoTelemetry(err)) {
                return;
            }
            const { name, message, stack } = err;
            data.uncaught_error_name = name;
            if (message) {
                data.uncaught_error_msg = message;
            }
            if (stack) {
                data.callstack = Array.isArray(err.stack)
                    ? err.stack = err.stack.join('\n')
                    : err.stack;
            }
        }
        this._enqueue(data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2Jyb3dzZXIvZXJyb3JUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLGtCQUFrQyxNQUFNLDZCQUE2QixDQUFDO0FBRTdFLE1BQU0sQ0FBQyxPQUFPLE9BQU8sY0FBZSxTQUFRLGtCQUFrQjtJQUMxQyxxQkFBcUI7UUFDdkMsSUFBSSxVQUErQixDQUFDO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLE9BQU8sVUFBVSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM5QyxVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztRQUNqQyxDQUFDO1FBQ0QsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLE9BQXVCLEVBQUUsUUFBaUIsRUFBRSxJQUFhLEVBQUUsTUFBZSxFQUFFLEtBQWE7WUFDdkgsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQWlCLEVBQUUsUUFBa0IsRUFBRSxJQUFjLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVGLFVBQVUsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN2QyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixVQUFVLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztZQUNqQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxNQUFlLEVBQUUsR0FBUztRQUMzRixNQUFNLElBQUksR0FBZTtZQUN4QixTQUFTLEVBQUUsR0FBRztZQUNkLEdBQUc7WUFDSCxJQUFJO1lBQ0osSUFBSTtZQUNKLE1BQU07U0FDTixDQUFDO1FBRUYsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULHVEQUF1RDtZQUN2RCxJQUFJLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7WUFDaEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDO1lBQ25DLENBQUM7WUFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO29CQUN4QyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ2xDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRCJ9