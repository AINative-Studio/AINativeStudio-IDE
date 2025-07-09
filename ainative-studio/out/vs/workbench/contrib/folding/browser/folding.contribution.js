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
var DefaultFoldingRangeProvider_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let DefaultFoldingRangeProvider = class DefaultFoldingRangeProvider extends Disposable {
    static { DefaultFoldingRangeProvider_1 = this; }
    static { this.configName = 'editor.defaultFoldingRangeProvider'; }
    static { this.extensionIds = []; }
    static { this.extensionItemLabels = []; }
    static { this.extensionDescriptions = []; }
    constructor(_extensionService, _configurationService) {
        super();
        this._extensionService = _extensionService;
        this._configurationService = _configurationService;
        this._store.add(this._extensionService.onDidChangeExtensions(this._updateConfigValues, this));
        this._store.add(FoldingController.setFoldingRangeProviderSelector(this._selectFoldingRangeProvider.bind(this)));
        this._updateConfigValues();
    }
    async _updateConfigValues() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        DefaultFoldingRangeProvider_1.extensionIds.length = 0;
        DefaultFoldingRangeProvider_1.extensionItemLabels.length = 0;
        DefaultFoldingRangeProvider_1.extensionDescriptions.length = 0;
        DefaultFoldingRangeProvider_1.extensionIds.push(null);
        DefaultFoldingRangeProvider_1.extensionItemLabels.push(nls.localize('null', 'All'));
        DefaultFoldingRangeProvider_1.extensionDescriptions.push(nls.localize('nullFormatterDescription', "All active folding range providers"));
        const languageExtensions = [];
        const otherExtensions = [];
        for (const extension of this._extensionService.extensions) {
            if (extension.main || extension.browser) {
                if (extension.categories?.find(cat => cat === 'Programming Languages')) {
                    languageExtensions.push(extension);
                }
                else {
                    otherExtensions.push(extension);
                }
            }
        }
        const sorter = (a, b) => a.name.localeCompare(b.name);
        for (const extension of languageExtensions.sort(sorter)) {
            DefaultFoldingRangeProvider_1.extensionIds.push(extension.identifier.value);
            DefaultFoldingRangeProvider_1.extensionItemLabels.push(extension.displayName ?? '');
            DefaultFoldingRangeProvider_1.extensionDescriptions.push(extension.description ?? '');
        }
        for (const extension of otherExtensions.sort(sorter)) {
            DefaultFoldingRangeProvider_1.extensionIds.push(extension.identifier.value);
            DefaultFoldingRangeProvider_1.extensionItemLabels.push(extension.displayName ?? '');
            DefaultFoldingRangeProvider_1.extensionDescriptions.push(extension.description ?? '');
        }
    }
    _selectFoldingRangeProvider(providers, document) {
        const value = this._configurationService.getValue(DefaultFoldingRangeProvider_1.configName, { overrideIdentifier: document.getLanguageId() });
        if (value) {
            return providers.filter(p => p.id === value);
        }
        return undefined;
    }
};
DefaultFoldingRangeProvider = DefaultFoldingRangeProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService)
], DefaultFoldingRangeProvider);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        [DefaultFoldingRangeProvider.configName]: {
            description: nls.localize('formatter.default', "Defines a default folding range provider that takes precedence over all other folding range providers. Must be the identifier of an extension contributing a folding range provider."),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFoldingRangeProvider.extensionIds,
            enumItemLabels: DefaultFoldingRangeProvider.extensionItemLabels,
            markdownEnumDescriptions: DefaultFoldingRangeProvider.extensionDescriptions
        }
    }
});
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DefaultFoldingRangeProvider, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZm9sZGluZy9icm93c2VyL2ZvbGRpbmcuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBMkQsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQTBCLFVBQVUsSUFBSSx1QkFBdUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ25KLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRTVHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTs7YUFFbkMsZUFBVSxHQUFHLG9DQUFvQyxBQUF2QyxDQUF3QzthQUUzRCxpQkFBWSxHQUFzQixFQUFFLEFBQXhCLENBQXlCO2FBQ3JDLHdCQUFtQixHQUFhLEVBQUUsQUFBZixDQUFnQjthQUNuQywwQkFBcUIsR0FBYSxFQUFFLEFBQWYsQ0FBZ0I7SUFFNUMsWUFDcUMsaUJBQW9DLEVBQ2hDLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUg0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2hDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFHcEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CO1FBQ2hDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlDQUFpQyxFQUFFLENBQUM7UUFFakUsNkJBQTJCLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEQsNkJBQTJCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUMzRCw2QkFBMkIsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRTdELDZCQUEyQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEQsNkJBQTJCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEYsNkJBQTJCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsb0NBQW9DLENBQUMsQ0FBQyxDQUFDO1FBRXZJLE1BQU0sa0JBQWtCLEdBQTRCLEVBQUUsQ0FBQztRQUN2RCxNQUFNLGVBQWUsR0FBNEIsRUFBRSxDQUFDO1FBRXBELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNELElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssdUJBQXVCLENBQUMsRUFBRSxDQUFDO29CQUN4RSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQXdCLEVBQUUsQ0FBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXBHLEtBQUssTUFBTSxTQUFTLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDekQsNkJBQTJCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFFLDZCQUEyQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xGLDZCQUEyQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN0RCw2QkFBMkIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUUsNkJBQTJCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbEYsNkJBQTJCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLENBQUM7UUFDckYsQ0FBQztJQUNGLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxTQUFpQyxFQUFFLFFBQW9CO1FBQzFGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQVMsNkJBQTJCLENBQUMsVUFBVSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwSixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQzs7QUEvREksMkJBQTJCO0lBUzlCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQVZsQiwyQkFBMkIsQ0FnRWhDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDaEcsR0FBRywyQkFBMkI7SUFDOUIsVUFBVSxFQUFFO1FBQ1gsQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUN6QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxzTEFBc0wsQ0FBQztZQUN0TyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFLDJCQUEyQixDQUFDLFlBQVk7WUFDOUMsY0FBYyxFQUFFLDJCQUEyQixDQUFDLG1CQUFtQjtZQUMvRCx3QkFBd0IsRUFBRSwyQkFBMkIsQ0FBQyxxQkFBcUI7U0FDM0U7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxFQUFFLENBQWtDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUN4RywyQkFBMkIsa0NBRTNCLENBQUMifQ==