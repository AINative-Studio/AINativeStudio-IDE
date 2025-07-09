/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareIgnoreCase } from '../../../base/common/strings.js';
import { getTargetPlatform } from './extensionManagement.js';
import { ExtensionIdentifier, UNDEFINED_PUBLISHER } from '../../extensions/common/extensions.js';
import { isLinux, platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { arch } from '../../../base/common/process.js';
import { TelemetryTrustedValue } from '../../telemetry/common/telemetryUtils.js';
import { isString } from '../../../base/common/types.js';
export function areSameExtensions(a, b) {
    if (a.uuid && b.uuid) {
        return a.uuid === b.uuid;
    }
    if (a.id === b.id) {
        return true;
    }
    return compareIgnoreCase(a.id, b.id) === 0;
}
const ExtensionKeyRegex = /^([^.]+\..+)-(\d+\.\d+\.\d+)(-(.+))?$/;
export class ExtensionKey {
    static create(extension) {
        const version = extension.manifest ? extension.manifest.version : extension.version;
        const targetPlatform = extension.manifest ? extension.targetPlatform : extension.properties.targetPlatform;
        return new ExtensionKey(extension.identifier, version, targetPlatform);
    }
    static parse(key) {
        const matches = ExtensionKeyRegex.exec(key);
        return matches && matches[1] && matches[2] ? new ExtensionKey({ id: matches[1] }, matches[2], matches[4] || undefined) : null;
    }
    constructor(identifier, version, targetPlatform = "undefined" /* TargetPlatform.UNDEFINED */) {
        this.identifier = identifier;
        this.version = version;
        this.targetPlatform = targetPlatform;
        this.id = identifier.id;
    }
    toString() {
        return `${this.id}-${this.version}${this.targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ ? `-${this.targetPlatform}` : ''}`;
    }
    equals(o) {
        if (!(o instanceof ExtensionKey)) {
            return false;
        }
        return areSameExtensions(this, o) && this.version === o.version && this.targetPlatform === o.targetPlatform;
    }
}
const EXTENSION_IDENTIFIER_WITH_VERSION_REGEX = /^([^.]+\..+)@((prerelease)|(\d+\.\d+\.\d+(-.*)?))$/;
export function getIdAndVersion(id) {
    const matches = EXTENSION_IDENTIFIER_WITH_VERSION_REGEX.exec(id);
    if (matches && matches[1]) {
        return [adoptToGalleryExtensionId(matches[1]), matches[2]];
    }
    return [adoptToGalleryExtensionId(id), undefined];
}
export function getExtensionId(publisher, name) {
    return `${publisher}.${name}`;
}
export function adoptToGalleryExtensionId(id) {
    return id.toLowerCase();
}
export function getGalleryExtensionId(publisher, name) {
    return adoptToGalleryExtensionId(getExtensionId(publisher ?? UNDEFINED_PUBLISHER, name));
}
export function groupByExtension(extensions, getExtensionIdentifier) {
    const byExtension = [];
    const findGroup = (extension) => {
        for (const group of byExtension) {
            if (group.some(e => areSameExtensions(getExtensionIdentifier(e), getExtensionIdentifier(extension)))) {
                return group;
            }
        }
        return null;
    };
    for (const extension of extensions) {
        const group = findGroup(extension);
        if (group) {
            group.push(extension);
        }
        else {
            byExtension.push([extension]);
        }
    }
    return byExtension;
}
export function getLocalExtensionTelemetryData(extension) {
    return {
        id: extension.identifier.id,
        name: extension.manifest.name,
        galleryId: null,
        publisherId: extension.publisherId,
        publisherName: extension.manifest.publisher,
        publisherDisplayName: extension.publisherDisplayName,
        dependencies: extension.manifest.extensionDependencies && extension.manifest.extensionDependencies.length > 0
    };
}
/* __GDPR__FRAGMENT__
    "GalleryExtensionTelemetryData" : {
        "id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "name": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "extensionVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "galleryId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherDisplayName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "isPreReleaseVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "dependencies": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
        "isSigned": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "${include}": [
            "${GalleryExtensionTelemetryData2}"
        ]
    }
*/
export function getGalleryExtensionTelemetryData(extension) {
    return {
        id: new TelemetryTrustedValue(extension.identifier.id),
        name: new TelemetryTrustedValue(extension.name),
        extensionVersion: extension.version,
        galleryId: extension.identifier.uuid,
        publisherId: extension.publisherId,
        publisherName: extension.publisher,
        publisherDisplayName: extension.publisherDisplayName,
        isPreReleaseVersion: extension.properties.isPreReleaseVersion,
        dependencies: !!(extension.properties.dependencies && extension.properties.dependencies.length > 0),
        isSigned: extension.isSigned,
        ...extension.telemetryData
    };
}
export const BetterMergeId = new ExtensionIdentifier('pprice.better-merge');
export function getExtensionDependencies(installedExtensions, extension) {
    const dependencies = [];
    const extensions = extension.manifest.extensionDependencies?.slice(0) ?? [];
    while (extensions.length) {
        const id = extensions.shift();
        if (id && dependencies.every(e => !areSameExtensions(e.identifier, { id }))) {
            const ext = installedExtensions.filter(e => areSameExtensions(e.identifier, { id }));
            if (ext.length === 1) {
                dependencies.push(ext[0]);
                extensions.push(...ext[0].manifest.extensionDependencies?.slice(0) ?? []);
            }
        }
    }
    return dependencies;
}
async function isAlpineLinux(fileService, logService) {
    if (!isLinux) {
        return false;
    }
    let content;
    try {
        const fileContent = await fileService.readFile(URI.file('/etc/os-release'));
        content = fileContent.value.toString();
    }
    catch (error) {
        try {
            const fileContent = await fileService.readFile(URI.file('/usr/lib/os-release'));
            content = fileContent.value.toString();
        }
        catch (error) {
            /* Ignore */
            logService.debug(`Error while getting the os-release file.`, getErrorMessage(error));
        }
    }
    return !!content && (content.match(/^ID=([^\u001b\r\n]*)/m) || [])[1] === 'alpine';
}
export async function computeTargetPlatform(fileService, logService) {
    const alpineLinux = await isAlpineLinux(fileService, logService);
    const targetPlatform = getTargetPlatform(alpineLinux ? 'alpine' : platform, arch);
    logService.debug('ComputeTargetPlatform:', targetPlatform);
    return targetPlatform;
}
export function isMalicious(identifier, malicious) {
    return malicious.some(publisherOrIdentifier => {
        if (isString(publisherOrIdentifier)) {
            return compareIgnoreCase(identifier.id.split('.')[0], publisherOrIdentifier) === 0;
        }
        return areSameExtensions(identifier, publisherOrIdentifier);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUE0RCxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU3SCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsQ0FBdUIsRUFBRSxDQUF1QjtJQUNqRixJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQzFCLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25CLE9BQU8sSUFBSSxD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