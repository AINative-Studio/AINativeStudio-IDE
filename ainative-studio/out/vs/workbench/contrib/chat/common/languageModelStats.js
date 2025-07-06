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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
export const ILanguageModelStatsService = createDecorator('ILanguageModelStatsService');
let LanguageModelStatsService = class LanguageModelStatsService extends Disposable {
    constructor(extensionFeaturesManagementService, storageService) {
        super();
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        // TODO: @sandy081 - remove this code after a while
        for (const key in storageService.keys(-1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */)) {
            if (key.startsWith('languageModelStats.') || key.startsWith('languageModelAccess.')) {
                storageService.remove(key, -1 /* StorageScope.APPLICATION */);
            }
        }
    }
    async update(model, extensionId, agent, tokenCount) {
        await this.extensionFeaturesManagementService.getAccess(extensionId, CopilotUsageExtensionFeatureId);
    }
};
LanguageModelStatsService = __decorate([
    __param(0, IExtensionFeaturesManagementService),
    __param(1, IStorageService)
], LanguageModelStatsService);
export { LanguageModelStatsService };
export const CopilotUsageExtensionFeatureId = 'copilot';
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: CopilotUsageExtensionFeatureId,
    label: localize('Language Models', "Copilot"),
    description: localize('languageModels', "Language models usage statistics of this extension."),
    icon: Codicon.copilot,
    access: {
        canToggle: false
    },
    accessDataLabel: localize('chat', "chat"),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVsU3RhdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxVQUFVLEVBQUUsbUNBQW1DLEVBQThCLE1BQU0sbUVBQW1FLENBQUM7QUFDaEssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUE2Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBUTdHLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTtJQUl4RCxZQUN1RCxrQ0FBdUUsRUFDNUcsY0FBK0I7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFIOEMsdUNBQWtDLEdBQWxDLGtDQUFrQyxDQUFxQztRQUk3SCxtREFBbUQ7UUFDbkQsS0FBSyxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSwrREFBOEMsRUFBRSxDQUFDO1lBQ3JGLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO2dCQUNyRixjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsb0NBQTJCLENBQUM7WUFDdEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFhLEVBQUUsV0FBZ0MsRUFBRSxLQUF5QixFQUFFLFVBQThCO1FBQ3RILE1BQU0sSUFBSSxDQUFDLGtDQUFrQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsOEJBQThCLENBQUMsQ0FBQztJQUN0RyxDQUFDO0NBRUQsQ0FBQTtBQXJCWSx5QkFBeUI7SUFLbkMsV0FBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxXQUFBLGVBQWUsQ0FBQTtHQU5MLHlCQUF5QixDQXFCckM7O0FBRUQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsU0FBUyxDQUFDO0FBQ3hELFFBQVEsQ0FBQyxFQUFFLENBQTZCLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO0lBQ3RHLEVBQUUsRUFBRSw4QkFBOEI7SUFDbEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUM7SUFDN0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxxREFBcUQsQ0FBQztJQUM5RixJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87SUFDckIsTUFBTSxFQUFFO1FBQ1AsU0FBUyxFQUFFLEtBQUs7S0FDaEI7SUFDRCxlQUFlLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7Q0FDekMsQ0FBQyxDQUFDIn0=