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
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { AllowedExtensionsConfigKey } from './extensionManagement.js';
import { IProductService } from '../../product/common/productService.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { isBoolean, isObject, isUndefined } from '../../../base/common/types.js';
import { Emitter } from '../../../base/common/event.js';
function isGalleryExtension(extension) {
    return extension.type === 'gallery';
}
function isIExtension(extension) {
    return extension.type === 1 /* ExtensionType.User */ || extension.type === 0 /* ExtensionType.System */;
}
const VersionRegex = /^(?<version>\d+\.\d+\.\d+(-.*)?)(@(?<platform>.+))?$/;
let AllowedExtensionsService = class AllowedExtensionsService extends Disposable {
    get allowedExtensionsConfigValue() {
        return this._allowedExtensionsConfigValue;
    }
    constructor(productService, configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeAllowedExtensions = this._register(new Emitter());
        this.onDidChangeAllowedExtensionsConfigValue = this._onDidChangeAllowedExtensions.event;
        this.publisherOrgs = productService.extensionPublisherOrgs?.map(p => p.toLowerCase()) ?? [];
        this._allowedExtensionsConfigValue = this.getAllowedExtensionsValue();
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AllowedExtensionsConfigKey)) {
                this._allowedExtensionsConfigValue = this.getAllowedExtensionsValue();
                this._onDidChangeAllowedExtensions.fire();
            }
        }));
    }
    getAllowedExtensionsValue() {
        const value = this.configurationService.getValue(AllowedExtensionsConfigKey);
        if (!isObject(value) || Array.isArray(value)) {
            return undefined;
        }
        const entries = Object.entries(value).map(([key, value]) => [key.toLowerCase(), value]);
        if (entries.length === 1 && entries[0][0] === '*' && entries[0][1] === true) {
            return undefined;
        }
        return Object.fromEntries(entries);
    }
    isAllowed(extension) {
        if (!this._allowedExtensionsConfigValue) {
            return true;
        }
        let id, version, targetPlatform, prerelease, publisher, publisherDisplayName;
        if (isGalleryExtension(extension)) {
            id = extension.identifier.id.toLowerCase();
            version = extension.version;
            prerelease = extension.properties.isPreReleaseVersion;
            publisher = extension.publisher.toLowerCase();
            publisherDisplayName = extension.publisherDisplayName.toLowerCase();
            targetPlatform = extension.properties.targetPlatform;
        }
        else if (isIExtension(extension)) {
            id = extension.identifier.id.toLowerCase();
            version = extension.manifest.version;
            prerelease = extension.preRelease;
            publisher = extension.manifest.publisher.toLowerCase();
            publisherDisplayName = extension.publisherDisplayName?.toLowerCase();
            targetPlatform = extension.targetPlatform;
        }
        else {
            id = extension.id.toLowerCase();
            version = extension.version ?? '*';
            targetPlatform = extension.targetPlatform ?? "universal" /* TargetPlatform.UNIVERSAL */;
            prerelease = extension.prerelease ?? false;
            publisher = extension.id.substring(0, extension.id.indexOf('.')).toLowerCase();
            publisherDisplayName = extension.publisherDisplayName?.toLowerCase();
        }
        const settingsCommandLink = URI.parse(`command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify({ query: `@id:${AllowedExtensionsConfigKey}` }))}`).toString();
        const extensionValue = this._allowedExtensionsConfigValue[id];
        const extensionReason = new MarkdownString(nls.localize('specific extension not allowed', "it is not in the [allowed list]({0})", settingsCommandLink));
        if (!isUndefined(extensionValue)) {
            if (isBoolean(extensionValue)) {
                return extensionValue ? true : extensionReason;
            }
            if (extensionValue === 'stable' && prerelease) {
                return new MarkdownString(nls.localize('extension prerelease not allowed', "the pre-release versions of this extension are not in the [allowed list]({0})", settingsCommandLink));
            }
            if (version !== '*' && Array.isArray(extensionValue) && !extensionValue.some(v => {
                const match = VersionRegex.exec(v);
                if (match && match.groups) {
                    const { platform: p, version: v } = match.groups;
                    if (v !== version) {
                        return false;
                    }
                    if (targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ && p && targetPlatform !== p) {
                        return false;
                    }
                    return true;
                }
                return false;
            })) {
                return new MarkdownString(nls.localize('specific version of extension not allowed', "the version {0} of this extension is not in the [allowed list]({1})", version, settingsCommandLink));
            }
            return true;
        }
        const publisherKey = publisherDisplayName && this.publisherOrgs.includes(publisherDisplayName) ? publisherDisplayName : publisher;
        const publisherValue = this._allowedExtensionsConfigValue[publisherKey];
        if (!isUndefined(publisherValue)) {
            if (isBoolean(publisherValue)) {
                return publisherValue ? true : new MarkdownString(nls.localize('publisher not allowed', "the extensions from this publisher are not in the [allowed list]({1})", publisherKey, settingsCommandLink));
            }
            if (publisherValue === 'stable' && prerelease) {
                return new MarkdownString(nls.localize('prerelease versions from this publisher not allowed', "the pre-release versions from this publisher are not in the [allowed list]({1})", publisherKey, settingsCommandLink));
            }
            return true;
        }
        if (this._allowedExtensionsConfigValue['*'] === true) {
            return true;
        }
        return extensionReason;
    }
};
AllowedExtensionsService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], AllowedExtensionsService);
export { AllowedExtensionsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2FsbG93ZWRFeHRlbnNpb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFxQiwwQkFBMEIsRUFBK0QsTUFBTSwwQkFBMEIsQ0FBQztBQUV0SixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsU0FBUyxrQkFBa0IsQ0FBQyxTQUFjO0lBQ3pDLE9BQU8sU0FBUyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUM7QUFDckMsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLFNBQWM7SUFDbkMsT0FBTyxTQUFTLENBQUMsSUFBSSwrQkFBdUIsSUFBSSxTQUFTLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQztBQUN6RixDQUFDO0FBR0QsTUFBTSxZQUFZLEdBQUcsc0RBQXNELENBQUM7QUFFckUsSUFBTSx3QkFBd0IsR0FB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