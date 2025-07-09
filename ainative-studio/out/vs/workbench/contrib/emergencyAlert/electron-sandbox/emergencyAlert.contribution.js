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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5QWxlcnQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VtZXJnZW5jeUFsZXJ0L2VsZWN0cm9uLXNhbmRib3gvZW1lcmdlbmN5QWxlcnQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBMEIsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQWlCN0QsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYzthQUVWLE9BQUUsR0FBRyxrQ0FBa0MsQUFBckMsQ0FBc0M7SUFFeEQsWUFDa0MsYUFBNkIsRUFDNUIsY0FBK0IsRUFDL0IsY0FBK0IsRUFDbkMsVUFBdUI7UUFIcEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzVCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDbkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUVyRCxJQUFJLGNBQWMsQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLG1DQUFtQztRQUM1QyxDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUM7UUFDM0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLGdDQUFnQztRQUN6QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQVc7UUFDcEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQVc7UUFDdEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxSCxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUMzRixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsTUFBTSxNQUFNLENBQW1CLGFBQWEsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELEtBQUssTUFBTSxjQUFjLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JELElBQ0MsQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQU8sbUJBQW1CO2dCQUNoRixDQUFDLGNBQWMsQ0FBQyxRQUFRLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxvQkFBb0I7Z0JBQ3pGLENBQUMsY0FBYyxDQUFDLElBQUksSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFLLGdCQUFnQjtjQUN6RSxDQUFDO2dCQUNGLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLEVBQUUsRUFBRSx1QkFBdUI7Z0JBQzNCLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDckIsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPO2dCQUMvQixPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87YUFDL0IsQ0FBQyxDQUFDO1lBRUgsTUFBTTtRQUNQLENBQUM7SUFDRixDQUFDOztBQTVEVyxjQUFjO0lBS3hCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsV0FBVyxDQUFBO0dBUkQsY0FBYyxDQTZEMUI7O0FBRUQsOEJBQThCLENBQUMsMEJBQTBCLEVBQUUsY0FBYyxvQ0FBNEIsQ0FBQyJ9