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
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Emitter } from '../../../../base/common/event.js';
let ConfigBasedRecommendations = class ConfigBasedRecommendations extends ExtensionRecommendations {
    get otherRecommendations() { return this._otherRecommendations; }
    get importantRecommendations() { return this._importantRecommendations; }
    get recommendations() { return [...this.importantRecommendations, ...this.otherRecommendations]; }
    constructor(extensionTipsService, workspaceContextService) {
        super();
        this.extensionTipsService = extensionTipsService;
        this.workspaceContextService = workspaceContextService;
        this.importantTips = [];
        this.otherTips = [];
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this._otherRecommendations = [];
        this._importantRecommendations = [];
    }
    async doActivate() {
        await this.fetch();
        this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(e => this.onWorkspaceFoldersChanged(e)));
    }
    async fetch() {
        const workspace = this.workspaceContextService.getWorkspace();
        const importantTips = new Map();
        const otherTips = new Map();
        for (const folder of workspace.folders) {
            const configBasedTips = await this.extensionTipsService.getConfigBasedTips(folder.uri);
            for (const tip of configBasedTips) {
                if (tip.important) {
                    importantTips.set(tip.extensionId, tip);
                }
                else {
                    otherTips.set(tip.extensionId, tip);
                }
            }
        }
        this.importantTips = [...importantTips.values()];
        this.otherTips = [...otherTips.values()].filter(tip => !importantTips.has(tip.extensionId));
        this._otherRecommendations = this.otherTips.map(tip => this.toExtensionRecommendation(tip));
        this._importantRecommendations = this.importantTips.map(tip => this.toExtensionRecommendation(tip));
    }
    async onWorkspaceFoldersChanged(event) {
        if (event.added.length) {
            const oldImportantRecommended = this.importantTips;
            await this.fetch();
            // Suggest only if at least one of the newly added recommendations was not suggested before
            if (this.importantTips.some(current => oldImportantRecommended.every(old => current.extensionId !== old.extensionId))) {
                this._onDidChangeRecommendations.fire();
            }
        }
    }
    toExtensionRecommendation(tip) {
        return {
            extension: tip.extensionId,
            reason: {
                reasonId: 3 /* ExtensionRecommendationReason.WorkspaceConfig */,
                reasonText: localize('exeBasedRecommendation', "This extension is recommended because of the current workspace configuration")
            },
            whenNotInstalled: tip.whenNotInstalled
        };
    }
};
ConfigBasedRecommendations = __decorate([
    __param(0, IExtensionTipsService),
    __param(1, IWorkspaceContextService)
], ConfigBasedRecommendations);
export { ConfigBasedRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnQmFzZWRSZWNvbW1lbmRhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2NvbmZpZ0Jhc2VkUmVjb21tZW5kYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBNEIsTUFBTSx3RUFBd0UsQ0FBQztBQUN6SSxPQUFPLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sK0JBQStCLENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSx3QkFBd0IsRUFBZ0MsTUFBTSxvREFBb0QsQ0FBQztBQUM1SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJcEQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSx3QkFBd0I7SUFTdkUsSUFBSSxvQkFBb0IsS0FBd0QsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO0lBR3BILElBQUksd0JBQXdCLEtBQXdELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztJQUU1SCxJQUFJLGVBQWUsS0FBd0QsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXJKLFlBQ3dCLG9CQUE0RCxFQUN6RCx1QkFBa0U7UUFFNUYsS0FBSyxFQUFFLENBQUM7UUFIZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN4Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBaEJyRixrQkFBYSxHQUErQixFQUFFLENB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