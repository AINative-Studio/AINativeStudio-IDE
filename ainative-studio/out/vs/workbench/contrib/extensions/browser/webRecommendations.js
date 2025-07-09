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
import { localize } from '../../../../nls.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
let WebRecommendations = class WebRecommendations extends ExtensionRecommendations {
    get recommendations() { return this._recommendations; }
    constructor(productService, extensionManagementServerService) {
        super();
        this.productService = productService;
        this.extensionManagementServerService = extensionManagementServerService;
        this._recommendations = [];
    }
    async doActivate() {
        const isOnlyWeb = this.extensionManagementServerService.webExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer;
        if (isOnlyWeb && Array.isArray(this.productService.webExtensionTips)) {
            this._recommendations = this.productService.webExtensionTips.map((extensionId) => ({
                extension: extensionId.toLowerCase(),
                reason: {
                    reasonId: 6 /* ExtensionRecommendationReason.Application */,
                    reasonText: localize('reason', "This extension is recommended for {0} for the Web", this.productService.nameLong)
                }
            }));
        }
    }
};
WebRecommendations = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionManagementServerService)
], WebRecommendations);
export { WebRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci93ZWJSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUEyQixNQUFNLCtCQUErQixDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFFakgsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSx3QkFBd0I7SUFHL0QsSUFBSSxlQUFlLEtBQTZDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUUvRixZQUNrQixjQUFnRCxFQUM5QixnQ0FBb0Y7UUFFdkgsS0FBSyxFQUFFLENBQUM7UUFIMEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2IscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUxoSCxxQkFBZ0IsR0FBOEIsRUFBRSxDQUFDO0lBUXpELENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVTtRQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsOEJBQThCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLENBQUM7UUFDeE8sSUFBSSxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQTJCLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRyxTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRTtnQkFDcEMsTUFBTSxFQUFFO29CQUNQLFFBQVEsbURBQTJDO29CQUNuRCxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxtREFBbUQsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztpQkFDakg7YUFDRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXhCWSxrQkFBa0I7SUFNNUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlDQUFpQyxDQUFBO0dBUHZCLGtCQUFrQixDQXdCOUIifQ==