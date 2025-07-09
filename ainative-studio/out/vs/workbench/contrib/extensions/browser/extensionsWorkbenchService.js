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
var ExtensionsWorkbenchService_1;
import * as nls from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { index } from '../../../../base/common/arrays.js';
import { Promises, ThrottledDelayer, createCancelablePromise } from '../../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { singlePagePager } from '../../../../base/common/paging.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionGalleryService, WEB_EXTENSION_TAG, isTargetPlatformCompatible, EXTENSION_IDENTIFIER_REGEX, TargetPlatformToString, IAllowedExtensionsService, AllowedExtensionsConfigKey, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, ExtensionManagementError } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, DefaultIconPath } from '../../../services/extensionManagement/common/extensionManagement.js';
import { getGalleryExtensionTelemetryData, getLocalExtensionTelemetryData, areSameExtensions, groupByExtension, getGalleryExtensionId, isMalicious } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { URI } from '../../../../base/common/uri.js';
import { AutoUpdateConfigurationKey, AutoCheckUpdatesConfigurationKey, HasOutdatedExtensionsContext, AutoRestartConfigurationKey, VIEWLET_ID } from '../common/extensions.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import * as resources from '../../../../base/common/resources.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ExtensionIdentifier, isApplicationScopedExtension } from '../../../../platform/extensions/common/extensions.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataAutoSyncService, IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isBoolean, isDefined, isString, isUndefined } from '../../../../base/common/types.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IExtensionService, toExtension, toExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { isWeb, language } from '../../../../base/common/platform.js';
import { getLocale } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { areApiProposalsCompatible, isEngineValid } from '../../../../platform/extensions/common/extensionValidator.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ShowCurrentReleaseNotesActionId } from '../../update/common/update.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
let Extension = class Extension {
    constructor(stateProvider, runtimeStateProvider, server, local, _gallery, resourceExtensionInfo, galleryService, telemetryService, logService, fileService, productService) {
        this.stateProvider = stateProvider;
        this.runtimeStateProvider = runtimeStateProvider;
        this.server = server;
        this.local = local;
        this._gallery = _gallery;
        this.resourceExtensionInfo = resourceExtensionInfo;
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.fileService = fileService;
        this.productService = productService;
        this.enablementState = 11 /* EnablementState.EnabledGlobally */;
        this.galleryResourcesCache = new Map();
        this.malicious = false;
    }
    get resourceExtension() {
        if (this.resourceExtensionInfo) {
            return this.resourceExtensionInfo.resourceExtension;
        }
        if (this.local?.isWorkspaceScoped) {
            return {
                type: 'resource',
                identifier: this.local.identifier,
                location: this.local.location,
                manifest: this.local.manifest,
                changelogUri: this.local.changelogUrl,
                readmeUri: this.local.readmeUrl,
            };
        }
        return undefined;
    }
    get gallery() {
        return this._gallery;
    }
    set gallery(gallery) {
        this._gallery = gallery;
        this.galleryResourcesCache.clear();
    }
    get type() {
        return this.local ? this.local.type : 1 /* ExtensionType.User */;
    }
    get isBuiltin() {
        return this.local ? this.local.isBuiltin : false;
    }
    get isWorkspaceScoped() {
        if (this.local) {
            return this.local.isWorkspaceScoped;
        }
        if (this.resourceExtensionInfo) {
            return this.resourceExtensionInfo.isWorkspaceScoped;
        }
        return false;
    }
    get name() {
        if (this.gallery) {
            return this.gallery.name;
        }
        return this.getManifestFromLocalOrResource()?.name ?? '';
    }
    get displayName() {
        if (this.gallery) {
            return this.gallery.displayName || this.gallery.name;
        }
        return this.getManifestFromLocalOrResource()?.displayName ?? this.name;
    }
    get identifier() {
        if (this.gallery) {
            return this.gallery.identifier;
        }
        if (this.resourceExtension) {
            return this.resourceExtension.identifier;
        }
        return this.local.identifier;
    }
    get uuid() {
        return this.gallery ? this.gallery.identifier.uuid : this.local?.identifier.uuid;
    }
    get publisher() {
        if (this.gallery) {
            return this.gallery.publisher;
        }
        return this.getManifestFromLocalOrResource()?.publisher ?? '';
    }
    get publisherDisplayName() {
        if (this.gallery) {
            return this.gallery.publisherDisplayName || this.gallery.publisher;
        }
        if (this.local?.publisherDisplayName) {
            return this.local.publisherDisplayName;
        }
        return this.publisher;
    }
    get publisherUrl() {
        return this.gallery?.publisherLink ? URI.parse(this.gallery.publisherLink) : undefined;
    }
    get publisherDomain() {
        return this.gallery?.publisherDomain;
    }
    get publisherSponsorLink() {
        return this.gallery?.publisherSponsorLink ? URI.parse(this.gallery.publisherSponsorLink) : undefined;
    }
    get version() {
        return this.local ? this.local.manifest.version : this.latestVersion;
    }
    get private() {
        return this.local ? this.local.private : this.gallery ? this.gallery.private : false;
    }
    get pinned() {
        return !!this.local?.pinned;
    }
    get latestVersion() {
        return this.gallery ? this.gallery.version : this.getManifestFromLocalOrResource()?.version ?? '';
    }
    get description() {
        return this.gallery ? this.gallery.description : this.getManifestFromLocalOrResource()?.description ?? '';
    }
    get url() {
        return this.gallery?.detailsLink;
    }
    get iconUrl() {
        return this.galleryIconUrl || this.resourceExtensionIconUrl || this.localIconUrl || this.defaultIconUrl;
    }
    get iconUrlFallback() {
        return this.galleryIconUrlFallback || this.resourceExtensionIconUrl || this.localIconUrl || this.defaultIconUrl;
    }
    get localIconUrl() {
        if (this.local && this.local.manifest.icon) {
            return FileAccess.uriToBrowserUri(resources.joinPath(this.local.location, this.local.manifest.icon)).toString(true);
        }
        return null;
    }
    get resourceExtensionIconUrl() {
        if (this.resourceExtension?.manifest.icon) {
            return FileAccess.uriToBrowserUri(resources.joinPath(this.resourceExtension.location, this.resourceExtension.manifest.icon)).toString(true);
        }
        return null;
    }
    get galleryIconUrl() {
        return this.gallery?.assets.icon ? this.gallery.assets.icon.uri : null;
    }
    get galleryIconUrlFallback() {
        return this.gallery?.assets.icon ? this.gallery.assets.icon.fallbackUri : null;
    }
    get defaultIconUrl() {
        if (this.type === 0 /* ExtensionType.System */ && this.local) {
            if (this.local.manifest && this.local.manifest.contributes) {
                if (Array.isArray(this.local.manifest.contributes.themes) && this.local.manifest.contributes.themes.length) {
                    return FileAccess.asBrowserUri('vs/workbench/contrib/extensions/browser/media/theme-icon.png').toString(true);
                }
                if (Array.isArray(this.local.manifest.contributes.grammars) && this.local.manifest.contributes.grammars.length) {
                    return FileAccess.asBrowserUri('vs/workbench/contrib/extensions/browser/media/language-icon.svg').toString(true);
                }
            }
        }
        return DefaultIconPath;
    }
    get repository() {
        return this.gallery && this.gallery.assets.repository ? this.gallery.assets.repository.uri : undefined;
    }
    get licenseUrl() {
        return this.gallery && this.gallery.assets.license ? this.gallery.assets.license.uri : undefined;
    }
    get supportUrl() {
        return this.gallery && this.gallery.supportLink ? this.gallery.supportLink : undefined;
    }
    get state() {
        return this.stateProvider(this);
    }
    get isMalicious() {
        return this.malicious || this.enablementState === 4 /* EnablementState.DisabledByMalicious */;
    }
    get installCount() {
        return this.gallery ? this.gallery.installCount : undefined;
    }
    get rating() {
        return this.gallery ? this.gallery.rating : undefined;
    }
    get ratingCount() {
        return this.gallery ? this.gallery.ratingCount : undefined;
    }
    get ratingUrl() {
        return this.gallery?.ratingLink;
    }
    get outdated() {
        try {
            if (!this.gallery || !this.local) {
                return false;
            }
            // Do not allow updating system extensions in stable
            if (this.type === 0 /* ExtensionType.System */ && this.productService.quality === 'stable') {
                return false;
            }
            if (!this.local.preRelease && this.gallery.properties.isPreReleaseVersion) {
                return false;
            }
            if (semver.gt(this.latestVersion, this.version)) {
                return true;
            }
            if (this.outdatedTargetPlatform) {
                return true;
            }
        }
        catch (error) {
            /* Ignore */
        }
        return false;
    }
    get outdatedTargetPlatform() {
        return !!this.local && !!this.gallery
            && !["undefined" /* TargetPlatform.UNDEFINED */, "web" /* TargetPlatform.WEB */].includes(this.local.targetPlatform)
            && this.gallery.properties.targetPlatform !== "web" /* TargetPlatform.WEB */
            && this.local.targetPlatform !== this.gallery.properties.targetPlatform
            && semver.eq(this.latestVersion, this.version);
    }
    get runtimeState() {
        return this.runtimeStateProvider(this);
    }
    get telemetryData() {
        const { local, gallery } = this;
        if (gallery) {
            return getGalleryExtensionTelemetryData(gallery);
        }
        else if (local) {
            return getLocalExtensionTelemetryData(local);
        }
        else {
            return {};
        }
    }
    get preview() {
        return this.local?.manifest.preview ?? this.gallery?.preview ?? false;
    }
    get preRelease() {
        return !!this.local?.preRelease;
    }
    get isPreReleaseVersion() {
        if (this.local) {
            return this.local.isPreReleaseVersion;
        }
        return !!this.gallery?.properties.isPreReleaseVersion;
    }
    get hasPreReleaseVersion() {
        return !!this.gallery?.hasPreReleaseVersion || !!this.local?.hasPreReleaseVersion || !!this._extensionEnabledWithPreRelease;
    }
    get hasReleaseVersion() {
        return !!this.resourceExtension || !!this.gallery?.hasReleaseVersion;
    }
    getLocal() {
        return this.local && !this.outdated ? this.local : undefined;
    }
    async getManifest(token) {
        const local = this.getLocal();
        if (local) {
            return local.manifest;
        }
        if (this.gallery) {
            return this.getGalleryManifest(token);
        }
        if (this.resourceExtension) {
            return this.resourceExtension.manifest;
        }
        return null;
    }
    async getGalleryManifest(token = CancellationToken.None) {
        if (this.gallery) {
            let cache = this.galleryResourcesCache.get('manifest');
            if (!cache) {
                if (this.gallery.assets.manifest) {
                    this.galleryResourcesCache.set('manifest', cache = this.galleryService.getManifest(this.gallery, token)
                        .catch(e => {
                        this.galleryResourcesCache.delete('manifest');
                        throw e;
                    }));
                }
                else {
                    this.logService.error(nls.localize('Manifest is not found', "Manifest is not found"), this.identifier.id);
                }
            }
            return cache;
        }
        return null;
    }
    hasReadme() {
        if (this.local && this.local.readmeUrl) {
            return true;
        }
        if (this.gallery && this.gallery.assets.readme) {
            return true;
        }
        if (this.resourceExtension?.readmeUri) {
            return true;
        }
        return this.type === 0 /* ExtensionType.System */;
    }
    async getReadme(token) {
        const local = this.getLocal();
        if (local?.readmeUrl) {
            const content = await this.fileService.readFile(local.readmeUrl);
            return content.value.toString();
        }
        if (this.gallery) {
            if (this.gallery.assets.readme) {
                return this.galleryService.getReadme(this.gallery, token);
            }
            this.telemetryService.publicLog('extensions:NotFoundReadMe', this.telemetryData);
        }
        if (this.type === 0 /* ExtensionType.System */) {
            return Promise.resolve(`# ${this.displayName || this.name}
**Notice:** This extension is bundled with Visual Studio Code. It can be disabled but not uninstalled.
## Features
${this.description}
`);
        }
        if (this.resourceExtension?.readmeUri) {
            const content = await this.fileService.readFile(this.resourceExtension?.readmeUri);
            return content.value.toString();
        }
        return Promise.reject(new Error('not available'));
    }
    hasChangelog() {
        if (this.local && this.local.changelogUrl) {
            return true;
        }
        if (this.gallery && this.gallery.assets.changelog) {
            return true;
        }
        return this.type === 0 /* ExtensionType.System */;
    }
    async getChangelog(token) {
        const local = this.getLocal();
        if (local?.changelogUrl) {
            const content = await this.fileService.readFile(local.changelogUrl);
            return content.value.toString();
        }
        if (this.gallery?.assets.changelog) {
            return this.galleryService.getChangelog(this.gallery, token);
        }
        if (this.type === 0 /* ExtensionType.System */) {
            return Promise.resolve(`Please check the [VS Code Release Notes](command:${ShowCurrentReleaseNotesActionId}) for changes to the built-in extensions.`);
        }
        return Promise.reject(new Error('not available'));
    }
    get categories() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.categories && !this.outdated) {
            return local.manifest.categories;
        }
        if (gallery) {
            return gallery.categories;
        }
        if (resourceExtension) {
            return resourceExtension.manifest.categories ?? [];
        }
        return [];
    }
    get tags() {
        const { gallery } = this;
        if (gallery) {
            return gallery.tags.filter(tag => !tag.startsWith('_'));
        }
        return [];
    }
    get dependencies() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.extensionDependencies && !this.outdated) {
            return local.manifest.extensionDependencies;
        }
        if (gallery) {
            return gallery.properties.dependencies || [];
        }
        if (resourceExtension) {
            return resourceExtension.manifest.extensionDependencies || [];
        }
        return [];
    }
    get extensionPack() {
        const { local, gallery, resourceExtension } = this;
        if (local && local.manifest.extensionPack && !this.outdated) {
            return local.manifest.extensionPack;
        }
        if (gallery) {
            return gallery.properties.extensionPack || [];
        }
        if (resourceExtension) {
            return resourceExtension.manifest.extensionPack || [];
        }
        return [];
    }
    setExtensionsControlManifest(extensionsControlManifest) {
        this.malicious = isMalicious(this.identifier, extensionsControlManifest.malicious);
        this.deprecationInfo = extensionsControlManifest.deprecated ? extensionsControlManifest.deprecated[this.identifier.id.toLowerCase()] : undefined;
        this._extensionEnabledWithPreRelease = extensionsControlManifest?.extensionsEnabledWithPreRelease?.includes(this.identifier.id.toLowerCase());
    }
    getManifestFromLocalOrResource() {
        if (this.local) {
            return this.local.manifest;
        }
        if (this.resourceExtension) {
            return this.resourceExtension.manifest;
        }
        return null;
    }
};
Extension = __decorate([
    __param(6, IExtensionGalleryService),
    __param(7, ITelemetryService),
    __param(8, ILogService),
    __param(9, IFileService),
    __param(10, IProductService)
], Extension);
export { Extension };
const EXTENSIONS_AUTO_UPDATE_KEY = 'extensions.autoUpdate';
const EXTENSIONS_DONOT_AUTO_UPDATE_KEY = 'extensions.donotAutoUpdate';
const EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY = 'extensions.dismissedNotifications';
let Extensions = class Extensions extends Disposable {
    get onChange() { return this._onChange.event; }
    get onReset() { return this._onReset.event; }
    constructor(server, stateProvider, runtimeStateProvider, isWorkspaceServer, galleryService, extensionEnablementService, workbenchExtensionManagementService, telemetryService, instantiationService) {
        super();
        this.server = server;
        this.stateProvider = stateProvider;
        this.runtimeStateProvider = runtimeStateProvider;
        this.isWorkspaceServer = isWorkspaceServer;
        this.galleryService = galleryService;
        this.extensionEnablementService = extensionEnablementService;
        this.workbenchExtensionManagementService = workbenchExtensionManagementService;
        this.telemetryService = telemetryService;
        this.instantiationService = instantiationService;
        this._onChange = this._register(new Emitter());
        this._onReset = this._register(new Emitter());
        this.installing = [];
        this.uninstalling = [];
        this.installed = [];
        this._register(server.extensionManagementService.onInstallExtension(e => this.onInstallExtension(e)));
        this._register(server.extensionManagementService.onDidInstallExtensions(e => this.onDidInstallExtensions(e)));
        this._register(server.extensionManagementService.onUninstallExtension(e => this.onUninstallExtension(e.identifier)));
        this._register(server.extensionManagementService.onDidUninstallExtension(e => this.onDidUninstallExtension(e)));
        this._register(server.extensionManagementService.onDidUpdateExtensionMetadata(e => this.onDidUpdateExtensionMetadata(e.local)));
        this._register(server.extensionManagementService.onDidChangeProfile(() => this.reset()));
        this._register(extensionEnablementService.onEnablementChanged(e => this.onEnablementChanged(e)));
        this._register(Event.any(this.onChange, this.onReset)(() => this._local = undefined));
        if (this.isWorkspaceServer) {
            this._register(this.workbenchExtensionManagementService.onInstallExtension(e => {
                if (e.workspaceScoped) {
                    this.onInstallExtension(e);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onDidInstallExtensions(e => {
                const result = e.filter(e => e.workspaceScoped);
                if (result.length) {
                    this.onDidInstallExtensions(result);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onUninstallExtension(e => {
                if (e.workspaceScoped) {
                    this.onUninstallExtension(e.identifier);
                }
            }));
            this._register(this.workbenchExtensionManagementService.onDidUninstallExtension(e => {
                if (e.workspaceScoped) {
                    this.onDidUninstallExtension(e);
                }
            }));
        }
    }
    get local() {
        if (!this._local) {
            this._local = [];
            for (const extension of this.installed) {
                this._local.push(extension);
            }
            for (const extension of this.installing) {
                if (!this.installed.some(installed => areSameExtensions(installed.identifier, extension.identifier))) {
                    this._local.push(extension);
                }
            }
        }
        return this._local;
    }
    async queryInstalled(productVersion) {
        await this.fetchInstalledExtensions(productVersion);
        this._onChange.fire(undefined);
        return this.local;
    }
    async syncInstalledExtensionsWithGallery(galleryExtensions, productVersion) {
        const extensions = await this.mapInstalledExtensionWithCompatibleGalleryExtension(galleryExtensions, productVersion);
        for (const [extension, gallery] of extensions) {
            // update metadata of the extension if it does not exist
            if (extension.local && extension.local.identifier.uuid !== gallery.identifier.uuid) {
                extension.local = await this.updateMetadata(extension.local, gallery);
            }
            if (!extension.gallery || extension.gallery.version !== gallery.version || extension.gallery.properties.targetPlatform !== gallery.properties.targetPlatform) {
                extension.gallery = gallery;
                this._onChange.fire({ extension });
            }
        }
    }
    async mapInstalledExtensionWithCompatibleGalleryExtension(galleryExtensions, productVersion) {
        const mappedExtensions = this.mapInstalledExtensionWithGalleryExtension(galleryExtensions);
        const targetPlatform = await this.server.extensionManagementService.getTargetPlatform();
        const compatibleGalleryExtensions = [];
        const compatibleGalleryExtensionsToFetch = [];
        await Promise.allSettled(mappedExtensions.map(async ([extension, gallery]) => {
            if (extension.local) {
                if (await this.galleryService.isExtensionCompatible(gallery, extension.local.preRelease, targetPlatform, productVersion)) {
                    compatibleGalleryExtensions.push(gallery);
                }
                else {
                    compatibleGalleryExtensionsToFetch.push({ ...extension.local.identifier, preRelease: extension.local.preRelease });
                }
            }
        }));
        if (compatibleGalleryExtensionsToFetch.length) {
            const result = await this.galleryService.getExtensions(compatibleGalleryExtensionsToFetch, { targetPlatform, compatible: true, queryAllVersions: true, productVersion }, CancellationToken.None);
            compatibleGalleryExtensions.push(...result);
        }
        return this.mapInstalledExtensionWithGalleryExtension(compatibleGalleryExtensions);
    }
    mapInstalledExtensionWithGalleryExtension(galleryExtensions) {
        const mappedExtensions = [];
        const byUUID = new Map(), byID = new Map();
        for (const gallery of galleryExtensions) {
            byUUID.set(gallery.identifier.uuid, gallery);
            byID.set(gallery.identifier.id.toLowerCase(), gallery);
        }
        for (const installed of this.installed) {
            if (installed.uuid) {
                const gallery = byUUID.get(installed.uuid);
                if (gallery) {
                    mappedExtensions.push([installed, gallery]);
                    continue;
                }
            }
            if (installed.local?.source !== 'resource') {
                const gallery = byID.get(installed.identifier.id.toLowerCase());
                if (gallery) {
                    mappedExtensions.push([installed, gallery]);
                }
            }
        }
        return mappedExtensions;
    }
    async updateMetadata(localExtension, gallery) {
        let isPreReleaseVersion = false;
        if (localExtension.manifest.version !== gallery.version) {
            this.telemetryService.publicLog2('galleryService:updateMetadata');
            const galleryWithLocalVersion = (await this.galleryService.getExtensions([{ ...localExtension.identifier, version: localExtension.manifest.version }], CancellationToken.None))[0];
            isPreReleaseVersion = !!galleryWithLocalVersion?.properties?.isPreReleaseVersion;
        }
        return this.workbenchExtensionManagementService.updateMetadata(localExtension, { id: gallery.identifier.uuid, publisherDisplayName: gallery.publisherDisplayName, publisherId: gallery.publisherId, isPreReleaseVersion });
    }
    canInstall(galleryExtension) {
        return this.server.extensionManagementService.canInstall(galleryExtension);
    }
    onInstallExtension(event) {
        const { source } = event;
        if (source && !URI.isUri(source)) {
            const extension = this.installed.find(e => areSameExtensions(e.identifier, source.identifier))
                ?? this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, undefined, source, undefined);
            this.installing.push(extension);
            this._onChange.fire({ extension });
        }
    }
    async fetchInstalledExtensions(productVersion) {
        const extensionsControlManifest = await this.server.extensionManagementService.getExtensionsControlManifest();
        const all = await this.server.extensionManagementService.getInstalled(undefined, undefined, productVersion);
        if (this.isWorkspaceServer) {
            all.push(...await this.workbenchExtensionManagementService.getInstalledWorkspaceExtensions(true));
        }
        // dedup workspace, user and system extensions by giving priority to workspace first and then to user extension.
        const installed = groupByExtension(all, r => r.identifier).reduce((result, extensions) => {
            if (extensions.length === 1) {
                result.push(extensions[0]);
            }
            else {
                let workspaceExtension, userExtension, systemExtension;
                for (const extension of extensions) {
                    if (extension.isWorkspaceScoped) {
                        workspaceExtension = extension;
                    }
                    else if (extension.type === 1 /* ExtensionType.User */) {
                        userExtension = extension;
                    }
                    else {
                        systemExtension = extension;
                    }
                }
                const extension = workspaceExtension ?? userExtension ?? systemExtension;
                if (extension) {
                    result.push(extension);
                }
            }
            return result;
        }, []);
        const byId = index(this.installed, e => e.local ? e.local.identifier.id : e.identifier.id);
        this.installed = installed.map(local => {
            const extension = byId[local.identifier.id] || this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, local, undefined, undefined);
            extension.local = local;
            extension.enablementState = this.extensionEnablementService.getEnablementState(local);
            extension.setExtensionsControlManifest(extensionsControlManifest);
            return extension;
        });
    }
    async reset() {
        this.installed = [];
        this.installing = [];
        this.uninstalling = [];
        await this.fetchInstalledExtensions();
        this._onReset.fire();
    }
    async onDidInstallExtensions(results) {
        const extensions = [];
        for (const event of results) {
            const { local, source } = event;
            const gallery = source && !URI.isUri(source) ? source : undefined;
            const location = source && URI.isUri(source) ? source : undefined;
            const installingExtension = gallery ? this.installing.filter(e => areSameExtensions(e.identifier, gallery.identifier))[0] : null;
            this.installing = installingExtension ? this.installing.filter(e => e !== installingExtension) : this.installing;
            let extension = installingExtension ? installingExtension
                : (location || local) ? this.instantiationService.createInstance(Extension, this.stateProvider, this.runtimeStateProvider, this.server, local, undefined, undefined)
                    : undefined;
            if (extension) {
                if (local) {
                    const installed = this.installed.filter(e => areSameExtensions(e.identifier, extension.identifier))[0];
                    if (installed) {
                        extension = installed;
                    }
                    else {
                        this.installed.push(extension);
                    }
                    extension.local = local;
                    if (!extension.gallery) {
                        extension.gallery = gallery;
                    }
                    extension.enablementState = this.extensionEnablementService.getEnablementState(local);
                }
                extensions.push(extension);
            }
            this._onChange.fire(!local || !extension ? undefined : { extension, operation: event.operation });
        }
        if (extensions.length) {
            const manifest = await this.server.extensionManagementService.getExtensionsControlManifest();
            for (const extension of extensions) {
                extension.setExtensionsControlManifest(manifest);
            }
            this.matchInstalledExtensionsWithGallery(extensions);
        }
    }
    async onDidUpdateExtensionMetadata(local) {
        const extension = this.installed.find(e => areSameExtensions(e.identifier, local.identifier));
        if (extension?.local) {
            const hasChanged = extension.local.pinned !== local.pinned
                || extension.local.preRelease !== local.preRelease;
            extension.local = local;
            if (hasChanged) {
                this._onChange.fire({ extension });
            }
        }
    }
    async matchInstalledExtensionsWithGallery(extensions) {
        const toMatch = extensions.filter(e => e.local && !e.gallery && e.local.source !== 'resource');
        if (!toMatch.length) {
            return;
        }
        if (!this.galleryService.isEnabled()) {
            return;
        }
        const galleryExtensions = await this.galleryService.getExtensions(toMatch.map(e => ({ ...e.identifier, preRelease: e.local?.preRelease })), { compatible: true, targetPlatform: await this.server.extensionManagementService.getTargetPlatform() }, CancellationToken.None);
        for (const extension of extensions) {
            const compatible = galleryExtensions.find(e => areSameExtensions(e.identifier, extension.identifier));
            if (compatible) {
                extension.gallery = compatible;
                this._onChange.fire({ extension });
            }
        }
    }
    onUninstallExtension(identifier) {
        const extension = this.installed.filter(e => areSameExtensions(e.identifier, identifier))[0];
        if (extension) {
            const uninstalling = this.uninstalling.filter(e => areSameExtensions(e.identifier, identifier))[0] || extension;
            this.uninstalling = [uninstalling, ...this.uninstalling.filter(e => !areSameExtensions(e.identifier, identifier))];
            this._onChange.fire(uninstalling ? { extension: uninstalling } : undefined);
        }
    }
    onDidUninstallExtension({ identifier, error }) {
        const uninstalled = this.uninstalling.find(e => areSameExtensions(e.identifier, identifier)) || this.installed.find(e => areSameExtensions(e.identifier, identifier));
        this.uninstalling = this.uninstalling.filter(e => !areSameExtensions(e.identifier, identifier));
        if (!error) {
            this.installed = this.installed.filter(e => !areSameExtensions(e.identifier, identifier));
        }
        if (uninstalled) {
            this._onChange.fire({ extension: uninstalled });
        }
    }
    onEnablementChanged(platformExtensions) {
        const extensions = this.local.filter(e => platformExtensions.some(p => areSameExtensions(e.identifier, p.identifier)));
        for (const extension of extensions) {
            if (extension.local) {
                const enablementState = this.extensionEnablementService.getEnablementState(extension.local);
                if (enablementState !== extension.enablementState) {
                    extension.enablementState = enablementState;
                    this._onChange.fire({ extension });
                }
            }
        }
    }
    getExtensionState(extension) {
        if (extension.gallery && this.installing.some(e => !!e.gallery && areSameExtensions(e.gallery.identifier, extension.gallery.identifier))) {
            return 0 /* ExtensionState.Installing */;
        }
        if (this.uninstalling.some(e => areSameExtensions(e.identifier, extension.identifier))) {
            return 2 /* ExtensionState.Uninstalling */;
        }
        const local = this.installed.filter(e => e === extension || (e.gallery && extension.gallery && areSameExtensions(e.gallery.identifier, extension.gallery.identifier)))[0];
        return local ? 1 /* ExtensionState.Installed */ : 3 /* ExtensionState.Uninstalled */;
    }
};
Extensions = __decorate([
    __param(4, IExtensionGalleryService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, IWorkbenchExtensionManagementService),
    __param(7, ITelemetryService),
    __param(8, IInstantiationService)
], Extensions);
let ExtensionsWorkbenchService = class ExtensionsWorkbenchService extends Disposable {
    static { ExtensionsWorkbenchService_1 = this; }
    static { this.UpdatesCheckInterval = 1000 * 60 * 60 * 12; } // 12 hours
    get onChange() { return this._onChange.event; }
    get onReset() { return this._onReset.event; }
    constructor(instantiationService, editorService, extensionManagementService, galleryService, extensionGalleryManifestService, configurationService, telemetryService, notificationService, urlService, extensionEnablementService, hostService, progressService, extensionManagementServerService, languageService, extensionsSyncManagementService, userDataAutoSyncService, productService, contextKeyService, extensionManifestPropertiesService, logService, extensionService, localeService, lifecycleService, fileService, userDataProfileService, storageService, dialogService, userDataSyncEnablementService, updateService, uriIdentityService, workspaceContextService, viewsService, fileDialogService, quickInputService, allowedExtensionsService) {
        super();
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.extensionManagementService = extensionManagementService;
        this.galleryService = galleryService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.extensionEnablementService = extensionEnablementService;
        this.hostService = hostService;
        this.progressService = progressService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.languageService = languageService;
        this.extensionsSyncManagementService = extensionsSyncManagementService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.productService = productService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.localeService = localeService;
        this.lifecycleService = lifecycleService;
        this.fileService = fileService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.updateService = updateService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceContextService = workspaceContextService;
        this.viewsService = viewsService;
        this.fileDialogService = fileDialogService;
        this.quickInputService = quickInputService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.localExtensions = null;
        this.remoteExtensions = null;
        this.webExtensions = null;
        this.extensionsServers = [];
        this._onChange = this._register(new Emitter());
        this._onDidChangeExtensionsNotification = new Emitter();
        this.onDidChangeExtensionsNotification = this._onDidChangeExtensionsNotification.event;
        this._onReset = new Emitter();
        this.preferPreReleases = this.productService.quality !== 'stable';
        this.installing = [];
        this.tasksInProgress = [];
        this.autoRestartListenerDisposable = this._register(new MutableDisposable());
        const preferPreReleasesValue = configurationService.getValue('_extensions.preferPreReleases');
        if (!isUndefined(preferPreReleasesValue)) {
            this.preferPreReleases = !!preferPreReleasesValue;
        }
        this.hasOutdatedExtensionsContextKey = HasOutdatedExtensionsContext.bindTo(contextKeyService);
        if (extensionManagementServerService.localExtensionManagementServer) {
            this.localExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.localExtensionManagementServer, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), !extensionManagementServerService.remoteExtensionManagementServer));
            this._register(this.localExtensions.onChange(e => this.onDidChangeExtensions(e?.extension)));
            this._register(this.localExtensions.onReset(e => this.reset()));
            this.extensionsServers.push(this.localExtensions);
        }
        if (extensionManagementServerService.remoteExtensionManagementServer) {
            this.remoteExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.remoteExtensionManagementServer, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), true));
            this._register(this.remoteExtensions.onChange(e => this.onDidChangeExtensions(e?.extension)));
            this._register(this.remoteExtensions.onReset(e => this.reset()));
            this.extensionsServers.push(this.remoteExtensions);
        }
        if (extensionManagementServerService.webExtensionManagementServer) {
            this.webExtensions = this._register(instantiationService.createInstance(Extensions, extensionManagementServerService.webExtensionManagementServer, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), !(extensionManagementServerService.remoteExtensionManagementServer || extensionManagementServerService.localExtensionManagementServer)));
            this._register(this.webExtensions.onChange(e => this.onDidChangeExtensions(e?.extension)));
            this._register(this.webExtensions.onReset(e => this.reset()));
            this.extensionsServers.push(this.webExtensions);
        }
        this.updatesCheckDelayer = new ThrottledDelayer(ExtensionsWorkbenchService_1.UpdatesCheckInterval);
        this.autoUpdateDelayer = new ThrottledDelayer(1000);
        this._register(toDisposable(() => {
            this.updatesCheckDelayer.cancel();
            this.autoUpdateDelayer.cancel();
        }));
        urlService.registerHandler(this);
        this.whenInitialized = this.initialize();
    }
    async initialize() {
        // initialize local extensions
        await Promise.all([this.queryLocal(), this.extensionService.whenInstalledExtensionsRegistered()]);
        if (this._store.isDisposed) {
            return;
        }
        this.onDidChangeRunningExtensions(this.extensionService.extensions, []);
        this._register(this.extensionService.onDidChangeExtensions(({ added, removed }) => this.onDidChangeRunningExtensions(added, removed)));
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        if (this._store.isDisposed) {
            return;
        }
        this.initializeAutoUpdate();
        this.updateExtensionsNotificaiton();
        this.reportInstalledExtensionsTelemetry();
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, this._store)(e => this.onDidDismissedNotificationsValueChange()));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, EXTENSIONS_AUTO_UPDATE_KEY, this._store)(e => this.onDidSelectedExtensionToAutoUpdateValueChange()));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, EXTENSIONS_DONOT_AUTO_UPDATE_KEY, this._store)(e => this.onDidSelectedExtensionToAutoUpdateValueChange()));
        this._register(Event.debounce(this.onChange, () => undefined, 100)(() => {
            this.updateExtensionsNotificaiton();
            this.reportProgressFromOtherSources();
        }));
    }
    initializeAutoUpdate() {
        // Register listeners for auto updates
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AutoUpdateConfigurationKey)) {
                if (this.isAutoUpdateEnabled()) {
                    this.eventuallyAutoUpdateExtensions();
                }
            }
            if (e.affectsConfiguration(AutoCheckUpdatesConfigurationKey)) {
                if (this.isAutoCheckUpdatesEnabled()) {
                    this.checkForUpdates(`Enabled auto check updates`);
                }
            }
        }));
        this._register(this.extensionEnablementService.onEnablementChanged(platformExtensions => {
            if (this.getAutoUpdateValue() === 'onlyEnabledExtensions' && platformExtensions.some(e => this.extensionEnablementService.isEnabled(e))) {
                this.checkForUpdates('Extension enablement changed');
            }
        }));
        this._register(Event.debounce(this.onChange, () => undefined, 100)(() => this.hasOutdatedExtensionsContextKey.set(this.outdated.length > 0)));
        this._register(this.updateService.onStateChange(e => {
            if ((e.type === "checking for updates" /* StateType.CheckingForUpdates */ && e.explicit) || e.type === "available for download" /* StateType.AvailableForDownload */ || e.type === "downloaded" /* StateType.Downloaded */) {
                this.telemetryService.publicLog2('extensions:updatecheckonproductupdate');
                if (this.isAutoCheckUpdatesEnabled()) {
                    this.checkForUpdates('Product update');
                }
            }
        }));
        this._register(this.allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => {
            if (this.isAutoCheckUpdatesEnabled()) {
                this.checkForUpdates('Allowed extensions changed');
            }
        }));
        // Update AutoUpdate Contexts
        this.hasOutdatedExtensionsContextKey.set(this.outdated.length > 0);
        // Check for updates
        this.eventuallyCheckForUpdates(true);
        if (isWeb) {
            this.syncPinnedBuiltinExtensions();
            // Always auto update builtin extensions in web
            if (!this.isAutoUpdateEnabled()) {
                this.autoUpdateBuiltinExtensions();
            }
        }
        this.registerAutoRestartListener();
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AutoRestartConfigurationKey)) {
                this.registerAutoRestartListener();
            }
        }));
    }
    isAutoUpdateEnabled() {
        return this.getAutoUpdateValue() !== false;
    }
    getAutoUpdateValue() {
        const autoUpdate = this.configurationService.getValue(AutoUpdateConfigurationKey);
        if (autoUpdate === 'onlySelectedExtensions') {
            return false;
        }
        return isBoolean(autoUpdate) || autoUpdate === 'onlyEnabledExtensions' ? autoUpdate : true;
    }
    async updateAutoUpdateForAllExtensions(isAutoUpdateEnabled) {
        const wasAutoUpdateEnabled = this.isAutoUpdateEnabled();
        if (wasAutoUpdateEnabled === isAutoUpdateEnabled) {
            return;
        }
        const result = await this.dialogService.confirm({
            title: nls.localize('confirmEnableDisableAutoUpdate', "Auto Update Extensions"),
            message: isAutoUpdateEnabled
                ? nls.localize('confirmEnableAutoUpdate', "Do you want to enable auto update for all extensions?")
                : nls.localize('confirmDisableAutoUpdate', "Do you want to disable auto update for all extensions?"),
            detail: nls.localize('confirmEnableDisableAutoUpdateDetail', "This will reset any auto update settings you have set for individual extensions."),
        });
        if (!result.confirmed) {
            return;
        }
        // Reset extensions enabled for auto update first to prevent them from being updated
        this.setEnabledAutoUpdateExtensions([]);
        await this.configurationService.updateValue(AutoUpdateConfigurationKey, isAutoUpdateEnabled);
        this.setDisabledAutoUpdateExtensions([]);
        await this.updateExtensionsPinnedState(!isAutoUpdateEnabled);
        this._onChange.fire(undefined);
    }
    registerAutoRestartListener() {
        this.autoRestartListenerDisposable.value = undefined;
        if (this.configurationService.getValue(AutoRestartConfigurationKey) === true) {
            this.autoRestartListenerDisposable.value = this.hostService.onDidChangeFocus(focus => {
                if (!focus && this.configurationService.getValue(AutoRestartConfigurationKey) === true) {
                    this.updateRunningExtensions(true);
                }
            });
        }
    }
    reportInstalledExtensionsTelemetry() {
        const extensionIds = this.installed.filter(extension => !extension.isBuiltin &&
            (extension.enablementState === 12 /* EnablementState.EnabledWorkspace */ ||
                extension.enablementState === 11 /* EnablementState.EnabledGlobally */))
            .map(extension => ExtensionIdentifier.toKey(extension.identifier.id));
        this.telemetryService.publicLog2('installedExtensions', { extensionIds: new TelemetryTrustedValue(extensionIds.join(';')), count: extensionIds.length });
    }
    async onDidChangeRunningExtensions(added, removed) {
        const changedExtensions = [];
        const extensionsToFetch = [];
        for (const desc of added) {
            const extension = this.installed.find(e => areSameExtensions({ id: desc.identifier.value, uuid: desc.uuid }, e.identifier));
            if (extension) {
                changedExtensions.push(extension);
            }
            else {
                extensionsToFetch.push(desc);
            }
        }
        const workspaceExtensions = [];
        for (const desc of removed) {
            if (this.workspaceContextService.isInsideWorkspace(desc.extensionLocation)) {
                workspaceExtensions.push(desc);
            }
            else {
                extensionsToFetch.push(desc);
            }
        }
        if (extensionsToFetch.length) {
            const extensions = await this.getExtensions(extensionsToFetch.map(e => ({ id: e.identifier.value, uuid: e.uuid })), CancellationToken.None);
            changedExtensions.push(...extensions);
        }
        if (workspaceExtensions.length) {
            const extensions = await this.getResourceExtensions(workspaceExtensions.map(e => e.extensionLocation), true);
            changedExtensions.push(...extensions);
        }
        for (const changedExtension of changedExtensions) {
            this._onChange.fire(changedExtension);
        }
    }
    updateExtensionsPinnedState(pinned) {
        return this.progressService.withProgress({
            location: 5 /* ProgressLocation.Extensions */,
            title: nls.localize('updatingExtensions', "Updating Extensions Auto Update State"),
        }, () => this.extensionManagementService.resetPinnedStateForAllUserExtensions(pinned));
    }
    reset() {
        for (const task of this.tasksInProgress) {
            task.cancel();
        }
        this.tasksInProgress = [];
        this.installing = [];
        this.onDidChangeExtensions();
        this._onReset.fire();
    }
    onDidChangeExtensions(extension) {
        this._installed = undefined;
        this._local = undefined;
        this._onChange.fire(extension);
    }
    get local() {
        if (!this._local) {
            if (this.extensionsServers.length === 1) {
                this._local = this.installed;
            }
            else {
                this._local = [];
                const byId = groupByExtension(this.installed, r => r.identifier);
                for (const extensions of byId) {
                    this._local.push(this.getPrimaryExtension(extensions));
                }
            }
        }
        return this._local;
    }
    get installed() {
        if (!this._installed) {
            this._installed = [];
            for (const extensions of this.extensionsServers) {
                for (const extension of extensions.local) {
                    this._installed.push(extension);
                }
            }
        }
        return this._installed;
    }
    get outdated() {
        return this.installed.filter(e => e.outdated && e.local && e.state === 1 /* ExtensionState.Installed */);
    }
    async queryLocal(server) {
        if (server) {
            if (this.localExtensions && this.extensionManagementServerService.localExtensionManagementServer === server) {
                return this.localExtensions.queryInstalled(this.getProductVersion());
            }
            if (this.remoteExtensions && this.extensionManagementServerService.remoteExtensionManagementServer === server) {
                return this.remoteExtensions.queryInstalled(this.getProductVersion());
            }
            if (this.webExtensions && this.extensionManagementServerService.webExtensionManagementServer === server) {
                return this.webExtensions.queryInstalled(this.getProductVersion());
            }
        }
        if (this.localExtensions) {
            try {
                await this.localExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        if (this.remoteExtensions) {
            try {
                await this.remoteExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        if (this.webExtensions) {
            try {
                await this.webExtensions.queryInstalled(this.getProductVersion());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return this.local;
    }
    async queryGallery(arg1, arg2) {
        if (!this.galleryService.isEnabled()) {
            return singlePagePager([]);
        }
        const options = CancellationToken.isCancellationToken(arg1) ? {} : arg1;
        const token = CancellationToken.isCancellationToken(arg1) ? arg1 : arg2;
        options.text = options.text ? this.resolveQueryText(options.text) : options.text;
        options.includePreRelease = isUndefined(options.includePreRelease) ? this.preferPreReleases : options.includePreRelease;
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const pager = await this.galleryService.query(options, token);
        this.syncInstalledExtensionsWithGallery(pager.firstPage);
        return {
            firstPage: pager.firstPage.map(gallery => this.fromGallery(gallery, extensionsControlManifest)),
            total: pager.total,
            pageSize: pager.pageSize,
            getPage: async (pageIndex, token) => {
                const page = await pager.getPage(pageIndex, token);
                this.syncInstalledExtensionsWithGallery(page);
                return page.map(gallery => this.fromGallery(gallery, extensionsControlManifest));
            }
        };
    }
    async getExtensions(extensionInfos, arg1, arg2) {
        if (!this.galleryService.isEnabled()) {
            return [];
        }
        extensionInfos.forEach(e => e.preRelease = e.preRelease ?? this.preferPreReleases);
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const galleryExtensions = await this.galleryService.getExtensions(extensionInfos, arg1, arg2);
        this.syncInstalledExtensionsWithGallery(galleryExtensions);
        return galleryExtensions.map(gallery => this.fromGallery(gallery, extensionsControlManifest));
    }
    async getResourceExtensions(locations, isWorkspaceScoped) {
        const resourceExtensions = await this.extensionManagementService.getExtensions(locations);
        return resourceExtensions.map(resourceExtension => this.getInstalledExtensionMatchingLocation(resourceExtension.location)
            ?? this.instantiationService.createInstance(Extension, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), undefined, undefined, undefined, { resourceExtension, isWorkspaceScoped }));
    }
    onDidDismissedNotificationsValueChange() {
        if (this.dismissedNotificationsValue !== this.getDismissedNotificationsValue() /* This checks if current window changed the value or not */) {
            this._dismissedNotificationsValue = undefined;
            this.updateExtensionsNotificaiton();
        }
    }
    updateExtensionsNotificaiton() {
        const computedNotificiations = this.computeExtensionsNotifications();
        const dismissedNotifications = [];
        let extensionsNotification;
        if (computedNotificiations.length) {
            // populate dismissed notifications with the ones that are still valid
            for (const dismissedNotification of this.getDismissedNotifications()) {
                if (computedNotificiations.some(e => e.key === dismissedNotification)) {
                    dismissedNotifications.push(dismissedNotification);
                }
            }
            if (!dismissedNotifications.includes(computedNotificiations[0].key)) {
                extensionsNotification = {
                    message: computedNotificiations[0].message,
                    severity: computedNotificiations[0].severity,
                    extensions: computedNotificiations[0].extensions,
                    key: computedNotificiations[0].key,
                    dismiss: () => {
                        this.setDismissedNotifications([...this.getDismissedNotifications(), computedNotificiations[0].key]);
                        this.updateExtensionsNotificaiton();
                    },
                };
            }
        }
        this.setDismissedNotifications(dismissedNotifications);
        if (this.extensionsNotification?.key !== extensionsNotification?.key) {
            this.extensionsNotification = extensionsNotification;
            this._onDidChangeExtensionsNotification.fire(this.extensionsNotification);
        }
    }
    computeExtensionsNotifications() {
        const computedNotificiations = [];
        const disallowedExtensions = this.local.filter(e => e.enablementState === 7 /* EnablementState.DisabledByAllowlist */);
        if (disallowedExtensions.length) {
            computedNotificiations.push({
                message: this.configurationService.inspect(AllowedExtensionsConfigKey).policy
                    ? nls.localize('disallowed extensions by policy', "Some extensions are disabled because they are not allowed by your system administrator.")
                    : nls.localize('disallowed extensions', "Some extensions are disabled because they are configured not to be allowed."),
                severity: Severity.Warning,
                extensions: disallowedExtensions,
                key: 'disallowedExtensions:' + disallowedExtensions.sort((a, b) => a.identifier.id.localeCompare(b.identifier.id)).map(e => e.identifier.id.toLowerCase()).join('-'),
            });
        }
        const invalidExtensions = this.local.filter(e => e.enablementState === 6 /* EnablementState.DisabledByInvalidExtension */ && !e.isWorkspaceScoped);
        if (invalidExtensions.length) {
            if (invalidExtensions.some(e => e.local && e.local.manifest.engines?.vscode &&
                (!isEngineValid(e.local.manifest.engines.vscode, this.productService.version, this.productService.date) || areApiProposalsCompatible([...e.local.manifest.enabledApiProposals ?? []])))) {
                computedNotificiations.push({
                    message: nls.localize('incompatibleExtensions', "Some extensions are disabled due to version incompatibility. Review and update them."),
                    severity: Severity.Warning,
                    extensions: invalidExtensions,
                    key: 'incompatibleExtensions:' + invalidExtensions.sort((a, b) => a.identifier.id.localeCompare(b.identifier.id)).map(e => `${e.identifier.id.toLowerCase()}@${e.local?.manifest.version}`).join('-'),
                });
            }
            else {
                computedNotificiations.push({
                    message: nls.localize('invalidExtensions', "Invalid extensions detected. Review them."),
                    severity: Severity.Warning,
                    extensions: invalidExtensions,
                    key: 'invalidExtensions:' + invalidExtensions.sort((a, b) => a.identifier.id.localeCompare(b.identifier.id)).map(e => `${e.identifier.id.toLowerCase()}@${e.local?.manifest.version}`).join('-'),
                });
            }
        }
        const deprecatedExtensions = this.local.filter(e => !!e.deprecationInfo && e.local && this.extensionEnablementService.isEnabled(e.local));
        if (deprecatedExtensions.length) {
            computedNotificiations.push({
                message: nls.localize('deprecated extensions', "Deprecated extensions detected. Review them and migrate to alternatives."),
                severity: Severity.Warning,
                extensions: deprecatedExtensions,
                key: 'deprecatedExtensions:' + deprecatedExtensions.sort((a, b) => a.identifier.id.localeCompare(b.identifier.id)).map(e => e.identifier.id.toLowerCase()).join('-'),
            });
        }
        return computedNotificiations;
    }
    getExtensionsNotification() {
        return this.extensionsNotification;
    }
    resolveQueryText(text) {
        text = text.replace(/@web/g, `tag:"${WEB_EXTENSION_TAG}"`);
        const extensionRegex = /\bext:([^\s]+)\b/g;
        if (extensionRegex.test(text)) {
            text = text.replace(extensionRegex, (m, ext) => {
                // Get curated keywords
                const lookup = this.productService.extensionKeywords || {};
                const keywords = lookup[ext] || [];
                // Get mode name
                const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(`.${ext}`));
                const languageName = languageId && this.languageService.getLanguageName(languageId);
                const languageTag = languageName ? ` tag:"${languageName}"` : '';
                // Construct a rich query
                return `tag:"__ext_${ext}" tag:"__ext_.${ext}" ${keywords.map(tag => `tag:"${tag}"`).join(' ')}${languageTag} tag:"${ext}"`;
            });
        }
        return text.substr(0, 350);
    }
    fromGallery(gallery, extensionsControlManifest) {
        let extension = this.getInstalledExtensionMatchingGallery(gallery);
        if (!extension) {
            extension = this.instantiationService.createInstance(Extension, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), undefined, undefined, gallery, undefined);
            extension.setExtensionsControlManifest(extensionsControlManifest);
        }
        return extension;
    }
    getInstalledExtensionMatchingGallery(gallery) {
        for (const installed of this.local) {
            if (installed.identifier.uuid) { // Installed from Gallery
                if (installed.identifier.uuid === gallery.identifier.uuid) {
                    return installed;
                }
            }
            else if (installed.local?.source !== 'resource') {
                if (areSameExtensions(installed.identifier, gallery.identifier)) { // Installed from other sources
                    return installed;
                }
            }
        }
        return null;
    }
    getInstalledExtensionMatchingLocation(location) {
        return this.local.find(e => e.local && this.uriIdentityService.extUri.isEqualOrParent(location, e.local?.location)) ?? null;
    }
    async open(extension, options) {
        if (typeof extension === 'string') {
            const id = extension;
            extension = this.installed.find(e => areSameExtensions(e.identifier, { id })) ?? (await this.getExtensions([{ id: extension }], CancellationToken.None))[0];
        }
        if (!extension) {
            throw new Error(`Extension not found. ${extension}`);
        }
        await this.editorService.openEditor(this.instantiationService.createInstance(ExtensionsInput, extension), options, options?.sideByside ? SIDE_GROUP : ACTIVE_GROUP);
    }
    async openSearch(searchValue, preserveFoucs) {
        const viewPaneContainer = (await this.viewsService.openViewContainer(VIEWLET_ID, true))?.getViewPaneContainer();
        viewPaneContainer.search(searchValue);
        if (!preserveFoucs) {
            viewPaneContainer.focus();
        }
    }
    getExtensionRuntimeStatus(extension) {
        const extensionsStatus = this.extensionService.getExtensionsStatus();
        for (const id of Object.keys(extensionsStatus)) {
            if (areSameExtensions({ id }, extension.identifier)) {
                return extensionsStatus[id];
            }
        }
        return undefined;
    }
    async updateRunningExtensions(auto = false) {
        const toAdd = [];
        const toRemove = [];
        const extensionsToCheck = [...this.local];
        for (const extension of extensionsToCheck) {
            const runtimeState = extension.runtimeState;
            if (!runtimeState || runtimeState.action !== "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */) {
                continue;
            }
            if (extension.state === 3 /* ExtensionState.Uninstalled */) {
                toRemove.push(extension.identifier.id);
                continue;
            }
            if (!extension.local) {
                continue;
            }
            const isEnabled = this.extensionEnablementService.isEnabled(extension.local);
            if (isEnabled) {
                const runningExtension = this.extensionService.extensions.find(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, extension.identifier));
                if (runningExtension) {
                    toRemove.push(runningExtension.identifier.value);
                }
                toAdd.push(extension.local);
            }
            else {
                toRemove.push(extension.identifier.id);
            }
        }
        for (const extension of this.extensionService.extensions) {
            if (extension.isUnderDevelopment) {
                continue;
            }
            if (extensionsToCheck.some(e => areSameExtensions({ id: extension.identifier.value, uuid: extension.uuid }, e.local?.identifier ?? e.identifier))) {
                continue;
            }
            // Extension is running but doesn't exist locally. Remove it from running extensions.
            toRemove.push(extension.identifier.value);
        }
        if (toAdd.length || toRemove.length) {
            if (await this.extensionService.stopExtensionHosts(nls.localize('restart', "Changing extension enablement"), auto)) {
                await this.extensionService.startExtensionHosts({ toAdd, toRemove });
                if (auto) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: nls.localize('extensionsAutoRestart', "Extensions were auto restarted to enable updates."),
                        priority: NotificationPriority.SILENT
                    });
                }
                this.telemetryService.publicLog2('extensions:autorestart', { count: toAdd.length + toRemove.length, auto });
            }
        }
    }
    getRuntimeState(extension) {
        const isUninstalled = extension.state === 3 /* ExtensionState.Uninstalled */;
        const runningExtension = this.extensionService.extensions.find(e => areSameExtensions({ id: e.identifier.value }, extension.identifier));
        const reloadAction = this.extensionManagementServerService.remoteExtensionManagementServer ? "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */ : "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
        const reloadActionLabel = reloadAction === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */ ? nls.localize('reload', "reload window") : nls.localize('restart extensions', "restart extensions");
        if (isUninstalled) {
            const canRemoveRunningExtension = runningExtension && this.extensionService.canRemoveExtension(runningExtension);
            const isSameExtensionRunning = runningExtension
                && (!extension.server || extension.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension)))
                && (!extension.resourceExtension || this.uriIdentityService.extUri.isEqual(extension.resourceExtension.location, runningExtension.extensionLocation));
            if (!canRemoveRunningExtension && isSameExtensionRunning && !runningExtension.isUnderDevelopment) {
                return { action: reloadAction, reason: nls.localize('postUninstallTooltip', "Please {0} to complete the uninstallation of this extension.", reloadActionLabel) };
            }
            return undefined;
        }
        if (extension.local) {
            const isSameExtensionRunning = runningExtension && extension.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));
            const isEnabled = this.extensionEnablementService.isEnabled(extension.local);
            // Extension is running
            if (runningExtension) {
                if (isEnabled) {
                    // No Reload is required if extension can run without reload
                    if (this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
                        return undefined;
                    }
                    const runningExtensionServer = this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension));
                    if (isSameExtensionRunning) {
                        // Different version or target platform of same extension is running. Requires reload to run the current version
                        if (!runningExtension.isUnderDevelopment && (extension.version !== runningExtension.version || extension.local.targetPlatform !== runningExtension.targetPlatform)) {
                            const productCurrentVersion = this.getProductCurrentVersion();
                            const productUpdateVersion = this.getProductUpdateVersion();
                            if (productUpdateVersion
                                && !isEngineValid(extension.local.manifest.engines.vscode, productCurrentVersion.version, productCurrentVersion.date)
                                && isEngineValid(extension.local.manifest.engines.vscode, productUpdateVersion.version, productUpdateVersion.date)) {
                                const state = this.updateService.state;
                                if (state.type === "available for download" /* StateType.AvailableForDownload */) {
                                    return { action: "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */, reason: nls.localize('postUpdateDownloadTooltip', "Please update {0} to enable the updated extension.", this.productService.nameLong) };
                                }
                                if (state.type === "downloaded" /* StateType.Downloaded */) {
                                    return { action: "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */, reason: nls.localize('postUpdateUpdateTooltip', "Please update {0} to enable the updated extension.", this.productService.nameLong) };
                                }
                                if (state.type === "ready" /* StateType.Ready */) {
                                    return { action: "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */, reason: nls.localize('postUpdateRestartTooltip', "Please restart {0} to enable the updated extension.", this.productService.nameLong) };
                                }
                                return undefined;
                            }
                            return { action: reloadAction, reason: nls.localize('postUpdateTooltip', "Please {0} to enable the updated extension.", reloadActionLabel) };
                        }
                        if (this.extensionsServers.length > 1) {
                            const extensionInOtherServer = this.installed.filter(e => areSameExtensions(e.identifier, extension.identifier) && e.server !== extension.server)[0];
                            if (extensionInOtherServer) {
                                // This extension prefers to run on UI/Local side but is running in remote
                                if (runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer && this.extensionManifestPropertiesService.prefersExecuteOnUI(extension.local.manifest) && extensionInOtherServer.server === this.extensionManagementServerService.localExtensionManagementServer) {
                                    return { action: reloadAction, reason: nls.localize('enable locally', "Please {0} to enable this extension locally.", reloadActionLabel) };
                                }
                                // This extension prefers to run on Workspace/Remote side but is running in local
                                if (runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer && this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(extension.local.manifest) && extensionInOtherServer.server === this.extensionManagementServerService.remoteExtensionManagementServer) {
                                    return { action: reloadAction, reason: nls.localize('enable remote', "Please {0} to enable this extension in {1}.", reloadActionLabel, this.extensionManagementServerService.remoteExtensionManagementServer?.label) };
                                }
                            }
                        }
                    }
                    else {
                        if (extension.server === this.extensionManagementServerService.localExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer) {
                            // This extension prefers to run on UI/Local side but is running in remote
                            if (this.extensionManifestPropertiesService.prefersExecuteOnUI(extension.local.manifest)) {
                                return { action: reloadAction, reason: nls.localize('postEnableTooltip', "Please {0} to enable this extension.", reloadActionLabel) };
                            }
                        }
                        if (extension.server === this.extensionManagementServerService.remoteExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer) {
                            // This extension prefers to run on Workspace/Remote side but is running in local
                            if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(extension.local.manifest)) {
                                return { action: reloadAction, reason: nls.localize('postEnableTooltip', "Please {0} to enable this extension.", reloadActionLabel) };
                            }
                        }
                    }
                    return undefined;
                }
                else {
                    if (isSameExtensionRunning) {
                        return { action: reloadAction, reason: nls.localize('postDisableTooltip', "Please {0} to disable this extension.", reloadActionLabel) };
                    }
                }
                return undefined;
            }
            // Extension is not running
            else {
                if (isEnabled && !this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
                    return { action: reloadAction, reason: nls.localize('postEnableTooltip', "Please {0} to enable this extension.", reloadActionLabel) };
                }
                const otherServer = extension.server ? extension.server === this.extensionManagementServerService.localExtensionManagementServer ? this.extensionManagementServerService.remoteExtensionManagementServer : this.extensionManagementServerService.localExtensionManagementServer : null;
                if (otherServer && extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                    const extensionInOtherServer = this.local.filter(e => areSameExtensions(e.identifier, extension.identifier) && e.server === otherServer)[0];
                    // Same extension in other server exists and
                    if (extensionInOtherServer && extensionInOtherServer.local && this.extensionEnablementService.isEnabled(extensionInOtherServer.local)) {
                        return { action: reloadAction, reason: nls.localize('postEnableTooltip', "Please {0} to enable this extension.", reloadActionLabel) };
                    }
                }
            }
        }
        return undefined;
    }
    getPrimaryExtension(extensions) {
        if (extensions.length === 1) {
            return extensions[0];
        }
        const enabledExtensions = extensions.filter(e => e.local && this.extensionEnablementService.isEnabled(e.local));
        if (enabledExtensions.length === 1) {
            return enabledExtensions[0];
        }
        const extensionsToChoose = enabledExtensions.length ? enabledExtensions : extensions;
        const manifest = extensionsToChoose.find(e => e.local && e.local.manifest)?.local?.manifest;
        // Manifest is not found which should not happen.
        // In which case return the first extension.
        if (!manifest) {
            return extensionsToChoose[0];
        }
        const extensionKinds = this.extensionManifestPropertiesService.getExtensionKind(manifest);
        let extension = extensionsToChoose.find(extension => {
            for (const extensionKind of extensionKinds) {
                switch (extensionKind) {
                    case 'ui':
                        /* UI extension is chosen only if it is installed locally */
                        if (extension.server === this.extensionManagementServerService.localExtensionManagementServer) {
                            return true;
                        }
                        return false;
                    case 'workspace':
                        /* Choose remote workspace extension if exists */
                        if (extension.server === this.extensionManagementServerService.remoteExtensionManagementServer) {
                            return true;
                        }
                        return false;
                    case 'web':
                        /* Choose web extension if exists */
                        if (extension.server === this.extensionManagementServerService.webExtensionManagementServer) {
                            return true;
                        }
                        return false;
                }
            }
            return false;
        });
        if (!extension && this.extensionManagementServerService.localExtensionManagementServer) {
            extension = extensionsToChoose.find(extension => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'workspace':
                            /* Choose local workspace extension if exists */
                            if (extension.server === this.extensionManagementServerService.localExtensionManagementServer) {
                                return true;
                            }
                            return false;
                        case 'web':
                            /* Choose local web extension if exists */
                            if (extension.server === this.extensionManagementServerService.localExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        if (!extension && this.extensionManagementServerService.webExtensionManagementServer) {
            extension = extensionsToChoose.find(extension => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'web':
                            /* Choose web extension if exists */
                            if (extension.server === this.extensionManagementServerService.webExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        if (!extension && this.extensionManagementServerService.remoteExtensionManagementServer) {
            extension = extensionsToChoose.find(extension => {
                for (const extensionKind of extensionKinds) {
                    switch (extensionKind) {
                        case 'web':
                            /* Choose remote web extension if exists */
                            if (extension.server === this.extensionManagementServerService.remoteExtensionManagementServer) {
                                return true;
                            }
                            return false;
                    }
                }
                return false;
            });
        }
        return extension || extensions[0];
    }
    getExtensionState(extension) {
        if (this.installing.some(i => areSameExtensions(i.identifier, extension.identifier) && (!extension.server || i.server === extension.server))) {
            return 0 /* ExtensionState.Installing */;
        }
        if (this.remoteExtensions) {
            const state = this.remoteExtensions.getExtensionState(extension);
            if (state !== 3 /* ExtensionState.Uninstalled */) {
                return state;
            }
        }
        if (this.webExtensions) {
            const state = this.webExtensions.getExtensionState(extension);
            if (state !== 3 /* ExtensionState.Uninstalled */) {
                return state;
            }
        }
        if (this.localExtensions) {
            return this.localExtensions.getExtensionState(extension);
        }
        return 3 /* ExtensionState.Uninstalled */;
    }
    async checkForUpdates(reason, onlyBuiltin) {
        if (reason) {
            this.logService.info(`[Extensions]: Checking for updates. Reason: ${reason}`);
        }
        else {
            this.logService.trace(`[Extensions]: Checking for updates`);
        }
        if (!this.galleryService.isEnabled()) {
            return;
        }
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        if (!extensions.length) {
            return;
        }
        const infos = [];
        for (const installed of this.local) {
            if (onlyBuiltin && !installed.isBuiltin) {
                // Skip if check updates only for builtin extensions and current extension is not builtin.
                continue;
            }
            if (installed.isBuiltin && !installed.local?.pinned && (installed.type === 0 /* ExtensionType.System */ || !installed.local?.identifier.uuid)) {
                // Skip checking updates for a builtin extension if it is a system extension or if it does not has Marketplace identifier
                continue;
            }
            if (installed.local?.source === 'resource') {
                continue;
            }
            infos.push({ ...installed.identifier, preRelease: !!installed.local?.preRelease });
        }
        if (infos.length) {
            const targetPlatform = await extensions[0].server.extensionManagementService.getTargetPlatform();
            this.telemetryService.publicLog2('galleryService:checkingForUpdates', {
                count: infos.length,
            });
            this.logService.trace(`Checking updates for extensions`, infos.map(e => e.id).join(', '));
            const galleryExtensions = await this.galleryService.getExtensions(infos, { targetPlatform, compatible: true, productVersion: this.getProductVersion(), preferResourceApi: true }, CancellationToken.None);
            if (galleryExtensions.length) {
                await this.syncInstalledExtensionsWithGallery(galleryExtensions);
            }
        }
    }
    async updateAll() {
        const toUpdate = [];
        this.outdated.forEach((extension) => {
            if (extension.gallery) {
                toUpdate.push({
                    extension: extension.gallery,
                    options: {
                        operation: 3 /* InstallOperation.Update */,
                        installPreReleaseVersion: extension.local?.isPreReleaseVersion,
                        profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                        isApplicationScoped: extension.local?.isApplicationScoped,
                        context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true }
                    }
                });
            }
        });
        return this.extensionManagementService.installGalleryExtensions(toUpdate);
    }
    async downloadVSIX(extensionId, preRelease) {
        let [galleryExtension] = await this.galleryService.getExtensions([{ id: extensionId, preRelease }], { compatible: true }, CancellationToken.None);
        if (!galleryExtension) {
            throw new Error(nls.localize('extension not found', "Extension '{0}' not found.", extensionId));
        }
        let targetPlatform = galleryExtension.properties.targetPlatform;
        const options = [];
        for (const targetPlatform of galleryExtension.allTargetPlatforms) {
            if (targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */ && targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */) {
                options.push({
                    label: targetPlatform === "undefined" /* TargetPlatform.UNDEFINED */ ? nls.localize('allplatforms', "All Platforms") : TargetPlatformToString(targetPlatform),
                    id: targetPlatform
                });
            }
        }
        if (options.length) {
            const message = nls.localize('platform placeholder', "Please select the platform for which you want to download the VSIX");
            const option = await this.quickInputService.pick(options.sort((a, b) => a.label.localeCompare(b.label)), { placeHolder: message });
            if (!option) {
                return;
            }
            targetPlatform = option.id;
        }
        if (targetPlatform !== galleryExtension.properties.targetPlatform) {
            [galleryExtension] = await this.galleryService.getExtensions([{ id: extensionId, preRelease }], { compatible: true, targetPlatform }, CancellationToken.None);
        }
        const result = await this.fileDialogService.showOpenDialog({
            title: nls.localize('download title', "Select folder to download the VSIX"),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: nls.localize('download', "Download"),
        });
        if (!result?.[0]) {
            return;
        }
        this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */ }, async (progress) => {
            progress.report({ message: nls.localize('downloading...', "Downloading VSIX...") });
            const name = `${galleryExtension.identifier.id}-${galleryExtension.version}${targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ && targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ && targetPlatform !== "unknown" /* TargetPlatform.UNKNOWN */ ? `-${targetPlatform}` : ''}.vsix`;
            await this.galleryService.download(galleryExtension, this.uriIdentityService.extUri.joinPath(result[0], name), 1 /* InstallOperation.None */);
            this.notificationService.info(nls.localize('download.completed', "Successfully downloaded the VSIX"));
        });
    }
    async syncInstalledExtensionsWithGallery(gallery) {
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        if (!extensions.length) {
            return;
        }
        await Promise.allSettled(extensions.map(extensions => extensions.syncInstalledExtensionsWithGallery(gallery, this.getProductVersion())));
        if (this.outdated.length) {
            this.logService.info(`Auto updating outdated extensions.`, this.outdated.map(e => e.identifier.id).join(', '));
            this.eventuallyAutoUpdateExtensions();
        }
    }
    isAutoCheckUpdatesEnabled() {
        return this.configurationService.getValue(AutoCheckUpdatesConfigurationKey);
    }
    eventuallyCheckForUpdates(immediate = false) {
        this.updatesCheckDelayer.cancel();
        this.updatesCheckDelayer.trigger(async () => {
            if (this.isAutoCheckUpdatesEnabled()) {
                await this.checkForUpdates();
            }
            this.eventuallyCheckForUpdates();
        }, immediate ? 0 : this.getUpdatesCheckInterval()).then(undefined, err => null);
    }
    getUpdatesCheckInterval() {
        if (this.productService.quality === 'insider' && this.getProductUpdateVersion()) {
            return 1000 * 60 * 60 * 1; // 1 hour
        }
        return ExtensionsWorkbenchService_1.UpdatesCheckInterval;
    }
    eventuallyAutoUpdateExtensions() {
        this.autoUpdateDelayer.trigger(() => this.autoUpdateExtensions())
            .then(undefined, err => null);
    }
    async autoUpdateBuiltinExtensions() {
        await this.checkForUpdates(undefined, true);
        const toUpdate = this.outdated.filter(e => e.isBuiltin);
        await Promises.settled(toUpdate.map(e => this.install(e, e.local?.preRelease ? { installPreReleaseVersion: true } : undefined)));
    }
    async syncPinnedBuiltinExtensions() {
        const infos = [];
        for (const installed of this.local) {
            if (installed.isBuiltin && installed.local?.pinned && installed.local?.identifier.uuid) {
                infos.push({ ...installed.identifier, version: installed.version });
            }
        }
        if (infos.length) {
            const galleryExtensions = await this.galleryService.getExtensions(infos, CancellationToken.None);
            if (galleryExtensions.length) {
                await this.syncInstalledExtensionsWithGallery(galleryExtensions);
            }
        }
    }
    async autoUpdateExtensions() {
        const toUpdate = [];
        for (const extension of this.outdated) {
            if (!this.shouldAutoUpdateExtension(extension)) {
                this.logService.info('Auto update disabled for extension', extension.identifier.id);
                continue;
            }
            if (await this.shouldRequireConsentToUpdate(extension)) {
                this.logService.info('Auto update consent required for extension', extension.identifier.id);
                continue;
            }
            toUpdate.push(extension);
        }
        if (!toUpdate.length) {
            return;
        }
        const productVersion = this.getProductVersion();
        await Promises.settled(toUpdate.map(e => {
            this.logService.info('Auto updating extension', e.identifier.id);
            return this.install(e, e.local?.preRelease ? { installPreReleaseVersion: true, productVersion } : { productVersion });
        }));
    }
    getProductVersion() {
        return this.getProductUpdateVersion() ?? this.getProductCurrentVersion();
    }
    getProductCurrentVersion() {
        return { version: this.productService.version, date: this.productService.date };
    }
    getProductUpdateVersion() {
        switch (this.updateService.state.type) {
            case "available for download" /* StateType.AvailableForDownload */:
            case "downloaded" /* StateType.Downloaded */:
            case "updating" /* StateType.Updating */:
            case "ready" /* StateType.Ready */: {
                const version = this.updateService.state.update.productVersion;
                if (version && semver.valid(version)) {
                    return { version, date: this.updateService.state.update.timestamp ? new Date(this.updateService.state.update.timestamp).toISOString() : undefined };
                }
            }
        }
        return undefined;
    }
    shouldAutoUpdateExtension(extension) {
        if (extension.deprecationInfo?.disallowInstall) {
            return false;
        }
        const autoUpdateValue = this.getAutoUpdateValue();
        if (autoUpdateValue === false) {
            const extensionsToAutoUpdate = this.getEnabledAutoUpdateExtensions();
            const extensionId = extension.identifier.id.toLowerCase();
            if (extensionsToAutoUpdate.includes(extensionId)) {
                return true;
            }
            if (this.isAutoUpdateEnabledForPublisher(extension.publisher) && !extensionsToAutoUpdate.includes(`-${extensionId}`)) {
                return true;
            }
            return false;
        }
        if (extension.pinned) {
            return false;
        }
        const disabledAutoUpdateExtensions = this.getDisabledAutoUpdateExtensions();
        if (disabledAutoUpdateExtensions.includes(extension.identifier.id.toLowerCase())) {
            return false;
        }
        if (autoUpdateValue === true) {
            return true;
        }
        if (autoUpdateValue === 'onlyEnabledExtensions') {
            return this.extensionEnablementService.isEnabledEnablementState(extension.enablementState);
        }
        return false;
    }
    async shouldRequireConsentToUpdate(extension) {
        if (!extension.outdated) {
            return;
        }
        if (extension.local?.manifest.main || extension.local?.manifest.browser) {
            return;
        }
        if (!extension.gallery) {
            return;
        }
        if (isDefined(extension.gallery.properties?.executesCode)) {
            if (!extension.gallery.properties.executesCode) {
                return;
            }
        }
        else {
            const manifest = extension instanceof Extension
                ? await extension.getGalleryManifest()
                : await this.galleryService.getManifest(extension.gallery, CancellationToken.None);
            if (!manifest?.main && !manifest?.browser) {
                return;
            }
        }
        return nls.localize('consentRequiredToUpdate', "The update for {0} extension introduces executable code, which is not present in the currently installed version.", extension.displayName);
    }
    isAutoUpdateEnabledFor(extensionOrPublisher) {
        if (isString(extensionOrPublisher)) {
            if (EXTENSION_IDENTIFIER_REGEX.test(extensionOrPublisher)) {
                throw new Error('Expected publisher string, found extension identifier');
            }
            if (this.isAutoUpdateEnabled()) {
                return true;
            }
            return this.isAutoUpdateEnabledForPublisher(extensionOrPublisher);
        }
        return this.shouldAutoUpdateExtension(extensionOrPublisher);
    }
    isAutoUpdateEnabledForPublisher(publisher) {
        const publishersToAutoUpdate = this.getPublishersToAutoUpdate();
        return publishersToAutoUpdate.includes(publisher.toLowerCase());
    }
    async updateAutoUpdateEnablementFor(extensionOrPublisher, enable) {
        if (this.isAutoUpdateEnabled()) {
            if (isString(extensionOrPublisher)) {
                throw new Error('Expected extension, found publisher string');
            }
            const disabledAutoUpdateExtensions = this.getDisabledAutoUpdateExtensions();
            const extensionId = extensionOrPublisher.identifier.id.toLowerCase();
            const extensionIndex = disabledAutoUpdateExtensions.indexOf(extensionId);
            if (enable) {
                if (extensionIndex !== -1) {
                    disabledAutoUpdateExtensions.splice(extensionIndex, 1);
                }
            }
            else {
                if (extensionIndex === -1) {
                    disabledAutoUpdateExtensions.push(extensionId);
                }
            }
            this.setDisabledAutoUpdateExtensions(disabledAutoUpdateExtensions);
            if (enable && extensionOrPublisher.local && extensionOrPublisher.pinned) {
                await this.extensionManagementService.updateMetadata(extensionOrPublisher.local, { pinned: false });
            }
            this._onChange.fire(extensionOrPublisher);
        }
        else {
            const enabledAutoUpdateExtensions = this.getEnabledAutoUpdateExtensions();
            if (isString(extensionOrPublisher)) {
                if (EXTENSION_IDENTIFIER_REGEX.test(extensionOrPublisher)) {
                    throw new Error('Expected publisher string, found extension identifier');
                }
                extensionOrPublisher = extensionOrPublisher.toLowerCase();
                if (this.isAutoUpdateEnabledFor(extensionOrPublisher) !== enable) {
                    if (enable) {
                        enabledAutoUpdateExtensions.push(extensionOrPublisher);
                    }
                    else {
                        if (enabledAutoUpdateExtensions.includes(extensionOrPublisher)) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionOrPublisher), 1);
                        }
                    }
                }
                this.setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions);
                for (const e of this.installed) {
                    if (e.publisher.toLowerCase() === extensionOrPublisher) {
                        this._onChange.fire(e);
                    }
                }
            }
            else {
                const extensionId = extensionOrPublisher.identifier.id.toLowerCase();
                const enableAutoUpdatesForPublisher = this.isAutoUpdateEnabledFor(extensionOrPublisher.publisher.toLowerCase());
                const enableAutoUpdatesForExtension = enabledAutoUpdateExtensions.includes(extensionId);
                const disableAutoUpdatesForExtension = enabledAutoUpdateExtensions.includes(`-${extensionId}`);
                if (enable) {
                    if (disableAutoUpdatesForExtension) {
                        enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(`-${extensionId}`), 1);
                    }
                    if (enableAutoUpdatesForPublisher) {
                        if (enableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionId), 1);
                        }
                    }
                    else {
                        if (!enableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.push(extensionId);
                        }
                    }
                }
                // Disable Auto Updates
                else {
                    if (enableAutoUpdatesForExtension) {
                        enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(extensionId), 1);
                    }
                    if (enableAutoUpdatesForPublisher) {
                        if (!disableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.push(`-${extensionId}`);
                        }
                    }
                    else {
                        if (disableAutoUpdatesForExtension) {
                            enabledAutoUpdateExtensions.splice(enabledAutoUpdateExtensions.indexOf(`-${extensionId}`), 1);
                        }
                    }
                }
                this.setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions);
                this._onChange.fire(extensionOrPublisher);
            }
        }
        if (enable) {
            this.autoUpdateExtensions();
        }
    }
    onDidSelectedExtensionToAutoUpdateValueChange() {
        if (this.enabledAuotUpdateExtensionsValue !== this.getEnabledAutoUpdateExtensionsValue() /* This checks if current window changed the value or not */
            || this.disabledAutoUpdateExtensionsValue !== this.getDisabledAutoUpdateExtensionsValue() /* This checks if current window changed the value or not */) {
            const userExtensions = this.installed.filter(e => !e.isBuiltin);
            const groupBy = (extensions) => {
                const shouldAutoUpdate = [];
                const shouldNotAutoUpdate = [];
                for (const extension of extensions) {
                    if (this.shouldAutoUpdateExtension(extension)) {
                        shouldAutoUpdate.push(extension);
                    }
                    else {
                        shouldNotAutoUpdate.push(extension);
                    }
                }
                return [shouldAutoUpdate, shouldNotAutoUpdate];
            };
            const [wasShouldAutoUpdate, wasShouldNotAutoUpdate] = groupBy(userExtensions);
            this._enabledAutoUpdateExtensionsValue = undefined;
            this._disabledAutoUpdateExtensionsValue = undefined;
            const [shouldAutoUpdate, shouldNotAutoUpdate] = groupBy(userExtensions);
            for (const e of wasShouldAutoUpdate ?? []) {
                if (shouldNotAutoUpdate?.includes(e)) {
                    this._onChange.fire(e);
                }
            }
            for (const e of wasShouldNotAutoUpdate ?? []) {
                if (shouldAutoUpdate?.includes(e)) {
                    this._onChange.fire(e);
                }
            }
        }
    }
    async canInstall(extension) {
        if (!(extension instanceof Extension)) {
            return new MarkdownString().appendText(nls.localize('not an extension', "The provided object is not an extension."));
        }
        if (extension.isMalicious) {
            return new MarkdownString().appendText(nls.localize('malicious', "This extension is reported to be problematic."));
        }
        if (extension.deprecationInfo?.disallowInstall) {
            return new MarkdownString().appendText(nls.localize('disallowed', "This extension is disallowed to be installed."));
        }
        if (extension.gallery) {
            if (!extension.gallery.isSigned && (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities.signing?.allRepositorySigned) {
                return new MarkdownString().appendText(nls.localize('not signed', "This extension is not signed."));
            }
            const localResult = this.localExtensions ? await this.localExtensions.canInstall(extension.gallery) : undefined;
            if (localResult === true) {
                return true;
            }
            const remoteResult = this.remoteExtensions ? await this.remoteExtensions.canInstall(extension.gallery) : undefined;
            if (remoteResult === true) {
                return true;
            }
            const webResult = this.webExtensions ? await this.webExtensions.canInstall(extension.gallery) : undefined;
            if (webResult === true) {
                return true;
            }
            return localResult ?? remoteResult ?? webResult ?? new MarkdownString().appendText(nls.localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.displayName ?? extension.identifier.id));
        }
        if (extension.resourceExtension && await this.extensionManagementService.canInstall(extension.resourceExtension) === true) {
            return true;
        }
        return new MarkdownString().appendText(nls.localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.displayName ?? extension.identifier.id));
    }
    async install(arg, installOptions = {}, progressLocation) {
        let installable;
        let extension;
        let servers;
        if (arg instanceof URI) {
            installable = arg;
        }
        else {
            let installableInfo;
            let gallery;
            // Install by id
            if (isString(arg)) {
                extension = this.local.find(e => areSameExtensions(e.identifier, { id: arg }));
                if (!extension?.isBuiltin) {
                    installableInfo = { id: arg, version: installOptions.version, preRelease: installOptions.installPreReleaseVersion ?? this.preferPreReleases };
                }
            }
            // Install by gallery
            else if (arg.gallery) {
                extension = arg;
                gallery = arg.gallery;
                if (installOptions.version && installOptions.version !== gallery?.version) {
                    installableInfo = { id: extension.identifier.id, version: installOptions.version };
                }
            }
            // Install by resource
            else if (arg.resourceExtension) {
                extension = arg;
                installable = arg.resourceExtension;
            }
            if (installableInfo) {
                const targetPlatform = extension?.server ? await extension.server.extensionManagementService.getTargetPlatform() : undefined;
                gallery = (await this.galleryService.getExtensions([installableInfo], { targetPlatform }, CancellationToken.None)).at(0);
            }
            if (!extension && gallery) {
                extension = this.instantiationService.createInstance(Extension, ext => this.getExtensionState(ext), ext => this.getRuntimeState(ext), undefined, undefined, gallery, undefined);
                extension.setExtensionsControlManifest(await this.extensionManagementService.getExtensionsControlManifest());
            }
            if (extension?.isMalicious) {
                throw new Error(nls.localize('malicious', "This extension is reported to be problematic."));
            }
            if (gallery) {
                // If requested to install everywhere
                // then install the extension in all the servers where it is not installed
                if (installOptions.installEverywhere) {
                    servers = [];
                    const installableServers = await this.extensionManagementService.getInstallableServers(gallery);
                    for (const extensionsServer of this.extensionsServers) {
                        if (installableServers.includes(extensionsServer.server) && !extensionsServer.local.find(e => areSameExtensions(e.identifier, gallery.identifier))) {
                            servers.push(extensionsServer.server);
                        }
                    }
                }
                // If requested to enable and extension is already installed
                // Check if the extension is disabled because of extension kind
                // If so, install the extension in the server that is compatible.
                else if (installOptions.enable && extension?.local) {
                    servers = [];
                    if (extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
                        const [installableServer] = await this.extensionManagementService.getInstallableServers(gallery);
                        if (installableServer) {
                            servers.push(installableServer);
                        }
                    }
                }
            }
            if (!servers || servers.length) {
                if (!installable) {
                    if (!gallery) {
                        const id = isString(arg) ? arg : arg.identifier.id;
                        const manifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
                        const reportIssueUri = manifest ? getExtensionGalleryManifestResourceUri(manifest, "ReportIssueUri" /* ExtensionGalleryResourceType.ReportIssueUri */) : undefined;
                        const reportIssueMessage = reportIssueUri ? nls.localize('report issue', "If this issue persists, please report it at {0}", reportIssueUri.toString()) : '';
                        if (installOptions.version) {
                            const message = nls.localize('not found version', "The extension '{0}' cannot be installed because the requested version '{1}' was not found.", id, installOptions.version);
                            throw new ExtensionManagementError(reportIssueMessage ? `${message} ${reportIssueMessage}` : message, "NotFound" /* ExtensionManagementErrorCode.NotFound */);
                        }
                        else {
                            const message = nls.localize('not found', "The extension '{0}' cannot be installed because it was not found.", id);
                            throw new ExtensionManagementError(reportIssueMessage ? `${message} ${reportIssueMessage}` : message, "NotFound" /* ExtensionManagementErrorCode.NotFound */);
                        }
                    }
                    installable = gallery;
                }
                if (installOptions.version) {
                    installOptions.installGivenVersion = true;
                }
                if (extension?.isWorkspaceScoped) {
                    installOptions.isWorkspaceScoped = true;
                }
            }
        }
        if (installable) {
            if (installOptions.justification) {
                const syncCheck = isUndefined(installOptions.isMachineScoped) && this.userDataSyncEnablementService.isEnabled() && this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */);
                const buttons = [];
                buttons.push({
                    label: isString(installOptions.justification) || !installOptions.justification.action
                        ? nls.localize({ key: 'installButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Install Extension")
                        : nls.localize({ key: 'installButtonLabelWithAction', comment: ['&& denotes a mnemonic'] }, "&&Install Extension and {0}", installOptions.justification.action), run: () => true
                });
                if (!extension) {
                    buttons.push({ label: nls.localize('open', "Open Extension"), run: () => { this.open(extension); return false; } });
                }
                const result = await this.dialogService.prompt({
                    title: nls.localize('installExtensionTitle', "Install Extension"),
                    message: extension ? nls.localize('installExtensionMessage', "Would you like to install '{0}' extension from '{1}'?", extension.displayName, extension.publisherDisplayName) : nls.localize('installVSIXMessage', "Would you like to install the extension?"),
                    detail: isString(installOptions.justification) ? installOptions.justification : installOptions.justification.reason,
                    cancelButton: true,
                    buttons,
                    checkbox: syncCheck ? {
                        label: nls.localize('sync extension', "Sync this extension"),
                        checked: true,
                    } : undefined,
                });
                if (!result.result) {
                    throw new CancellationError();
                }
                if (syncCheck) {
                    installOptions.isMachineScoped = !result.checkboxChecked;
                }
            }
            if (installable instanceof URI) {
                extension = await this.doInstall(undefined, () => this.installFromVSIX(installable, installOptions), progressLocation);
            }
            else if (extension) {
                if (extension.resourceExtension) {
                    extension = await this.doInstall(extension, () => this.extensionManagementService.installResourceExtension(installable, installOptions), progressLocation);
                }
                else {
                    extension = await this.doInstall(extension, () => this.installFromGallery(extension, installable, installOptions, servers), progressLocation);
                }
            }
        }
        if (!extension) {
            throw new Error(nls.localize('unknown', "Unable to install extension"));
        }
        if (installOptions.enable) {
            if (extension.enablementState === 10 /* EnablementState.DisabledWorkspace */ || extension.enablementState === 9 /* EnablementState.DisabledGlobally */) {
                if (installOptions.justification) {
                    const result = await this.dialogService.confirm({
                        title: nls.localize('enableExtensionTitle', "Enable Extension"),
                        message: nls.localize('enableExtensionMessage', "Would you like to enable '{0}' extension?", extension.displayName),
                        detail: isString(installOptions.justification) ? installOptions.justification : installOptions.justification.reason,
                        primaryButton: isString(installOptions.justification) ? nls.localize({ key: 'enableButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Enable Extension") : nls.localize({ key: 'enableButtonLabelWithAction', comment: ['&& denotes a mnemonic'] }, "&&Enable Extension and {0}", installOptions.justification.action),
                    });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
                await this.setEnablement(extension, extension.enablementState === 10 /* EnablementState.DisabledWorkspace */ ? 12 /* EnablementState.EnabledWorkspace */ : 11 /* EnablementState.EnabledGlobally */);
            }
            await this.waitUntilExtensionIsEnabled(extension);
        }
        return extension;
    }
    async installInServer(extension, server, installOptions) {
        await this.doInstall(extension, async () => {
            const local = extension.local;
            if (!local) {
                throw new Error('Extension not found');
            }
            if (!extension.gallery) {
                extension = (await this.getExtensions([{ ...extension.identifier, preRelease: local.preRelease }], CancellationToken.None))[0] ?? extension;
            }
            if (extension.gallery) {
                return server.extensionManagementService.installFromGallery(extension.gallery, { installPreReleaseVersion: local.preRelease, ...installOptions });
            }
            const targetPlatform = await server.extensionManagementService.getTargetPlatform();
            if (!isTargetPlatformCompatible(local.targetPlatform, [local.targetPlatform], targetPlatform)) {
                throw new Error(nls.localize('incompatible', "Can't install '{0}' extension because it is not compatible.", extension.identifier.id));
            }
            const vsix = await this.extensionManagementService.zip(local);
            try {
                return await server.extensionManagementService.install(vsix);
            }
            finally {
                try {
                    await this.fileService.del(vsix);
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
        });
    }
    canSetLanguage(extension) {
        if (!isWeb) {
            return false;
        }
        if (!extension.gallery) {
            return false;
        }
        const locale = getLocale(extension.gallery);
        if (!locale) {
            return false;
        }
        return true;
    }
    async setLanguage(extension) {
        if (!this.canSetLanguage(extension)) {
            throw new Error('Can not set language');
        }
        const locale = getLocale(extension.gallery);
        if (locale === language) {
            return;
        }
        const localizedLanguageName = extension.gallery?.properties?.localizedLanguages?.[0];
        return this.localeService.setLocale({ id: locale, galleryExtension: extension.gallery, extensionId: extension.identifier.id, label: localizedLanguageName ?? extension.displayName });
    }
    setEnablement(extensions, enablementState) {
        extensions = Array.isArray(extensions) ? extensions : [extensions];
        return this.promptAndSetEnablement(extensions, enablementState);
    }
    async uninstall(e) {
        const extension = e.local ? e : this.local.find(local => areSameExtensions(local.identifier, e.identifier));
        if (!extension?.local) {
            throw new Error('Missing local');
        }
        const extensionsToUninstall = [{ extension: extension.local }];
        for (const packExtension of this.getAllPackExtensionsToUninstall(extension.local, this.local)) {
            if (!extensionsToUninstall.some(e => areSameExtensions(e.extension.identifier, packExtension.identifier))) {
                extensionsToUninstall.push({ extension: packExtension });
            }
        }
        const dependents = [];
        for (const { extension } of extensionsToUninstall) {
            for (const local of this.local) {
                if (!local.local) {
                    continue;
                }
                if (areSameExtensions(local.identifier, extension.identifier)) {
                    continue;
                }
                if (local.dependencies.length === 0) {
                    continue;
                }
                if (extension.manifest.extensionPack?.some(id => areSameExtensions({ id }, local.identifier))) {
                    continue;
                }
                if (dependents.some(d => d.extensionPack.some(id => areSameExtensions({ id }, local.identifier)))) {
                    continue;
                }
                if (local.dependencies.some(dep => areSameExtensions(extension.identifier, { id: dep }))) {
                    dependents.push(local);
                    extensionsToUninstall.push({ extension: local.local });
                }
            }
        }
        if (dependents.length) {
            const { result } = await this.dialogService.prompt({
                title: nls.localize('uninstallDependents', "Uninstall Extension with Dependents"),
                type: Severity.Warning,
                message: this.getErrorMessageForUninstallingAnExtensionWithDependents(extension, dependents),
                buttons: [{
                        label: nls.localize('uninstallAll', "Uninstall All"),
                        run: () => true
                    }],
                cancelButton: {
                    run: () => false
                }
            });
            if (!result) {
                throw new CancellationError();
            }
        }
        return this.withProgress({
            location: 5 /* ProgressLocation.Extensions */,
            title: nls.localize('uninstallingExtension', 'Uninstalling extension....'),
            source: `${extension.identifier.id}`
        }, () => this.extensionManagementService.uninstallExtensions(extensionsToUninstall).then(() => undefined));
    }
    getAllPackExtensionsToUninstall(extension, installed, checked = []) {
        if (checked.some(e => areSameExtensions(e.identifier, extension.identifier))) {
            return [];
        }
        checked.push(extension);
        const extensionsPack = extension.manifest.extensionPack ?? [];
        if (extensionsPack.length) {
            const packedExtensions = [];
            for (const i of installed) {
                if (i.local && !i.isBuiltin && extensionsPack.some(id => areSameExtensions({ id }, i.identifier))) {
                    packedExtensions.push(i.local);
                }
            }
            const packOfPackedExtensions = [];
            for (const packedExtension of packedExtensions) {
                packOfPackedExtensions.push(...this.getAllPackExtensionsToUninstall(packedExtension, installed, checked));
            }
            return [...packedExtensions, ...packOfPackedExtensions];
        }
        return [];
    }
    getErrorMessageForUninstallingAnExtensionWithDependents(extension, dependents) {
        if (dependents.length === 1) {
            return nls.localize('singleDependentUninstallError', "Cannot uninstall '{0}' extension alone. '{1}' extension depends on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName);
        }
        if (dependents.length === 2) {
            return nls.localize('twoDependentsUninstallError', "Cannot uninstall '{0}' extension alone. '{1}' and '{2}' extensions depend on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
        }
        return nls.localize('multipleDependentsUninstallError', "Cannot uninstall '{0}' extension alone. '{1}', '{2}' and other extensions depend on this. Do you want to uninstall all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
    }
    isExtensionIgnoredToSync(extension) {
        return extension.local ? !this.isInstalledExtensionSynced(extension.local)
            : this.extensionsSyncManagementService.hasToNeverSyncExtension(extension.identifier.id);
    }
    async togglePreRelease(extension) {
        if (!extension.local) {
            return;
        }
        if (extension.preRelease !== extension.isPreReleaseVersion) {
            await this.extensionManagementService.updateMetadata(extension.local, { preRelease: !extension.preRelease });
            return;
        }
        await this.install(extension, { installPreReleaseVersion: !extension.preRelease, preRelease: !extension.preRelease });
    }
    async toggleExtensionIgnoredToSync(extension) {
        const isIgnored = this.isExtensionIgnoredToSync(extension);
        if (extension.local && isIgnored) {
            extension.local = await this.updateSynchronizingInstalledExtension(extension.local, true);
            this._onChange.fire(extension);
        }
        else {
            this.extensionsSyncManagementService.updateIgnoredExtensions(extension.identifier.id, !isIgnored);
        }
        await this.userDataAutoSyncService.triggerSync(['IgnoredExtensionsUpdated']);
    }
    async toggleApplyExtensionToAllProfiles(extension) {
        if (!extension.local || isApplicationScopedExtension(extension.local.manifest) || extension.isBuiltin) {
            return;
        }
        const isApplicationScoped = extension.local.isApplicationScoped;
        await Promise.all(this.getAllExtensions().map(async (extensions) => {
            const local = extensions.local.find(e => areSameExtensions(e.identifier, extension.identifier))?.local;
            if (local && local.isApplicationScoped === isApplicationScoped) {
                await this.extensionManagementService.toggleAppliationScope(local, this.userDataProfileService.currentProfile.extensionsResource);
            }
        }));
    }
    getAllExtensions() {
        const extensions = [];
        if (this.localExtensions) {
            extensions.push(this.localExtensions);
        }
        if (this.remoteExtensions) {
            extensions.push(this.remoteExtensions);
        }
        if (this.webExtensions) {
            extensions.push(this.webExtensions);
        }
        return extensions;
    }
    isInstalledExtensionSynced(extension) {
        if (extension.isMachineScoped) {
            return false;
        }
        if (this.extensionsSyncManagementService.hasToAlwaysSyncExtension(extension.identifier.id)) {
            return true;
        }
        return !this.extensionsSyncManagementService.hasToNeverSyncExtension(extension.identifier.id);
    }
    async updateSynchronizingInstalledExtension(extension, sync) {
        const isMachineScoped = !sync;
        if (extension.isMachineScoped !== isMachineScoped) {
            extension = await this.extensionManagementService.updateMetadata(extension, { isMachineScoped });
        }
        if (sync) {
            this.extensionsSyncManagementService.updateIgnoredExtensions(extension.identifier.id, false);
        }
        return extension;
    }
    doInstall(extension, installTask, progressLocation) {
        const title = extension ? nls.localize('installing named extension', "Installing '{0}' extension....", extension.displayName) : nls.localize('installing extension', 'Installing extension....');
        return this.withProgress({
            location: progressLocation ?? 5 /* ProgressLocation.Extensions */,
            title
        }, async () => {
            try {
                if (extension) {
                    this.installing.push(extension);
                    this._onChange.fire(extension);
                }
                const local = await installTask();
                return await this.waitAndGetInstalledExtension(local.identifier);
            }
            finally {
                if (extension) {
                    this.installing = this.installing.filter(e => e !== extension);
                    // Trigger the change without passing the extension because it is replaced by a new instance.
                    this._onChange.fire(undefined);
                }
            }
        });
    }
    async installFromVSIX(vsix, installOptions) {
        const manifest = await this.extensionManagementService.getManifest(vsix);
        const existingExtension = this.local.find(local => areSameExtensions(local.identifier, { id: getGalleryExtensionId(manifest.publisher, manifest.name) }));
        if (existingExtension) {
            installOptions = installOptions || {};
            if (existingExtension.latestVersion === manifest.version) {
                installOptions.pinned = existingExtension.local?.pinned || !this.shouldAutoUpdateExtension(existingExtension);
            }
            else {
                installOptions.installGivenVersion = true;
            }
        }
        return this.extensionManagementService.installVSIX(vsix, manifest, installOptions);
    }
    installFromGallery(extension, gallery, installOptions, servers) {
        installOptions = installOptions ?? {};
        installOptions.pinned = extension.local?.pinned || !this.shouldAutoUpdateExtension(extension);
        if (extension.local && !servers) {
            installOptions.productVersion = this.getProductVersion();
            installOptions.operation = 3 /* InstallOperation.Update */;
            return this.extensionManagementService.updateFromGallery(gallery, extension.local, installOptions);
        }
        else {
            return this.extensionManagementService.installFromGallery(gallery, installOptions, servers);
        }
    }
    async waitAndGetInstalledExtension(identifier) {
        let installedExtension = this.local.find(local => areSameExtensions(local.identifier, identifier));
        if (!installedExtension) {
            await Event.toPromise(Event.filter(this.onChange, e => !!e && this.local.some(local => areSameExtensions(local.identifier, identifier))));
        }
        installedExtension = this.local.find(local => areSameExtensions(local.identifier, identifier));
        if (!installedExtension) {
            // This should not happen
            throw new Error('Extension should have been installed');
        }
        return installedExtension;
    }
    async waitUntilExtensionIsEnabled(extension) {
        if (this.extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension.identifier.id))) {
            return;
        }
        if (!extension.local || !this.extensionService.canAddExtension(toExtensionDescription(extension.local))) {
            return;
        }
        await new Promise((c, e) => {
            const disposable = this.extensionService.onDidChangeExtensions(() => {
                try {
                    if (this.extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension.identifier.id))) {
                        disposable.dispose();
                        c();
                    }
                }
                catch (error) {
                    e(error);
                }
            });
        });
    }
    promptAndSetEnablement(extensions, enablementState) {
        const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ || enablementState === 12 /* EnablementState.EnabledWorkspace */;
        if (enable) {
            const allDependenciesAndPackedExtensions = this.getExtensionsRecursively(extensions, this.local, enablementState, { dependencies: true, pack: true });
            return this.checkAndSetEnablement(extensions, allDependenciesAndPackedExtensions, enablementState);
        }
        else {
            const packedExtensions = this.getExtensionsRecursively(extensions, this.local, enablementState, { dependencies: false, pack: true });
            if (packedExtensions.length) {
                return this.checkAndSetEnablement(extensions, packedExtensions, enablementState);
            }
            return this.checkAndSetEnablement(extensions, [], enablementState);
        }
    }
    async checkAndSetEnablement(extensions, otherExtensions, enablementState) {
        const allExtensions = [...extensions, ...otherExtensions];
        const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ || enablementState === 12 /* EnablementState.EnabledWorkspace */;
        if (!enable) {
            for (const extension of extensions) {
                const dependents = this.getDependentsAfterDisablement(extension, allExtensions, this.local);
                if (dependents.length) {
                    const { result } = await this.dialogService.prompt({
                        title: nls.localize('disableDependents', "Disable Extension with Dependents"),
                        type: Severity.Warning,
                        message: this.getDependentsErrorMessageForDisablement(extension, allExtensions, dependents),
                        buttons: [{
                                label: nls.localize('disable all', 'Disable All'),
                                run: () => true
                            }],
                        cancelButton: {
                            run: () => false
                        }
                    });
                    if (!result) {
                        throw new CancellationError();
                    }
                    await this.checkAndSetEnablement(dependents, [extension], enablementState);
                }
            }
        }
        return this.doSetEnablement(allExtensions, enablementState);
    }
    getExtensionsRecursively(extensions, installed, enablementState, options, checked = []) {
        const toCheck = extensions.filter(e => checked.indexOf(e) === -1);
        if (toCheck.length) {
            for (const extension of toCheck) {
                checked.push(extension);
            }
            const extensionsToEanbleOrDisable = installed.filter(i => {
                if (checked.indexOf(i) !== -1) {
                    return false;
                }
                const enable = enablementState === 11 /* EnablementState.EnabledGlobally */ || enablementState === 12 /* EnablementState.EnabledWorkspace */;
                const isExtensionEnabled = i.enablementState === 11 /* EnablementState.EnabledGlobally */ || i.enablementState === 12 /* EnablementState.EnabledWorkspace */;
                if (enable === isExtensionEnabled) {
                    return false;
                }
                return (enable || !i.isBuiltin) // Include all Extensions for enablement and only non builtin extensions for disablement
                    && (options.dependencies || options.pack)
                    && extensions.some(extension => (options.dependencies && extension.dependencies.some(id => areSameExtensions({ id }, i.identifier)))
                        || (options.pack && extension.extensionPack.some(id => areSameExtensions({ id }, i.identifier))));
            });
            if (extensionsToEanbleOrDisable.length) {
                extensionsToEanbleOrDisable.push(...this.getExtensionsRecursively(extensionsToEanbleOrDisable, installed, enablementState, options, checked));
            }
            return extensionsToEanbleOrDisable;
        }
        return [];
    }
    getDependentsAfterDisablement(extension, extensionsToDisable, installed) {
        return installed.filter(i => {
            if (i.dependencies.length === 0) {
                return false;
            }
            if (i === extension) {
                return false;
            }
            if (!this.extensionEnablementService.isEnabledEnablementState(i.enablementState)) {
                return false;
            }
            if (extensionsToDisable.indexOf(i) !== -1) {
                return false;
            }
            return i.dependencies.some(dep => [extension, ...extensionsToDisable].some(d => areSameExtensions(d.identifier, { id: dep })));
        });
    }
    getDependentsErrorMessageForDisablement(extension, allDisabledExtensions, dependents) {
        for (const e of [extension, ...allDisabledExtensions]) {
            const dependentsOfTheExtension = dependents.filter(d => d.dependencies.some(id => areSameExtensions({ id }, e.identifier)));
            if (dependentsOfTheExtension.length) {
                return this.getErrorMessageForDisablingAnExtensionWithDependents(e, dependentsOfTheExtension);
            }
        }
        return '';
    }
    getErrorMessageForDisablingAnExtensionWithDependents(extension, dependents) {
        if (dependents.length === 1) {
            return nls.localize('singleDependentError', "Cannot disable '{0}' extension alone. '{1}' extension depends on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName);
        }
        if (dependents.length === 2) {
            return nls.localize('twoDependentsError', "Cannot disable '{0}' extension alone. '{1}' and '{2}' extensions depend on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
        }
        return nls.localize('multipleDependentsError', "Cannot disable '{0}' extension alone. '{1}', '{2}' and other extensions depend on this. Do you want to disable all these extensions?", extension.displayName, dependents[0].displayName, dependents[1].displayName);
    }
    async doSetEnablement(extensions, enablementState) {
        return await this.extensionEnablementService.setEnablement(extensions.map(e => e.local), enablementState);
    }
    reportProgressFromOtherSources() {
        if (this.installed.some(e => e.state === 0 /* ExtensionState.Installing */ || e.state === 2 /* ExtensionState.Uninstalling */)) {
            if (!this._activityCallBack) {
                this.withProgress({ location: 5 /* ProgressLocation.Extensions */ }, () => new Promise(resolve => this._activityCallBack = resolve));
            }
        }
        else {
            this._activityCallBack?.();
            this._activityCallBack = undefined;
        }
    }
    withProgress(options, task) {
        return this.progressService.withProgress(options, async () => {
            const cancelableTask = createCancelablePromise(() => task());
            this.tasksInProgress.push(cancelableTask);
            try {
                return await cancelableTask;
            }
            finally {
                const index = this.tasksInProgress.indexOf(cancelableTask);
                if (index !== -1) {
                    this.tasksInProgress.splice(index, 1);
                }
            }
        });
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        const message = err && err.message || '';
        if (/getaddrinfo ENOTFOUND|getaddrinfo ENOENT|connect EACCES|connect ECONNREFUSED/.test(message)) {
            return;
        }
        this.notificationService.error(err);
    }
    handleURL(uri, options) {
        if (!/^extension/.test(uri.path)) {
            return Promise.resolve(false);
        }
        this.onOpenExtensionUrl(uri);
        return Promise.resolve(true);
    }
    onOpenExtensionUrl(uri) {
        const match = /^extension\/([^/]+)$/.exec(uri.path);
        if (!match) {
            return;
        }
        const extensionId = match[1];
        this.queryLocal().then(async (local) => {
            let extension = local.find(local => areSameExtensions(local.identifier, { id: extensionId }));
            if (!extension) {
                [extension] = await this.getExtensions([{ id: extensionId }], { source: 'uri' }, CancellationToken.None);
            }
            if (extension) {
                await this.hostService.focus(mainWindow);
                await this.open(extension);
            }
        }).then(undefined, error => this.onError(error));
    }
    getPublishersToAutoUpdate() {
        return this.getEnabledAutoUpdateExtensions().filter(id => !EXTENSION_IDENTIFIER_REGEX.test(id));
    }
    getEnabledAutoUpdateExtensions() {
        try {
            const parsedValue = JSON.parse(this.enabledAuotUpdateExtensionsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) { /* Ignore */ }
        return [];
    }
    setEnabledAutoUpdateExtensions(enabledAutoUpdateExtensions) {
        this.enabledAuotUpdateExtensionsValue = JSON.stringify(enabledAutoUpdateExtensions);
    }
    get enabledAuotUpdateExtensionsValue() {
        if (!this._enabledAutoUpdateExtensionsValue) {
            this._enabledAutoUpdateExtensionsValue = this.getEnabledAutoUpdateExtensionsValue();
        }
        return this._enabledAutoUpdateExtensionsValue;
    }
    set enabledAuotUpdateExtensionsValue(enabledAuotUpdateExtensionsValue) {
        if (this.enabledAuotUpdateExtensionsValue !== enabledAuotUpdateExtensionsValue) {
            this._enabledAutoUpdateExtensionsValue = enabledAuotUpdateExtensionsValue;
            this.setEnabledAutoUpdateExtensionsValue(enabledAuotUpdateExtensionsValue);
        }
    }
    getEnabledAutoUpdateExtensionsValue() {
        return this.storageService.get(EXTENSIONS_AUTO_UPDATE_KEY, -1 /* StorageScope.APPLICATION */, '[]');
    }
    setEnabledAutoUpdateExtensionsValue(value) {
        this.storageService.store(EXTENSIONS_AUTO_UPDATE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getDisabledAutoUpdateExtensions() {
        try {
            const parsedValue = JSON.parse(this.disabledAutoUpdateExtensionsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) { /* Ignore */ }
        return [];
    }
    setDisabledAutoUpdateExtensions(disabledAutoUpdateExtensions) {
        this.disabledAutoUpdateExtensionsValue = JSON.stringify(disabledAutoUpdateExtensions);
    }
    get disabledAutoUpdateExtensionsValue() {
        if (!this._disabledAutoUpdateExtensionsValue) {
            this._disabledAutoUpdateExtensionsValue = this.getDisabledAutoUpdateExtensionsValue();
        }
        return this._disabledAutoUpdateExtensionsValue;
    }
    set disabledAutoUpdateExtensionsValue(disabledAutoUpdateExtensionsValue) {
        if (this.disabledAutoUpdateExtensionsValue !== disabledAutoUpdateExtensionsValue) {
            this._disabledAutoUpdateExtensionsValue = disabledAutoUpdateExtensionsValue;
            this.setDisabledAutoUpdateExtensionsValue(disabledAutoUpdateExtensionsValue);
        }
    }
    getDisabledAutoUpdateExtensionsValue() {
        return this.storageService.get(EXTENSIONS_DONOT_AUTO_UPDATE_KEY, -1 /* StorageScope.APPLICATION */, '[]');
    }
    setDisabledAutoUpdateExtensionsValue(value) {
        this.storageService.store(EXTENSIONS_DONOT_AUTO_UPDATE_KEY, value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getDismissedNotifications() {
        try {
            const parsedValue = JSON.parse(this.dismissedNotificationsValue);
            if (Array.isArray(parsedValue)) {
                return parsedValue;
            }
        }
        catch (e) { /* Ignore */ }
        return [];
    }
    setDismissedNotifications(dismissedNotifications) {
        this.dismissedNotificationsValue = JSON.stringify(dismissedNotifications);
    }
    get dismissedNotificationsValue() {
        if (!this._dismissedNotificationsValue) {
            this._dismissedNotificationsValue = this.getDismissedNotificationsValue();
        }
        return this._dismissedNotificationsValue;
    }
    set dismissedNotificationsValue(dismissedNotificationsValue) {
        if (this.dismissedNotificationsValue !== dismissedNotificationsValue) {
            this._dismissedNotificationsValue = dismissedNotificationsValue;
            this.setDismissedNotificationsValue(dismissedNotificationsValue);
        }
    }
    getDismissedNotificationsValue() {
        return this.storageService.get(EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, 0 /* StorageScope.PROFILE */, '[]');
    }
    setDismissedNotificationsValue(value) {
        this.storageService.store(EXTENSIONS_DISMISSED_NOTIFICATIONS_KEY, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ExtensionsWorkbenchService = ExtensionsWorkbenchService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorService),
    __param(2, IWorkbenchExtensionManagementService),
    __param(3, IExtensionGalleryService),
    __param(4, IExtensionGalleryManifestService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, INotificationService),
    __param(8, IURLService),
    __param(9, IWorkbenchExtensionEnablementService),
    __param(10, IHostService),
    __param(11, IProgressService),
    __param(12, IExtensionManagementServerService),
    __param(13, ILanguageService),
    __param(14, IIgnoredExtensionsManagementService),
    __param(15, IUserDataAutoSyncService),
    __param(16, IProductService),
    __param(17, IContextKeyService),
    __param(18, IExtensionManifestPropertiesService),
    __param(19, ILogService),
    __param(20, IExtensionService),
    __param(21, ILocaleService),
    __param(22, ILifecycleService),
    __param(23, IFileService),
    __param(24, IUserDataProfileService),
    __param(25, IStorageService),
    __param(26, IDialogService),
    __param(27, IUserDataSyncEnablementService),
    __param(28, IUpdateService),
    __param(29, IUriIdentityService),
    __param(30, IWorkspaceContextService),
    __param(31, IViewsService),
    __param(32, IFileDialogService),
    __param(33, IQuickInputService),
    __param(34, IAllowedExtensionsService)
], ExtensionsWorkbenchService);
export { ExtensionsWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNXb3JrYmVuY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUQsT0FBTyxFQUFxQixRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25HLE9BQU8sRUFBVSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQ04sd0JBQXdCLEVBQzZDLGlCQUFpQixFQUNBLDBCQUEwQixFQUF3QiwwQkFBMEIsRUFHbEssc0JBQXNCLEVBQ3RCLHlCQUF5QixFQUN6QiwwQkFBMEIsRUFDMUIsOENBQThDLEVBQzlDLHdCQUF3QixFQUV4QixNQUFNLHdFQUF3RSxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxvQ0FBb0MsRUFBbUIsaUNBQWlDLEVB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