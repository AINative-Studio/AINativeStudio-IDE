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
import * as nls from '../../../../nls.js';
import { isWorkspaceToOpen, isFileToOpen } from '../../../../platform/window/common/window.js';
import { IDialogService, getFileNamesMessage } from '../../../../platform/dialogs/common/dialogs.js';
import { isSavedWorkspace, isTemporaryWorkspace, IWorkspaceContextService, WORKSPACE_EXTENSION } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../history/common/history.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import * as resources from '../../../../base/common/resources.js';
import { isAbsolute as localPathIsAbsolute, normalize as localPathNormalize } from '../../../../base/common/path.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { SimpleFileDialog } from './simpleFileDialog.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IHostService } from '../../host/browser/host.js';
import Severity from '../../../../base/common/severity.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { trim } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IPathService } from '../../path/common/pathService.js';
import { Schemas } from '../../../../base/common/network.js';
import { PLAINTEXT_EXTENSION } from '../../../../editor/common/languages/modesRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let AbstractFileDialogService = class AbstractFileDialogService {
    constructor(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        this.hostService = hostService;
        this.contextService = contextService;
        this.historyService = historyService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.dialogService = dialogService;
        this.languageService = languageService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.commandService = commandService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.logService = logService;
    }
    async defaultFilePath(schemeFilter = this.getSchemeFilterForWindow(), authorityFilter = this.getAuthorityFilterForWindow()) {
        // Check for last active file first...
        let candidate = this.historyService.getLastActiveFile(schemeFilter, authorityFilter);
        // ...then for last active file root
        if (!candidate) {
            candidate = this.historyService.getLastActiveWorkspaceRoot(schemeFilter, authorityFilter);
        }
        else {
            candidate = resources.dirname(candidate);
        }
        if (!candidate) {
            candidate = await this.preferredHome(schemeFilter);
        }
        return candidate;
    }
    async defaultFolderPath(schemeFilter = this.getSchemeFilterForWindow(), authorityFilter = this.getAuthorityFilterForWindow()) {
        // Check for last active file root first...
        let candidate = this.historyService.getLastActiveWorkspaceRoot(schemeFilter, authorityFilter);
        // ...then for last active file
        if (!candidate) {
            candidate = this.historyService.getLastActiveFile(schemeFilter, authorityFilter);
        }
        if (!candidate) {
            return this.preferredHome(schemeFilter);
        }
        return resources.dirname(candidate);
    }
    async preferredHome(schemeFilter = this.getSchemeFilterForWindow()) {
        const preferLocal = schemeFilter === Schemas.file;
        const preferredHomeConfig = this.configurationService.inspect('files.dialog.defaultPath');
        const preferredHomeCandidate = preferLocal ? preferredHomeConfig.userLocalValue : preferredHomeConfig.userRemoteValue;
        if (preferredHomeCandidate) {
            const isPreferredHomeCandidateAbsolute = preferLocal ? localPathIsAbsolute(preferredHomeCandidate) : (await this.pathService.path).isAbsolute(preferredHomeCandidate);
            if (isPreferredHomeCandidateAbsolute) {
                const preferredHomeNormalized = preferLocal ? localPathNormalize(preferredHomeCandidate) : (await this.pathService.path).normalize(preferredHomeCandidate);
                const preferredHome = resources.toLocalResource(await this.pathService.fileURI(preferredHomeNormalized), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
                if (await this.fileService.exists(preferredHome)) {
                    return preferredHome;
                }
            }
        }
        return this.pathService.userHome({ preferLocal });
    }
    async defaultWorkspacePath(schemeFilter = this.getSchemeFilterForWindow()) {
        let defaultWorkspacePath;
        // Check for current workspace config file first...
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const configuration = this.contextService.getWorkspace().configuration;
            if (configuration?.scheme === schemeFilter && isSavedWorkspace(configuration, this.environmentService) && !isTemporaryWorkspace(configuration)) {
                defaultWorkspacePath = resources.dirname(configuration);
            }
        }
        // ...then fallback to default file path
        if (!defaultWorkspacePath) {
            defaultWorkspacePath = await this.defaultFilePath(schemeFilter);
        }
        return defaultWorkspacePath;
    }
    async showSaveConfirm(fileNamesOrResources) {
        if (this.skipDialogs()) {
            this.logService.trace('FileDialogService: refused to show save confirmation dialog in tests.');
            // no veto when we are in extension dev testing mode because we cannot assume we run interactive
            return 1 /* ConfirmResult.DONT_SAVE */;
        }
        return this.doShowSaveConfirm(fileNamesOrResources);
    }
    skipDialogs() {
        if (this.environmentService.isExtensionDevelopment && this.environmentService.extensionTestsLocationURI) {
            return true; // integration tests
        }
        return !!this.environmentService.enableSmokeTestDriver; // smoke tests
    }
    async doShowSaveConfirm(fileNamesOrResources) {
        if (fileNamesOrResources.length === 0) {
            return 1 /* ConfirmResult.DONT_SAVE */;
        }
        let message;
        let detail = nls.localize('saveChangesDetail', "Your changes will be lost if you don't save them.");
        if (fileNamesOrResources.length === 1) {
            message = nls.localize('saveChangesMessage', "Do you want to save the changes you made to {0}?", typeof fileNamesOrResources[0] === 'string' ? fileNamesOrResources[0] : resources.basename(fileNamesOrResources[0]));
        }
        else {
            message = nls.localize('saveChangesMessages', "Do you want to save the changes to the following {0} files?", fileNamesOrResources.length);
            detail = getFileNamesMessage(fileNamesOrResources) + '\n' + detail;
        }
        const { result } = await this.dialogService.prompt({
            type: Severity.Warning,
            message,
            detail,
            buttons: [
                {
                    label: fileNamesOrResources.length > 1 ?
                        nls.localize({ key: 'saveAll', comment: ['&& denotes a mnemonic'] }, "&&Save All") :
                        nls.localize({ key: 'save', comment: ['&& denotes a mnemonic'] }, "&&Save"),
                    run: () => 0 /* ConfirmResult.SAVE */
                },
                {
                    label: nls.localize({ key: 'dontSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                    run: () => 1 /* ConfirmResult.DONT_SAVE */
                }
            ],
            cancelButton: {
                run: () => 2 /* ConfirmResult.CANCEL */
            }
        });
        return result;
    }
    addFileSchemaIfNeeded(schema, _isFolder) {
        return schema === Schemas.untitled ? [Schemas.file] : (schema !== Schemas.file ? [schema, Schemas.file] : [schema]);
    }
    async pickFileFolderAndOpenSimplified(schema, options, preferNewWindow) {
        const title = nls.localize('openFileOrFolder.title', 'Open File or Folder');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema);
        const uri = await this.pickResource({ canSelectFiles: true, canSelectFolders: true, canSelectMany: false, defaultUri: options.defaultUri, title, availableFileSystems });
        if (uri) {
            const stat = await this.fileService.stat(uri);
            const toOpen = stat.isDirectory ? { folderUri: uri } : { fileUri: uri };
            if (!isWorkspaceToOpen(toOpen) && isFileToOpen(toOpen)) {
                this.addFileToRecentlyOpened(toOpen.fileUri);
            }
            if (stat.isDirectory || options.forceNewWindow || preferNewWindow) {
                await this.hostService.openWindow([toOpen], { forceNewWindow: options.forceNewWindow, remoteAuthority: options.remoteAuthority });
            }
            else {
                await this.editorService.openEditors([{ resource: uri, options: { source: EditorOpenSource.USER, pinned: true } }], undefined, { validateTrust: true });
            }
        }
    }
    async pickFileAndOpenSimplified(schema, options, preferNewWindow) {
        const title = nls.localize('openFile.title', 'Open File');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema);
        const uri = await this.pickResource({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, defaultUri: options.defaultUri, title, availableFileSystems });
        if (uri) {
            this.addFileToRecentlyOpened(uri);
            if (options.forceNewWindow || preferNewWindow) {
                await this.hostService.openWindow([{ fileUri: uri }], { forceNewWindow: options.forceNewWindow, remoteAuthority: options.remoteAuthority });
            }
            else {
                await this.editorService.openEditors([{ resource: uri, options: { source: EditorOpenSource.USER, pinned: true } }], undefined, { validateTrust: true });
            }
        }
    }
    addFileToRecentlyOpened(uri) {
        this.workspacesService.addRecentlyOpened([{ fileUri: uri, label: this.labelService.getUriLabel(uri, { appendWorkspaceSuffix: true }) }]);
    }
    async pickFolderAndOpenSimplified(schema, options) {
        const title = nls.localize('openFolder.title', 'Open Folder');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema, true);
        const uri = await this.pickResource({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, defaultUri: options.defaultUri, title, availableFileSystems });
        if (uri) {
            return this.hostService.openWindow([{ folderUri: uri }], { forceNewWindow: options.forceNewWindow, remoteAuthority: options.remoteAuthority });
        }
    }
    async pickWorkspaceAndOpenSimplified(schema, options) {
        const title = nls.localize('openWorkspace.title', 'Open Workspace from File');
        const filters = [{ name: nls.localize('filterName.workspace', 'Workspace'), extensions: [WORKSPACE_EXTENSION] }];
        const availableFileSystems = this.addFileSchemaIfNeeded(schema, true);
        const uri = await this.pickResource({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false, defaultUri: options.defaultUri, title, filters, availableFileSystems });
        if (uri) {
            return this.hostService.openWindow([{ workspaceUri: uri }], { forceNewWindow: options.forceNewWindow, remoteAuthority: options.remoteAuthority });
        }
    }
    async pickFileToSaveSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema);
        }
        options.title = nls.localize('saveFileAs.title', 'Save As');
        const uri = await this.saveRemoteResource(options);
        if (uri) {
            this.addFileToRecentlyOpened(uri);
        }
        return uri;
    }
    async showSaveDialogSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema);
        }
        return this.saveRemoteResource(options);
    }
    async showOpenDialogSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema, options.canSelectFolders);
        }
        const uri = await this.pickResource(options);
        return uri ? [uri] : undefined;
    }
    getSimpleFileDialog() {
        return this.instantiationService.createInstance(SimpleFileDialog);
    }
    pickResource(options) {
        return this.getSimpleFileDialog().showOpenDialog(options);
    }
    saveRemoteResource(options) {
        return this.getSimpleFileDialog().showSaveDialog(options);
    }
    getSchemeFilterForWindow(defaultUriScheme) {
        return defaultUriScheme ?? this.pathService.defaultUriScheme;
    }
    getAuthorityFilterForWindow() {
        return this.environmentService.remoteAuthority;
    }
    getFileSystemSchema(options) {
        return options.availableFileSystems && options.availableFileSystems[0] || this.getSchemeFilterForWindow(options.defaultUri?.scheme);
    }
    getWorkspaceAvailableFileSystems(options) {
        if (options.availableFileSystems && (options.availableFileSystems.length > 0)) {
            return options.availableFileSystems;
        }
        const availableFileSystems = [Schemas.file];
        if (this.environmentService.remoteAuthority) {
            availableFileSystems.unshift(Schemas.vscodeRemote);
        }
        return availableFileSystems;
    }
    getPickFileToSaveDialogOptions(defaultUri, availableFileSystems) {
        const options = {
            defaultUri,
            title: nls.localize('saveAsTitle', "Save As"),
            availableFileSystems
        };
        // Build the file filter by using our known languages
        const ext = defaultUri ? resources.extname(defaultUri) : undefined;
        let matchingFilter;
        const registeredLanguageNames = this.languageService.getSortedRegisteredLanguageNames();
        const registeredLanguageFilters = coalesce(registeredLanguageNames.map(({ languageName, languageId }) => {
            const extensions = this.languageService.getExtensions(languageId);
            if (!extensions.length) {
                return null;
            }
            const filter = { name: languageName, extensions: distinct(extensions).slice(0, 10).map(e => trim(e, '.')) };
            // https://github.com/microsoft/vscode/issues/115860
            const extOrPlaintext = ext || PLAINTEXT_EXTENSION;
            if (!matchingFilter && extensions.includes(extOrPlaintext)) {
                matchingFilter = filter;
                // The selected extension must be in the set of extensions that are in the filter list that is sent to the save dialog.
                // If it isn't, add it manually. https://github.com/microsoft/vscode/issues/147657
                const trimmedExt = trim(extOrPlaintext, '.');
                if (!filter.extensions.includes(trimmedExt)) {
                    filter.extensions.unshift(trimmedExt);
                }
                return null; // first matching filter will be added to the top
            }
            return filter;
        }));
        // We have no matching filter, e.g. because the language
        // is unknown. We still add the extension to the list of
        // filters though so that it can be picked
        // (https://github.com/microsoft/vscode/issues/96283)
        if (!matchingFilter && ext) {
            matchingFilter = { name: trim(ext, '.').toUpperCase(), extensions: [trim(ext, '.')] };
        }
        // Order of filters is
        // - All Files (we MUST do this to fix macOS issue https://github.com/microsoft/vscode/issues/102713)
        // - File Extension Match (if any)
        // - All Languages
        // - No Extension
        options.filters = coalesce([
            { name: nls.localize('allFiles', "All Files"), extensions: ['*'] },
            matchingFilter,
            ...registeredLanguageFilters,
            { name: nls.localize('noExt', "No Extension"), extensions: [''] }
        ]);
        return options;
    }
};
AbstractFileDialogService = __decorate([
    __param(0, IHostService),
    __param(1, IWorkspaceContextService),
    __param(2, IHistoryService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IOpenerService),
    __param(8, IDialogService),
    __param(9, ILanguageService),
    __param(10, IWorkspacesService),
    __param(11, ILabelService),
    __param(12, IPathService),
    __param(13, ICommandService),
    __param(14, IEditorService),
    __param(15, ICodeEditorService),
    __param(16, ILogService)
], AbstractFileDialogService);
export { AbstractFileDialogService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RGaWxlRGlhbG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGlhbG9ncy9icm93c2VyL2Fic3RyYWN0RmlsZURpYWxvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hILE9BQU8sRUFBK0YsY0FBYyxFQUFpQixtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pOLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBa0IsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzSyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFOUYsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUFFLFNBQVMsSUFBSSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxxQkFBcUIsR0FBRyxNQUFNLDREQUE0RCxDQUFDO0FBQ3BHLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFF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