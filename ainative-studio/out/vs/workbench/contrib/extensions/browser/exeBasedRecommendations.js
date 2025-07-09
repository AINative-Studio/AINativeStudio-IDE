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
import { IExtensionTipsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { localize } from '../../../../nls.js';
let ExeBasedRecommendations = class ExeBasedRecommendations extends ExtensionRecommendations {
    get otherRecommendations() { return this._otherTips.map(tip => this.toExtensionRecommendation(tip)); }
    get importantRecommendations() { return this._importantTips.map(tip => this.toExtensionRecommendation(tip)); }
    get recommendations() { return [...this.importantRecommendations, ...this.otherRecommendations]; }
    constructor(extensionTipsService) {
        super();
        this.extensionTipsService = extensionTipsService;
        this._otherTips = [];
        this._importantTips = [];
    }
    getRecommendations(exe) {
        const important = this._importantTips
            .filter(tip => tip.exeName.toLowerCase() === exe.toLowerCase())
            .map(tip => this.toExtensionRecommendation(tip));
        const others = this._otherTips
            .filter(tip => tip.exeName.toLowerCase() === exe.toLowerCase())
            .map(tip => this.toExtensionRecommendation(tip));
        return { important, others };
    }
    async doActivate() {
        this._otherTips = await this.extensionTipsService.getOtherExecutableBasedTips();
        await this.fetchImportantExeBasedRecommendations();
    }
    async fetchImportantExeBasedRecommendations() {
        if (!this._importantExeBasedRecommendations) {
            this._importantExeBasedRecommendations = this.doFetchImportantExeBasedRecommendations();
        }
        return this._importantExeBasedRecommendations;
    }
    async doFetchImportantExeBasedRecommendations() {
        const importantExeBasedRecommendations = new Map();
        this._importantTips = await this.extensionTipsService.getImportantExecutableBasedTips();
        this._importantTips.forEach(tip => importantExeBasedRecommendations.set(tip.extensionId.toLowerCase(), tip));
        return importantExeBasedRecommendations;
    }
    toExtensionRecommendation(tip) {
        return {
            extension: tip.extensionId.toLowerCase(),
            reason: {
                reasonId: 2 /* ExtensionRecommendationReason.Executable */,
                reasonText: localize('exeBasedRecommendation', "This extension is recommended because you have {0} installed.", tip.exeFriendlyName)
            }
        };
    }
};
ExeBasedRecommendations = __decorate([
    __param(0, IExtensionTipsService)
], ExeBasedRecommendations);
export { ExeBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlQmFzZWRSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4ZUJhc2VkUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBZ0MsTUFBTSx3RUFBd0UsQ0FBQztBQUM3SSxPQUFPLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sK0JBQStCLENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBR3ZDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsd0JBQXdCO0lBS3BFLElBQUksb0JBQW9CLEtBQTZDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUksSUFBSSx3QkFBd0IsS0FBNkMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0SixJQUFJLGVBQWUsS0FBNkMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTFJLFlBQ3dCLG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUZnQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBVDVFLGVBQVUsR0FBbUMsRUFBRSxDQUFDO1FBQ2hELG1CQUFjLEdBQW1DLEVBQUUsQ0FBQztJQVc1RCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsR0FBVztRQUM3QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYzthQUNuQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUM5RCxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVTthQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUM5RCxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVsRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFUyxLQUFLLENBQUMsVUFBVTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDaEYsTUFBTSxJQUFJLENBQUMscUNBQXFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0lBR08sS0FBSyxDQUFDLHFDQUFxQztRQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxDQUFDO1FBQ3pGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQztJQUMvQyxDQUFDO0lBRU8sS0FBSyxDQUFDLHVDQUF1QztRQUNwRCxNQUFNLGdDQUFnQyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsK0JBQStCLEVBQUUsQ0FBQztRQUN4RixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0csT0FBTyxnQ0FBZ0MsQ0FBQztJQUN6QyxDQUFDO0lBRU8seUJBQXlCLENBQUMsR0FBaUM7UUFDbEUsT0FBTztZQUNOLFNBQVMsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRTtZQUN4QyxNQUFNLEVBQUU7Z0JBQ1AsUUFBUSxrREFBMEM7Z0JBQ2xELFVBQVUsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsK0RBQStELEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQzthQUNwSTtTQUNELENBQUM7SUFDSCxDQUFDO0NBRUQsQ0FBQTtBQTFEWSx1QkFBdUI7SUFXakMsV0FBQSxxQkFBcUIsQ0FBQTtHQVhYLHVCQUF1QixDQTBEbkMifQ==