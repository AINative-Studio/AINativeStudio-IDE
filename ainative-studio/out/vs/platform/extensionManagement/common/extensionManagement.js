/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const EXTENSION_IDENTIFIER_PATTERN = '^([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
export const EXTENSION_IDENTIFIER_REGEX = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
export const WEB_EXTENSION_TAG = '__web_extension';
export const EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT = 'skipWalkthrough';
export const EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT = 'skipPublisherTrust';
export const EXTENSION_INSTALL_SOURCE_CONTEXT = 'extensionInstallSource';
export const EXTENSION_INSTALL_DEP_PACK_CONTEXT = 'dependecyOrPackExtensionInstall';
export const EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT = 'clientTargetPlatform';
export var ExtensionInstallSource;
(function (ExtensionInstallSource) {
    ExtensionInstallSource["COMMAND"] = "command";
    ExtensionInstallSource["SETTINGS_SYNC"] = "settingsSync";
})(ExtensionInstallSource || (ExtensionInstallSource = {}));
export function TargetPlatformToString(targetPlatform) {
    switch (targetPlatform) {
        case "win32-x64" /* TargetPlatform.WIN32_X64 */: return 'Windows 64 bit';
        case "win32-arm64" /* TargetPlatform.WIN32_ARM64 */: return 'Windows ARM';
        case "linux-x64" /* TargetPlatform.LINUX_X64 */: return 'Linux 64 bit';
        case "linux-arm64" /* TargetPlatform.LINUX_ARM64 */: return 'Linux ARM 64';
        case "linux-armhf" /* TargetPlatform.LINUX_ARMHF */: return 'Linux ARM';
        case "alpine-x64" /* TargetPlatform.ALPINE_X64 */: return 'Alpine Linux 64 bit';
        case "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */: return 'Alpine ARM 64';
        case "darwin-x64" /* TargetPlatform.DARWIN_X64 */: return 'Mac';
        case "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */: return 'Mac Silicon';
        case "web" /* TargetPlatform.WEB */: return 'Web';
        case "universal" /* TargetPlatform.UNIVERSAL */: return "universal" /* TargetPlatform.UNIVERSAL */;
        case "unknown" /* TargetPlatform.UNKNOWN */: return "unknown" /* TargetPlatform.UNKNOWN */;
        case "undefined" /* TargetPlatform.UNDEFINED */: return "undefined" /* TargetPlatform.UNDEFINED */;
    }
}
export function toTargetPlatform(targetPlatform) {
    switch (targetPlatform) {
        case "win32-x64" /* TargetPlatform.WIN32_X64 */: return "win32-x64" /* TargetPlatform.WIN32_X64 */;
        case "win32-arm64" /* TargetPlatform.WIN32_ARM64 */: return "win32-arm64" /* TargetPlatform.WIN32_ARM64 */;
        case "linux-x64" /* TargetPlatform.LINUX_X64 */: return "linux-x64" /* TargetPlatform.LINUX_X64 */;
        case "linux-arm64" /* TargetPlatform.LINUX_ARM64 */: return "linux-arm64" /* TargetPlatform.LINUX_ARM64 */;
        case "linux-armhf" /* TargetPlatform.LINUX_ARMHF */: return "linux-armhf" /* TargetPlatform.LINUX_ARMHF */;
        case "alpine-x64" /* TargetPlatform.ALPINE_X64 */: return "alpine-x64" /* TargetPlatform.ALPINE_X64 */;
        case "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */: return "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */;
        case "darwin-x64" /* TargetPlatform.DARWIN_X64 */: return "darwin-x64" /* TargetPlatform.DARWIN_X64 */;
        case "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */: return "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */;
        case "web" /* TargetPlatform.WEB */: return "web" /* TargetPlatform.WEB */;
        case "universal" /* TargetPlatform.UNIVERSAL */: return "universal" /* TargetPlatform.UNIVERSAL */;
        default: return "unknown" /* TargetPlatform.UNKNOWN */;
    }
}
export function getTargetPlatform(platform, arch) {
    switch (platform) {
        case 3 /* Platform.Windows */:
            if (arch === 'x64') {
                return "win32-x64" /* TargetPlatform.WIN32_X64 */;
            }
            if (arch === 'arm64') {
                return "win32-arm64" /* TargetPlatform.WIN32_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 2 /* Platform.Linux */:
            if (arch === 'x64') {
                return "linux-x64" /* TargetPlatform.LINUX_X64 */;
            }
            if (arch === 'arm64') {
                return "linux-arm64" /* TargetPlatform.LINUX_ARM64 */;
            }
            if (arch === 'arm') {
                return "linux-armhf" /* TargetPlatform.LINUX_ARMHF */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 'alpine':
            if (arch === 'x64') {
                return "alpine-x64" /* TargetPlatform.ALPINE_X64 */;
            }
            if (arch === 'arm64') {
                return "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 1 /* Platform.Mac */:
            if (arch === 'x64') {
                return "darwin-x64" /* TargetPlatform.DARWIN_X64 */;
            }
            if (arch === 'arm64') {
                return "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 0 /* Platform.Web */: return "web" /* TargetPlatform.WEB */;
    }
}
export function isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, productTargetPlatform) {
    // Not a web extension in web target platform
    return productTargetPlatform === "web" /* TargetPlatform.WEB */ && !allTargetPlatforms.includes("web" /* TargetPlatform.WEB */);
}
export function isTargetPlatformCompatible(extensionTargetPlatform, allTargetPlatforms, productTargetPlatform) {
    // Not compatible when extension is not a web extension in web target platform
    if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, productTargetPlatform)) {
        return false;
    }
    // Compatible when extension target platform is not defined
    if (extensionTargetPlatform === "undefined" /* TargetPlatform.UNDEFINED */) {
        return true;
    }
    // Compatible when extension target platform is universal
    if (extensionTargetPlatform === "universal" /* TargetPlatform.UNIVERSAL */) {
        return true;
    }
    // Not compatible when extension target platform is unknown
    if (extensionTargetPlatform === "unknown" /* TargetPlatform.UNKNOWN */) {
        return false;
    }
    // Compatible when extension and product target platforms matches
    if (extensionTargetPlatform === productTargetPlatform) {
        return true;
    }
    return false;
}
export function isIExtensionIdentifier(thing) {
    return thing
        && typeof thing === 'object'
        && typeof thing.id === 'string'
        && (!thing.uuid || typeof thing.uuid === 'string');
}
export var SortBy;
(function (SortBy) {
    SortBy["NoneOrRelevance"] = "NoneOrRelevance";
    SortBy["LastUpdatedDate"] = "LastUpdatedDate";
    SortBy["Title"] = "Title";
    SortBy["PublisherName"] = "PublisherName";
    SortBy["InstallCount"] = "InstallCount";
    SortBy["PublishedDate"] = "PublishedDate";
    SortBy["AverageRating"] = "AverageRating";
    SortBy["WeightedRating"] = "WeightedRating";
})(SortBy || (SortBy = {}));
export var SortOrder;
(function (SortOrder) {
    SortOrder[SortOrder["Default"] = 0] = "Default";
    SortOrder[SortOrder["Ascending"] = 1] = "Ascending";
    SortOrder[SortOrder["Descending"] = 2] = "Descending";
})(SortOrder || (SortOrder = {}));
export var FilterType;
(function (FilterType) {
    FilterType["Category"] = "Category";
    FilterType["ExtensionId"] = "ExtensionId";
    FilterType["ExtensionName"] = "ExtensionName";
    FilterType["ExcludeWithFlags"] = "ExcludeWithFlags";
    FilterType["Featured"] = "Featured";
    FilterType["SearchText"] = "SearchText";
    FilterType["Tag"] = "Tag";
    FilterType["Target"] = "Target";
})(FilterType || (FilterType = {}));
export var StatisticType;
(function (StatisticType) {
    StatisticType["Install"] = "install";
    StatisticType["Uninstall"] = "uninstall";
})(StatisticType || (StatisticType = {}));
export var InstallOperation;
(function (InstallOperation) {
    InstallOperation[InstallOperation["None"] = 1] = "None";
    InstallOperation[InstallOperation["Install"] = 2] = "Install";
    InstallOperation[InstallOperation["Update"] = 3] = "Update";
    InstallOperation[InstallOperation["Migrate"] = 4] = "Migrate";
})(InstallOperation || (InstallOperation = {}));
export const IExtensionGalleryService = createDecorator('extensionGalleryService');
export var ExtensionGalleryErrorCode;
(function (ExtensionGalleryErrorCode) {
    ExtensionGalleryErrorCode["Timeout"] = "Timeout";
    ExtensionGalleryErrorCode["Cancelled"] = "Cancelled";
    ExtensionGalleryErrorCode["Failed"] = "Failed";
    ExtensionGalleryErrorCode["DownloadFailedWriting"] = "DownloadFailedWriting";
    ExtensionGalleryErrorCode["Offline"] = "Offline";
})(ExtensionGalleryErrorCode || (ExtensionGalleryErrorCode = {}));
export class ExtensionGalleryError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = code;
    }
}
export var ExtensionManagementErrorCode;
(function (ExtensionManagementErrorCode) {
    ExtensionManagementErrorCode["NotFound"] = "NotFound";
    ExtensionManagementErrorCode["Unsupported"] = "Unsupported";
    ExtensionManagementErrorCode["Deprecated"] = "Deprecated";
    ExtensionManagementErrorCode["Malicious"] = "Malicious";
    ExtensionManagementErrorCode["Incompatible"] = "Incompatible";
    ExtensionManagementErrorCode["IncompatibleApi"] = "IncompatibleApi";
    ExtensionManagementErrorCode["IncompatibleTargetPlatform"] = "IncompatibleTargetPlatform";
    ExtensionManagementErrorCode["ReleaseVersionNotFound"] = "ReleaseVersionNotFound";
    ExtensionManagementErrorCode["Invalid"] = "Invalid";
    ExtensionManagementErrorCode["Download"] = "Download";
    ExtensionManagementErrorCode["DownloadSignature"] = "DownloadSignature";
    ExtensionManagementErrorCode["DownloadFailedWriting"] = "DownloadFailedWriting";
    ExtensionManagementErrorCode["UpdateMetadata"] = "UpdateMetadata";
    ExtensionManagementErrorCode["Extract"] = "Extract";
    ExtensionManagementErrorCode["Scanning"] = "Scanning";
    ExtensionManagementErrorCode["ScanningExtension"] = "ScanningExtension";
    ExtensionManagementErrorCode["ReadRemoved"] = "ReadRemoved";
    ExtensionManagementErrorCode["UnsetRemoved"] = "UnsetRemoved";
    ExtensionManagementErrorCode["Delete"] = "Delete";
    ExtensionManagementErrorCode["Rename"] = "Rename";
    ExtensionManagementErrorCode["IntializeDefaultProfile"] = "IntializeDefaultProfile";
    ExtensionManagementErrorCode["AddToProfile"] = "AddToProfile";
    ExtensionManagementErrorCode["InstalledExtensionNotFound"] = "InstalledExtensionNotFound";
    ExtensionManagementErrorCode["PostInstall"] = "PostInstall";
    ExtensionManagementErrorCode["CorruptZip"] = "CorruptZip";
    ExtensionManagementErrorCode["IncompleteZip"] = "IncompleteZip";
    ExtensionManagementErrorCode["PackageNotSigned"] = "PackageNotSigned";
    ExtensionManagementErrorCode["SignatureVerificationInternal"] = "SignatureVerificationInternal";
    ExtensionManagementErrorCode["SignatureVerificationFailed"] = "SignatureVerificationFailed";
    ExtensionManagementErrorCode["NotAllowed"] = "NotAllowed";
    ExtensionManagementErrorCode["Gallery"] = "Gallery";
    ExtensionManagementErrorCode["Cancelled"] = "Cancelled";
    ExtensionManagementErrorCode["Unknown"] = "Unknown";
    ExtensionManagementErrorCode["Internal"] = "Internal";
})(ExtensionManagementErrorCode || (ExtensionManagementErrorCode = {}));
export var ExtensionSignatureVerificationCode;
(function (ExtensionSignatureVerificationCode) {
    ExtensionSignatureVerificationCode["NotSigned"] = "NotSigned";
    ExtensionSignatureVerificationCode["Success"] = "Success";
    ExtensionSignatureVerificationCode["RequiredArgumentMissing"] = "RequiredArgumentMissing";
    ExtensionSignatureVerificationCode["InvalidArgument"] = "InvalidArgument";
    ExtensionSignatureVerificationCode["PackageIsUnreadable"] = "PackageIsUnreadable";
    ExtensionSignatureVerificationCode["UnhandledException"] = "UnhandledException";
    ExtensionSignatureVerificationCode["SignatureManifestIsMissing"] = "SignatureManifestIsMissing";
    ExtensionSignatureVerificationCode["SignatureManifestIsUnreadable"] = "SignatureManifestIsUnreadable";
    ExtensionSignatureVerificationCode["SignatureIsMissing"] = "SignatureIsMissing";
    ExtensionSignatureVerificationCode["SignatureIsUnreadable"] = "SignatureIsUnreadable";
    ExtensionSignatureVerificationCode["CertificateIsUnreadable"] = "CertificateIsUnreadable";
    ExtensionSignatureVerificationCode["SignatureArchiveIsUnreadable"] = "SignatureArchiveIsUnreadable";
    ExtensionSignatureVerificationCode["FileAlreadyExists"] = "FileAlreadyExists";
    ExtensionSignatureVerificationCode["SignatureArchiveIsInvalidZip"] = "SignatureArchiveIsInvalidZip";
    ExtensionSignatureVerificationCode["SignatureArchiveHasSameSignatureFile"] = "SignatureArchiveHasSameSignatureFile";
    ExtensionSignatureVerificationCode["PackageIntegrityCheckFailed"] = "PackageIntegrityCheckFailed";
    ExtensionSignatureVerificationCode["SignatureIsInvalid"] = "SignatureIsInvalid";
    ExtensionSignatureVerificationCode["SignatureManifestIsInvalid"] = "SignatureManifestIsInvalid";
    ExtensionSignatureVerificationCode["SignatureIntegrityCheckFailed"] = "SignatureIntegrityCheckFailed";
    ExtensionSignatureVerificationCode["EntryIsMissing"] = "EntryIsMissing";
    ExtensionSignatureVerificationCode["EntryIsTampered"] = "EntryIsTampered";
    ExtensionSignatureVerificationCode["Untrusted"] = "Untrusted";
    ExtensionSignatureVerificationCode["CertificateRevoked"] = "CertificateRevoked";
    ExtensionSignatureVerificationCode["SignatureIsNotValid"] = "SignatureIsNotValid";
    ExtensionSignatureVerificationCode["UnknownError"] = "UnknownError";
    ExtensionSignatureVerificationCode["PackageIsInvalidZip"] = "PackageIsInvalidZip";
    ExtensionSignatureVerificationCode["SignatureArchiveHasTooManyEntries"] = "SignatureArchiveHasTooManyEntries";
})(ExtensionSignatureVerificationCode || (ExtensionSignatureVerificationCode = {}));
export class ExtensionManagementError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = code;
    }
}
export const IExtensionManagementService = createDecorator('extensionManagementService');
export const DISABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/disabled';
export const ENABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/enabled';
export const IGlobalExtensionEnablementService = createDecorator('IGlobalExtensionEnablementService');
export const IExtensionTipsService = createDecorator('IExtensionTipsService');
export const IAllowedExtensionsService = createDecorator('IAllowedExtensionsService');
export async function computeSize(location, fileService) {
    let stat;
    try {
        stat = await fileService.resolve(location);
    }
    catch (e) {
        if (e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
            return 0;
        }
        throw e;
    }
    if (stat.children) {
        const sizes = await Promise.all(stat.children.map(c => computeSize(c.resource, fileService)));
        return sizes.reduce((r, s) => r + s, 0);
    }
    return stat.size ?? 0;
}
export const ExtensionsLocalizedLabel = localize2('extensions', "Extensions");
export const PreferencesLocalizedLabel = localize2('preferences', 'Preferences');
export const UseUnpkgResourceApiConfigKey = 'extensions.gallery.useUnpkgResourceApi';
export const AllowedExtensionsConfigKey = 'extensions.allowed';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUc1QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsMkRBQTJELENBQUM7QUFDeEcsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUNuRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztBQUNuRCxNQUFNLENBQUMsTUFBTSwwQ0FBMEMsR0FBRyxpQkFBaUIsQ0FBQztBQUM1RSxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxvQkFBb0IsQ0FBQztBQUNuRixNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyx3QkFBd0IsQ0FBQztBQUN6RSxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxpQ0FBaUMsQ0FBQztBQUNwRixNQUFNLENBQUMsTUFBTSxnREFBZ0QsR0FBRyxzQkFBc0IsQ0FBQztBQUV2RixNQUFNLENBQU4sSUFBa0Isc0JBR2pCO0FBSEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLDZDQUFtQixDQUFBO0lBQ25CLHdEQUE4QixDQUFBO0FBQy9CLENBQUMsRUFIaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUd2QztBQU9ELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxjQUE4QjtJQUNwRSxRQUFRLGNBQWMsRUFBRSxDQUFDO1FBQ3hCLCtDQUE2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