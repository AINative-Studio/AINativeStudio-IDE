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
import { parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { isWorkspace, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { ResourceMap } from '../../../../base/common/map.js';
export const EXTENSIONS_CONFIG = '.vscode/extensions.json';
export const IWorkspaceExtensionsConfigService = createDecorator('IWorkspaceExtensionsConfigService');
let WorkspaceExtensionsConfigService = class WorkspaceExtensionsConfigService extends Disposable {
    constructor(workspaceContextService, fileService, quickInputService, modelService, languageService, jsonEditingService) {
        super();
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.jsonEditingService = jsonEditingService;
        this._onDidChangeExtensionsConfigs = this._register(new Emitter());
        this.onDidChangeExtensionsConfigs = this._onDidChangeExtensionsConfigs.event;
        this._register(workspaceContextService.onDidChangeWorkspaceFolders(e => this._onDidChangeExtensionsConfigs.fire()));
        this._register(fileService.onDidFilesChange(e => {
            const workspace = workspaceContextService.getWorkspace();
            if ((workspace.configuration && e.affects(workspace.configuration))
                || workspace.folders.some(folder => e.affects(folder.toResource(EXTENSIONS_CONFIG)))) {
                this._onDidChangeExtensionsConfigs.fire();
            }
        }));
    }
    async getExtensionsConfigs() {
        const workspace = this.workspaceContextService.getWorkspace();
        const result = [];
        const workspaceExtensionsConfigContent = workspace.configuration ? await this.resolveWorkspaceExtensionConfig(workspace.configuration) : undefined;
        if (workspaceExtensionsConfigContent) {
            result.push(workspaceExtensionsConfigContent);
        }
        result.push(...await Promise.all(workspace.folders.map(workspaceFolder => this.resolveWorkspaceFolderExtensionConfig(workspaceFolder))));
        return result;
    }
    async getRecommendations() {
        const configs = await this.getExtensionsConfigs();
        return distinct(configs.flatMap(c => c.recommendations ? c.recommendations.map(c => c.toLowerCase()) : []));
    }
    async getUnwantedRecommendations() {
        const configs = await this.getExtensionsConfigs();
        return distinct(configs.flatMap(c => c.unwantedRecommendations ? c.unwantedRecommendations.map(c => c.toLowerCase()) : []));
    }
    async toggleRecommendation(extensionId) {
        extensionId = extensionId.toLowerCase();
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceExtensionsConfigContent = workspace.configuration ? await this.resolveWorkspaceExtensionConfig(workspace.configuration) : undefined;
        const workspaceFolderExtensionsConfigContents = new ResourceMap();
        await Promise.all(workspace.folders.map(async (workspaceFolder) => {
            const extensionsConfigContent = await this.resolveWorkspaceFolderExtensionConfig(workspaceFolder);
            workspaceFolderExtensionsConfigContents.set(workspaceFolder.uri, extensionsConfigContent);
        }));
        const isWorkspaceRecommended = workspaceExtensionsConfigContent && workspaceExtensionsConfigContent.recommendations?.some(r => r.toLowerCase() === extensionId);
        const recommendedWorksapceFolders = workspace.folders.filter(workspaceFolder => workspaceFolderExtensionsConfigContents.get(workspaceFolder.uri)?.recommendations?.some(r => r.toLowerCase() === extensionId));
        const isRecommended = isWorkspaceRecommended || recommendedWorksapceFolders.length > 0;
        const workspaceOrFolders = isRecommended
            ? await this.pickWorkspaceOrFolders(recommendedWorksapceFolders, isWorkspaceRecommended ? workspace : undefined, localize('select for remove', "Remove extension recommendation from"))
            : await this.pickWorkspaceOrFolders(workspace.folders, workspace.configuration ? workspace : undefined, localize('select for add', "Add extension recommendation to"));
        for (const workspaceOrWorkspaceFolder of workspaceOrFolders) {
            if (isWorkspace(workspaceOrWorkspaceFolder)) {
                await this.addOrRemoveWorkspaceRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceExtensionsConfigContent, !isRecommended);
            }
            else {
                await this.addOrRemoveWorkspaceFolderRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceFolderExtensionsConfigContents.get(workspaceOrWorkspaceFolder.uri), !isRecommended);
            }
        }
    }
    async toggleUnwantedRecommendation(extensionId) {
        const workspace = this.workspaceContextService.getWorkspace();
        const workspaceExtensionsConfigContent = workspace.configuration ? await this.resolveWorkspaceExtensionConfig(workspace.configuration) : undefined;
        const workspaceFolderExtensionsConfigContents = new ResourceMap();
        await Promise.all(workspace.folders.map(async (workspaceFolder) => {
            const extensionsConfigContent = await this.resolveWorkspaceFolderExtensionConfig(workspaceFolder);
            workspaceFolderExtensionsConfigContents.set(workspaceFolder.uri, extensionsConfigContent);
        }));
        const isWorkspaceUnwanted = workspaceExtensionsConfigContent && workspaceExtensionsConfigContent.unwantedRecommendations?.some(r => r === extensionId);
        const unWantedWorksapceFolders = workspace.folders.filter(workspaceFolder => workspaceFolderExtensionsConfigContents.get(workspaceFolder.uri)?.unwantedRecommendations?.some(r => r === extensionId));
        const isUnwanted = isWorkspaceUnwanted || unWantedWorksapceFolders.length > 0;
        const workspaceOrFolders = isUnwanted
            ? await this.pickWorkspaceOrFolders(unWantedWorksapceFolders, isWorkspaceUnwanted ? workspace : undefined, localize('select for remove', "Remove extension recommendation from"))
            : await this.pickWorkspaceOrFolders(workspace.folders, workspace.configuration ? workspace : undefined, localize('select for add', "Add extension recommendation to"));
        for (const workspaceOrWorkspaceFolder of workspaceOrFolders) {
            if (isWorkspace(workspaceOrWorkspaceFolder)) {
                await this.addOrRemoveWorkspaceUnwantedRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceExtensionsConfigContent, !isUnwanted);
            }
            else {
                await this.addOrRemoveWorkspaceFolderUnwantedRecommendation(extensionId, workspaceOrWorkspaceFolder, workspaceFolderExtensionsConfigContents.get(workspaceOrWorkspaceFolder.uri), !isUnwanted);
            }
        }
    }
    async addOrRemoveWorkspaceFolderRecommendation(extensionId, workspaceFolder, extensionsConfigContent, add) {
        const values = [];
        if (add) {
            if (Array.isArray(extensionsConfigContent.recommendations)) {
                values.push({ path: ['recommendations', -1], value: extensionId });
            }
            else {
                values.push({ path: ['recommendations'], value: [extensionId] });
            }
            const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
            if (unwantedRecommendationEdit) {
                values.push(unwantedRecommendationEdit);
            }
        }
        else if (extensionsConfigContent.recommendations) {
            const recommendationEdit = this.getEditToRemoveValueFromArray(['recommendations'], extensionsConfigContent.recommendations, extensionId);
            if (recommendationEdit) {
                values.push(recommendationEdit);
            }
        }
        if (values.length) {
            return this.jsonEditingService.write(workspaceFolder.toResource(EXTENSIONS_CONFIG), values, true);
        }
    }
    async addOrRemoveWorkspaceRecommendation(extensionId, workspace, extensionsConfigContent, add) {
        const values = [];
        if (extensionsConfigContent) {
            if (add) {
                const path = ['extensions', 'recommendations'];
                if (Array.isArray(extensionsConfigContent.recommendations)) {
                    values.push({ path: [...path, -1], value: extensionId });
                }
                else {
                    values.push({ path, value: [extensionId] });
                }
                const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
                if (unwantedRecommendationEdit) {
                    values.push(unwantedRecommendationEdit);
                }
            }
            else if (extensionsConfigContent.recommendations) {
                const recommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'recommendations'], extensionsConfigContent.recommendations, extensionId);
                if (recommendationEdit) {
                    values.push(recommendationEdit);
                }
            }
        }
        else if (add) {
            values.push({ path: ['extensions'], value: { recommendations: [extensionId] } });
        }
        if (values.length) {
            return this.jsonEditingService.write(workspace.configuration, values, true);
        }
    }
    async addOrRemoveWorkspaceFolderUnwantedRecommendation(extensionId, workspaceFolder, extensionsConfigContent, add) {
        const values = [];
        if (add) {
            const path = ['unwantedRecommendations'];
            if (Array.isArray(extensionsConfigContent.unwantedRecommendations)) {
                values.push({ path: [...path, -1], value: extensionId });
            }
            else {
                values.push({ path, value: [extensionId] });
            }
            const recommendationEdit = this.getEditToRemoveValueFromArray(['recommendations'], extensionsConfigContent.recommendations, extensionId);
            if (recommendationEdit) {
                values.push(recommendationEdit);
            }
        }
        else if (extensionsConfigContent.unwantedRecommendations) {
            const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
            if (unwantedRecommendationEdit) {
                values.push(unwantedRecommendationEdit);
            }
        }
        if (values.length) {
            return this.jsonEditingService.write(workspaceFolder.toResource(EXTENSIONS_CONFIG), values, true);
        }
    }
    async addOrRemoveWorkspaceUnwantedRecommendation(extensionId, workspace, extensionsConfigContent, add) {
        const values = [];
        if (extensionsConfigContent) {
            if (add) {
                const path = ['extensions', 'unwantedRecommendations'];
                if (Array.isArray(extensionsConfigContent.recommendations)) {
                    values.push({ path: [...path, -1], value: extensionId });
                }
                else {
                    values.push({ path, value: [extensionId] });
                }
                const recommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'recommendations'], extensionsConfigContent.recommendations, extensionId);
                if (recommendationEdit) {
                    values.push(recommendationEdit);
                }
            }
            else if (extensionsConfigContent.unwantedRecommendations) {
                const unwantedRecommendationEdit = this.getEditToRemoveValueFromArray(['extensions', 'unwantedRecommendations'], extensionsConfigContent.unwantedRecommendations, extensionId);
                if (unwantedRecommendationEdit) {
                    values.push(unwantedRecommendationEdit);
                }
            }
        }
        else if (add) {
            values.push({ path: ['extensions'], value: { unwantedRecommendations: [extensionId] } });
        }
        if (values.length) {
            return this.jsonEditingService.write(workspace.configuration, values, true);
        }
    }
    async pickWorkspaceOrFolders(workspaceFolders, workspace, placeHolder) {
        const workspaceOrFolders = workspace ? [...workspaceFolders, workspace] : [...workspaceFolders];
        if (workspaceOrFolders.length === 1) {
            return workspaceOrFolders;
        }
        const folderPicks = workspaceFolders.map(workspaceFolder => {
            return {
                label: workspaceFolder.name,
                description: localize('workspace folder', "Workspace Folder"),
                workspaceOrFolder: workspaceFolder,
                iconClasses: getIconClasses(this.modelService, this.languageService, workspaceFolder.uri, FileKind.ROOT_FOLDER)
            };
        });
        if (workspace) {
            folderPicks.push({ type: 'separator' });
            folderPicks.push({
                label: localize('workspace', "Workspace"),
                workspaceOrFolder: workspace,
            });
        }
        const result = await this.quickInputService.pick(folderPicks, { placeHolder, canPickMany: true }) || [];
        return result.map(r => r.workspaceOrFolder);
    }
    async resolveWorkspaceExtensionConfig(workspaceConfigurationResource) {
        try {
            const content = await this.fileService.readFile(workspaceConfigurationResource);
            const extensionsConfigContent = parse(content.value.toString())['extensions'];
            return extensionsConfigContent ? this.parseExtensionConfig(extensionsConfigContent) : undefined;
        }
        catch (e) { /* Ignore */ }
        return undefined;
    }
    async resolveWorkspaceFolderExtensionConfig(workspaceFolder) {
        try {
            const content = await this.fileService.readFile(workspaceFolder.toResource(EXTENSIONS_CONFIG));
            const extensionsConfigContent = parse(content.value.toString());
            return this.parseExtensionConfig(extensionsConfigContent);
        }
        catch (e) { /* ignore */ }
        return {};
    }
    parseExtensionConfig(extensionsConfigContent) {
        return {
            recommendations: distinct((extensionsConfigContent.recommendations || []).map(e => e.toLowerCase())),
            unwantedRecommendations: distinct((extensionsConfigContent.unwantedRecommendations || []).map(e => e.toLowerCase()))
        };
    }
    getEditToRemoveValueFromArray(path, array, value) {
        const index = array?.indexOf(value);
        if (index !== undefined && index !== -1) {
            return { path: [...path, index], value: undefined };
        }
        return undefined;
    }
};
WorkspaceExtensionsConfigService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IFileService),
    __param(2, IQuickInputService),
    __param(3, IModelService),
    __param(4, ILanguageService),
    __param(5, IJSONEditingService)
], WorkspaceExtensionsConfigService);
export { WorkspaceExtensionsConfigService };
registerSingleton(IWorkspaceExtensionsConfigService, WorkspaceExtensionsConfigService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlRXh0ZW5zaW9uc0NvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zL2NvbW1vbi93b3Jrc3BhY2VFeHRlbnNpb25zQ29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFZLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQWMsd0JBQXdCLEVBQW9CLE1BQU0sb0RBQW9ELENBQUM7QUFDekksT0FBTyxFQUFFLGtCQUFrQixFQUF1QyxNQUFNLHNEQUFzRCxDQUFDO0FBQy9ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFjLE1BQU0sMkNB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