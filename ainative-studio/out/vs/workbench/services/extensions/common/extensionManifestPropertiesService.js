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
import { ALL_EXTENSION_KINDS, ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { ExtensionsRegistry } from './extensionsRegistry.js';
import { getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { WORKSPACE_TRUST_EXTENSION_SUPPORT } from '../../workspaces/common/workspaceTrust.js';
import { isBoolean } from '../../../../base/common/types.js';
import { IWorkspaceTrustEnablementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isWeb } from '../../../../base/common/platform.js';
export const IExtensionManifestPropertiesService = createDecorator('extensionManifestPropertiesService');
let ExtensionManifestPropertiesService = class ExtensionManifestPropertiesService extends Disposable {
    constructor(productService, configurationService, workspaceTrustEnablementService, logService) {
        super();
        this.productService = productService;
        this.configurationService = configurationService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.logService = logService;
        this._extensionPointExtensionKindsMap = null;
        this._productExtensionKindsMap = null;
        this._configuredExtensionKindsMap = null;
        this._productVirtualWorkspaceSupportMap = null;
        this._configuredVirtualWorkspaceSupportMap = null;
        // Workspace trust request type (settings.json)
        this._configuredExtensionWorkspaceTrustRequestMap = new ExtensionIdentifierMap();
        const configuredExtensionWorkspaceTrustRequests = configurationService.inspect(WORKSPACE_TRUST_EXTENSION_SUPPORT).userValue || {};
        for (const id of Object.keys(configuredExtensionWorkspaceTrustRequests)) {
            this._configuredExtensionWorkspaceTrustRequestMap.set(id, configuredExtensionWorkspaceTrustRequests[id]);
        }
        // Workspace trust request type (product.json)
        this._productExtensionWorkspaceTrustRequestMap = new Map();
        if (productService.extensionUntrustedWorkspaceSupport) {
            for (const id of Object.keys(productService.extensionUntrustedWorkspaceSupport)) {
                this._productExtensionWorkspaceTrustRequestMap.set(id, productService.extensionUntrustedWorkspaceSupport[id]);
            }
        }
    }
    prefersExecuteOnUI(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return (extensionKind.length > 0 && extensionKind[0] === 'ui');
    }
    prefersExecuteOnWorkspace(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return (extensionKind.length > 0 && extensionKind[0] === 'workspace');
    }
    prefersExecuteOnWeb(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return (extensionKind.length > 0 && extensionKind[0] === 'web');
    }
    canExecuteOnUI(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some(kind => kind === 'ui');
    }
    canExecuteOnWorkspace(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some(kind => kind === 'workspace');
    }
    canExecuteOnWeb(manifest) {
        const extensionKind = this.getExtensionKind(manifest);
        return extensionKind.some(kind => kind === 'web');
    }
    getExtensionKind(manifest) {
        const deducedExtensionKind = this.deduceExtensionKind(manifest);
        const configuredExtensionKind = this.getConfiguredExtensionKind(manifest);
        if (configuredExtensionKind && configuredExtensionKind.length > 0) {
            const result = [];
            for (const extensionKind of configuredExtensionKind) {
                if (extensionKind !== '-web') {
                    result.push(extensionKind);
                }
            }
            // If opted out from web without specifying other extension kinds then default to ui, workspace
            if (configuredExtensionKind.includes('-web') && !result.length) {
                result.push('ui');
                result.push('workspace');
            }
            // Add web kind if not opted out from web and can run in web
            if (isWeb && !configuredExtensionKind.includes('-web') && !configuredExtensionKind.includes('web') && deducedExtensionKind.includes('web')) {
                result.push('web');
            }
            return result;
        }
        return deducedExtensionKind;
    }
    getUserConfiguredExtensionKind(extensionIdentifier) {
        if (this._configuredExtensionKindsMap === null) {
            const configuredExtensionKindsMap = new ExtensionIdentifierMap();
            const configuredExtensionKinds = this.configurationService.getValue('remote.extensionKind') || {};
            for (const id of Object.keys(configuredExtensionKinds)) {
                configuredExtensionKindsMap.set(id, configuredExtensionKinds[id]);
            }
            this._configuredExtensionKindsMap = configuredExtensionKindsMap;
        }
        const userConfiguredExtensionKind = this._configuredExtensionKindsMap.get(extensionIdentifier.id);
        return userConfiguredExtensionKind ? this.toArray(userConfiguredExtensionKind) : undefined;
    }
    getExtensionUntrustedWorkspaceSupportType(manifest) {
        // Workspace trust feature is disabled, or extension has no entry point
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled() || !manifest.main) {
            return true;
        }
        // Get extension workspace trust requirements from settings.json
        const configuredWorkspaceTrustRequest = this.getConfiguredExtensionWorkspaceTrustRequest(manifest);
        // Get extension workspace trust requirements from product.json
        const productWorkspaceTrustRequest = this.getProductExtensionWorkspaceTrustRequest(manifest);
        // Use settings.json override value if it exists
        if (configuredWorkspaceTrustRequest !== undefined) {
            return configuredWorkspaceTrustRequest;
        }
        // Use product.json override value if it exists
        if (productWorkspaceTrustRequest?.override !== undefined) {
            return productWorkspaceTrustRequest.override;
        }
        // Use extension manifest value if it exists
        if (manifest.capabilities?.untrustedWorkspaces?.supported !== undefined) {
            return manifest.capabilities.untrustedWorkspaces.supported;
        }
        // Use product.json default value if it exists
        if (productWorkspaceTrustRequest?.default !== undefined) {
            return productWorkspaceTrustRequest.default;
        }
        return false;
    }
    getExtensionVirtualWorkspaceSupportType(manifest) {
        // check user configured
        const userConfiguredVirtualWorkspaceSupport = this.getConfiguredVirtualWorkspaceSupport(manifest);
        if (userConfiguredVirtualWorkspaceSupport !== undefined) {
            return userConfiguredVirtualWorkspaceSupport;
        }
        const productConfiguredWorkspaceSchemes = this.getProductVirtualWorkspaceSupport(manifest);
        // check override from product
        if (productConfiguredWorkspaceSchemes?.override !== undefined) {
            return productConfiguredWorkspaceSchemes.override;
        }
        // check the manifest
        const virtualWorkspaces = manifest.capabilities?.virtualWorkspaces;
        if (isBoolean(virtualWorkspaces)) {
            return virtualWorkspaces;
        }
        else if (virtualWorkspaces) {
            const supported = virtualWorkspaces.supported;
            if (isBoolean(supported) || supported === 'limited') {
                return supported;
            }
        }
        // check default from product
        if (productConfiguredWorkspaceSchemes?.default !== undefined) {
            return productConfiguredWorkspaceSchemes.default;
        }
        // Default - supports virtual workspace
        return true;
    }
    deduceExtensionKind(manifest) {
        // Not an UI extension if it has main
        if (manifest.main) {
            if (manifest.browser) {
                return isWeb ? ['workspace', 'web'] : ['workspace'];
            }
            return ['workspace'];
        }
        if (manifest.browser) {
            return ['web'];
        }
        let result = [...ALL_EXTENSION_KINDS];
        if (isNonEmptyArray(manifest.extensionPack) || isNonEmptyArray(manifest.extensionDependencies)) {
            // Extension pack defaults to [workspace, web] in web and only [workspace] in desktop
            result = isWeb ? ['workspace', 'web'] : ['workspace'];
        }
        if (manifest.contributes) {
            for (const contribution of Object.keys(manifest.contributes)) {
                const supportedExtensionKinds = this.getSupportedExtensionKindsForExtensionPoint(contribution);
                if (supportedExtensionKinds.length) {
                    result = result.filter(extensionKind => supportedExtensionKinds.includes(extensionKind));
                }
            }
        }
        if (!result.length) {
            this.logService.warn('Cannot deduce extensionKind for extension', getGalleryExtensionId(manifest.publisher, manifest.name));
        }
        return result;
    }
    getSupportedExtensionKindsForExtensionPoint(extensionPoint) {
        if (this._extensionPointExtensionKindsMap === null) {
            const extensionPointExtensionKindsMap = new Map();
            ExtensionsRegistry.getExtensionPoints().forEach(e => extensionPointExtensionKindsMap.set(e.name, e.defaultExtensionKind || [] /* supports all */));
            this._extensionPointExtensionKindsMap = extensionPointExtensionKindsMap;
        }
        let extensionPointExtensionKind = this._extensionPointExtensionKindsMap.get(extensionPoint);
        if (extensionPointExtensionKind) {
            return extensionPointExtensionKind;
        }
        extensionPointExtensionKind = this.productService.extensionPointExtensionKind ? this.productService.extensionPointExtensionKind[extensionPoint] : undefined;
        if (extensionPointExtensionKind) {
            return extensionPointExtensionKind;
        }
        /* Unknown extension point */
        return isWeb ? ['workspace', 'web'] : ['workspace'];
    }
    getConfiguredExtensionKind(manifest) {
        const extensionIdentifier = { id: getGalleryExtensionId(manifest.publisher, manifest.name) };
        // check in config
        let result = this.getUserConfiguredExtensionKind(extensionIdentifier);
        if (typeof result !== 'undefined') {
            return this.toArray(result);
        }
        // check product.json
        result = this.getProductExtensionKind(manifest);
        if (typeof result !== 'undefined') {
            return result;
        }
        // check the manifest itself
        result = manifest.extensionKind;
        if (typeof result !== 'undefined') {
            result = this.toArray(result);
            return result.filter(r => ['ui', 'workspace'].includes(r));
        }
        return null;
    }
    getProductExtensionKind(manifest) {
        if (this._productExtensionKindsMap === null) {
            const productExtensionKindsMap = new ExtensionIdentifierMap();
            if (this.productService.extensionKind) {
                for (const id of Object.keys(this.productService.extensionKind)) {
                    productExtensionKindsMap.set(id, this.productService.extensionKind[id]);
                }
            }
            this._productExtensionKindsMap = productExtensionKindsMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productExtensionKindsMap.get(extensionId);
    }
    getProductVirtualWorkspaceSupport(manifest) {
        if (this._productVirtualWorkspaceSupportMap === null) {
            const productWorkspaceSchemesMap = new ExtensionIdentifierMap();
            if (this.productService.extensionVirtualWorkspacesSupport) {
                for (const id of Object.keys(this.productService.extensionVirtualWorkspacesSupport)) {
                    productWorkspaceSchemesMap.set(id, this.productService.extensionVirtualWorkspacesSupport[id]);
                }
            }
            this._productVirtualWorkspaceSupportMap = productWorkspaceSchemesMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productVirtualWorkspaceSupportMap.get(extensionId);
    }
    getConfiguredVirtualWorkspaceSupport(manifest) {
        if (this._configuredVirtualWorkspaceSupportMap === null) {
            const configuredWorkspaceSchemesMap = new ExtensionIdentifierMap();
            const configuredWorkspaceSchemes = this.configurationService.getValue('extensions.supportVirtualWorkspaces') || {};
            for (const id of Object.keys(configuredWorkspaceSchemes)) {
                if (configuredWorkspaceSchemes[id] !== undefined) {
                    configuredWorkspaceSchemesMap.set(id, configuredWorkspaceSchemes[id]);
                }
            }
            this._configuredVirtualWorkspaceSupportMap = configuredWorkspaceSchemesMap;
        }
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._configuredVirtualWorkspaceSupportMap.get(extensionId);
    }
    getConfiguredExtensionWorkspaceTrustRequest(manifest) {
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        const extensionWorkspaceTrustRequest = this._configuredExtensionWorkspaceTrustRequestMap.get(extensionId);
        if (extensionWorkspaceTrustRequest && (extensionWorkspaceTrustRequest.version === undefined || extensionWorkspaceTrustRequest.version === manifest.version)) {
            return extensionWorkspaceTrustRequest.supported;
        }
        return undefined;
    }
    getProductExtensionWorkspaceTrustRequest(manifest) {
        const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
        return this._productExtensionWorkspaceTrustRequestMap.get(extensionId);
    }
    toArray(extensionKind) {
        if (Array.isArray(extensionKind)) {
            return extensionKind;
        }
        return extensionKind === 'ui' ? ['ui', 'workspace'] : [extensionKind];
    }
};
ExtensionManifestPropertiesService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceTrustEnablementService),
    __param(3, ILogService)
], ExtensionManifestPropertiesService);
export { ExtensionManifestPropertiesService };
registerSingleton(IExtensionManifestPropertiesService, ExtensionManifestPropertiesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQTBILG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFM08sT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FB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