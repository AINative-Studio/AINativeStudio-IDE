/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isCancellationError, isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import BaseErrorTelemetry from '../common/errorTelemetry.js';
export default class ErrorTelemetry extends BaseErrorTelemetry {
    installErrorListeners() {
        setUnexpectedErrorHandler(err => console.error(err));
        // Print a console message when rejection isn't handled within N seconds. For details:
        // see https://nodejs.org/api/process.html#process_event_unhandledrejection
        // and https://nodejs.org/api/process.html#process_event_rejectionhandled
        const unhandledPromises = [];
        process.on('unhandledRejection', (reason, promise) => {
            unhandledPromises.push(promise);
            setTimeout(() => {
                const idx = unhandledPromises.indexOf(promise);
                if (idx >= 0) {
                    promise.catch(e => {
                        unhandledPromises.splice(idx, 1);
                        if (!isCancellationError(e)) {
                            console.warn(`rejected promise not handled within 1 second: ${e}`);
                            if (e.stack) {
                                console.warn(`stack trace: ${e.stack}`);
                            }
                            if (reason) {
                                onUnexpectedError(reason);
                            }
                        }
                    });
                }
            }, 1000);
        });
        process.on('rejectionHandled', (promise) => {
            const idx = unhandledPromises.indexOf(promise);
            if (idx >= 0) {
                unhandledPromises.splice(idx, 1);
            }
        });
        // Print a console message when an exception isn't handled.
        process.on('uncaughtException', (err) => {
            if (isSigPipeError(err)) {
                return;
            }
            onUnexpectedError(err);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L25vZGUvZXJyb3JUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25JLE9BQU8sa0JBQWtCLE1BQU0sNkJBQTZCLENBQUM7QUFFN0QsTUFBTSxDQUFDLE9BQU8sT0FBTyxjQUFlLFNBQVEsa0JBQWtCO0lBQzFDLHFCQUFxQjtRQUN2Qyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVyRCxzRkFBc0Y7UUFDdEYsMkVBQTJFO1FBQzNFLHlFQUF5RTtRQUN6RSxNQUFNLGlCQUFpQixHQUFtQixFQUFFLENBQUM7UUFDN0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE1BQVcsRUFBRSxPQUFxQixFQUFFLEVBQUU7WUFDdkUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNqQixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNqQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzs0QkFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDbkUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7NEJBQ3pDLENBQUM7NEJBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQ0FDWixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQzs0QkFDM0IsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxPQUFxQixFQUFFLEVBQUU7WUFDeEQsTUFBTSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNkLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsMkRBQTJEO1FBQzNELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFrQyxFQUFFLEVBQUU7WUFDdEUsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTztZQUNSLENBQUM7WUFFRCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9