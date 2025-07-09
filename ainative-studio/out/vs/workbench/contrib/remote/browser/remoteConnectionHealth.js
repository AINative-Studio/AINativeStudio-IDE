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
import { IRemoteAgentService, remoteConnectionLatencyMeasurer } from '../../../services/remote/common/remoteAgentService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { localize } from '../../../../nls.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Codicon } from '../../../../base/common/codicons.js';
import Severity from '../../../../base/common/severity.js';
const REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY = 'remote.unsupportedConnectionChoice';
const BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY = 'workbench.banner.remote.unsupportedConnection.dismissed';
let InitialRemoteConnectionHealthContribution = class InitialRemoteConnectionHealthContribution {
    constructor(_remoteAgentService, _environmentService, _telemetryService, bannerService, dialogService, openerService, hostService, storageService, productService) {
        this._remoteAgentService = _remoteAgentService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this.bannerService = bannerService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.productService = productService;
        if (this._environmentService.remoteAuthority) {
            this._checkInitialRemoteConnectionHealth();
        }
    }
    async _confirmConnection() {
        let ConnectionChoice;
        (function (ConnectionChoice) {
            ConnectionChoice[ConnectionChoice["Allow"] = 1] = "Allow";
            ConnectionChoice[ConnectionChoice["LearnMore"] = 2] = "LearnMore";
            ConnectionChoice[ConnectionChoice["Cancel"] = 0] = "Cancel";
        })(ConnectionChoice || (ConnectionChoice = {}));
        const { result, checkboxChecked } = await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('unsupportedGlibcWarning', "You are about to connect to an OS version that is unsupported by {0}.", this.productService.nameLong),
            buttons: [
                {
                    label: localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                    run: () => 1 /* ConnectionChoice.Allow */
                },
                {
                    label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, "&&Learn More"),
                    run: async () => { await this.openerService.open('https://aka.ms/vscode-remote/faq/old-linux'); return 2 /* ConnectionChoice.LearnMore */; }
                }
            ],
            cancelButton: {
                run: () => 0 /* ConnectionChoice.Cancel */
            },
            checkbox: {
                label: localize('remember', "Do not show again"),
            }
        });
        if (result === 2 /* ConnectionChoice.LearnMore */) {
            return await this._confirmConnection();
        }
        const allowed = result === 1 /* ConnectionChoice.Allow */;
        if (allowed && checkboxChecked) {
            this.storageService.store(`${REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY}.${this._environmentService.remoteAuthority}`, allowed, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        return allowed;
    }
    async _checkInitialRemoteConnectionHealth() {
        try {
            const environment = await this._remoteAgentService.getRawEnvironment();
            if (environment && environment.isUnsupportedGlibc) {
                let allowed = this.storageService.getBoolean(`${REMOTE_UNSUPPORTED_CONNECTION_CHOICE_KEY}.${this._environmentService.remoteAuthority}`, 0 /* StorageScope.PROFILE */);
                if (allowed === undefined) {
                    allowed = await this._confirmConnection();
                }
                if (allowed) {
                    const bannerDismissedVersion = this.storageService.get(`${BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY}`, 0 /* StorageScope.PROFILE */) ?? '';
                    // Ignore patch versions and dismiss the banner if the major and minor versions match.
                    const shouldShowBanner = bannerDismissedVersion.slice(0, bannerDismissedVersion.lastIndexOf('.')) !== this.productService.version.slice(0, this.productService.version.lastIndexOf('.'));
                    if (shouldShowBanner) {
                        const actions = [
                            {
                                label: localize('unsupportedGlibcBannerLearnMore', "Learn More"),
                                href: 'https://aka.ms/vscode-remote/faq/old-linux'
                            }
                        ];
                        this.bannerService.show({
                            id: 'unsupportedGlibcWarning.banner',
                            message: localize('unsupportedGlibcWarning.banner', "You are connected to an OS version that is unsupported by {0}.", this.productService.nameLong),
                            actions,
                            icon: Codicon.warning,
                            closeLabel: `Do not show again in v${this.productService.version}`,
                            onClose: () => {
                                this.storageService.store(`${BANNER_REMOTE_UNSUPPORTED_CONNECTION_DISMISSED_KEY}`, this.productService.version, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                            }
                        });
                    }
                }
                else {
                    this.hostService.openWindow({ forceReuseWindow: true, remoteAuthority: null });
                    return;
                }
            }
            this._telemetryService.publicLog2('remoteConnectionSuccess', {
                web: isWeb,
                connectionTimeMs: await this._remoteAgentService.getConnection()?.getInitialConnectionTimeMs(),
                remoteName: getRemoteName(this._environmentService.remoteAuthority)
            });
            await this._measureExtHostLatency();
        }
        catch (err) {
            this._telemetryService.publicLog2('remoteConnectionFailure', {
                web: isWeb,
                connectionTimeMs: await this._remoteAgentService.getConnection()?.getInitialConnectionTimeMs(),
                remoteName: getRemoteName(this._environmentService.remoteAuthority),
                message: err ? err.message : ''
            });
        }
    }
    async _measureExtHostLatency() {
        const measurement = await remoteConnectionLatencyMeasurer.measure(this._remoteAgentService);
        if (measurement === undefined) {
            return;
        }
        this._telemetryService.publicLog2('remoteConnectionLatency', {
            web: isWeb,
            remoteName: getRemoteName(this._environmentService.remoteAuthority),
            latencyMs: measurement.current
        });
    }
};
InitialRemoteConnectionHealthContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, ITelemetryService),
    __param(3, IBannerService),
    __param(4, IDialogService),
    __param(5, IOpenerService),
    __param(6, IHostService),
    __param(7, IStorageService),
    __param(8, IProductService)
], InitialRemoteConnectionHealthContribution);
export { InitialRemoteConnectionHealthContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29ubmVjdGlvbkhlYWx0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9yZW1vdGVDb25uZWN0aW9uSGVhbHRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdILE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFHM0QsTUFBTSx3Q0FBd0MsR0FBRyxvQ0FBb0MsQ0FBQztBQUN0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