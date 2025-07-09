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
import { distinct } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { isWeb, platform } from '../../../base/common/platform.js';
import { arch } from '../../../base/common/process.js';
import { isBoolean, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { isOfflineError } from '../../../base/parts/request/common/request.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { getTargetPlatform, isNotWebExtensionInWebTargetPlatform, isTargetPlatformCompatible, toTargetPlatform, WEB_EXTENSION_TAG, ExtensionGalleryError, UseUnpkgResourceApiConfigKey, IAllowedExtensionsService, EXTENSION_IDENTIFIER_REGEX } from './extensionManagement.js';
import { adoptToGalleryExtensionId, areSameExtensions, getGalleryExtensionId, getGalleryExtensionTelemetryData } from './extensionManagementUtil.js';
import { areApiProposalsCompatible, isEngineValid } from '../../extensions/common/extensionValidator.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, asTextOrError, IRequestService, isSuccess } from '../../request/common/request.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { format2 } from '../../../base/common/strings.js';
import { getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService } from './extensionGalleryManifest.js';
const CURRENT_TARGET_PLATFORM = isWeb ? "web" /* TargetPlatform.WEB */ : getTargetPlatform(platform, arch);
const SEARCH_ACTIVITY_HEADER_NAME = 'X-Market-Search-Activity-Id';
const ACTIVITY_HEADER_NAME = 'Activityid';
const SERVER_HEADER_NAME = 'Server';
const END_END_ID_HEADER_NAME = 'X-Vss-E2eid';
const AssetType = {
    Icon: 'Microsoft.VisualStudio.Services.Icons.Default',
    Details: 'Microsoft.VisualStudio.Services.Content.Details',
    Changelog: 'Microsoft.VisualStudio.Services.Content.Changelog',
    Manifest: 'Microsoft.VisualStudio.Code.Manifest',
    VSIX: 'Microsoft.VisualStudio.Services.VSIXPackage',
    License: 'Microsoft.VisualStudio.Services.Content.License',
    Repository: 'Microsoft.VisualStudio.Services.Links.Source',
    Signature: 'Microsoft.VisualStudio.Services.VsixSignature'
};
const PropertyType = {
    Dependency: 'Microsoft.VisualStudio.Code.ExtensionDependencies',
    ExtensionPack: 'Microsoft.VisualStudio.Code.ExtensionPack',
    Engine: 'Microsoft.VisualStudio.Code.Engine',
    PreRelease: 'Microsoft.VisualStudio.Code.PreRelease',
    EnabledApiProposals: 'Microsoft.VisualStudio.Code.EnabledApiProposals',
    LocalizedLanguages: 'Microsoft.VisualStudio.Code.LocalizedLanguages',
    WebExtension: 'Microsoft.VisualStudio.Code.WebExtension',
    SponsorLink: 'Microsoft.VisualStudio.Code.SponsorLink',
    SupportLink: 'Microsoft.VisualStudio.Services.Links.Support',
    ExecutesCode: 'Microsoft.VisualStudio.Code.ExecutesCode',
    Private: 'PrivateMarketplace',
};
const DefaultPageSize = 10;
const DefaultQueryState = {
    pageNumber: 1,
    pageSize: DefaultPageSize,
    sortBy: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
    sortOrder: 0 /* SortOrder.Default */,
    flags: [],
    criteria: [],
    assetTypes: []
};
var VersionKind;
(function (VersionKind) {
    VersionKind[VersionKind["Release"] = 0] = "Release";
    VersionKind[VersionKind["Prerelease"] = 1] = "Prerelease";
    VersionKind[VersionKind["Latest"] = 2] = "Latest";
})(VersionKind || (VersionKind = {}));
class Query {
    constructor(state = DefaultQueryState) {
        this.state = state;
    }
    get pageNumber() { return this.state.pageNumber; }
    get pageSize() { return this.state.pageSize; }
    get sortBy() { return this.state.sortBy; }
    get sortOrder() { return this.state.sortOrder; }
    get flags() { return this.state.flags; }
    get criteria() { return this.state.criteria; }
    get assetTypes() { return this.state.assetTypes; }
    get source() { return this.state.source; }
    get searchText() {
        const criterium = this.state.criteria.filter(criterium => criterium.filterType === "SearchText" /* FilterType.SearchText */)[0];
        return criterium && criterium.value ? criterium.value : '';
    }
    withPage(pageNumber, pageSize = this.state.pageSize) {
        return new Query({ ...this.state, pageNumber, pageSize });
    }
    withFilter(filterType, ...values) {
        const criteria = [
            ...this.state.criteria,
            ...values.length ? values.map(value => ({ filterType, value })) : [{ filterType }]
        ];
        return new Query({ ...this.state, criteria });
    }
    withSortBy(sortBy) {
        return new Query({ ...this.state, sortBy });
    }
    withSortOrder(sortOrder) {
        return new Query({ ...this.state, sortOrder });
    }
    withFlags(...flags) {
        return new Query({ ...this.state, flags: distinct(flags) });
    }
    withAssetTypes(...assetTypes) {
        return new Query({ ...this.state, assetTypes });
    }
    withSource(source) {
        return new Query({ ...this.state, source });
    }
}
function getStatistic(statistics, name) {
    const result = (statistics || []).filter(s => s.statisticName === name)[0];
    return result ? result.value : 0;
}
function getCoreTranslationAssets(version) {
    const coreTranslationAssetPrefix = 'Microsoft.VisualStudio.Code.Translation.';
    const result = version.files.filter(f => f.assetType.indexOf(coreTranslationAssetPrefix) === 0);
    return result.reduce((result, file) => {
        const asset = getVersionAsset(version, file.assetType);
        if (asset) {
            result.push([file.assetType.substring(coreTranslationAssetPrefix.length), asset]);
        }
        return result;
    }, []);
}
function getRepositoryAsset(version) {
    if (version.properties) {
        const results = version.properties.filter(p => p.key === AssetType.Repository);
        const gitRegExp = new RegExp('((git|ssh|http(s)?)|(git@[\\w.]+))(:(//)?)([\\w.@:/\\-~]+)(.git)(/)?');
        const uri = results.filter(r => gitRegExp.test(r.value))[0];
        return uri ? { uri: uri.value, fallbackUri: uri.value } : null;
    }
    return getVersionAsset(version, AssetType.Repository);
}
function getDownloadAsset(version) {
    return {
        // always use fallbackAssetUri for download asset to hit the Marketplace API so that downloads are counted
        uri: `${version.fallbackAssetUri}/${AssetType.VSIX}?redirect=true${version.targetPlatform ? `&targetPlatform=${version.targetPlatform}` : ''}`,
        fallbackUri: `${version.fallbackAssetUri}/${AssetType.VSIX}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`
    };
}
function getVersionAsset(version, type) {
    const result = version.files.filter(f => f.assetType === type)[0];
    return result ? {
        uri: `${version.assetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`,
        fallbackUri: `${version.fallbackAssetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`
    } : null;
}
function getExtensions(version, property) {
    const values = version.properties ? version.properties.filter(p => p.key === property) : [];
    const value = values.length > 0 && values[0].value;
    return value ? value.split(',').map(v => adoptToGalleryExtensionId(v)) : [];
}
function getEngine(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.Engine) : [];
    return (values.length > 0 && values[0].value) || '';
}
function isPreReleaseVersion(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.PreRelease) : [];
    return values.length > 0 && values[0].value === 'true';
}
function isPrivateExtension(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.Private) : [];
    return values.length > 0 && values[0].value === 'true';
}
function executesCode(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.ExecutesCode) : [];
    return values.length > 0 ? values[0].value === 'true' : undefined;
}
function getEnabledApiProposals(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.EnabledApiProposals) : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getLocalizedLanguages(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.LocalizedLanguages) : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getSponsorLink(version) {
    return version.properties?.find(p => p.key === PropertyType.SponsorLink)?.value;
}
function getSupportLink(version) {
    return version.properties?.find(p => p.key === PropertyType.SupportLink)?.value;
}
function getIsPreview(flags) {
    return flags.indexOf('preview') !== -1;
}
function getTargetPlatformForExtensionVersion(version) {
    return version.targetPlatform ? toTargetPlatform(version.targetPlatform) : "undefined" /* TargetPlatform.UNDEFINED */;
}
function getAllTargetPlatforms(rawGalleryExtension) {
    const allTargetPlatforms = distinct(rawGalleryExtension.versions.map(getTargetPlatformForExtensionVersion));
    // Is a web extension only if it has WEB_EXTENSION_TAG
    const isWebExtension = !!rawGalleryExtension.tags?.includes(WEB_EXTENSION_TAG);
    // Include Web Target Platform only if it is a web extension
    const webTargetPlatformIndex = allTargetPlatforms.indexOf("web" /* TargetPlatform.WEB */);
    if (isWebExtension) {
        if (webTargetPlatformIndex === -1) {
            // Web extension but does not has web target platform -> add it
            allTargetPlatforms.push("web" /* TargetPlatform.WEB */);
        }
    }
    else {
        if (webTargetPlatformIndex !== -1) {
            // Not a web extension but has web target platform -> remove it
            allTargetPlatforms.splice(webTargetPlatformIndex, 1);
        }
    }
    return allTargetPlatforms;
}
export function sortExtensionVersions(versions, preferredTargetPlatform) {
    /* It is expected that versions from Marketplace are sorted by version. So we are just sorting by preferred targetPlatform */
    for (let index = 0; index < versions.length; index++) {
        const version = versions[index];
        if (version.version === versions[index - 1]?.version) {
            let insertionIndex = index;
            const versionTargetPlatform = getTargetPlatformForExtensionVersion(version);
            /* put it at the beginning */
            if (versionTargetPlatform === preferredTargetPlatform) {
                while (insertionIndex > 0 && versions[insertionIndex - 1].version === version.version) {
                    insertionIndex--;
                }
            }
            if (insertionIndex !== index) {
                versions.splice(index, 1);
                versions.splice(insertionIndex, 0, version);
            }
        }
    }
    return versions;
}
function setTelemetry(extension, index, querySource) {
    /* __GDPR__FRAGMENT__
    "GalleryExtensionTelemetryData2" : {
        "index" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
        "querySource": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "queryActivityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    }
    */
    extension.telemetryData = { index, querySource, queryActivityId: extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME] };
}
function toExtension(galleryExtension, version, allTargetPlatforms, extensionGalleryManifest, queryContext) {
    const latestVersion = galleryExtension.versions[0];
    const assets = {
        manifest: getVersionAsset(version, AssetType.Manifest),
        readme: getVersionAsset(version, AssetType.Details),
        changelog: getVersionAsset(version, AssetType.Changelog),
        license: getVersionAsset(version, AssetType.License),
        repository: getRepositoryAsset(version),
        download: getDownloadAsset(version),
        icon: getVersionAsset(version, AssetType.Icon),
        signature: getVersionAsset(version, AssetType.Signature),
        coreTranslations: getCoreTranslationAssets(version)
    };
    const detailsViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */);
    const publisherViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */);
    const ratingViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */);
    return {
        type: 'gallery',
        identifier: {
            id: getGalleryExtensionId(galleryExtension.publisher.publisherName, galleryExtension.extensionName),
            uuid: galleryExtension.extensionId
        },
        name: galleryExtension.extensionName,
        version: version.version,
        displayName: galleryExtension.displayName,
        publisherId: galleryExtension.publisher.publisherId,
        publisher: galleryExtension.publisher.publisherName,
        publisherDisplayName: galleryExtension.publisher.displayName,
        publisherDomain: galleryExtension.publisher.domain ? { link: galleryExtension.publisher.domain, verified: !!galleryExtension.publisher.isDomainVerified } : undefined,
        publisherSponsorLink: getSponsorLink(latestVersion),
        description: galleryExtension.shortDescription ?? '',
        installCount: getStatistic(galleryExtension.statistics, 'install'),
        rating: getStatistic(galleryExtension.statistics, 'averagerating'),
        ratingCount: getStatistic(galleryExtension.statistics, 'ratingcount'),
        categories: galleryExtension.categories || [],
        tags: galleryExtension.tags || [],
        releaseDate: Date.parse(galleryExtension.releaseDate),
        lastUpdated: Date.parse(galleryExtension.lastUpdated),
        allTargetPlatforms,
        assets,
        properties: {
            dependencies: getExtensions(version, PropertyType.Dependency),
            extensionPack: getExtensions(version, PropertyType.ExtensionPack),
            engine: getEngine(version),
            enabledApiProposals: getEnabledApiProposals(version),
            localizedLanguages: getLocalizedLanguages(version),
            targetPlatform: getTargetPlatformForExtensionVersion(version),
            isPreReleaseVersion: isPreReleaseVersion(version),
            executesCode: executesCode(version)
        },
        hasPreReleaseVersion: isPreReleaseVersion(latestVersion),
        hasReleaseVersion: true,
        private: isPrivateExtension(latestVersion),
        preview: getIsPreview(galleryExtension.flags),
        isSigned: !!assets.signature,
        queryContext,
        supportLink: getSupportLink(latestVersion),
        detailsLink: detailsViewUri ? format2(detailsViewUri, { publisher: galleryExtension.publisher.publisherName, name: galleryExtension.extensionName }) : undefined,
        publisherLink: publisherViewUri ? format2(publisherViewUri, { publisher: galleryExtension.publisher.publisherName }) : undefined,
        ratingLink: ratingViewUri ? format2(ratingViewUri, { publisher: galleryExtension.publisher.publisherName, name: galleryExtension.extensionName }) : undefined,
    };
}
let AbstractExtensionGalleryService = class AbstractExtensionGalleryService {
    constructor(storageService, assignmentService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        this.assignmentService = assignmentService;
        this.requestService = requestService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.extensionsControlUrl = productService.extensionsGallery?.controlUrl;
        this.unpkgResourceApi = productService.extensionsGallery?.extensionUrlTemplate;
        this.extensionsEnabledWithApiProposalVersion = productService.extensionsEnabledWithApiProposalVersion?.map(id => id.toLowerCase()) ?? [];
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, this.environmentService, this.configurationService, this.fileService, storageService, this.telemetryService);
    }
    isEnabled() {
        return this.extensionGalleryManifestService.isEnabled();
    }
    async getExtensions(extensionInfos, arg1, arg2) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        const options = CancellationToken.isCancellationToken(arg1) ? {} : arg1;
        const token = CancellationToken.isCancellationToken(arg1) ? arg1 : arg2;
        const resourceApi = (options.preferResourceApi && (this.configurationService.getValue(UseUnpkgResourceApiConfigKey) ?? false)) ? await this.getResourceApi(extensionGalleryManifest) : undefined;
        const result = resourceApi
            ? await this.getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token)
            : await this.getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token);
        const uuids = result.map(r => r.identifier.uuid);
        const extensionInfosByName = [];
        for (const e of extensionInfos) {
            if (e.uuid && !uuids.includes(e.uuid)) {
                extensionInfosByName.push({ ...e, uuid: undefined });
            }
        }
        if (extensionInfosByName.length) {
            // report telemetry data for additional query
            this.telemetryService.publicLog2('galleryService:additionalQueryByName', {
                count: extensionInfosByName.length
            });
            const extensions = await this.getExtensionsUsingQueryApi(extensionInfosByName, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getResourceApi(extensionGalleryManifest) {
        const latestVersionResource = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */);
        if (!latestVersionResource) {
            return undefined;
        }
        if (this.productService.quality !== 'stable') {
            return {
                uri: latestVersionResource,
                fallback: this.unpkgResourceApi
            };
        }
        const value = await this.assignmentService?.getTreatment('extensions.gallery.useResourceApi') ?? 'unpkg';
        if (value === 'marketplace') {
            return {
                uri: latestVersionResource,
                fallback: this.unpkgResourceApi
            };
        }
        if (value === 'unpkg' && this.unpkgResourceApi) {
            return { uri: this.unpkgResourceApi };
        }
        return undefined;
    }
    async getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token) {
        const names = [], ids = [], includePreRelease = [], versions = [];
        let isQueryForReleaseVersionFromPreReleaseVersion = true;
        for (const extensionInfo of extensionInfos) {
            if (extensionInfo.uuid) {
                ids.push(extensionInfo.uuid);
            }
            else {
                names.push(extensionInfo.id);
            }
            if (extensionInfo.version) {
                versions.push({ id: extensionInfo.id, uuid: extensionInfo.uuid, version: extensionInfo.version });
            }
            else {
                includePreRelease.push({ id: extensionInfo.id, uuid: extensionInfo.uuid, includePreRelease: !!extensionInfo.preRelease });
            }
            isQueryForReleaseVersionFromPreReleaseVersion = isQueryForReleaseVersionFromPreReleaseVersion && (!!extensionInfo.hasPreRelease && !extensionInfo.preRelease);
        }
        if (!ids.length && !names.length) {
            return [];
        }
        let query = new Query().withPage(1, extensionInfos.length);
        if (ids.length) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, ...ids);
        }
        if (names.length) {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, ...names);
        }
        if (options.queryAllVersions) {
            query = query.withFlags(...query.flags, "IncludeVersions" /* Flag.IncludeVersions */);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const { extensions } = await this.queryGalleryExtensions(query, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            includePreRelease,
            versions,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? { version: this.productService.version, date: this.productService.date },
            isQueryForReleaseVersionFromPreReleaseVersion
        }, extensionGalleryManifest, token);
        if (options.source) {
            extensions.forEach((e, index) => setTelemetry(e, index, options.source));
        }
        return extensions;
    }
    async getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token) {
        const result = [];
        const toQuery = [];
        const toFetchLatest = [];
        for (const extensionInfo of extensionInfos) {
            if (!EXTENSION_IDENTIFIER_REGEX.test(extensionInfo.id)) {
                continue;
            }
            if (extensionInfo.version) {
                toQuery.push(extensionInfo);
            }
            else {
                toFetchLatest.push(extensionInfo);
            }
        }
        await Promise.allSettled(toFetchLatest.map(async (extensionInfo) => {
            let galleryExtension;
            try {
                try {
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.uri, extensionGalleryManifest, token);
                }
                catch (error) {
                    if (!resourceApi.fallback) {
                        throw error;
                    }
                    // fallback to unpkg
                    this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id} from ${resourceApi.uri}. Trying the fallback ${resourceApi.fallback}`, getErrorMessage(error));
                    this.telemetryService.publicLog2('galleryService:fallbacktounpkg', {
                        extension: extensionInfo.id,
                        preRelease: !!extensionInfo.preRelease,
                        compatible: !!options.compatible
                    });
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.fallback, extensionGalleryManifest, token);
                }
                if (galleryExtension === 'NOT_FOUND') {
                    if (extensionInfo.uuid) {
                        // Fallback to query if extension with UUID is not found. Probably extension is renamed.
                        toQuery.push(extensionInfo);
                    }
                    return;
                }
                if (galleryExtension) {
                    result.push(galleryExtension);
                }
            }
            catch (error) {
                // fallback to query
                this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id}.`, getErrorMessage(error));
                this.telemetryService.publicLog2('galleryService:fallbacktoquery', {
                    extension: extensionInfo.id,
                    preRelease: !!extensionInfo.preRelease,
                    compatible: !!options.compatible,
                    fromFallback: !!resourceApi.fallback
                });
                toQuery.push(extensionInfo);
            }
        }));
        if (toQuery.length) {
            const extensions = await this.getExtensionsUsingQueryApi(toQuery, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getLatestGalleryExtension(extensionInfo, options, resourceUriTemplate, extensionGalleryManifest, token) {
        const [publisher, name] = extensionInfo.id.split('.');
        const uri = URI.parse(format2(resourceUriTemplate, { publisher, name }));
        const rawGalleryExtension = await this.getLatestRawGalleryExtension(extensionInfo.id, uri, token);
        if (!rawGalleryExtension) {
            return 'NOT_FOUND';
        }
        const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
        const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? {
                version: this.productService.version,
                date: this.productService.date
            },
            version: extensionInfo.preRelease ? 1 /* VersionKind.Prerelease */ : 0 /* VersionKind.Release */
        }, allTargetPlatforms);
        if (rawGalleryExtensionVersion) {
            return toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest);
        }
        return null;
    }
    async getCompatibleExtension(extension, includePreRelease, targetPlatform, productVersion = { version: this.productService.version, date: this.productService.date }) {
        if (isNotWebExtensionInWebTargetPlatform(extension.allTargetPlatforms, targetPlatform)) {
            return null;
        }
        if (await this.isExtensionCompatible(extension, includePreRelease, targetPlatform)) {
            return extension;
        }
        if (this.allowedExtensionsService.isAllowed({ id: extension.identifier.id, publisherDisplayName: extension.publisherDisplayName }) !== true) {
            return null;
        }
        const result = await this.getExtensions([{
                ...extension.identifier,
                preRelease: includePreRelease,
                hasPreRelease: extension.hasPreReleaseVersion,
            }], {
            compatible: true,
            productVersion,
            queryAllVersions: true,
            targetPlatform,
        }, CancellationToken.None);
        return result[0] ?? null;
    }
    async isExtensionCompatible(extension, includePreRelease, targetPlatform, productVersion = { version: this.productService.version, date: this.productService.date }) {
        if (this.allowedExtensionsService.isAllowed(extension) !== true) {
            return false;
        }
        if (!isTargetPlatformCompatible(extension.properties.targetPlatform, extension.allTargetPlatforms, targetPlatform)) {
            return false;
        }
        if (!includePreRelease && extension.properties.isPreReleaseVersion) {
            // Pre-releases are not allowed when include pre-release flag is not set
            return false;
        }
        let engine = extension.properties.engine;
        if (!engine) {
            const manifest = await this.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error('Manifest was not found');
            }
            engine = manifest.engines.vscode;
        }
        if (!isEngineValid(engine, productVersion.version, productVersion.date)) {
            return false;
        }
        if (!this.areApiProposalsCompatible(extension.identifier, extension.properties.enabledApiProposals)) {
            return false;
        }
        return true;
    }
    areApiProposalsCompatible(extensionIdentifier, enabledApiProposals) {
        if (!enabledApiProposals) {
            return true;
        }
        if (!this.extensionsEnabledWithApiProposalVersion.includes(extensionIdentifier.id.toLowerCase())) {
            return true;
        }
        return areApiProposalsCompatible(enabledApiProposals);
    }
    async isValidVersion(extension, rawGalleryExtensionVersion, { targetPlatform, compatible, productVersion, version }, publisherDisplayName, allTargetPlatforms) {
        // Specific version
        if (isString(version)) {
            if (rawGalleryExtensionVersion.version !== version) {
                return false;
            }
        }
        // Prerelease or release version kind
        else if (version === 0 /* VersionKind.Release */ || version === 1 /* VersionKind.Prerelease */) {
            if (isPreReleaseVersion(rawGalleryExtensionVersion) !== (version === 1 /* VersionKind.Prerelease */)) {
                return false;
            }
        }
        const targetPlatformForExtension = getTargetPlatformForExtensionVersion(rawGalleryExtensionVersion);
        if (!isTargetPlatformCompatible(targetPlatformForExtension, allTargetPlatforms, targetPlatform)) {
            return false;
        }
        if (compatible) {
            if (this.allowedExtensionsService.isAllowed({ id: extension, publisherDisplayName, version: rawGalleryExtensionVersion.version, prerelease: isPreReleaseVersion(rawGalleryExtensionVersion), targetPlatform: targetPlatformForExtension }) !== true) {
                return false;
            }
            try {
                const engine = await this.getEngine(extension, rawGalleryExtensionVersion);
                if (!isEngineValid(engine, productVersion.version, productVersion.date)) {
                    return false;
                }
            }
            catch (error) {
                this.logService.error(`Error while getting the engine for the version ${rawGalleryExtensionVersion.version}.`, getErrorMessage(error));
                return false;
            }
        }
        return true;
    }
    async query(options, token) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let text = options.text || '';
        const pageSize = options.pageSize ?? 50;
        let query = new Query()
            .withPage(1, pageSize);
        if (text) {
            // Use category filter instead of "category:themes"
            text = text.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
                query = query.withFilter("Category" /* FilterType.Category */, category || quotedCategory);
                return '';
            });
            // Use tag filter instead of "tag:debuggers"
            text = text.replace(/\btag:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedTag, tag) => {
                query = query.withFilter("Tag" /* FilterType.Tag */, tag || quotedTag);
                return '';
            });
            // Use featured filter
            text = text.replace(/\bfeatured(\s+|\b|$)/g, () => {
                query = query.withFilter("Featured" /* FilterType.Featured */);
                return '';
            });
            text = text.trim();
            if (text) {
                text = text.length < 200 ? text : text.substring(0, 200);
                query = query.withFilter("SearchText" /* FilterType.SearchText */, text);
            }
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === "NoneOrRelevance" /* SortBy.NoneOrRelevance */)) {
                query = query.withSortBy("NoneOrRelevance" /* SortBy.NoneOrRelevance */);
            }
        }
        else {
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === "InstallCount" /* SortBy.InstallCount */)) {
                query = query.withSortBy("InstallCount" /* SortBy.InstallCount */);
            }
        }
        if (options.sortBy && extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === options.sortBy)) {
            query = query.withSortBy(options.sortBy);
        }
        if (typeof options.sortOrder === 'number') {
            query = query.withSortOrder(options.sortOrder);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const runQuery = async (query, token) => {
            const { extensions, total } = await this.queryGalleryExtensions(query, { targetPlatform: CURRENT_TARGET_PLATFORM, compatible: false, includePreRelease: !!options.includePreRelease, productVersion: options.productVersion ?? { version: this.productService.version, date: this.productService.date } }, extensionGalleryManifest, token);
            extensions.forEach((e, index) => setTelemetry(e, ((query.pageNumber - 1) * query.pageSize) + index, options.source));
            return { extensions, total };
        };
        const { extensions, total } = await runQuery(query, token);
        const getPage = async (pageIndex, ct) => {
            if (ct.isCancellationRequested) {
                throw new CancellationError();
            }
            const { extensions } = await runQuery(query.withPage(pageIndex + 1), ct);
            return extensions;
        };
        return { firstPage: extensions, total, pageSize: query.pageSize, getPage };
    }
    async queryGalleryExtensions(query, criteria, extensionGalleryManifest, token) {
        if (this.productService.quality !== 'stable'
            && (await this.assignmentService?.getTreatment('useLatestPrereleaseAndStableVersionFlag'))) {
            return this.queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token);
        }
        return this.queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token);
    }
    async queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token) {
        const flags = query.flags;
        /**
         * If both version flags (IncludeLatestVersionOnly and IncludeVersions) are included, then only include latest versions (IncludeLatestVersionOnly) flag.
         */
        if (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) && query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeVersions" /* Flag.IncludeVersions */));
        }
        /**
         * If version flags (IncludeLatestVersionOnly and IncludeVersions) are not included, default is to query for latest versions (IncludeLatestVersionOnly).
         */
        if (!query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) && !query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags, "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        }
        /**
         * If versions criteria exist or every requested extension is for release version and has a pre-release version, then remove latest flags and add all versions flag.
         */
        if (criteria.versions?.length || criteria.isQueryForReleaseVersionFromPreReleaseVersion) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const hasAllVersions = !query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        if (hasAllVersions) {
            const extensions = [];
            for (const rawGalleryExtension of rawGalleryExtensions) {
                const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
                const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
                const includePreRelease = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
                const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                    compatible: criteria.compatible,
                    targetPlatform: criteria.targetPlatform,
                    productVersion: criteria.productVersion,
                    version: criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                        ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */)
                }, allTargetPlatforms);
                if (rawGalleryExtensionVersion) {
                    extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context));
                }
            }
            return { extensions, total };
        }
        const result = [];
        const needAllVersions = new Map();
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
            const includePreRelease = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({ id: extensionIdentifier.id, publisherDisplayName: rawGalleryExtension.publisher.displayName }) !== true) {
                    continue;
                }
            }
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version: criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                    ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */)
            }, allTargetPlatforms);
            const extension = rawGalleryExtensionVersion ? toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context) : null;
            if (!extension
                /** Need all versions if the extension is a pre-release version but
                 * 		- the query is to look for a release version or
                 * 		- the extension has no release version
                 * Get all versions to get or check the release version
                */
                || (extension.properties.isPreReleaseVersion && (!includePreRelease || !extension.hasReleaseVersion))
                /**
                 * Need all versions if the extension is a release version with a different target platform than requested and also has a pre-release version
                 * Because, this is a platform specific extension and can have a newer release version supporting this platform.
                 * See https://github.com/microsoft/vscode/issues/139628
                */
                || (!extension.properties.isPreReleaseVersion && extension.properties.targetPlatform !== criteria.targetPlatform && extension.hasPreReleaseVersion)) {
                needAllVersions.set(rawGalleryExtension.extensionId, index);
            }
            else {
                result.push([index, extension]);
            }
        }
        if (needAllVersions.size) {
            const stopWatch = new StopWatch();
            const query = new Query()
                .withFlags(...flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */)
                .withPage(1, needAllVersions.size)
                .withFilter("ExtensionId" /* FilterType.ExtensionId */, ...needAllVersions.keys());
            const { extensions } = await this.queryGalleryExtensions(query, criteria, extensionGalleryManifest, token);
            this.telemetryService.publicLog2('galleryService:additionalQuery', {
                duration: stopWatch.elapsed(),
                count: needAllVersions.size
            });
            for (const extension of extensions) {
                const index = needAllVersions.get(extension.identifier.uuid);
                result.push([index, extension]);
            }
        }
        return { extensions: result.sort((a, b) => a[0] - b[0]).map(([, extension]) => extension), total };
    }
    async queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token) {
        /**
         * If versions criteria exist, then remove latest flags and add all versions flag.
        */
        if (criteria.versions?.length) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ && flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * If the query does not specify all versions flag, handle latest versions.
         */
        else if (!query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            const includeLatest = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : criteria.includePreRelease.every(({ includePreRelease }) => includePreRelease);
            query = includeLatest ? query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) : query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */);
        }
        /**
         * If all versions flag is set, remove latest flags.
         */
        if (query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */) && (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) || query.flags.includes("IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */))) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ && flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const extensions = [];
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({ id: extensionIdentifier.id, publisherDisplayName: rawGalleryExtension.publisher.displayName }) !== true) {
                    continue;
                }
            }
            const version = criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                ?? ((isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease) ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */);
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version
            }, allTargetPlatforms);
            if (rawGalleryExtensionVersion) {
                extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, context));
            }
        }
        return { extensions, total };
    }
    async getRawGalleryExtensionVersion(rawGalleryExtension, criteria, allTargetPlatforms) {
        const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
        const rawGalleryExtensionVersions = sortExtensionVersions(rawGalleryExtension.versions, criteria.targetPlatform);
        if (criteria.compatible && isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
            return null;
        }
        const version = isString(criteria.version) ? criteria.version : undefined;
        for (let index = 0; index < rawGalleryExtensionVersions.length; index++) {
            const rawGalleryExtensionVersion = rawGalleryExtensionVersions[index];
            if (await this.isValidVersion(extensionIdentifier.id, rawGalleryExtensionVersion, criteria, rawGalleryExtension.publisher.displayName, allTargetPlatforms)) {
                if (criteria.compatible && !this.areApiProposalsCompatible(extensionIdentifier, getEnabledApiProposals(rawGalleryExtensionVersion))) {
                    continue;
                }
                return rawGalleryExtensionVersion;
            }
            if (version && rawGalleryExtensionVersion.version === version) {
                return null;
            }
        }
        if (version || criteria.compatible) {
            return null;
        }
        /**
         * Fallback: Return the latest version
         * This can happen when the extension does not have a release version or does not have a version compatible with the given target platform.
         */
        return rawGalleryExtension.versions[0];
    }
    async queryRawGalleryExtensions(query, extensionGalleryManifest, token) {
        const extensionsQueryApi = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */);
        if (!extensionsQueryApi) {
            throw new Error('No extension gallery query service configured.');
        }
        query = query
            /* Always exclude non validated extensions */
            .withFlags(...query.flags, "ExcludeNonValidated" /* Flag.ExcludeNonValidated */)
            .withFilter("Target" /* FilterType.Target */, 'Microsoft.VisualStudio.Code');
        const unpublishedFlag = extensionGalleryManifest.capabilities.extensionQuery.flags?.find(f => f.name === "Unpublished" /* Flag.Unpublished */);
        /* Always exclude unpublished extensions */
        if (unpublishedFlag) {
            query = query.withFilter("ExcludeWithFlags" /* FilterType.ExcludeWithFlags */, String(unpublishedFlag.value));
        }
        const data = JSON.stringify({
            filters: [
                {
                    criteria: query.criteria.reduce((criteria, c) => {
                        const criterium = extensionGalleryManifest.capabilities.extensionQuery.filtering?.find(f => f.name === c.filterType);
                        if (criterium) {
                            criteria.push({
                                filterType: criterium.value,
                                value: c.value,
                            });
                        }
                        return criteria;
                    }, []),
                    pageNumber: query.pageNumber,
                    pageSize: query.pageSize,
                    sortBy: extensionGalleryManifest.capabilities.extensionQuery.sorting?.find(s => s.name === query.sortBy)?.value,
                    sortOrder: query.sortOrder,
                }
            ],
            assetTypes: query.assetTypes,
            flags: query.flags.reduce((flags, flag) => {
                const flagValue = extensionGalleryManifest.capabilities.extensionQuery.flags?.find(f => f.name === flag);
                if (flagValue) {
                    flags |= flagValue.value;
                }
                return flags;
            }, 0)
        });
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            'Accept': 'application/json;api-version=3.0-preview.1',
            'Accept-Encoding': 'gzip',
            'Content-Length': String(data.length),
        };
        const stopWatch = new StopWatch();
        let context, errorCode, total = 0;
        try {
            context = await this.requestService.request({
                type: 'POST',
                url: extensionsQueryApi,
                data,
                headers
            }, token);
            if (context.res.statusCode && context.res.statusCode >= 400 && context.res.statusCode < 500) {
                return { galleryExtensions: [], total };
            }
            const result = await asJson(context);
            if (result) {
                const r = result.results[0];
                const galleryExtensions = r.extensions;
                const resultCount = r.resultMetadata && r.resultMetadata.filter(m => m.metadataType === 'ResultCount')[0];
                total = resultCount && resultCount.metadataItems.filter(i => i.name === 'TotalCount')[0].count || 0;
                return {
                    galleryExtensions,
                    total,
                    context: context.res.headers['activityid'] ? {
                        [SEARCH_ACTIVITY_HEADER_NAME]: context.res.headers['activityid']
                    } : {}
                };
            }
            return { galleryExtensions: [], total };
        }
        catch (e) {
            if (isCancellationError(e)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
                throw e;
            }
            else {
                const errorMessage = getErrorMessage(e);
                errorCode = isOfflineError(e)
                    ? "Offline" /* ExtensionGalleryErrorCode.Offline */
                    : errorMessage.startsWith('XHR timeout')
                        ? "Timeout" /* ExtensionGalleryErrorCode.Timeout */
                        : "Failed" /* ExtensionGalleryErrorCode.Failed */;
                throw new ExtensionGalleryError(errorMessage, errorCode);
            }
        }
        finally {
            this.telemetryService.publicLog2('galleryService:query', {
                filterTypes: query.criteria.map(criterium => criterium.filterType),
                flags: query.flags,
                sortBy: query.sortBy,
                sortOrder: String(query.sortOrder),
                pageNumber: String(query.pageNumber),
                source: query.source,
                searchTextLength: query.searchText.length,
                requestBodySize: String(data.length),
                duration: stopWatch.elapsed(),
                success: !!context && isSuccess(context),
                responseBodySize: context?.res.headers['Content-Length'],
                statusCode: context ? String(context.res.statusCode) : undefined,
                errorCode,
                count: String(total),
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    getHeaderValue(headers, name) {
        const value = headers?.[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
    }
    async getLatestRawGalleryExtension(extension, uri, token) {
        let errorCode;
        const stopWatch = new StopWatch();
        let context;
        try {
            const commonHeaders = await this.commonHeadersPromise;
            const headers = {
                ...commonHeaders,
                'Content-Type': 'application/json',
                'Accept': 'application/json;api-version=7.2-preview',
                'Accept-Encoding': 'gzip',
            };
            context = await this.requestService.request({
                type: 'GET',
                url: uri.toString(true),
                headers,
                timeout: 10000 /*10s*/
            }, token);
            if (context.res.statusCode === 404) {
                errorCode = 'NotFound';
                return null;
            }
            if (context.res.statusCode && context.res.statusCode !== 200) {
                errorCode = `GalleryServiceError:` + context.res.statusCode;
                throw new Error('Unexpected HTTP response: ' + context.res.statusCode);
            }
            const result = await asJson(context);
            if (!result) {
                errorCode = 'NoData';
            }
            return result;
        }
        catch (error) {
            if (isCancellationError(error)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
            }
            else {
                const errorMessage = getErrorMessage(error);
                errorCode = isOfflineError(error)
                    ? "Offline" /* ExtensionGalleryErrorCode.Offline */
                    : errorMessage.startsWith('XHR timeout')
                        ? "Timeout" /* ExtensionGalleryErrorCode.Timeout */
                        : "Failed" /* ExtensionGalleryErrorCode.Failed */;
            }
            throw error;
        }
        finally {
            this.telemetryService.publicLog2('galleryService:getLatest', {
                extension,
                host: uri.authority,
                duration: stopWatch.elapsed(),
                errorCode,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    async reportStatistic(publisher, name, version, type) {
        const manifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!manifest) {
            return undefined;
        }
        let url;
        if (isWeb) {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, { publisher, name, version, statTypeValue: type === "install" /* StatisticType.Install */ ? '1' : '3' });
        }
        else {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, { publisher, name, version, statTypeName: type });
        }
        const Accept = isWeb ? 'api-version=6.1-preview.1' : '*/*;api-version=4.0-preview.1';
        const commonHeaders = await this.commonHeadersPromise;
        const headers = { ...commonHeaders, Accept };
        try {
            await this.requestService.request({
                type: 'POST',
                url,
                headers
            }, CancellationToken.None);
        }
        catch (error) { /* Ignore */ }
    }
    async download(extension, location, operation) {
        this.logService.trace('ExtensionGalleryService#download', extension.identifier.id);
        const data = getGalleryExtensionTelemetryData(extension);
        const startTime = new Date().getTime();
        const operationParam = operation === 2 /* InstallOperation.Install */ ? 'install' : operation === 3 /* InstallOperation.Update */ ? 'update' : '';
        const downloadAsset = operationParam ? {
            uri: `${extension.assets.download.uri}${URI.parse(extension.assets.download.uri).query ? '&' : '?'}${operationParam}=true`,
            fallbackUri: `${extension.assets.download.fallbackUri}${URI.parse(extension.assets.download.fallbackUri).query ? '&' : '?'}${operationParam}=true`
        } : extension.assets.download;
        const headers = extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME] ? { [SEARCH_ACTIVITY_HEADER_NAME]: extension.queryContext[SEARCH_ACTIVITY_HEADER_NAME] } : undefined;
        const context = await this.getAsset(extension.identifier.id, downloadAsset, AssetType.VSIX, extension.version, headers ? { headers } : undefined);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
        /* __GDPR__
            "galleryService:downloadVSIX" : {
                "owner": "sandy081",
                "duration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "${include}": [
                    "${GalleryExtensionTelemetryData}"
                ]
            }
        */
        this.telemetryService.publicLog('galleryService:downloadVSIX', { ...data, duration: new Date().getTime() - startTime });
    }
    async downloadSignatureArchive(extension, location) {
        if (!extension.assets.signature) {
            throw new Error('No signature asset found');
        }
        this.logService.trace('ExtensionGalleryService#downloadSignatureArchive', extension.identifier.id);
        const context = await this.getAsset(extension.identifier.id, extension.assets.signature, AssetType.Signature, extension.version);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
    }
    async getReadme(extension, token) {
        if (extension.assets.readme) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.readme, AssetType.Details, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getManifest(extension, token) {
        if (extension.assets.manifest) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.manifest, AssetType.Manifest, extension.version, {}, token);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getManifestFromRawExtensionVersion(extension, rawExtensionVersion, token) {
        const manifestAsset = getVersionAsset(rawExtensionVersion, AssetType.Manifest);
        if (!manifestAsset) {
            throw new Error('Manifest was not found');
        }
        const headers = { 'Accept-Encoding': 'gzip' };
        const context = await this.getAsset(extension, manifestAsset, AssetType.Manifest, rawExtensionVersion.version, { headers });
        return await asJson(context);
    }
    async getCoreTranslation(extension, languageId) {
        const asset = extension.assets.coreTranslations.filter(t => t[0] === languageId.toUpperCase())[0];
        if (asset) {
            const context = await this.getAsset(extension.identifier.id, asset[1], asset[0], extension.version);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getChangelog(extension, token) {
        if (extension.assets.changelog) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.changelog, AssetType.Changelog, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getAllCompatibleVersions(extensionIdentifier, includePreRelease, targetPlatform) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let query = new Query()
            .withFlags("IncludeVersions" /* Flag.IncludeVersions */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */)
            .withPage(1, 1);
        if (extensionIdentifier.uuid) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, extensionIdentifier.uuid);
        }
        else {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, extensionIdentifier.id);
        }
        const { galleryExtensions } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, CancellationToken.None);
        if (!galleryExtensions.length) {
            return [];
        }
        const allTargetPlatforms = getAllTargetPlatforms(galleryExtensions[0]);
        if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, targetPlatform)) {
            return [];
        }
        const validVersions = [];
        const productVersion = { version: this.productService.version, date: this.productService.date };
        await Promise.all(galleryExtensions[0].versions.map(async (version) => {
            try {
                if ((await this.isValidVersion(extensionIdentifier.id, version, {
                    compatible: true,
                    productVersion,
                    targetPlatform,
                    version: includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */
                }, galleryExtensions[0].publisher.displayName, allTargetPlatforms))
                    && this.areApiProposalsCompatible(extensionIdentifier, getEnabledApiProposals(version))) {
                    validVersions.push(version);
                }
            }
            catch (error) { /* Ignore error and skip version */ }
        }));
        const result = [];
        const seen = new Set();
        for (const version of sortExtensionVersions(validVersions, targetPlatform)) {
            if (!seen.has(version.version)) {
                seen.add(version.version);
                result.push({ version: version.version, date: version.lastUpdated, isPreReleaseVersion: isPreReleaseVersion(version) });
            }
        }
        return result;
    }
    async getAsset(extension, asset, assetType, extensionVersion, options = {}, token = CancellationToken.None) {
        const commonHeaders = await this.commonHeadersPromise;
        const baseOptions = { type: 'GET' };
        const headers = { ...commonHeaders, ...(options.headers || {}) };
        options = { ...options, ...baseOptions, headers };
        const url = asset.uri;
        const fallbackUrl = asset.fallbackUri;
        const firstOptions = { ...options, url };
        let context;
        try {
            context = await this.requestService.request(firstOptions, token);
            if (context.res.statusCode === 200) {
                return context;
            }
            const message = await asTextOrError(context);
            throw new Error(`Expected 200, got back ${context.res.statusCode} instead.\n\n${message}`);
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            const message = getErrorMessage(err);
            this.telemetryService.publicLog2('galleryService:cdnFallback', {
                extension,
                assetType,
                message,
                extensionVersion,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
            const fallbackOptions = { ...options, url: fallbackUrl };
            return this.requestService.request(fallbackOptions, token);
        }
    }
    async getEngine(extension, rawExtensionVersion) {
        let engine = getEngine(rawExtensionVersion);
        if (!engine) {
            this.telemetryService.publicLog2('galleryService:engineFallback', { extension, extensionVersion: rawExtensionVersion.version });
            const manifest = await this.getManifestFromRawExtensionVersion(extension, rawExtensionVersion, CancellationToken.None);
            if (!manifest) {
                throw new Error('Manifest was not found');
            }
            engine = manifest.engines.vscode;
        }
        return engine;
    }
    async getExtensionsControlManifest() {
        if (!this.isEnabled()) {
            throw new Error('No extension gallery service configured.');
        }
        if (!this.extensionsControlUrl) {
            return { malicious: [], deprecated: {}, search: [] };
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: this.extensionsControlUrl,
            timeout: 10000 /*10s*/
        }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        const malicious = [];
        const deprecated = {};
        const search = [];
        const extensionsEnabledWithPreRelease = [];
        if (result) {
            for (const id of result.malicious) {
                if (EXTENSION_IDENTIFIER_REGEX.test(id)) {
                    malicious.push({ id });
                }
                else {
                    malicious.push(id);
                }
            }
            if (result.migrateToPreRelease) {
                for (const [unsupportedPreReleaseExtensionId, preReleaseExtensionInfo] of Object.entries(result.migrateToPreRelease)) {
                    if (!preReleaseExtensionInfo.engine || isEngineValid(preReleaseExtensionInfo.engine, this.productService.version, this.productService.date)) {
                        deprecated[unsupportedPreReleaseExtensionId.toLowerCase()] = {
                            disallowInstall: true,
                            extension: {
                                id: preReleaseExtensionInfo.id,
                                displayName: preReleaseExtensionInfo.displayName,
                                autoMigrate: { storage: !!preReleaseExtensionInfo.migrateStorage },
                                preRelease: true
                            }
                        };
                    }
                }
            }
            if (result.deprecated) {
                for (const [deprecatedExtensionId, deprecationInfo] of Object.entries(result.deprecated)) {
                    if (deprecationInfo) {
                        deprecated[deprecatedExtensionId.toLowerCase()] = isBoolean(deprecationInfo) ? {} : deprecationInfo;
                    }
                }
            }
            if (result.search) {
                for (const s of result.search) {
                    search.push(s);
                }
            }
            if (Array.isArray(result.extensionsEnabledWithPreRelease)) {
                for (const id of result.extensionsEnabledWithPreRelease) {
                    extensionsEnabledWithPreRelease.push(id.toLowerCase());
                }
            }
        }
        return { malicious, deprecated, search, extensionsEnabledWithPreRelease };
    }
};
AbstractExtensionGalleryService = __decorate([
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, IEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, IFileService),
    __param(7, IProductService),
    __param(8, IConfigurationService),
    __param(9, IAllowedExtensionsService),
    __param(10, IExtensionGalleryManifestService)
], AbstractExtensionGalleryService);
export { AbstractExtensionGalleryService };
let ExtensionGalleryService = class ExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(storageService, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryService = __decorate([
    __param(0, IStorageService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IEnvironmentService),
    __param(4, ITelemetryService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IConfigurationService),
    __param(8, IAllowedExtensionsService),
    __param(9, IExtensionGalleryManifestService)
], ExtensionGalleryService);
export { ExtensionGalleryService };
let ExtensionGalleryServiceWithNoStorageService = class ExtensionGalleryServiceWithNoStorageService extends AbstractExtensionGalleryService {
    constructor(requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(undefined, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryServiceWithNoStorageService = __decorate([
    __param(0, IRequestService),
    __param(1, ILogService),
    __param(2, IEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IFileService),
    __param(5, IProductService),
    __param(6, IConfigurationService),
    __param(7, IAllowedExtensionsService),
    __param(8, IExtensionGalleryManifestService)
], ExtensionGalleryServiceWithNoStorageService);
export { ExtensionGalleryServiceWithNoStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQThDLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBNk4sb0NBQW9DLEVBQUUsMEJBQTBCLEVBQTBDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFxRSxxQkFBcUIsRUFBOEMsNEJBQTRCLEVBQUUseUJBQXlCLEVBQUUsMEJBQTBCLEVBQXNCLE1BQU0sMEJBQTBCLENBQUM7QUFDdHBCLE9BQU8sRUFBRSx5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VUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDdkcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsT0FBb0M7SUFDaEUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzNHLE9BQU8sTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUM7QUFDeEQsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsT0FBb0M7SUFDL0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3hHLE9BQU8sTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUM7QUFDeEQsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLE9BQW9DO0lBQ3pELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFD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