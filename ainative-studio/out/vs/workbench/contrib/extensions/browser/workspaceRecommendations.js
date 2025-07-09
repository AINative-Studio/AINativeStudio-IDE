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
import { EXTENSION_IDENTIFIER_PATTERN } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { distinct, equals } from '../../../../base/common/arrays.js';
import { ExtensionRecommendations } from './extensionRecommendations.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { IWorkspaceExtensionsConfigService } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
const WORKSPACE_EXTENSIONS_FOLDER = '.vscode/extensions';
let WorkspaceRecommendations = class WorkspaceRecommendations extends ExtensionRecommendations {
    get recommendations() { return this._recommendations; }
    get ignoredRecommendations() { return this._ignoredRecommendations; }
    constructor(workspaceExtensionsConfigService, contextService, uriIdentityService, fileService, workbenchExtensionManagementService, notificationService) {
        super();
        this.workspaceExtensionsConfigService = workspaceExtensionsConfigService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.workbenchExtensionManagementService = workbenchExtensionManagementService;
        this.notificationService = notificationService;
        this._recommendations = [];
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this._ignoredRecommendations = [];
        this.workspaceExtensions = [];
        this.onDidChangeWorkspaceExtensionsScheduler = this._register(new RunOnceScheduler(() => this.onDidChangeWorkspaceExtensionsFolders(), 1000));
    }
    async doActivate() {
        this.workspaceExtensions = await this.fetchWorkspaceExtensions();
        await this.fetch();
        this._register(this.workspaceExtensionsConfigService.onDidChangeExtensionsConfigs(() => this.onDidChangeExtensionsConfigs()));
        for (const folder of this.contextService.getWorkspace().folders) {
            this._register(this.fileService.watch(this.uriIdentityService.extUri.joinPath(folder.uri, WORKSPACE_EXTENSIONS_FOLDER)));
        }
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.onDidChangeWorkspaceExtensionsScheduler.schedule()));
        this._register(this.fileService.onDidFilesChange(e => {
            if (this.contextService.getWorkspace().folders.some(folder => e.affects(this.uriIdentityService.extUri.joinPath(folder.uri, WORKSPACE_EXTENSIONS_FOLDER), 1 /* FileChangeType.ADDED */, 2 /* FileChangeType.DELETED */))) {
                this.onDidChangeWorkspaceExtensionsScheduler.schedule();
            }
        }));
    }
    async onDidChangeWorkspaceExtensionsFolders() {
        const existing = this.workspaceExtensions;
        this.workspaceExtensions = await this.fetchWorkspaceExtensions();
        if (!equals(existing, this.workspaceExtensions, (a, b) => this.uriIdentityService.extUri.isEqual(a, b))) {
            this.onDidChangeExtensionsConfigs();
        }
    }
    async fetchWorkspaceExtensions() {
        const workspaceExtensions = [];
        for (const workspaceFolder of this.contextService.getWorkspace().folders) {
            const extensionsLocaiton = this.uriIdentityService.extUri.joinPath(workspaceFolder.uri, WORKSPACE_EXTENSIONS_FOLDER);
            try {
                const stat = await this.fileService.resolve(extensionsLocaiton);
                for (const extension of stat.children ?? []) {
                    if (!extension.isDirectory) {
                        continue;
                    }
                    workspaceExtensions.push(extension.resource);
                }
            }
            catch (error) {
                // ignore
            }
        }
        if (workspaceExtensions.length) {
            const resourceExtensions = await this.workbenchExtensionManagementService.getExtensions(workspaceExtensions);
            return resourceExtensions.map(extension => extension.location);
        }
        return [];
    }
    /**
     * Parse all extensions.json files, fetch workspace recommendations, filter out invalid and unwanted ones
     */
    async fetch() {
        const extensionsConfigs = await this.workspaceExtensionsConfigService.getExtensionsConfigs();
        const { invalidRecommendations, message } = await this.validateExtensions(extensionsConfigs);
        if (invalidRecommendations.length) {
            this.notificationService.warn(`The ${invalidRecommendations.length} extension(s) below, in workspace recommendations have issues:\n${message}`);
        }
        this._recommendations = [];
        this._ignoredRecommendations = [];
        for (const extensionsConfig of extensionsConfigs) {
            if (extensionsConfig.unwantedRecommendations) {
                for (const unwantedRecommendation of extensionsConfig.unwantedRecommendations) {
                    if (invalidRecommendations.indexOf(unwantedRecommendation) === -1) {
                        this._ignoredRecommendations.push(unwantedRecommendation);
                    }
                }
            }
            if (extensionsConfig.recommendations) {
                for (const extensionId of extensionsConfig.recommendations) {
                    if (invalidRecommendations.indexOf(extensionId) === -1) {
                        this._recommendations.push({
                            extension: extensionId,
                            reason: {
                                reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
                                reasonText: localize('workspaceRecommendation', "This extension is recommended by users of the current workspace.")
                            }
                        });
                    }
                }
            }
        }
        for (const extension of this.workspaceExtensions) {
            this._recommendations.push({
                extension,
                reason: {
                    reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
                    reasonText: localize('workspaceRecommendation', "This extension is recommended by users of the current workspace.")
                }
            });
        }
    }
    async validateExtensions(contents) {
        const validExtensions = [];
        const invalidExtensions = [];
        let message = '';
        const allRecommendations = distinct(contents.flatMap(({ recommendations }) => recommendations || []));
        const regEx = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
        for (const extensionId of allRecommendations) {
            if (regEx.test(extensionId)) {
                validExtensions.push(extensionId);
            }
            else {
                invalidExtensions.push(extensionId);
                message += `${extensionId} (bad format) Expected: <provider>.<name>\n`;
            }
        }
        return { validRecommendations: validExtensions, invalidRecommendations: invalidExtensions, message };
    }
    async onDidChangeExtensionsConfigs() {
        await this.fetch();
        this._onDidChangeRecommendations.fire();
    }
};
WorkspaceRecommendations = __decorate([
    __param(0, IWorkspaceExtensionsConfigService),
    __param(1, IWorkspaceContextService),
    __param(2, IUriIdentityService),
    __param(3, IFileService),
    __param(4, IWorkbenchExtensionManagementService),
    __param(5, INotificationService)
], WorkspaceRecommendations);
export { WorkspaceRecommendations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlUmVjb21tZW5kYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci93b3Jrc3BhY2VSZWNvbW1lbmRhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDdEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQTJCLE1BQU0sK0JBQStCLENBQUM7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQTRCLGlDQUFpQyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDN0osT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUUzSCxNQUFNLDJCQUEyQixHQUFHLG9CQUFvQixDQUFDO0FBRWxELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsd0JBQXdCO0lBR3JFLElBQUksZUFB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