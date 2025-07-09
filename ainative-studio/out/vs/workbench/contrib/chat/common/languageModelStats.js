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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFN0YXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2xhbmd1YWdlTW9kZWxTdGF0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQ0FBbUMsRUFBOEIsTUFBTSxtRUFBbUUsQ0FBQztBQUNoSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDRCQUE0QixDQUFDLENBQUM7QUFRN0csSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBSXhELFlBQ3VELGtDQUF1RSxFQUM1RyxjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQztRQUg4Qyx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBSTdILG1EQUFtRDtRQUNuRCxLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLCtEQUE4QyxFQUFFLENBQUM7WUFDckYsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JGLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxvQ0FBMkIsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQWEsRUFBRSxXQUFnQyxFQUFFLEtBQXlCLEVBQUUsVUFBOEI7UUFDdEgsTUFBTSxJQUFJLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7Q0FFRCxDQUFBO0FBckJZLHlCQUF5QjtJQUtuQyxXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEsZUFBZSxDQUFBO0dBTkwseUJBQXlCLENBcUJyQzs7QUFFRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxTQUFTLENBQUM7QUFDeEQsUUFBUSxDQUFDLEVBQUUsQ0FBNkIsVUFBVSxDQUFDLHlCQUF5QixDQUFDLENBQUMsd0JBQXdCLENBQUM7SUFDdEcsRUFBRSxFQUFFLDhCQUE4QjtJQUNsQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQztJQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHFEQUFxRCxDQUFDO0lBQzlGLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztJQUNyQixNQUFNLEVBQUU7UUFDUCxTQUFTLEVBQUUsS0FBSztLQUNoQjtJQUNELGVBQWUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztDQUN6QyxDQUFDLENBQUMifQ==