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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionGalleryManifestService, ExtensionGalleryServiceUrlConfigKey } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService as ExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { resolveMarketplaceHeaders } from '../../../../platform/externalServices/common/marketplace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
import { IHostService } from '../../host/browser/host.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
let WorkbenchExtensionGalleryManifestService = class WorkbenchExtensionGalleryManifestService extends ExtensionGalleryManifestService {
    constructor(productService, environmentService, fileService, telemetryService, storageService, remoteAgentService, sharedProcessService, configurationService, requestService, defaultAccountService, dialogService, hostService, logService) {
        super(productService);
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.defaultAccountService = defaultAccountService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.logService = logService;
        this.extensionGalleryManifest = null;
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, environmentService, configurationService, fileService, storageService, telemetryService);
        const channels = [sharedProcessService.getChannel('extensionGalleryManifest')];
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            channels.push(remoteConnection.getChannel('extensionGalleryManifest'));
        }
        this.getExtensionGalleryManifest().then(manifest => {
            channels.forEach(channel => channel.call('setExtensionGalleryManifest', [manifest]));
            this._register(this.onDidChangeExtensionGalleryManifest(manifest => channels.forEach(channel => channel.call('setExtensionGalleryManifest', [manifest]))));
        });
    }
    async getExtensionGalleryManifest() {
        if (!this.extensionGalleryManifestPromise) {
            this.extensionGalleryManifestPromise = this.doGetExtensionGalleryManifest();
        }
        await this.extensionGalleryManifestPromise;
        return this.extensionGalleryManifest ? this.extensionGalleryManifest[1] : null;
    }
    async doGetExtensionGalleryManifest() {
        const defaultServiceUrl = this.productService.extensionsGallery?.serviceUrl;
        if (!defaultServiceUrl) {
            this.extensionGalleryManifest = null;
            return;
        }
        const configuredServiceUrl = this.configurationService.getValue(ExtensionGalleryServiceUrlConfigKey);
        if (configuredServiceUrl && this.checkAccess(await this.defaultAccountService.getDefaultAccount())) {
            this.extensionGalleryManifest = [configuredServiceUrl, await this.getExtensionGalleryManifestFromServiceUrl(configuredServiceUrl)];
        }
        if (!this.extensionGalleryManifest) {
            const defaultExtensionGalleryManifest = await super.getExtensionGalleryManifest();
            if (defaultExtensionGalleryManifest) {
                this.extensionGalleryManifest = [defaultServiceUrl, defaultExtensionGalleryManifest];
            }
        }
        this._register(this.defaultAccountService.onDidChangeDefaultAccount(account => {
            if (!configuredServiceUrl) {
                return;
            }
            const canAccess = this.checkAccess(account);
            if (canAccess && this.extensionGalleryManifest?.[0] === configuredServiceUrl) {
                return;
            }
            if (!canAccess && this.extensionGalleryManifest?.[0] === defaultServiceUrl) {
                return;
            }
            this.extensionGalleryManifest = null;
            this._onDidChangeExtensionGalleryManifest.fire(null);
            this.requestRestart();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(ExtensionGalleryServiceUrlConfigKey)) {
                return;
            }
            const configuredServiceUrl = this.configurationService.getValue(ExtensionGalleryServiceUrlConfigKey);
            if (!configuredServiceUrl && this.extensionGalleryManifest?.[0] === defaultServiceUrl) {
                return;
            }
            if (configuredServiceUrl && this.extensionGalleryManifest?.[0] === configuredServiceUrl) {
                return;
            }
            this.extensionGalleryManifest = null;
            this._onDidChangeExtensionGalleryManifest.fire(null);
            this.requestRestart();
        }));
    }
    checkAccess(account) {
        if (!account) {
            this.logService.debug('[Marketplace] Checking account access for configured gallery: No account found');
            return false;
        }
        this.logService.debug('[Marketplace] Checking Account SKU access for configured gallery', account.access_type_sku);
        if (account.access_type_sku && this.productService.extensionsGallery?.accessSKUs?.includes(account.access_type_sku)) {
            this.logService.debug('[Marketplace] Account has access to configured gallery');
            return true;
        }
        this.logService.debug('[Marketplace] Checking enterprise account access for configured gallery', account.enterprise);
        return account.enterprise;
    }
    async requestRestart() {
        const confirmation = await this.dialogService.confirm({
            message: localize('extensionGalleryManifestService.accountChange', "{0} is now configured to a different Marketplace. Please restart to apply the changes.", this.productService.nameLong),
            primaryButton: localize({ key: 'restart', comment: ['&& denotes a mnemonic'] }, "&&Restart")
        });
        if (confirmation.confirmed) {
            return this.hostService.restart();
        }
    }
    async getExtensionGalleryManifestFromServiceUrl(url) {
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
        };
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url,
                headers,
            }, CancellationToken.None);
            const extensionGalleryManifest = await asJson(context);
            if (!extensionGalleryManifest) {
                throw new Error('Unable to retrieve extension gallery manifest.');
            }
            return extensionGalleryManifest;
        }
        catch (error) {
            this.logService.error('[Marketplace] Error retrieving extension gallery manifest', error);
            throw error;
        }
    }
};
WorkbenchExtensionGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentService),
    __param(2, IFileService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IRemoteAgentService),
    __param(6, ISharedProcessService),
    __param(7, IConfigurationService),
    __param(8, IRequestService),
    __param(9, IDefaultAccountService),
    __param(10, IDialogService),
    __param(11, IHostService),
    __param(12, ILogService)
], WorkbenchExtensionGalleryManifestService);
export { WorkbenchExtensionGalleryManifestService };
registerSingleton(IExtensionGalleryManifestService, WorkbenchExtensionGalleryManifestService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbkdhbGxlcnlNYW5pZmVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUE2QixtQ0FBbUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQy9MLE9BQU8sRUFBRSwrQkFBK0IsSUFBSSwrQkFBK0IsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQ3hLLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9B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