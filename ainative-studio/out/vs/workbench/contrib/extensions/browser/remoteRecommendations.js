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
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { PlatformToString, platform } from '../../../../base/common/platform.js';
let RemoteRecommendations = class RemoteRecommendations extends ExtensionRecommendations {
    get recommendations() { return this._recommendations; }
    constructor(productService) {
        super();
        this.productService = productService;
        this._recommendations = [];
    }
    async doActivate() {
        const extensionTips = { ...this.productService.remoteExtensionTips, ...this.productService.virtualWorkspaceExtensionTips };
        const currentPlatform = PlatformToString(platform);
        this._recommendations = Object.values(extensionTips).filter(({ supportedPlatforms }) => !supportedPlatforms || supportedPlatforms.includes(currentPlatform)).map(extension => ({
            extension: extension.extensionId.toLowerCase(),
            reason: {
                reasonId: 6 /* ExtensionRecommendationReason.Application */,
                reasonText: ''
            }
        }));
    }
};
RemoteRecommendations = __decorate([
    __param(0, IProductService)
], RemoteRecommendations);
export { RemoteRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9yZW1vdGVSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLCtCQUErQixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFMUUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSx3QkFBd0I7SUFHbEUsSUFBSSxlQUFlLEtBQW9ELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUV0RyxZQUNrQixjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUYwQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFKMUQscUJBQWdCLEdBQXFDLEVBQUUsQ0FBQztJQU9oRSxDQUFDO0lBRVMsS0FBSyxDQUFDLFVBQVU7UUFDekIsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFDM0gsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUssU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFO1lBQzlDLE1BQU0sRUFBRTtnQkFDUCxRQUFRLG1EQUEyQztnQkFDbkQsVUFBVSxFQUFFLEVBQUU7YUFDZDtTQUNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNELENBQUE7QUF0QlkscUJBQXFCO0lBTS9CLFdBQUEsZUFBZSxDQUFBO0dBTkwscUJBQXFCLENBc0JqQyJ9