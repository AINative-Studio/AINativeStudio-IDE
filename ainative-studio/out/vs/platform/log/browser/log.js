/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { relativePath } from '../../../base/common/resources.js';
import { AdapterLogger, DEFAULT_LOG_LEVEL, LogLevel } from '../common/log.js';
/**
 * Only used in browser contexts where the log files are not stored on disk
 * but in IndexedDB. A method to get all logs with their contents so that
 * CI automation can persist them.
 */
export async function getLogs(fileService, environmentService) {
    const result = [];
    await doGetLogs(fileService, result, environmentService.logsHome, environmentService.logsHome);
    return result;
}
async function doGetLogs(fileService, logs, curFolder, logsHome) {
    const stat = await fileService.resolve(curFolder);
    for (const { resource, isDirectory } of stat.children || []) {
        if (isDirectory) {
            await doGetLogs(fileService, logs, resource, logsHome);
        }
        else {
            const contents = (await fileService.readFile(resource)).value.toString();
            if (contents) {
                const path = relativePath(logsHome, resource);
                if (path) {
                    logs.push({ relativePath: path, contents });
                }
            }
        }
    }
}
function logLevelToString(level) {
    switch (level) {
        case LogLevel.Trace: return 'trace';
        case LogLevel.Debug: return 'debug';
        case LogLevel.Info: return 'info';
        case LogLevel.Warning: return 'warn';
        case LogLevel.Error: return 'error';
    }
    return 'info';
}
/**
 * A logger that is used when VSCode is running in the web with
 * an automation such as playwright. We expect a global codeAutomationLog
 * to be defined that we can use to log to.
 */
export class ConsoleLogInAutomationLogger extends AdapterLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super({ log: (level, args) => this.consoleLog(logLevelToString(level), args) }, logLevel);
    }
    consoleLog(type, args) {
        const automatedWindow = mainWindow;
        if (typeof automatedWindow.codeAutomationLog === 'function') {
            try {
                automatedWindow.codeAutomationLog(type, args);
            }
            catch (err) {
                // see https://github.com/microsoft/vscode-test-web/issues/69
                console.error('Problems writing to codeAutomationLog', err);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9icm93c2VyL2xvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQVcsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFZdkY7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsT0FBTyxDQUFDLFdBQXlCLEVBQUUsa0JBQXVDO0lBQy9GLE1BQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztJQUU5QixNQUFNLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUUvRixPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxLQUFLLFVBQVUsU0FBUyxDQUFDLFdBQXlCLEVBQUUsSUFBZ0IsRUFBRSxTQUFjLEVBQUUsUUFBYTtJQUNsRyxNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFbEQsS0FBSyxNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDN0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pFLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsS0FBZTtJQUN4QyxRQUFRLEtBQUssRUFBRSxDQUFDO1FBQ2YsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7UUFDcEMsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7UUFDcEMsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUM7UUFDbEMsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUM7UUFDckMsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7SUFDckMsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsYUFBYTtJQUk5RCxZQUFZLFdBQXFCLGlCQUFpQjtRQUNqRCxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVPLFVBQVUsQ0FBQyxJQUFZLEVBQUUsSUFBVztRQUMzQyxNQUFNLGVBQWUsR0FBRyxVQUF5QyxDQUFDO1FBQ2xFLElBQUksT0FBTyxlQUFlLENBQUMsaUJBQWlCLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDO2dCQUNKLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0MsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsNkRBQTZEO2dCQUM3RCxPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=