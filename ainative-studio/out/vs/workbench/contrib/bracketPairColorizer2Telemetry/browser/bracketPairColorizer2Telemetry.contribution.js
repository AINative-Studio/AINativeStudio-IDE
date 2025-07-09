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
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
let BracketPairColorizer2TelemetryContribution = class BracketPairColorizer2TelemetryContribution {
    constructor(configurationService, extensionsWorkbenchService, telemetryService) {
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.telemetryService = telemetryService;
        this.init().catch(onUnexpectedError);
    }
    async init() {
        const bracketPairColorizerId = 'coenraads.bracket-pair-colorizer-2';
        await this.extensionsWorkbenchService.queryLocal();
        const extension = this.extensionsWorkbenchService.installed.find(e => e.identifier.id === bracketPairColorizerId);
        if (!extension ||
            ((extension.enablementState !== 11 /* EnablementState.EnabledGlobally */) &&
                (extension.enablementState !== 12 /* EnablementState.EnabledWorkspace */))) {
            return;
        }
        const nativeBracketPairColorizationEnabledKey = 'editor.bracketPairColorization.enabled';
        const nativeColorizationEnabled = !!this.configurationService.getValue(nativeBracketPairColorizationEnabledKey);
        this.telemetryService.publicLog2('bracketPairColorizerTwoUsage', {
            nativeColorizationEnabled
        });
    }
};
BracketPairColorizer2TelemetryContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, ITelemetryService)
], BracketPairColorizer2TelemetryContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BracketPairColorizer2TelemetryContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJDb2xvcml6ZXIyVGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9icmFja2V0UGFpckNvbG9yaXplcjJUZWxlbWV0cnkvYnJvd3Nlci9icmFja2V0UGFpckNvbG9yaXplcjJUZWxlbWV0cnkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBSXBGLElBQU0sMENBQTBDLEdBQWhELE1BQU0sMENBQTBDO0lBQy9DLFlBQ3lDLG9CQUEyQyxFQUNyQywwQkFBdUQsRUFDakUsZ0JBQW1DO1FBRi9CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUNqRSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBRXZFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUk7UUFDakIsTUFBTSxzQkFBc0IsR0FBRyxvQ0FBb0MsQ0FBQztRQUVwRSxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLHNCQUFzQixDQUFDLENBQUM7UUFDbEgsSUFDQyxDQUFDLFNBQVM7WUFDVixDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsNkNBQW9DLENBQUM7Z0JBQy9ELENBQUMsU0FBUyxDQUFDLGVBQWUsOENBQXFDLENBQUMsQ0FBQyxFQUNqRSxDQUFDO1lBQ0YsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLHVDQUF1QyxHQUFHLHdDQUF3QyxDQUFDO1FBQ3pGLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQVVoSCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUEyRSw4QkFBOEIsRUFBRTtZQUMxSSx5QkFBeUI7U0FDekIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUFyQ0ssMENBQTBDO0lBRTdDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLGlCQUFpQixDQUFBO0dBSmQsMENBQTBDLENBcUMvQztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQWtDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLDBDQUEwQyxrQ0FBMEIsQ0FBQyJ9