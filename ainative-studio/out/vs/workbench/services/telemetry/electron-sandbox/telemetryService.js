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
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { supportsTelemetry, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { TelemetryAppenderClient } from '../../../../platform/telemetry/common/telemetryIpc.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { resolveWorkbenchCommonProperties } from '../common/workbenchCommonProperties.js';
import { TelemetryService as BaseTelemetryService } from '../../../../platform/telemetry/common/telemetryService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
let TelemetryService = class TelemetryService extends Disposable {
    get sessionId() { return this.impl.sessionId; }
    get machineId() { return this.impl.machineId; }
    get sqmId() { return this.impl.sqmId; }
    get devDeviceId() { return this.impl.devDeviceId; }
    get firstSessionDate() { return this.impl.firstSessionDate; }
    get msftInternal() { return this.impl.msftInternal; }
    constructor(environmentService, productService, sharedProcessService, storageService, configurationService) {
        super();
        if (supportsTelemetry(productService, environmentService)) {
            const isInternal = isInternalTelemetry(productService, configurationService);
            const channel = sharedProcessService.getChannel('telemetryAppender');
            const config = {
                appenders: [new TelemetryAppenderClient(channel)],
                commonProperties: resolveWorkbenchCommonProperties(storageService, environmentService.os.release, environmentService.os.hostname, productService.commit, productService.version, environmentService.machineId, environmentService.sqmId, environmentService.devDeviceId, isInternal, process, environmentService.remoteAuthority),
                piiPaths: getPiiPathsFromEnvironment(environmentService),
                sendErrorTelemetry: true
            };
            this.impl = this._register(new BaseTelemetryService(config, configurationService, productService));
        }
        else {
            this.impl = NullTelemetryService;
        }
        this.sendErrorTelemetry = this.impl.sendErrorTelemetry;
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
        this.impl.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IProductService),
    __param(2, ISharedProcessService),
    __param(3, IStorageService),
    __param(4, IConfigurationService)
], TelemetryService);
export { TelemetryService };
registerSingleton(ITelemetryService, TelemetryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVsZW1ldHJ5L2VsZWN0cm9uLXNhbmRib3gvdGVsZW1ldHJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQWtDLE1BQU0sb0RBQW9ELENBQUM7QUFDdkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbkssT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixJQUFJLG9CQUFvQixFQUEyQixNQUFNLDJEQUEyRCxDQUFDO0FBQzlJLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFOUUsSUFBTSxnQkFBZ0IsR0FB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