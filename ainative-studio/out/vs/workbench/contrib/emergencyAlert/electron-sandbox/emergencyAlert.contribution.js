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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { arch, platform } from '../../../../base/common/process.js';
let EmergencyAlert = class EmergencyAlert {
    static { this.ID = 'workbench.contrib.emergencyAlert'; }
    constructor(bannerService, requestService, productService, logService) {
        this.bannerService = bannerService;
        this.requestService = requestService;
        this.productService = productService;
        this.logService = logService;
        if (productService.quality !== 'insider') {
            return; // only enabled in insiders for now
        }
        const emergencyAlertUrl = productService.emergencyAlertUrl;
        if (!emergencyAlertUrl) {
            return; // no emergency alert configured
        }
        this.fetchAlerts(emergencyAlertUrl);
    }
    async fetchAlerts(url) {
        try {
            await this.doFetchAlerts(url);
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    async doFetchAlerts(url) {
        const requestResult = await this.requestService.request({ type: 'GET', url, disableCache: true }, CancellationToken.None);
        if (requestResult.res.statusCode !== 200) {
            throw new Error(`Failed to fetch emergency alerts: HTTP ${requestResult.res.statusCode}`);
        }
        const emergencyAlerts = await asJson(requestResult);
        if (!emergencyAlerts) {
            return;
        }
        for (const emergencyAlert of emergencyAlerts.alerts) {
            if ((emergencyAlert.commit !== this.productService.commit) || // version mismatch
                (emergencyAlert.platform && emergencyAlert.platform !== platform) || // platform mismatch
                (emergencyAlert.arch && emergencyAlert.arch !== arch) // arch mismatch
            ) {
                return;
            }
            this.bannerService.show({
                id: 'emergencyAlert.banner',
                icon: Codicon.warning,
                message: emergencyAlert.message,
                actions: emergencyAlert.actions
            });
            break;
        }
    }
};
EmergencyAlert = __decorate([
    __param(0, IBannerService),
    __param(1, IRequestService),
    __param(2, IProductService),
    __param(3, ILogService)
], EmergencyAlert);
export { EmergencyAlert };
registerWorkbenchContribution2('workbench.emergencyAlert', EmergencyAlert, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5QWxlcnQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW1lcmdlbmN5QWxlcnQvZWxlY3Ryb24tc2FuZGJveC9lbWVyZ2VuY3lBbGVydC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBaUI3RCxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO2FBRVYsT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFzQztJQUV4RCxZQUNrQyxhQUE2QixFQUM1QixjQUErQixFQUMvQixjQUErQixFQUNuQyxVQUF1QjtRQUhwQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDNUIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNuQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXJELElBQUksY0FBYyxDQUFDLE9B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