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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RGaWxlRGlhbG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2Jyb3dzZXIvYWJzdHJhY3RGaWxlRGlhbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBbUIsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDaEgsT0FBTyxFQUErRixjQUFjLEVBQWlCLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDak4sT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFrQixtQkFBbUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNLLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RixPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQUUsU0FBUyxJQUFJLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckgsT0FBTyxFQUFFLHFCQUFxQixHQUFHLE1BQU0sNERBQTRELENBQUM7QUFDcEcsT0FBTyxFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUs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