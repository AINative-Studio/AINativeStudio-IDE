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
let LanguageRecommendations = class LanguageRecommendations extends ExtensionRecommendations {
    get recommendations() { return this._recommendations; }
    constructor(productService) {
        super();
        this.productService = productService;
        this._recommendations = [];
    }
    async doActivate() {
        if (this.productService.languageExtensionTips) {
            this._recommendations = this.productService.languageExtensionTips.map((extensionId) => ({
                extension: extensionId.toLowerCase(),
                reason: {
                    reasonId: 6 /* ExtensionRecommendationReason.Application */,
                    reasonText: ''
                }
            }));
        }
    }
};
LanguageRecommendations = __decorate([
    __param(0, IProductService)
], LanguageRecommendations);
export { LanguageRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2xhbmd1YWdlUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBMkIsTUFBTSwrQkFBK0IsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHakYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx3QkFBd0I7SUFHcEUsSUFBSSxlQUFlLEtBQTZDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUUvRixZQUNrQixjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUYwQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFKMUQscUJBQWdCLEdBQThCLEVBQUUsQ0FBQztJQU96RCxDQUFDO0lBRVMsS0FBSyxDQUFDLFVBQVU7UUFDekIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUEyQixFQUFFLENBQUMsQ0FBQztnQkFDaEgsU0FBUyxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sRUFBRTtvQkFDUCxRQUFRLG1EQUEyQztvQkFDbkQsVUFBVSxFQUFFLEVBQUU7aUJBQ2Q7YUFDRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXRCWSx1QkFBdUI7SUFNakMsV0FBQSxlQUFlLENBQUE7R0FOTCx1QkFBdUIsQ0FzQm5DIn0=