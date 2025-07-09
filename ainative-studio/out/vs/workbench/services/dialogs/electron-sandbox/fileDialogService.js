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
import { IHostService } from '../../host/browser/host.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../history/common/history.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { AbstractFileDialogService } from '../browser/abstractFileDialogService.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IPathService } from '../../path/common/pathService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let FileDialogService = class FileDialogService extends AbstractFileDialogService {
    constructor(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, nativeHostService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        super(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService);
        this.nativeHostService = nativeHostService;
    }
    toNativeOpenDialogOptions(options) {
        return {
            forceNewWindow: options.forceNewWindow,
            telemetryExtraData: options.telemetryExtraData,
            defaultPath: options.defaultUri?.fsPath
        };
    }
    shouldUseSimplified(schema) {
        const setting = (this.configurationService.getValue('files.simpleDialog.enable') === true);
        const newWindowSetting = (this.configurationService.getValue('window.openFilesInNewWindow') === 'on');
        return {
            useSimplified: ((schema !== Schemas.file) && (schema !== Schemas.vscodeUserData)) || setting,
            isSetting: newWindowSetting
        };
    }
    async pickFileFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        const shouldUseSimplified = this.shouldUseSimplified(schema);
        if (shouldUseSimplified.useSimplified) {
            return this.pickFileFolderAndOpenSimplified(schema, options, shouldUseSimplified.isSetting);
        }
        return this.nativeHostService.pickFileFolderAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFileAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        const shouldUseSimplified = this.shouldUseSimplified(schema);
        if (shouldUseSimplified.useSimplified) {
            return this.pickFileAndOpenSimplified(schema, options, shouldUseSimplified.isSetting);
        }
        return this.nativeHostService.pickFileAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFolderPath(schema);
        }
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickFolderAndOpenSimplified(schema, options);
        }
        return this.nativeHostService.pickFolderAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickWorkspaceAndOpen(options) {
        options.availableFileSystems = this.getWorkspaceAvailableFileSystems(options);
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultWorkspacePath(schema);
        }
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickWorkspaceAndOpenSimplified(schema, options);
        }
        return this.nativeHostService.pickWorkspaceAndOpen(this.toNativeOpenDialogOptions(options));
    }
    async pickFileToSave(defaultUri, availableFileSystems) {
        const schema = this.getFileSystemSchema({ defaultUri, availableFileSystems });
        const options = this.getPickFileToSaveDialogOptions(defaultUri, availableFileSystems);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.pickFileToSaveSimplified(schema, options);
        }
        else {
            const result = await this.nativeHostService.showSaveDialog(this.toNativeSaveDialogOptions(options));
            if (result && !result.canceled && result.filePath) {
                const uri = URI.file(result.filePath);
                this.addFileToRecentlyOpened(uri);
                return uri;
            }
        }
        return;
    }
    toNativeSaveDialogOptions(options) {
        options.defaultUri = options.defaultUri ? URI.file(options.defaultUri.path) : undefined;
        return {
            defaultPath: options.defaultUri?.fsPath,
            buttonLabel: typeof options.saveLabel === 'string' ? options.saveLabel : options.saveLabel?.withMnemonic,
            filters: options.filters,
            title: options.title,
            targetWindowId: getActiveWindow().vscodeWindowId
        };
    }
    async showSaveDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.showSaveDialogSimplified(schema, options);
        }
        const result = await this.nativeHostService.showSaveDialog(this.toNativeSaveDialogOptions(options));
        if (result && !result.canceled && result.filePath) {
            return URI.file(result.filePath);
        }
        return;
    }
    async showOpenDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema).useSimplified) {
            return this.showOpenDialogSimplified(schema, options);
        }
        const newOptions = {
            title: options.title,
            defaultPath: options.defaultUri?.fsPath,
            buttonLabel: typeof options.openLabel === 'string' ? options.openLabel : options.openLabel?.withMnemonic,
            filters: options.filters,
            properties: [],
            targetWindowId: getActiveWindow().vscodeWindowId
        };
        newOptions.properties.push('createDirectory');
        if (options.canSelectFiles) {
            newOptions.properties.push('openFile');
        }
        if (options.canSelectFolders) {
            newOptions.properties.push('openDirectory');
        }
        if (options.canSelectMany) {
            newOptions.properties.push('multiSelections');
        }
        const result = await this.nativeHostService.showOpenDialog(newOptions);
        return result && Array.isArray(result.filePaths) && result.filePaths.length > 0 ? result.filePaths.map(URI.file) : undefined;
    }
};
FileDialogService = __decorate([
    __param(0, IHostService),
    __param(1, IWorkspaceContextService),
    __param(2, IHistoryService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IOpenerService),
    __param(8, INativeHostService),
    __param(9, IDialogService),
    __param(10, ILanguageService),
    __param(11, IWorkspacesService),
    __param(12, ILabelService),
    __param(13, IPathService),
    __param(14, ICommandService),
    __param(15, IEditorService),
    __param(16, ICodeEditorService),
    __param(17, ILogService)
], FileDialogService);
export { FileDialogService };
registerSingleton(IFileDialogService, FileDialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RpYWxvZ3MvZWxlY3Ryb24tc2FuZGJveC9maWxlRGlhbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUErRCxrQkFBa0IsRUFBRSxjQUFjLEVBQTRCLE1BQU0sZ0RBQWdELENBQUM7QUFDM0wsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQXNCLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxn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