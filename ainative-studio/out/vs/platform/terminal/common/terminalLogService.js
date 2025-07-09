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
import { Disposable } from '../../../base/common/lifecycle.js';
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { ILoggerService, LogLevel } from '../../log/common/log.js';
import { IWorkspaceContextService } from '../../workspace/common/workspace.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { joinPath } from '../../../base/common/resources.js';
let TerminalLogService = class TerminalLogService extends Disposable {
    get onDidChangeLogLevel() { return this._logger.onDidChangeLogLevel; }
    constructor(_loggerService, workspaceContextService, environmentService) {
        super();
        this._loggerService = _loggerService;
        this._logger = this._loggerService.createLogger(joinPath(environmentService.logsHome, 'terminal.log'), { id: 'terminal', name: localize('terminalLoggerName', 'Terminal') });
        this._register(Event.runAndSubscribe(workspaceContextService.onDidChangeWorkspaceFolders, () => {
            this._workspaceId = workspaceContextService.getWorkspace().id.substring(0, 7);
        }));
    }
    getLevel() { return this._logger.getLevel(); }
    setLevel(level) { this._logger.setLevel(level); }
    flush() { this._logger.flush(); }
    trace(message, ...args) { this._logger.trace(this._formatMessage(message), args); }
    debug(message, ...args) { this._logger.debug(this._formatMessage(message), args); }
    info(message, ...args) { this._logger.info(this._formatMessage(message), args); }
    warn(message, ...args) { this._logger.warn(this._formatMessage(message), args); }
    error(message, ...args) {
        if (message instanceof Error) {
            this._logger.error(this._formatMessage(''), message, args);
            return;
        }
        this._logger.error(this._formatMessage(message), args);
    }
    _formatMessage(message) {
        if (this._logger.getLevel() === LogLevel.Trace) {
            return `[${this._workspaceId}] ${message}`;
        }
        return message;
    }
};
TerminalLogService = __decorate([
    __param(0, ILoggerService),
    __param(1, IWorkspaceContextService),
    __param(2, IEnvironmentService)
], TerminalLogService);
export { TerminalLogService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2dTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbExvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFXLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBUWpELElBQUksbUJBQW1CLEtBQXNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFFdkYsWUFDa0MsY0FBOEIsRUFDckMsdUJBQWlELEVBQ3RELGtCQUF1QztRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQUp5QixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFLL0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFB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