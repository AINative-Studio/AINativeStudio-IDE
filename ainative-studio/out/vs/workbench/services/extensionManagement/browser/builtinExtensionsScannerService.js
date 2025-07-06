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
import { IBuiltinExtensionsScannerService } from '../../../../platform/extensions/common/extensions.js';
import { isWeb, Language } from '../../../../base/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { builtinExtensionsPath, FileAccess } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { localizeManifest } from '../../../../platform/extensionManagement/common/extensionNls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mainWindow } from '../../../../base/browser/window.js';
let BuiltinExtensionsScannerService = class BuiltinExtensionsScannerService {
    constructor(environmentService, uriIdentityService, extensionResourceLoaderService, productService, logService) {
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
        this.builtinExtensionsPromises = [];
        if (isWeb) {
            const nlsBaseUrl = productService.extensionsGallery?.nlsBaseUrl;
            // Only use the nlsBaseUrl if we are using a language other than the default, English.
            if (nlsBaseUrl && productService.commit && !Language.isDefaultVariant()) {
                this.nlsUrl = URI.joinPath(URI.parse(nlsBaseUrl), productService.commit, productService.version, Language.value());
            }
            const builtinExtensionsServiceUrl = FileAccess.asBrowserUri(builtinExtensionsPath);
            if (builtinExtensionsServiceUrl) {
                let bundledExtensions = [];
                if (environmentService.isBuilt) {
                    // Built time configuration (do NOT modify)
                    bundledExtensions = [ /*BUILD->INSERT_BUILTIN_EXTENSIONS*/];
                }
                else {
                    // Find builtin extensions by checking for DOM
                    const builtinExtensionsElement = mainWindow.document.getElementById('vscode-workbench-builtin-extensions');
                    const builtinExtensionsElementAttribute = builtinExtensionsElement ? builtinExtensionsElement.getAttribute('data-settings') : undefined;
                    if (builtinExtensionsElementAttribute) {
                        try {
                            bundledExtensions = JSON.parse(builtinExtensionsElementAttribute);
                        }
                        catch (error) { /* ignore error*/ }
                    }
                }
                this.builtinExtensionsPromises = bundledExtensions.map(async (e) => {
                    const id = getGalleryExtensionId(e.packageJSON.publisher, e.packageJSON.name);
                    return {
                        identifier: { id },
                        location: uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.extensionPath),
                        type: 0 /* ExtensionType.System */,
                        isBuiltin: true,
                        manifest: e.packageNLS ? await this.localizeManifest(id, e.packageJSON, e.packageNLS) : e.packageJSON,
                        readmeUrl: e.readmePath ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.readmePath) : undefined,
                        changelogUrl: e.changelogPath ? uriIdentityService.extUri.joinPath(builtinExtensionsServiceUrl, e.changelogPath) : undefined,
                        targetPlatform: "web" /* TargetPlatform.WEB */,
                        validations: [],
                        isValid: true,
                        preRelease: false,
                    };
                });
            }
        }
    }
    async scanBuiltinExtensions() {
        return [...await Promise.all(this.builtinExtensionsPromises)];
    }
    async localizeManifest(extensionId, manifest, fallbackTranslations) {
        if (!this.nlsUrl) {
            return localizeManifest(this.logService, manifest, fallbackTranslations);
        }
        // the `package` endpoint returns the translations in a key-value format similar to the package.nls.json file.
        const uri = URI.joinPath(this.nlsUrl, extensionId, 'package');
        try {
            const res = await this.extensionResourceLoaderService.readExtensionResource(uri);
            const json = JSON.parse(res.toString());
            return localizeManifest(this.logService, manifest, json, fallbackTranslations);
        }
        catch (e) {
            this.logService.error(e);
            return localizeManifest(this.logService, manifest, fallbackTranslations);
        }
    }
};
BuiltinExtensionsScannerService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IUriIdentityService),
    __param(2, IExtensionResourceLoaderService),
    __param(3, IProductService),
    __param(4, ILogService)
], BuiltinExtensionsScannerService);
export { BuiltinExtensionsScannerService };
registerSingleton(IBuiltinExtensionsScannerService, BuiltinExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQWlFLE1BQU0sc0RBQXNELENBQUM7QUFDdkssT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUNqSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFpQixnQkFBZ0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFVekQsSUFBTSwrQkFBK0IsR0FB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