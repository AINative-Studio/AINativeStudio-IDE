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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQXFCLDBCQUEwQixFQUErRCxNQUFNLDBCQUEwQixDQUFDO0FBRXRKLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV4RCxTQUFTLGtCQUFrQixDQUFDLFNBQWM7SUFDekMsT0FBTyxTQUFTLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztBQUNyQyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsU0FBYztJQUNuQyxPQUFPLFNBQVMsQ0FBQyxJQUFJLCtCQUF1QixJQUFJLFNBQVMsQ0FBQyxJQUFJLGlDQUF5QixDQUFDO0FBQ3pGLENBQUM7QUFHRCxNQUFNLFlBQVksR0FBRyxzREFBc0QsQ0FBQztBQUVyRSxJQUFNLHdCQUF3QixHQUE5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