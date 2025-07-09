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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
let TasksResourceInitializer = class TasksResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const tasksContent = JSON.parse(content);
        if (!tasksContent.tasks) {
            this.logService.info(`Initializing Profile: No tasks to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.tasksResource, VSBuffer.fromString(tasksContent.tasks));
    }
};
TasksResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], TasksResourceInitializer);
export { TasksResourceInitializer };
let TasksResource = class TasksResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const tasksContent = await this.getTasksResourceContent(profile);
        return JSON.stringify(tasksContent);
    }
    async getTasksResourceContent(profile) {
        const tasksContent = await this.getTasksContent(profile);
        return { tasks: tasksContent };
    }
    async apply(content, profile) {
        const tasksContent = JSON.parse(content);
        if (!tasksContent.tasks) {
            this.logService.info(`Importing Profile (${profile.name}): No tasks to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.tasksResource, VSBuffer.fromString(tasksContent.tasks));
    }
    async getTasksContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.tasksResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
TasksResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], TasksResource);
export { TasksResource };
let TasksResourceTreeItem = class TasksResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "tasks" /* ProfileResourceType.Tasks */;
        this.handle = "tasks" /* ProfileResourceType.Tasks */;
        this.label = { label: localize('tasks', "Tasks") };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [{
                handle: this.profile.tasksResource.toString(),
                resourceUri: this.profile.tasksResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource)
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.tasksResource, undefined, undefined]
                }
            }];
    }
    async hasContent() {
        const tasksContent = await this.instantiationService.createInstance(TasksResource).getTasksResourceContent(this.profile);
        return tasksContent.tasks !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(TasksResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.tasks;
    }
};
TasksResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], TasksResourceTreeItem);
export { TasksResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdGFza3NSZXNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUIsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RixPQUFPLEVBQTBHLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFNeEssSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFFcEMsWUFDMkMsc0JBQStDLEVBQzFELFdBQXlCLEVBQzFCLFVBQXVCO1FBRlgsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMxRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUMxQixlQUFVLEdBQVYsVUFBVSxDQUFhO0lBRXRELENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQWU7UUFDL0IsTUFBTSxZQUFZLEdBQTBCLElBQUksQ0FBQyxLQUFLLENBQUMs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