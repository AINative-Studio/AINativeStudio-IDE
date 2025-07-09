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
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ILoggerService, ILogService, isLogLevel, log, LogLevelToString, parseLogLevel } from '../../../platform/log/common/log.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
let MainThreadLoggerService = class MainThreadLoggerService {
    constructor(extHostContext, loggerService) {
        this.loggerService = loggerService;
        this.disposables = new DisposableStore();
        const proxy = extHostContext.getProxy(ExtHostContext.ExtHostLogLevelServiceShape);
        this.disposables.add(loggerService.onDidChangeLogLevel(arg => {
            if (isLogLevel(arg)) {
                proxy.$setLogLevel(arg);
            }
            else {
                proxy.$setLogLevel(arg[1], arg[0]);
            }
        }));
    }
    $log(file, messages) {
        const logger = this.loggerService.getLogger(URI.revive(file));
        if (!logger) {
            throw new Error('Create the logger before logging');
        }
        for (const [level, message] of messages) {
            log(logger, level, message);
        }
    }
    async $createLogger(file, options) {
        this.loggerService.createLogger(URI.revive(file), options);
    }
    async $registerLogger(logResource) {
        this.loggerService.registerLogger({
            ...logResource,
            resource: URI.revive(logResource.resource)
        });
    }
    async $deregisterLogger(resource) {
        this.loggerService.deregisterLogger(URI.revive(resource));
    }
    async $setVisibility(resource, visible) {
        this.loggerService.setVisibility(URI.revive(resource), visible);
    }
    $flush(file) {
        const logger = this.loggerService.getLogger(URI.revive(file));
        if (!logger) {
            throw new Error('Create the logger before flushing');
        }
        logger.flush();
    }
    dispose() {
        this.disposables.dispose();
    }
};
MainThreadLoggerService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLogger),
    __param(1, ILoggerService)
], MainThreadLoggerService);
export { MainThreadLoggerService };
// --- Internal commands to improve extension test runs
CommandsRegistry.registerCommand('_extensionTests.setLogLevel', function (accessor, level) {
    const loggerService = accessor.get(ILoggerService);
    const environmentService = accessor.get(IEnvironmentService);
    if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
        const logLevel = parseLogLevel(level);
        if (logLevel !== undefined) {
            loggerService.setLogLevel(logLevel);
        }
    }
});
CommandsRegistry.registerCommand('_extensionTests.getLogLevel', function (accessor) {
    const logService = accessor.get(ILogService);
    return LogLevelToString(logService.getLevel());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRMb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQW1DLGNBQWMsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBWSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvSyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBeUIsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbkcsT0FBTyxFQUFpQixHQUFHLEVBQVUsTUFBTSw2QkFBNkIsQ0FBQztBQUV6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUduRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUluQyxZQUNDLGNBQStCLEVBQ2YsYUFBOEM7UUFBN0Isa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBSjlDLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQU1wRCxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1RCxJQUFJLFVBQVUsQ0FBQyxH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