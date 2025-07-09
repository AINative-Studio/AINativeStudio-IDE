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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AbstractRequestService, IRequestService } from '../../../../platform/request/common/request.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { request } from '../../../../base/parts/request/common/requestImpl.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
import { LogService } from '../../../../platform/log/common/logService.js';
let NativeRequestService = class NativeRequestService extends AbstractRequestService {
    constructor(nativeHostService, configurationService, loggerService) {
        const logger = loggerService.createLogger(`network`, { name: localize('network', "Network"), group: windowLogGroup });
        const logService = new LogService(logger);
        super(logService);
        this.nativeHostService = nativeHostService;
        this.configurationService = configurationService;
        this._register(logger);
        this._register(logService);
    }
    async request(options, token) {
        if (!options.proxyAuthorization) {
            options.proxyAuthorization = this.configurationService.inspect('http.proxyAuthorization').userLocalValue;
        }
        return this.logAndRequest(options, () => request(options, token, () => navigator.onLine));
    }
    async resolveProxy(url) {
        return this.nativeHostService.resolveProxy(url);
    }
    async lookupAuthorization(authInfo) {
        return this.nativeHostService.lookupAuthorization(authInfo);
    }
    async lookupKerberosAuthorization(url) {
        return this.nativeHostService.lookupKerberosAuthorization(url);
    }
    async loadCertificates() {
        return this.nativeHostService.loadCertificates();
    }
};
NativeRequestService = __decorate([
    __param(0, INativeHostService),
    __param(1, IConfigurationService),
    __param(2, ILoggerService)
], NativeRequestService);
export { NativeRequestService };
registerSingleton(IRequestService, NativeRequestService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlcXVlc3QvZWxlY3Ryb24tc2FuZGJveC9yZXF1ZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHNCQUFzQixFQUF5QixlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUdsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXBFLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsc0JBQXNCO0lBSS9ELFlBQ3NDLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDbkUsYUFBNkI7UUFFN0MsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN0SCxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFObUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNsQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBTW5GLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUF3QixFQUFFLEtBQXdCO1FBQy9ELElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBUyx5QkFBeUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztRQUNsSCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFFBQWtCO1FBQzNDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsR0FBVztRQUM1QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQjtRQUNyQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2xELENBQUM7Q0FDRCxDQUFBO0FBdENZLG9CQUFvQjtJQUs5QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7R0FQSixvQkFBb0IsQ0FzQ2hDOztBQUVELGlCQUFpQixDQUFDLGVBQWUsRUFBRSxvQkFBb0Isb0NBQTRCLENBQUMifQ==