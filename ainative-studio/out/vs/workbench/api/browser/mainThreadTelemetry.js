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
var MainThreadTelemetry_1;
import { Disposable } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { ITelemetryService, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SETTING_ID } from '../../../platform/telemetry/common/telemetry.js';
import { supportsTelemetry } from '../../../platform/telemetry/common/telemetryUtils.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadTelemetry = class MainThreadTelemetry extends Disposable {
    static { MainThreadTelemetry_1 = this; }
    static { this._name = 'pluginHostTelemetry'; }
    constructor(extHostContext, _telemetryService, _configurationService, _environmentService, _productService) {
        super();
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTelemetry);
        if (supportsTelemetry(this._productService, this._environmentService)) {
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(TELEMETRY_SETTING_ID) || e.affectsConfiguration(TELEMETRY_OLD_SETTING_ID)) {
                    this._proxy.$onDidChangeTelemetryLevel(this.telemetryLevel);
                }
            }));
        }
        this._proxy.$initializeTelemetryLevel(this.telemetryLevel, supportsTelemetry(this._productService, this._environmentService), this._productService.enabledTelemetryLevels);
    }
    get telemetryLevel() {
        if (!supportsTelemetry(this._productService, this._environmentService)) {
            return 0 /* TelemetryLevel.NONE */;
        }
        return this._telemetryService.telemetryLevel;
    }
    $publicLog(eventName, data = Object.create(null)) {
        // __GDPR__COMMON__ "pluginHostTelemetry" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        data[MainThreadTelemetry_1._name] = true;
        this._telemetryService.publicLog(eventName, data);
    }
    $publicLog2(eventName, data) {
        this.$publicLog(eventName, data);
    }
};
MainThreadTelemetry = MainThreadTelemetry_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTelemetry),
    __param(1, ITelemetryService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService),
    __param(4, IProductService)
], MainThreadTelemetry);
export { MainThreadTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXJGLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0Isd0JBQXdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwSixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBeUIsV0FBVyxFQUE0QixNQUFNLCtCQUErQixDQUFDO0FBR3RILElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFHMUIsVUFBSyxHQUFHLHFCQUFxQixBQUF4QixDQUF5QjtJQUV0RCxZQUNDLGNBQStCLEVBQ0ssaUJBQW9DLEVBQ2hDLHFCQUE0QyxFQUM5QyxtQkFBd0MsRUFDNUMsZUFBZ0M7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFMNEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDNUMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBSWxFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV2RSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN2RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDdEUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO29CQUN0RyxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDN0QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzVLLENBQUM7SUFFRCxJQUFZLGNBQWM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUN4RSxtQ0FBMkI7UUFDNUIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsVUFBVSxDQUFDLFNBQWlCLEVBQUUsT0FBWSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUM1RCxzSUFBc0k7UUFDdEksSUFBSSxDQUFDLHFCQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN2QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsV0FBVyxDQUFzRixTQUFpQixFQUFFLElBQWdDO1FBQ25KLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQVcsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7O0FBMUNXLG1CQUFtQjtJQUQvQixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUM7SUFRbkQsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxlQUFlLENBQUE7R0FWTCxtQkFBbUIsQ0EyQy9CIn0=