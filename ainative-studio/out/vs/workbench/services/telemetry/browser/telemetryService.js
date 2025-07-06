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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { OneDataSystemWebAppender } from '../../../../platform/telemetry/browser/1dsAppender.js';
import { ITelemetryService, TELEMETRY_SETTING_ID } from '../../../../platform/telemetry/common/telemetry.js';
import { TelemetryLogAppender } from '../../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService as BaseTelemetryService } from '../../../../platform/telemetry/common/telemetryService.js';
import { getTelemetryLevel, isInternalTelemetry, isLoggingOnly, NullTelemetryService, supportsTelemetry } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { resolveWorkbenchCommonProperties } from './workbenchCommonProperties.js';
let TelemetryService = class TelemetryService extends Disposable {
    get sessionId() { return this.impl.sessionId; }
    get machineId() { return this.impl.machineId; }
    get sqmId() { return this.impl.sqmId; }
    get devDeviceId() { return this.impl.devDeviceId; }
    get firstSessionDate() { return this.impl.firstSessionDate; }
    get msftInternal() { return this.impl.msftInternal; }
    constructor(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService) {
        super();
        this.impl = NullTelemetryService;
        this.sendErrorTelemetry = true;
        this.impl = this.initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService);
        // When the level changes it could change from off to on and we want to make sure telemetry is properly intialized
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
                this.impl = this.initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService);
            }
        }));
    }
    /**
     * Initializes the telemetry service to be a full fledged service.
     * This is only done once and only when telemetry is enabled as this will also ping the endpoint to
     * ensure its not adblocked and we can send telemetry
     */
    initializeService(environmentService, logService, loggerService, configurationService, storageService, productService, remoteAgentService) {
        const telemetrySupported = supportsTelemetry(productService, environmentService) && productService.aiConfig?.ariaKey;
        if (telemetrySupported && getTelemetryLevel(configurationService) !== 0 /* TelemetryLevel.NONE */ && this.impl === NullTelemetryService) {
            // If remote server is present send telemetry through that, else use the client side appender
            const appenders = [];
            const isInternal = isInternalTelemetry(productService, configurationService);
            if (!isLoggingOnly(productService, environmentService)) {
                if (remoteAgentService.getConnection() !== null) {
                    const remoteTelemetryProvider = {
                        log: remoteAgentService.logTelemetry.bind(remoteAgentService),
                        flush: remoteAgentService.flushTelemetry.bind(remoteAgentService)
                    };
                    appenders.push(remoteTelemetryProvider);
                }
                else {
                    appenders.push(new OneDataSystemWebAppender(isInternal, 'monacoworkbench', null, productService.aiConfig?.ariaKey));
                }
            }
            appenders.push(new TelemetryLogAppender('', false, loggerService, environmentService, productService));
            const config = {
                appenders,
                commonProperties: resolveWorkbenchCommonProperties(storageService, productService.commit, productService.version, isInternal, environmentService.remoteAuthority, productService.embedderIdentifier, productService.removeTelemetryMachineId, environmentService.options && environmentService.options.resolveCommonTelemetryProperties),
                sendErrorTelemetry: this.sendErrorTelemetry,
            };
            return this._register(new BaseTelemetryService(config, configurationService, productService));
        }
        return this.impl;
    }
    setExperimentProperty(name, value) {
        return this.impl.setExperimentProperty(name, value);
    }
    get telemetryLevel() {
        return this.impl.telemetryLevel;
    }
    publicLog(eventName, data) {
        this.impl.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        this.impl.publicLog(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, ILogService),
    __param(2, ILoggerService),
    __param(3, IConfigurationService),
    __param(4, IStorageService),
    __param(5, IProductService),
    __param(6, IRemoteAgentService)
], TelemetryService);
export { TelemetryService };
registerSingleton(ITelemetryService, TelemetryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpHLE9BQU8sRUFBa0IsaUJBQWlCLEVBQWtCLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDN0ksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDckcsT0FBTyxFQUEyQixnQkFBZ0IsSUFBSSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQXNCLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0wsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENB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