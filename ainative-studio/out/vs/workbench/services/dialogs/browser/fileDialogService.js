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
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AbstractFileDialogService } from './abstractFileDialogService.js';
import { Schemas } from '../../../../base/common/network.js';
import { memoize } from '../../../../base/common/decorators.js';
import { localize } from '../../../../nls.js';
import { getMediaOrTextMime } from '../../../../base/common/mime.js';
import { basename } from '../../../../base/common/resources.js';
import { getActiveWindow, triggerDownload, triggerUpload } from '../../../../base/browser/dom.js';
import Severity from '../../../../base/common/severity.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { extractFileListData } from '../../../../platform/dnd/browser/dnd.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
export class FileDialogService extends AbstractFileDialogService {
    get fileSystemProvider() {
        return this.fileService.getProvider(Schemas.file);
    }
    async pickFileFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileFolderAndOpenSimplified(schema, options, false);
        }
        throw new Error(localize('pickFolderAndOpen', "Can't open folders, try adding a folder to the workspace instead."));
    }
    addFileSchemaIfNeeded(schema, isFolder) {
        return (schema === Schemas.untitled) ? [Schemas.file]
            : (((schema !== Schemas.file) && (!isFolder || (schema !== Schemas.vscodeRemote))) ? [schema, Schemas.file] : [schema]);
    }
    async pickFileAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFilePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileAndOpenSimplified(schema, options, false);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('open');
        }
        let fileHandle = undefined;
        try {
            ([fileHandle] = await activeWindow.showOpenFilePicker({ multiple: false }));
        }
        catch (error) {
            return; // `showOpenFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return;
        }
        const uri = await this.fileSystemProvider.registerFileHandle(fileHandle);
        this.addFileToRecentlyOpened(uri);
        await this.openerService.open(uri, { fromUserGesture: true, editorOptions: { pinned: true } });
    }
    async pickFolderAndOpen(options) {
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultFolderPath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickFolderAndOpenSimplified(schema, options);
        }
        throw new Error(localize('pickFolderAndOpen', "Can't open folders, try adding a folder to the workspace instead."));
    }
    async pickWorkspaceAndOpen(options) {
        options.availableFileSystems = this.getWorkspaceAvailableFileSystems(options);
        const schema = this.getFileSystemSchema(options);
        if (!options.defaultUri) {
            options.defaultUri = await this.defaultWorkspacePath(schema);
        }
        if (this.shouldUseSimplified(schema)) {
            return super.pickWorkspaceAndOpenSimplified(schema, options);
        }
        throw new Error(localize('pickWorkspaceAndOpen', "Can't open workspaces, try adding a folder to the workspace instead."));
    }
    async pickFileToSave(defaultUri, availableFileSystems) {
        const schema = this.getFileSystemSchema({ defaultUri, availableFileSystems });
        const options = this.getPickFileToSaveDialogOptions(defaultUri, availableFileSystems);
        if (this.shouldUseSimplified(schema)) {
            return super.pickFileToSaveSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('save');
        }
        let fileHandle = undefined;
        const startIn = Iterable.first(this.fileSystemProvider.directories);
        try {
            fileHandle = await activeWindow.showSaveFilePicker({ types: this.getFilePickerTypes(options.filters), ...{ suggestedName: basename(defaultUri), startIn } });
        }
        catch (error) {
            return; // `showSaveFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return undefined;
        }
        return this.fileSystemProvider.registerFileHandle(fileHandle);
    }
    getFilePickerTypes(filters) {
        return filters?.filter(filter => {
            return !((filter.extensions.length === 1) && ((filter.extensions[0] === '*') || filter.extensions[0] === ''));
        }).map(filter => {
            const accept = {};
            const extensions = filter.extensions.filter(ext => (ext.indexOf('-') < 0) && (ext.indexOf('*') < 0) && (ext.indexOf('_') < 0));
            accept[getMediaOrTextMime(`fileName.${filter.extensions[0]}`) ?? 'text/plain'] = extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
            return {
                description: filter.name,
                accept
            };
        });
    }
    async showSaveDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema)) {
            return super.showSaveDialogSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('save');
        }
        let fileHandle = undefined;
        const startIn = Iterable.first(this.fileSystemProvider.directories);
        try {
            fileHandle = await activeWindow.showSaveFilePicker({ types: this.getFilePickerTypes(options.filters), ...options.defaultUri ? { suggestedName: basename(options.defaultUri) } : undefined, ...{ startIn } });
        }
        catch (error) {
            return undefined; // `showSaveFilePicker` will throw an error when the user cancels
        }
        if (!WebFileSystemAccess.isFileSystemFileHandle(fileHandle)) {
            return undefined;
        }
        return this.fileSystemProvider.registerFileHandle(fileHandle);
    }
    async showOpenDialog(options) {
        const schema = this.getFileSystemSchema(options);
        if (this.shouldUseSimplified(schema)) {
            return super.showOpenDialogSimplified(schema, options);
        }
        const activeWindow = getActiveWindow();
        if (!WebFileSystemAccess.supported(activeWindow)) {
            return this.showUnsupportedBrowserWarning('open');
        }
        let uri;
        const startIn = Iterable.first(this.fileSystemProvider.directories) ?? 'documents';
        try {
            if (options.canSelectFiles) {
                const handle = await activeWindow.showOpenFilePicker({ multiple: false, types: this.getFilePickerTypes(options.filters), ...{ startIn } });
                if (handle.length === 1 && WebFileSystemAccess.isFileSystemFileHandle(handle[0])) {
                    uri = await this.fileSystemProvider.registerFileHandle(handle[0]);
                }
            }
            else {
                const handle = await activeWindow.showDirectoryPicker({ ...{ startIn } });
                uri = await this.fileSystemProvider.registerDirectoryHandle(handle);
            }
        }
        catch (error) {
            // ignore - `showOpenFilePicker` / `showDirectoryPicker` will throw an error when the user cancels
        }
        return uri ? [uri] : undefined;
    }
    async showUnsupportedBrowserWarning(context) {
        // When saving, try to just download the contents
        // of the active text editor if any as a workaround
        if (context === 'save') {
            const activeCodeEditor = this.codeEditorService.getActiveCodeEditor();
            if (!(activeCodeEditor instanceof EmbeddedCodeEditorWidget)) {
                const activeTextModel = activeCodeEditor?.getModel();
                if (activeTextModel) {
                    triggerDownload(VSBuffer.fromString(activeTextModel.getValue()).buffer, basename(activeTextModel.uri));
                    return;
                }
            }
        }
        // Otherwise inform the user about options
        const buttons = [
            {
                label: localize({ key: 'openRemote', comment: ['&& denotes a mnemonic'] }, "&&Open Remote..."),
                run: async () => { await this.commandService.executeCommand('workbench.action.remote.showMenu'); }
            },
            {
                label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, "&&Learn More"),
                run: async () => { await this.openerService.open('https://aka.ms/VSCodeWebLocalFileSystemAccess'); }
            }
        ];
        if (context === 'open') {
            buttons.push({
                label: localize({ key: 'openFiles', comment: ['&& denotes a mnemonic'] }, "Open &&Files..."),
                run: async () => {
                    const files = await triggerUpload();
                    if (files) {
                        const filesData = (await this.instantiationService.invokeFunction(accessor => extractFileListData(accessor, files))).filter(fileData => !fileData.isDirectory);
                        if (filesData.length > 0) {
                            this.editorService.openEditors(filesData.map(fileData => {
                                return {
                                    resource: fileData.resource,
                                    contents: fileData.contents?.toString(),
                                    options: { pinned: true }
                                };
                            }));
                        }
                    }
                }
            });
        }
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('unsupportedBrowserMessage', "Opening Local Folders is Unsupported"),
            detail: localize('unsupportedBrowserDetail', "Your browser doesn't support opening local folders.\nYou can either open single files or open a remote repository."),
            buttons
        });
        return undefined;
    }
    shouldUseSimplified(scheme) {
        return ![Schemas.file, Schemas.vscodeUserData, Schemas.tmp].includes(scheme);
    }
}
__decorate([
    memoize
], FileDialogService.prototype, "fileSystemProvider", null);
registerSingleton(IFileDialogService, FileDialogService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZURpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RpYWxvZ3MvYnJvd3Nlci9maWxlRGlhbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQStELGtCQUFrQixFQUE2QixNQUFNLGdEQUFnRCxDQUFDO0FBRTVLLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEcsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSww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