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
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IProductService } from '../../product/common/productService.js';
let ExtensionGalleryManifestService = class ExtensionGalleryManifestService extends Disposable {
    constructor(productService) {
        super();
        this.productService = productService;
        this.onDidChangeExtensionGalleryManifest = Event.None;
    }
    isEnabled() {
        return !!this.productService.extensionsGallery?.serviceUrl;
    }
    async getExtensionGalleryManifest() {
        const extensionsGallery = this.productService.extensionsGallery;
        if (!extensionsGallery?.serviceUrl) {
            return null;
        }
        const resources = [
            {
                id: `${extensionsGallery.serviceUrl}/extensionquery`,
                type: "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */
            },
            {
                id: `${extensionsGallery.serviceUrl}/vscode/{publisher}/{name}/latest`,
                type: "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */
            },
            {
                id: `${extensionsGallery.serviceUrl}/publishers/{publisher}/extensions/{name}/{version}/stats?statType={statTypeName}`,
                type: "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */
            },
            {
                id: `${extensionsGallery.serviceUrl}/itemName/{publisher}.{name}/version/{version}/statType/{statTypeValue}/vscodewebextension`,
                type: "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */
            },
        ];
        if (extensionsGallery.publisherUrl) {
            resources.push({
                id: `${extensionsGallery.publisherUrl}/{publisher}`,
                type: "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */
            });
        }
        if (extensionsGallery.itemUrl) {
            resources.push({
                id: `${extensionsGallery.itemUrl}/?itemName={publisher}.{name}`,
                type: "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */
            });
            resources.push({
                id: `${extensionsGallery.itemUrl}/?itemName={publisher}.{name}&ssr=false#review-details`,
                type: "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */
            });
        }
        if (extensionsGallery.resourceUrlTemplate) {
            resources.push({
                id: extensionsGallery.resourceUrlTemplate,
                type: "ExtensionResourceUriTemplate" /* ExtensionGalleryResourceType.ExtensionResourceUri */
            });
        }
        const filtering = [
            {
                name: "Tag" /* FilterType.Tag */,
                value: 1,
            },
            {
                name: "ExtensionId" /* FilterType.ExtensionId */,
                value: 4,
            },
            {
                name: "Category" /* FilterType.Category */,
                value: 5,
            },
            {
                name: "ExtensionName" /* FilterType.ExtensionName */,
                value: 7,
            },
            {
                name: "Target" /* FilterType.Target */,
                value: 8,
            },
            {
                name: "Featured" /* FilterType.Featured */,
                value: 9,
            },
            {
                name: "SearchText" /* FilterType.SearchText */,
                value: 10,
            },
            {
                name: "ExcludeWithFlags" /* FilterType.ExcludeWithFlags */,
                value: 12,
            },
        ];
        const sorting = [
            {
                name: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
                value: 0,
            },
            {
                name: "LastUpdatedDate" /* SortBy.LastUpdatedDate */,
                value: 1,
            },
            {
                name: "Title" /* SortBy.Title */,
                value: 2,
            },
            {
                name: "PublisherName" /* SortBy.PublisherName */,
                value: 3,
            },
            {
                name: "InstallCount" /* SortBy.InstallCount */,
                value: 4,
            },
            {
                name: "AverageRating" /* SortBy.AverageRating */,
                value: 6,
            },
            {
                name: "PublishedDate" /* SortBy.PublishedDate */,
                value: 10,
            },
            {
                name: "WeightedRating" /* SortBy.WeightedRating */,
                value: 12,
            },
        ];
        const flags = [
            {
                name: "None" /* Flag.None */,
                value: 0x0,
            },
            {
                name: "IncludeVersions" /* Flag.IncludeVersions */,
                value: 0x1,
            },
            {
                name: "IncludeFiles" /* Flag.IncludeFiles */,
                value: 0x2,
            },
            {
                name: "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */,
                value: 0x4,
            },
            {
                name: "IncludeSharedAccounts" /* Flag.IncludeSharedAccounts */,
                value: 0x8,
            },
            {
                name: "IncludeVersionProperties" /* Flag.IncludeVersionProperties */,
                value: 0x10,
            },
            {
                name: "ExcludeNonValidated" /* Flag.ExcludeNonValidated */,
                value: 0x20,
            },
            {
                name: "IncludeInstallationTargets" /* Flag.IncludeInstallationTargets */,
                value: 0x40,
            },
            {
                name: "IncludeAssetUri" /* Flag.IncludeAssetUri */,
                value: 0x80,
            },
            {
                name: "IncludeStatistics" /* Flag.IncludeStatistics */,
                value: 0x100,
            },
            {
                name: "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */,
                value: 0x200,
            },
            {
                name: "Unpublished" /* Flag.Unpublished */,
                value: 0x1000,
            },
            {
                name: "IncludeNameConflictInfo" /* Flag.IncludeNameConflictInfo */,
                value: 0x8000,
            },
            {
                name: "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */,
                value: 0x10000,
            },
        ];
        return {
            version: '',
            resources,
            capabilities: {
                extensionQuery: {
                    filtering,
                    sorting,
                    flags,
                },
                signing: {
                    allRepositorySigned: true,
                }
            }
        };
    }
};
ExtensionGalleryManifestService = __decorate([
    __param(0, IProductService)
], ExtensionGalleryManifestService);
export { ExtensionGalleryManifestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQWNsRSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7SUFLOUQsWUFDa0IsY0FBa0Q7UUFFbkUsS0FBSyxFQUFFLENBQUM7UUFGNEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBSDNELHdDQUFtQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFNMUQsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQztJQUM1RCxDQUFDO0lBRUQsS0FBSyxDQUFDLDJCQUEyQjtRQUNoQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQXVELENBQUM7UUFDdEcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHO1lBQ2pCO2dCQUNDLEVBQUUsRUFBRSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsaUJBQWlCO2dCQUNwRCxJQUFJLGtGQUFvRDthQUN4RDtZQUNE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