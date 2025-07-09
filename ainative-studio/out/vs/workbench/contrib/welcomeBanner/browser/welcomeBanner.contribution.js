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
var WelcomeBannerContribution_1;
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { URI } from '../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let WelcomeBannerContribution = class WelcomeBannerContribution {
    static { WelcomeBannerContribution_1 = this; }
    static { this.WELCOME_BANNER_DISMISSED_KEY = 'workbench.banner.welcome.dismissed'; }
    constructor(bannerService, storageService, environmentService) {
        const welcomeBanner = environmentService.options?.welcomeBanner;
        if (!welcomeBanner) {
            return; // welcome banner is not enabled
        }
        if (storageService.getBoolean(WelcomeBannerContribution_1.WELCOME_BANNER_DISMISSED_KEY, 0 /* StorageScope.PROFILE */, false)) {
            return; // welcome banner dismissed
        }
        let icon = undefined;
        if (typeof welcomeBanner.icon === 'string') {
            icon = ThemeIcon.fromId(welcomeBanner.icon);
        }
        else if (welcomeBanner.icon) {
            icon = URI.revive(welcomeBanner.icon);
        }
        bannerService.show({
            id: 'welcome.banner',
            message: welcomeBanner.message,
            icon,
            actions: welcomeBanner.actions,
            onClose: () => {
                storageService.store(WelcomeBannerContribution_1.WELCOME_BANNER_DISMISSED_KEY, true, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            }
        });
    }
};
WelcomeBannerContribution = WelcomeBannerContribution_1 = __decorate([
    __param(0, IBannerService),
    __param(1, IStorageService),
    __param(2, IBrowserWorkbenchEnvironmentService)
], WelcomeBannerContribution);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(WelcomeBannerContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZUJhbm5lci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUJhbm5lci9icm93c2VyL3dlbGNvbWVCYW5uZXIuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCOzthQUVOLGlDQUE0QixHQUFHLG9DQUFvQyxBQUF2QyxDQUF3QztJQUU1RixZQUNpQixhQUE2QixFQUM1QixjQUErQixFQUNYLGtCQUF1RDtRQUU1RixNQUFNLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDO1FBQ2hFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPLENBQUMsZ0NBQWdDO1FBQ3pDLENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsMkJBQXlCLENBQUMsNEJBQTRCLGdDQUF3QixLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BILE9BQU8sQ0FBQywyQkFBMkI7UUFDcEMsQ0FBQztRQUVELElBQUksSUFBSSxHQUFnQyxTQUFTLENBQUM7UUFDbEQsSUFBSSxPQUFPLGFBQWEsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDNUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvQixJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELGFBQWEsQ0FBQyxJQUFJLENBQUM7WUFDbEIsRUFBRSxFQUFFLGdCQUFnQjtZQUNwQixPQUFPLEVBQUUsYUFBYSxDQUFDLE9BQU87WUFDOUIsSUFBSTtZQUNKLE9BQU8sRUFBRSxhQUFhLENBQUMsT0FBTztZQUM5QixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLGNBQWMsQ0FBQyxLQUFLLENBQUMsMkJBQXlCLENBQUMsNEJBQTRCLEVBQUUsSUFBSSw4REFBOEMsQ0FBQztZQUNqSSxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQzs7QUFsQ0kseUJBQXlCO0lBSzVCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1DQUFtQyxDQUFBO0dBUGhDLHlCQUF5QixDQW1DOUI7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7S0FDekUsNkJBQTZCLENBQUMseUJBQXlCLGtDQUEwQixDQUFDIn0=