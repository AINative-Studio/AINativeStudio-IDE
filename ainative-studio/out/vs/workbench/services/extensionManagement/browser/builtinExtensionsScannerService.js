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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbkV4dGVuc2lvbnNTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9icm93c2VyL2J1aWx0aW5FeHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFpRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZLLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDakksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBaUIsZ0JBQWdCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNsSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBVXpELElBQU0sK0JBQStCLEdB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