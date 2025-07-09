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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { State } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL } from './abstractUpdateService.js';
let LinuxUpdateService = class LinuxUpdateService extends AbstractUpdateService {
    constructor(lifecycleMainService, configurationService, environmentMainService, requestService, logService, nativeHostMainService, productService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
        this.nativeHostMainService = nativeHostMainService;
    }
    buildUpdateFeedUrl(quality) {
        return createUpdateURL(`linux-${process.arch}`, quality, this.productService);
    }
    doCheckForUpdates(context) {
        if (!this.url) {
            return;
        }
        this.setState(State.CheckingForUpdates(context));
        this.requestService.request({ url: this.url }, CancellationToken.None)
            .then(asJson)
            .then(update => {
            if (!update || !update.url || !update.version || !update.productVersion) {
                this.setState(State.Idle(1 /* UpdateType.Archive */));
            }
            else {
                this.setState(State.AvailableForDownload(update));
            }
        })
            .then(undefined, err => {
            this.logService.error(err);
            // only show message when explicitly checking for updates
            const message = !!context ? (err.message || err) : undefined;
            this.setState(State.Idle(1 /* UpdateType.Archive */, message));
        });
    }
    async doDownloadUpdate(state) {
        // Use the download URL if available as we don't currently detect the package type that was
        // installed and the website download page is more useful than the tarball generally.
        if (this.productService.downloadUrl && this.productService.downloadUrl.length > 0) {
            this.nativeHostMainService.openExternal(undefined, this.productService.downloadUrl);
        }
        else if (state.update.url) {
            this.nativeHostMainService.openExternal(undefined, state.update.url);
        }
        this.setState(State.Idle(1 /* UpdateType.Archive */));
    }
};
LinuxUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, IRequestService),
    __param(4, ILogService),
    __param(5, INativeHostMainService),
    __param(6, IProductService)
], LinuxUpdateService);
export { LinuxUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5saW51eC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvZWxlY3Ryb24tbWFpbi91cGRhdGVTZXJ2aWNlLmxpbnV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQWlDLEtBQUssRUFBYyxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU3RSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLHFCQUFxQjtJQUU1RCxZQUN3QixvQkFBMkMsRUFDM0Msb0JBQTJDLEVBQ3pDLHNCQUErQyxFQUN2RCxjQUErQixFQUNuQyxVQUF1QixFQUNLLHFCQUE2QyxFQUNyRSxjQUErQjtRQUVoRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsc0JBQXNCLEVBQUUsY0FB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