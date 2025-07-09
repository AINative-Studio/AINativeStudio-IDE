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
import { Codicon } from '../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { GlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUserDataProfileStorageService } from '../../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
let ExtensionsResourceInitializer = class ExtensionsResourceInitializer {
    constructor(userDataProfileService, extensionManagementService, extensionGalleryService, extensionEnablementService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionEnablementService = extensionEnablementService;
        this.logService = logService;
    }
    async initialize(content) {
        const profileExtensions = JSON.parse(content);
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.userDataProfileService.currentProfile.extensionsResource);
        const extensionsToEnableOrDisable = [];
        const extensionsToInstall = [];
        for (const e of profileExtensions) {
            const isDisabled = this.extensionEnablementService.getDisabledExtensions().some(disabledExtension => areSameExtensions(disabledExtension, e.identifier));
            const installedExtension = installedExtensions.find(installed => areSameExtensions(installed.identifier, e.identifier));
            if (!installedExtension || (!installedExtension.isBuiltin && installedExtension.preRelease !== e.preRelease)) {
                extensionsToInstall.push(e);
            }
            if (isDisabled !== !!e.disabled) {
                extensionsToEnableOrDisable.push({ extension: e.identifier, enable: !e.disabled });
            }
        }
        const extensionsToUninstall = installedExtensions.filter(extension => !extension.isBuiltin && !profileExtensions.some(({ identifier }) => areSameExtensions(identifier, extension.identifier)));
        for (const { extension, enable } of extensionsToEnableOrDisable) {
            if (enable) {
                this.logService.trace(`Initializing Profile: Enabling extension...`, extension.id);
                await this.extensionEnablementService.enableExtension(extension);
                this.logService.info(`Initializing Profile: Enabled extension...`, extension.id);
            }
            else {
                this.logService.trace(`Initializing Profile: Disabling extension...`, extension.id);
                await this.extensionEnablementService.disableExtension(extension);
                this.logService.info(`Initializing Profile: Disabled extension...`, extension.id);
            }
        }
        if (extensionsToInstall.length) {
            const galleryExtensions = await this.extensionGalleryService.getExtensions(extensionsToInstall.map(e => ({ ...e.identifier, version: e.version, hasPreRelease: e.version ? undefined : e.preRelease })), CancellationToken.None);
            await Promise.all(extensionsToInstall.map(async (e) => {
                const extension = galleryExtensions.find(galleryExtension => areSameExtensions(galleryExtension.identifier, e.identifier));
                if (!extension) {
                    return;
                }
                if (await this.extensionManagementService.canInstall(extension) === true) {
                    this.logService.trace(`Initializing Profile: Installing extension...`, extension.identifier.id, extension.version);
                    await this.extensionManagementService.installFromGallery(extension, {
                        isMachineScoped: false, /* set isMachineScoped value to prevent install and sync dialog in web */
                        donotIncludePackAndDependencies: true,
                        installGivenVersion: !!e.version,
                        installPreReleaseVersion: e.preRelease,
                        profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                        context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true, [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true }
                    });
                    this.logService.info(`Initializing Profile: Installed extension...`, extension.identifier.id, extension.version);
                }
                else {
                    this.logService.info(`Initializing Profile: Skipped installing extension because it cannot be installed.`, extension.identifier.id);
                }
            }));
        }
        if (extensionsToUninstall.length) {
            await Promise.all(extensionsToUninstall.map(e => this.extensionManagementService.uninstall(e)));
        }
    }
};
ExtensionsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, ILogService)
], ExtensionsResourceInitializer);
export { ExtensionsResourceInitializer };
let ExtensionsResource = class ExtensionsResource {
    constructor(extensionManagementService, extensionGalleryService, userDataProfileStorageService, instantiationService, logService) {
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    async getContent(profile, exclude) {
        const extensions = await this.getLocalExtensions(profile);
        return this.toContent(extensions, exclude);
    }
    toContent(extensions, exclude) {
        return JSON.stringify(exclude?.length ? extensions.filter(e => !exclude.includes(e.identifier.id.toLowerCase())) : extensions);
    }
    async apply(content, profile, progress, token) {
        return this.withProfileScopedServices(profile, async (extensionEnablementService) => {
            const profileExtensions = await this.getProfileExtensions(content);
            const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
            const extensionsToEnableOrDisable = [];
            const extensionsToInstall = [];
            for (const e of profileExtensions) {
                const isDisabled = extensionEnablementService.getDisabledExtensions().some(disabledExtension => areSameExtensions(disabledExtension, e.identifier));
                const installedExtension = installedExtensions.find(installed => areSameExtensions(installed.identifier, e.identifier));
                if (!installedExtension || (!installedExtension.isBuiltin && installedExtension.preRelease !== e.preRelease)) {
                    extensionsToInstall.push(e);
                }
                if (isDisabled !== !!e.disabled) {
                    extensionsToEnableOrDisable.push({ extension: e.identifier, enable: !e.disabled });
                }
            }
            const extensionsToUninstall = installedExtensions.filter(extension => !extension.isBuiltin && !profileExtensions.some(({ identifier }) => areSameExtensions(identifier, extension.identifier)) && !extension.isApplicationScoped);
            for (const { extension, enable } of extensionsToEnableOrDisable) {
                if (enable) {
                    this.logService.trace(`Importing Profile (${profile.name}): Enabling extension...`, extension.id);
                    await extensionEnablementService.enableExtension(extension);
                    this.logService.info(`Importing Profile (${profile.name}): Enabled extension...`, extension.id);
                }
                else {
                    this.logService.trace(`Importing Profile (${profile.name}): Disabling extension...`, extension.id);
                    await extensionEnablementService.disableExtension(extension);
                    this.logService.info(`Importing Profile (${profile.name}): Disabled extension...`, extension.id);
                }
            }
            if (extensionsToInstall.length) {
                this.logService.info(`Importing Profile (${profile.name}): Started installing extensions.`);
                const galleryExtensions = await this.extensionGalleryService.getExtensions(extensionsToInstall.map(e => ({ ...e.identifier, version: e.version, hasPreRelease: e.version ? undefined : e.preRelease })), CancellationToken.None);
                const installExtensionInfos = [];
                await Promise.all(extensionsToInstall.map(async (e) => {
                    const extension = galleryExtensions.find(galleryExtension => areSameExtensions(galleryExtension.identifier, e.identifier));
                    if (!extension) {
                        return;
                    }
                    if (await this.extensionManagementService.canInstall(extension) === true) {
                        installExtensionInfos.push({
                            extension,
                            options: {
                                isMachineScoped: false, /* set isMachineScoped value to prevent install and sync dialog in web */
                                donotIncludePackAndDependencies: true,
                                installGivenVersion: !!e.version,
                                installPreReleaseVersion: e.preRelease,
                                profileLocation: profile.extensionsResource,
                                context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true }
                            }
                        });
                    }
                    else {
                        this.logService.info(`Importing Profile (${profile.name}): Skipped installing extension because it cannot be installed.`, extension.identifier.id);
                    }
                }));
                if (installExtensionInfos.length) {
                    if (token) {
                        await this.extensionManagementService.requestPublisherTrust(installExtensionInfos);
                        for (const installExtensionInfo of installExtensionInfos) {
                            if (token.isCancellationRequested) {
                                return;
                            }
                            progress?.(localize('installingExtension', "Installing extension {0}...", installExtensionInfo.extension.displayName ?? installExtensionInfo.extension.identifier.id));
                            await this.extensionManagementService.installFromGallery(installExtensionInfo.extension, installExtensionInfo.options);
                        }
                    }
                    else {
                        await this.extensionManagementService.installGalleryExtensions(installExtensionInfos);
                    }
                }
                this.logService.info(`Importing Profile (${profile.name}): Finished installing extensions.`);
            }
            if (extensionsToUninstall.length) {
                await Promise.all(extensionsToUninstall.map(e => this.extensionManagementService.uninstall(e)));
            }
        });
    }
    async copy(from, to, disableExtensions) {
        await this.extensionManagementService.copyExtensions(from.extensionsResource, to.extensionsResource);
        const extensionsToDisable = await this.withProfileScopedServices(from, async (extensionEnablementService) => extensionEnablementService.getDisabledExtensions());
        if (disableExtensions) {
            const extensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, to.extensionsResource);
            for (const extension of extensions) {
                extensionsToDisable.push(extension.identifier);
            }
        }
        await this.withProfileScopedServices(to, async (extensionEnablementService) => Promise.all(extensionsToDisable.map(extension => extensionEnablementService.disableExtension(extension))));
    }
    async getLocalExtensions(profile) {
        return this.withProfileScopedServices(profile, async (extensionEnablementService) => {
            const result = new Map();
            const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
            const disabledExtensions = extensionEnablementService.getDisabledExtensions();
            for (const extension of installedExtensions) {
                const { identifier, preRelease } = extension;
                const disabled = disabledExtensions.some(disabledExtension => areSameExtensions(disabledExtension, identifier));
                if (extension.isBuiltin && !disabled) {
                    // skip enabled builtin extensions
                    continue;
                }
                if (!extension.isBuiltin) {
                    if (!extension.identifier.uuid) {
                        // skip user extensions without uuid
                        continue;
                    }
                }
                const existing = result.get(identifier.id.toLowerCase());
                if (existing?.disabled) {
                    // Remove the duplicate disabled extension
                    result.delete(identifier.id.toLowerCase());
                }
                const profileExtension = { identifier, displayName: extension.manifest.displayName };
                if (disabled) {
                    profileExtension.disabled = true;
                }
                if (!extension.isBuiltin && extension.pinned) {
                    profileExtension.version = extension.manifest.version;
                }
                if (!profileExtension.version && preRelease) {
                    profileExtension.preRelease = true;
                }
                profileExtension.applicationScoped = extension.isApplicationScoped;
                result.set(profileExtension.identifier.id.toLowerCase(), profileExtension);
            }
            return [...result.values()];
        });
    }
    async getProfileExtensions(content) {
        return JSON.parse(content);
    }
    async withProfileScopedServices(profile, fn) {
        return this.userDataProfileStorageService.withProfileScopedStorageService(profile, async (storageService) => {
            const disposables = new DisposableStore();
            const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStorageService, storageService])));
            const extensionEnablementService = disposables.add(instantiationService.createInstance(GlobalExtensionEnablementService));
            try {
                return await fn(extensionEnablementService);
            }
            finally {
                disposables.dispose();
            }
        });
    }
};
ExtensionsResource = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IExtensionGalleryService),
    __param(2, IUserDataProfileStorageService),
    __param(3, IInstantiationService),
    __param(4, ILogService)
], ExtensionsResource);
export { ExtensionsResource };
export class ExtensionsResourceTreeItem {
    constructor() {
        this.type = "extensions" /* ProfileResourceType.Extensions */;
        this.handle = "extensions" /* ProfileResourceType.Extensions */;
        this.label = { label: localize('extensions', "Extensions") };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
        this.contextValue = "extensions" /* ProfileResourceType.Extensions */;
        this.excludedExtensions = new Set();
    }
    async getChildren() {
        const extensions = (await this.getExtensions()).sort((a, b) => (a.displayName ?? a.identifier.id).localeCompare(b.displayName ?? b.identifier.id));
        const that = this;
        return extensions.map(e => ({
            ...e,
            handle: e.identifier.id.toLowerCase(),
            parent: this,
            label: { label: e.displayName || e.identifier.id },
            description: e.applicationScoped ? localize('all profiles and disabled', "All Profiles") : undefined,
            collapsibleState: TreeItemCollapsibleState.None,
            checkbox: that.checkbox ? {
                get isChecked() { return !that.excludedExtensions.has(e.identifier.id.toLowerCase()); },
                set isChecked(value) {
                    if (value) {
                        that.excludedExtensions.delete(e.identifier.id.toLowerCase());
                    }
                    else {
                        that.excludedExtensions.add(e.identifier.id.toLowerCase());
                    }
                },
                tooltip: localize('exclude', "Select {0} Extension", e.displayName || e.identifier.id),
                accessibilityInformation: {
                    label: localize('exclude', "Select {0} Extension", e.displayName || e.identifier.id),
                }
            } : undefined,
            themeIcon: Codicon.extensions,
            command: {
                id: 'extension.open',
                title: '',
                arguments: [e.identifier.id, undefined, true]
            }
        }));
    }
    async hasContent() {
        const extensions = await this.getExtensions();
        return extensions.length > 0;
    }
}
let ExtensionsResourceExportTreeItem = class ExtensionsResourceExportTreeItem extends ExtensionsResourceTreeItem {
    constructor(profile, instantiationService) {
        super();
        this.profile = profile;
        this.instantiationService = instantiationService;
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.extensions;
    }
    getExtensions() {
        return this.instantiationService.createInstance(ExtensionsResource).getLocalExtensions(this.profile);
    }
    async getContent() {
        return this.instantiationService.createInstance(ExtensionsResource).getContent(this.profile, [...this.excludedExtensions.values()]);
    }
};
ExtensionsResourceExportTreeItem = __decorate([
    __param(1, IInstantiationService)
], ExtensionsResourceExportTreeItem);
export { ExtensionsResourceExportTreeItem };
let ExtensionsResourceImportTreeItem = class ExtensionsResourceImportTreeItem extends ExtensionsResourceTreeItem {
    constructor(content, instantiationService) {
        super();
        this.content = content;
        this.instantiationService = instantiationService;
    }
    isFromDefaultProfile() {
        return false;
    }
    getExtensions() {
        return this.instantiationService.createInstance(ExtensionsResource).getProfileExtensions(this.content);
    }
    async getContent() {
        const extensionsResource = this.instantiationService.createInstance(ExtensionsResource);
        const extensions = await extensionsResource.getProfileExtensions(this.content);
        return extensionsResource.toContent(extensions, [...this.excludedExtensions.values()]);
    }
};
ExtensionsResourceImportTreeItem = __decorate([
    __param(1, IInstantiationService)
], ExtensionsResourceImportTreeItem);
export { ExtensionsResourceImportTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Jlc291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9leHRlbnNpb25zUmVzb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDakksT0FBTyxFQUFFLDhDQUE4QyxFQUFFLDBDQUEwQyxFQUFFLHdCQUF3QixFQUF3QiwyQkFBMkIsRUFBRSxpQ0FBaUMsRUFBeUMsTUFBTSx3RUFBd0UsQ0FBQztBQUMzVSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUUvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBQzlILE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RixPQUFPLEVBQUUsb0NBQW9D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