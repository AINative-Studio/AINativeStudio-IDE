/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { isLogLevel, log, LogLevel } from '../common/log.js';
export class LoggerChannel {
    constructor(loggerService) {
        this.loggerService = loggerService;
        this.loggers = new ResourceMap();
    }
    listen(_, event, windowId) {
        switch (event) {
            case 'onDidChangeLoggers': return windowId ? this.loggerService.getOnDidChangeLoggersEvent(windowId) : this.loggerService.onDidChangeLoggers;
            case 'onDidChangeLogLevel': return windowId ? this.loggerService.getOnDidChangeLogLevelEvent(windowId) : this.loggerService.onDidChangeLogLevel;
            case 'onDidChangeVisibility': return windowId ? this.loggerService.getOnDidChangeVisibilityEvent(windowId) : this.loggerService.onDidChangeVisibility;
        }
        throw new Error(`Event not found: ${event}`);
    }
    async call(_, command, arg) {
        switch (command) {
            case 'createLogger':
                this.createLogger(URI.revive(arg[0]), arg[1], arg[2]);
                return;
            case 'log': return this.log(URI.revive(arg[0]), arg[1]);
            case 'consoleLog': return this.consoleLog(arg[0], arg[1]);
            case 'setLogLevel': return isLogLevel(arg[0]) ? this.loggerService.setLogLevel(arg[0]) : this.loggerService.setLogLevel(URI.revive(arg[0]), arg[1]);
            case 'setVisibility': return this.loggerService.setVisibility(URI.revive(arg[0]), arg[1]);
            case 'registerLogger': return this.loggerService.registerLogger({ ...arg[0], resource: URI.revive(arg[0].resource) }, arg[1]);
            case 'deregisterLogger': return this.loggerService.deregisterLogger(URI.revive(arg[0]));
        }
        throw new Error(`Call not found: ${command}`);
    }
    createLogger(file, options, windowId) {
        this.loggers.set(file, this.loggerService.createLogger(file, options, windowId));
    }
    consoleLog(level, args) {
        let consoleFn = console.log;
        switch (level) {
            case LogLevel.Error:
                consoleFn = console.error;
                break;
            case LogLevel.Warning:
                consoleFn = console.warn;
                break;
            case LogLevel.Info:
                consoleFn = console.info;
                break;
        }
        consoleFn.call(console, ...args);
    }
    log(file, messages) {
        const logger = this.loggers.get(file);
        if (!logger) {
            throw new Error('Create the logger before logging');
        }
        for (const [level, message] of messages) {
            log(logger, level, message);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9lbGVjdHJvbi1tYWluL2xvZ0lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBMkIsVUFBVSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUd0RixNQUFNLE9BQU8sYUFBYTtJQUl6QixZQUE2QixhQUFpQztRQUFqQyxrQkFBYSxHQUFiLGFBQWEsQ0FBb0I7UUFGN0MsWUFBTyxHQUFHLElBQUksV0FBVyxFQUFXLENBQUM7SUFFWSxDQUFDO0lBRW5FLE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYSxFQUFFLFFBQWlCO1FBQ2xELFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLG9CQUFvQixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUM7WUFDN0ksS0FBSyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1lBQ2hKLEtBQUssdUJBQXVCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FB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