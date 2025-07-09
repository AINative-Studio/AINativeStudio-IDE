/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { ExtensionManagementChannelClient as BaseExtensionManagementChannelClient } from '../../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { Emitter } from '../../../../base/common/event.js';
import { delta } from '../../../../base/common/arrays.js';
import { compare } from '../../../../base/common/strings.js';
export class ProfileAwareExtensionManagementChannelClient extends BaseExtensionManagementChannelClient {
    get onProfileAwareDidInstallExtensions() { return this._onDidProfileAwareInstallExtensions.event; }
    get onProfileAwareDidUninstallExtension() { return this._onDidProfileAwareUninstallExtension.event; }
    get onProfileAwareDidUpdateExtensionMetadata() { return this._onDidProfileAwareUpdateExtensionMetadata.event; }
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService) {
        super(channel, productService, allowedExtensionsService);
        this.userDataProfileService = userDataProfileService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this._onDidProfileAwareInstallExtensions = this._register(new Emitter());
        this._onDidProfileAwareUninstallExtension = this._register(new Emitter());
        this._onDidProfileAwareUpdateExtensionMetadata = this._register(new Emitter());
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.extensionsResource, e.profile.extensionsResource)) {
                e.join(this.whenProfileChanged(e));
            }
        }));
    }
    async onInstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onInstallExtension.fire(data);
        }
    }
    async onDidInstallExtensionsEvent(results) {
        const filtered = [];
        for (const e of results) {
            const result = this.filterEvent(e.profileLocation, e.applicationScoped ?? e.local?.isApplicationScoped ?? false);
            if (result instanceof Promise ? await result : result) {
                filtered.push(e);
            }
        }
        if (filtered.length) {
            this._onDidInstallExtensions.fire(filtered);
        }
        this._onDidProfileAwareInstallExtensions.fire(results);
    }
    async onUninstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onUninstallExtension.fire(data);
        }
    }
    async onDidUninstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onDidUninstallExtension.fire(data);
        }
        this._onDidProfileAwareUninstallExtension.fire(data);
    }
    async onDidUpdateExtensionMetadataEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.local?.isApplicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onDidUpdateExtensionMetadata.fire(data);
        }
        this._onDidProfileAwareUpdateExtensionMetadata.fire(data);
    }
    async install(vsix, installOptions) {
        installOptions = { ...installOptions, profileLocation: await this.getProfileLocation(installOptions?.profileLocation) };
        return super.install(vsix, installOptions);
    }
    async installFromLocation(location, profileLocation) {
        return super.installFromLocation(location, await this.getProfileLocation(profileLocation));
    }
    async installFromGallery(extension, installOptions) {
        installOptions = { ...installOptions, profileLocation: await this.getProfileLocation(installOptions?.profileLocation) };
        return super.installFromGallery(extension, installOptions);
    }
    async installGalleryExtensions(extensions) {
        const infos = [];
        for (const extension of extensions) {
            infos.push({ ...extension, options: { ...extension.options, profileLocation: await this.getProfileLocation(extension.options?.profileLocation) } });
        }
        return super.installGalleryExtensions(infos);
    }
    async uninstall(extension, options) {
        options = { ...options, profileLocation: await this.getProfileLocation(options?.profileLocation) };
        return super.uninstall(extension, options);
    }
    async uninstallExtensions(extensions) {
        const infos = [];
        for (const { extension, options } of extensions) {
            infos.push({ extension, options: { ...options, profileLocation: await this.getProfileLocation(options?.profileLocation) } });
        }
        return super.uninstallExtensions(infos);
    }
    async getInstalled(type = null, extensionsProfileResource, productVersion) {
        return super.getInstalled(type, await this.getProfileLocation(extensionsProfileResource), productVersion);
    }
    async updateMetadata(local, metadata, extensionsProfileResource) {
        return super.updateMetadata(local, metadata, await this.getProfileLocation(extensionsProfileResource));
    }
    async toggleAppliationScope(local, fromProfileLocation) {
        return super.toggleAppliationScope(local, await this.getProfileLocation(fromProfileLocation));
    }
    async copyExtensions(fromProfileLocation, toProfileLocation) {
        return super.copyExtensions(await this.getProfileLocation(fromProfileLocation), await this.getProfileLocation(toProfileLocation));
    }
    async whenProfileChanged(e) {
        const previousProfileLocation = await this.getProfileLocation(e.previous.extensionsResource);
        const currentProfileLocation = await this.getProfileLocation(e.profile.extensionsResource);
        if (this.uriIdentityService.extUri.isEqual(previousProfileLocation, currentProfileLocation)) {
            return;
        }
        const eventData = await this.switchExtensionsProfile(previousProfileLocation, currentProfileLocation);
        this._onDidChangeProfile.fire(eventData);
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        const oldExtensions = await this.getInstalled(1 /* ExtensionType.User */, previousProfileLocation);
        const newExtensions = await this.getInstalled(1 /* ExtensionType.User */, currentProfileLocation);
        if (preserveExtensions?.length) {
            const extensionsToInstall = [];
            for (const extension of oldExtensions) {
                if (preserveExtensions.some(id => ExtensionIdentifier.equals(extension.identifier.id, id)) &&
                    !newExtensions.some(e => ExtensionIdentifier.equals(e.identifier.id, extension.identifier.id))) {
                    extensionsToInstall.push(extension.identifier);
                }
            }
            if (extensionsToInstall.length) {
                await this.installExtensionsFromProfile(extensionsToInstall, previousProfileLocation, currentProfileLocation);
            }
        }
        return delta(oldExtensions, newExtensions, (a, b) => compare(`${ExtensionIdentifier.toKey(a.identifier.id)}@${a.manifest.version}`, `${ExtensionIdentifier.toKey(b.identifier.id)}@${b.manifest.version}`));
    }
    async getProfileLocation(profileLocation) {
        return profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENoYW5uZWxDbGllbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRDaGFubmVsQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBdUMsTUFBTSxzREFBc0QsQ0FBQztBQUNoSSxPQUFPLEVBQUUsZ0NBQWdDLElBQUksb0NBQW9DLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUdySyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUs3RCxNQUFNLE9BQWdCLDRDQUE2QyxTQUFRLG9DQUFvQztJQU05RyxJQUFJLGtDQUFrQyxLQUFLLE9BQU8sSUFBSSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHbkcsSUFBSSxtQ0FBbUMsS0FBSyxPQUFPLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBR3JHLElBQUksd0NBQXdDLEtBQUssT0FBTyxJQUFJLENBQUMseUNBQXlDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUUvRyxZQUFZLE9BQWlCLEVBQzVCLGNBQStCLEVBQy9CLHdCQUFtRCxFQUNoQyxzQkFBK0MsRUFDL0Msa0JBQXVDO1FBRTFELEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFIdEMsMkJBQXNCLEdBQXRCLHNCQUFzQixD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