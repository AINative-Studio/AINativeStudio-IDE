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
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from './telemetry.js';
import { TelemetryService } from './telemetryService.js';
import { NullTelemetryServiceShape } from './telemetryUtils.js';
let ServerTelemetryService = class ServerTelemetryService extends TelemetryService {
    constructor(config, injectedTelemetryLevel, _configurationService, _productService) {
        super(config, _configurationService, _productService);
        this._injectedTelemetryLevel = injectedTelemetryLevel;
    }
    publicLog(eventName, data) {
        if (this._injectedTelemetryLevel < 3 /* TelemetryLevel.USAGE */) {
            return;
        }
        return super.publicLog(eventName, data);
    }
    publicLog2(eventName, data) {
        return this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        if (this._injectedTelemetryLevel < 2 /* TelemetryLevel.ERROR */) {
            return Promise.resolve(undefined);
        }
        return super.publicLogError(errorEventName, data);
    }
    publicLogError2(eventName, data) {
        return this.publicLogError(eventName, data);
    }
    async updateInjectedTelemetryLevel(telemetryLevel) {
        if (telemetryLevel === undefined) {
            this._injectedTelemetryLevel = 0 /* TelemetryLevel.NONE */;
            throw new Error('Telemetry level cannot be undefined. This will cause infinite looping!');
        }
        // We always take the most restrictive level because we don't want multiple clients to connect and send data when one client does not consent
        this._injectedTelemetryLevel = this._injectedTelemetryLevel ? Math.min(this._injectedTelemetryLevel, telemetryLevel) : telemetryLevel;
        if (this._injectedTelemetryLevel === 0 /* TelemetryLevel.NONE */) {
            this.dispose();
        }
    }
};
ServerTelemetryService = __decorate([
    __param(2, IConfigurationService),
    __param(3, IProductService)
], ServerTelemetryService);
export { ServerTelemetryService };
export const ServerNullTelemetryService = new class extends NullTelemetryServiceShape {
    async updateInjectedTelemetryLevel() { return; } // No-op, telemetry is already disabled
};
export const IServerTelemetryService = refineServiceDecorator(ITelemetryService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyVGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3NlcnZlclRlbGVtZXRyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpFLE9BQU8sRUFBa0IsaUJBQWlCLEVBQWtCLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkYsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBTXpELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsZ0JBQWdCO0lBSzNELFlBQ0MsTUFBK0IsRUFDL0Isc0JBQXNDLEVBQ2YscUJBQTRDLEVBQ2xELGVBQWdDO1FBRWpELEtBQUssQ0FBQyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDO0lBQ3ZELENBQUM7SUFFUSxTQUFTLENBQUMsU0FBaUIsRUFBRSxJQUFxQjtRQUMxRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsK0JBQXVCLEVBQUUsQ0FBQztZQUN6RCxPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVRLFVBQVUsQ0FBc0YsU0FBaUIsRUFBRSxJQUFnQztRQUMzSixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQWtDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRVEsY0FBYyxDQUFDLGNBQXNCLEVBQUUsSUFBcUI7UUFDcEUsSUFBSSxJQUFJLENBQUMsdUJBQXVCLCtCQUF1QixFQUFFLENBQUM7WUFDekQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFUSxlQUFlLENBQXNGLFNBQWlCLEVBQUUsSUFBZ0M7UUFDaEssT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFrQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxjQUE4QjtRQUNoRSxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsdUJBQXVCLDhCQUFzQixDQUFDO1lBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMsd0VBQXdFLENBQUMsQ0FBQztRQUMzRixDQUFDO1FBQ0QsNklBQTZJO1FBQzdJLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7UUFDdEksSUFBSSxJQUFJLENBQUMsdUJBQXVCLGdDQUF3QixFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWhEWSxzQkFBc0I7SUFRaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtHQVRMLHNCQUFzQixDQWdEbEM7O0FBRUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxLQUFNLFNBQVEseUJBQXlCO0lBQ3BGLEtBQUssQ0FBQyw0QkFBNEIsS0FBb0IsT0FBTyxDQUFDLENBQUMsQ0FBQyx1Q0FBdUM7Q0FDdkcsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUE2QyxpQkFBaUIsQ0FBQyxDQUFDIn0=