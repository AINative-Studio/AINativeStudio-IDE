/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var ExtensionGalleryResourceType;
(function (ExtensionGalleryResourceType) {
    ExtensionGalleryResourceType["ExtensionQueryService"] = "ExtensionQueryService";
    ExtensionGalleryResourceType["ExtensionLatestVersionUri"] = "ExtensionLatestVersionUriTemplate";
    ExtensionGalleryResourceType["ExtensionStatisticsUri"] = "ExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["WebExtensionStatisticsUri"] = "WebExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["PublisherViewUri"] = "PublisherViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionDetailsViewUri"] = "ExtensionDetailsViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionRatingViewUri"] = "ExtensionRatingViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionResourceUri"] = "ExtensionResourceUriTemplate";
    ExtensionGalleryResourceType["ReportIssueUri"] = "ReportIssueUri";
})(ExtensionGalleryResourceType || (ExtensionGalleryResourceType = {}));
export var Flag;
(function (Flag) {
    Flag["None"] = "None";
    Flag["IncludeVersions"] = "IncludeVersions";
    Flag["IncludeFiles"] = "IncludeFiles";
    Flag["IncludeCategoryAndTags"] = "IncludeCategoryAndTags";
    Flag["IncludeSharedAccounts"] = "IncludeSharedAccounts";
    Flag["IncludeVersionProperties"] = "IncludeVersionProperties";
    Flag["ExcludeNonValidated"] = "ExcludeNonValidated";
    Flag["IncludeInstallationTargets"] = "IncludeInstallationTargets";
    Flag["IncludeAssetUri"] = "IncludeAssetUri";
    Flag["IncludeStatistics"] = "IncludeStatistics";
    Flag["IncludeLatestVersionOnly"] = "IncludeLatestVersionOnly";
    Flag["Unpublished"] = "Unpublished";
    Flag["IncludeNameConflictInfo"] = "IncludeNameConflictInfo";
    Flag["IncludeLatestPrereleaseAndStableVersionOnly"] = "IncludeLatestPrereleaseAndStableVersionOnly";
})(Flag || (Flag = {}));
export const IExtensionGalleryManifestService = createDecorator('IExtensionGalleryManifestService');
export function getExtensionGalleryManifestResourceUri(manifest, type, version) {
    for (const resource of manifest.resources) {
        const [r, v] = resource.type.split('/');
        if (r !== type) {
            continue;
        }
        if (!version || v === version) {
            return resource.id;
        }
        break;
    }
    return undefined;
}
export const ExtensionGalleryServiceUrlConfigKey = 'extensions.gallery.serviceUrl';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkdhbGxlcnlNYW5pZmVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFOLElBQWtCLDRCQVVqQjtBQVZELFdBQWtCLDRCQUE0QjtJQUM3QywrRUFBK0MsQ0FBQTtJQUMvQywrRkFBK0QsQ0FBQTtJQUMvRCx5RkFBeUQsQ0FBQTtJQUN6RCwrRkFBK0QsQ0FBQTtJQUMvRCw2RUFBNkMsQ0FBQTtJQUM3QywyRkFBMkQsQ0FBQTtJQUMzRCx5RkFBeUQsQ0FBQTtJQUN6RCxxRkFBcUQsQ0FBQTtJQUNyRCxpRUFBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBVmlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFVN0M7QUFFRCxNQUFNLENBQU4sSUFBa0IsSUFlakI7QUFmRCxXQUFrQixJQUFJO0lBQ3JCLHFCQUFhLENBQUE7SUFDYiwyQ0FBbUMsQ0FBQTtJQUNuQyxxQ0FBNkIsQ0FBQTtJQUM3Qix5REFBaUQsQ0FBQTtJQUNqRCx1REFBK0MsQ0FBQTtJQUMvQyw2REFBcUQsQ0FBQTtJQUNyRCxtREFBMkMsQ0FBQTtJQUMzQyxpRUFBeUQsQ0FBQTtJQUN6RCwyQ0FBbUMsQ0FBQTtJQUNuQywrQ0FBdUMsQ0FBQTtJQUN2Qyw2REFBcUQsQ0FBQTtJQUNyRCxtQ0FBMkIsQ0FBQTtJQUMzQiwyREFBbUQsQ0FBQTtJQUNuRCxtR0FBMkYsQ0FBQTtBQUM1RixDQUFDLEVBZmlCLElBQUksS0FBSixJQUFJLFFBZXJCO0FBMkJELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FBbUMsa0NBQWtDLENBQUMsQ0FBQztBQVV0SSxNQUFNLFVBQVUsc0NBQXNDLENBQUMsUUFBbUMsRUFBRSxJQUFrQyxFQUFFLE9BQWdCO0lBQy9JLEtBQUssTUFBTSxRQUFRLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDaEIsU0FBUztRQUNWLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMvQixPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELE1BQU07SUFDUCxDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLCtCQUErQixDQUFDIn0=