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
import { distinct } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionIgnoredRecommendationsService } from './extensionRecommendations.js';
import { IWorkspaceExtensionsConfigService } from './workspaceExtensionsConfig.js';
const ignoredRecommendationsStorageKey = 'extensionsAssistant/ignored_recommendations';
let ExtensionIgnoredRecommendationsService = class ExtensionIgnoredRecommendationsService extends Disposable {
    get globalIgnoredRecommendations() { return [...this._globalIgnoredRecommendations]; }
    get ignoredRecommendations() { return distinct([...this.globalIgnoredRecommendations, ...this.ignoredWorkspaceRecommendations]); }
    constructor(workspaceExtensionsConfigService, storageService) {
        super();
        this.workspaceExtensionsConfigService = workspaceExtensionsConfigService;
        this.storageService = storageService;
        this._onDidChangeIgnoredRecommendations = this._register(new Emitter());
        this.onDidChangeIgnoredRecommendations = this._onDidChangeIgnoredRecommendations.event;
        // Global Ignored Recommendations
        this._globalIgnoredRecommendations = [];
        this._onDidChangeGlobalIgnoredRecommendation = this._register(new Emitter());
        this.onDidChangeGlobalIgnoredRecommendation = this._onDidChangeGlobalIgnoredRecommendation.event;
        // Ignored Workspace Recommendations
        this.ignoredWorkspaceRecommendations = [];
        this._globalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, ignoredRecommendationsStorageKey, this._store)(() => this.onDidStorageChange()));
        this.initIgnoredWorkspaceRecommendations();
    }
    async initIgnoredWorkspaceRecommendations() {
        this.ignoredWorkspaceRecommendations = await this.workspaceExtensionsConfigService.getUnwantedRecommendations();
        this._onDidChangeIgnoredRecommendations.fire();
        this._register(this.workspaceExtensionsConfigService.onDidChangeExtensionsConfigs(async () => {
            this.ignoredWorkspaceRecommendations = await this.workspaceExtensionsConfigService.getUnwantedRecommendations();
            this._onDidChangeIgnoredRecommendations.fire();
        }));
    }
    toggleGlobalIgnoredRecommendation(extensionId, shouldIgnore) {
        extensionId = extensionId.toLowerCase();
        const ignored = this._globalIgnoredRecommendations.indexOf(extensionId) !== -1;
        if (ignored === shouldIgnore) {
            return;
        }
        this._globalIgnoredRecommendations = shouldIgnore ? [...this._globalIgnoredRecommendations, extensionId] : this._globalIgnoredRecommendations.filter(id => id !== extensionId);
        this.storeCachedIgnoredRecommendations(this._globalIgnoredRecommendations);
        this._onDidChangeGlobalIgnoredRecommendation.fire({ extensionId, isRecommended: !shouldIgnore });
        this._onDidChangeIgnoredRecommendations.fire();
    }
    getCachedIgnoredRecommendations() {
        const ignoredRecommendations = JSON.parse(this.ignoredRecommendationsValue);
        return ignoredRecommendations.map(e => e.toLowerCase());
    }
    onDidStorageChange() {
        if (this.ignoredRecommendationsValue !== this.getStoredIgnoredRecommendationsValue() /* This checks if current window changed the value or not */) {
            this._ignoredRecommendationsValue = undefined;
            this._globalIgnoredRecommendations = this.getCachedIgnoredRecommendations();
            this._onDidChangeIgnoredRecommendations.fire();
        }
    }
    storeCachedIgnoredRecommendations(ignoredRecommendations) {
        this.ignoredRecommendationsValue = JSON.stringify(ignoredRecommendations);
    }
    get ignoredRecommendationsValue() {
        if (!this._ignoredRecommendationsValue) {
            this._ignoredRecommendationsValue = this.getStoredIgnoredRecommendationsValue();
        }
        return this._ignoredRecommendationsValue;
    }
    set ignoredRecommendationsValue(ignoredRecommendationsValue) {
        if (this.ignoredRecommendationsValue !== ignoredRecommendationsValue) {
            this._ignoredRecommendationsValue = ignoredRecommendationsValue;
            this.setStoredIgnoredRecommendationsValue(ignoredRecommendationsValue);
        }
    }
    getStoredIgnoredRecommendationsValue() {
        return this.storageService.get(ignoredRecommendationsStorageKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredIgnoredRecommendationsValue(value) {
        this.storageService.store(ignoredRecommendationsStorageKey, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ExtensionIgnoredRecommendationsService = __decorate([
    __param(0, IWorkspaceExtensionsConfigService),
    __param(1, IStorageService)
], ExtensionIgnoredRecommendationsService);
export { ExtensionIgnoredRecommendationsService };
registerSingleton(IExtensionIgnoredRecommendationsService, ExtensionIgnoredRecommendationsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSWdub3JlZFJlY29tbWVuZGF0aW9uc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvblJlY29tbWVuZGF0aW9ucy9jb21tb24vZXh0ZW5zaW9uSWdub3JlZFJlY29tbWVuZGF0aW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHVDQUF1QyxFQUEyQyxNQUFNLCtCQUErQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW5GLE1BQU0sZ0NBQWdDLEdBQUcsNkNBQTZDLENBQUM7QUFFaEYsSUFBTSxzQ0FBc0MsR0FBNUMsTUFBTSxzQ0FBdUMsU0FBUSxVQUFVO0lBU3JFLElBQUksNEJBQTRCLEtBQWUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBT2hHLElBQUksc0JBQXNCLEtBQWUsT0FBTyxRQUFRLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVJLFlBQ29DLGdDQUFv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