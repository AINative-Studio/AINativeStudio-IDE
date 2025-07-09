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
let KeymapRecommendations = class KeymapRecommendations extends ExtensionRecommendations {
    get recommendations() { return this._recommendations; }
    constructor(productService) {
        super();
        this.productService = productService;
        this._recommendations = [];
    }
    async doActivate() {
        if (this.productService.keymapExtensionTips) {
            this._recommendations = this.productService.keymapExtensionTips.map(extensionId => ({
                extension: extensionId.toLowerCase(),
                reason: {
                    reasonId: 6 /* ExtensionRecommendationReason.Application */,
                    reasonText: ''
                }
            }));
        }
    }
};
KeymapRecommendations = __decorate([
    __param(0, IProductService)
], KeymapRecommendations);
export { KeymapRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9rZXltYXBSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUEyQixNQUFNLCtCQUErQixDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUdqRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLHdCQUF3QjtJQUdsRSxJQUFJLGVBQWUsS0FBNkMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBRS9GLFlBQ2tCLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBRjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUoxRCxxQkFBZ0IsR0FBOEIsRUFBRSxDQUFDO0lBT3pELENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVTtRQUN6QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRixTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRTtnQkFDcEMsTUFBTSxFQUFFO29CQUNQLFFBQVEsbURBQTJDO29CQUNuRCxVQUFVLEVBQUUsRUFBRTtpQkFDZDthQUNELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7Q0FFRCxDQUFBO0FBdkJZLHFCQUFxQjtJQU0vQixXQUFBLGVBQWUsQ0FBQTtHQU5MLHFCQUFxQixDQXVCakMifQ==