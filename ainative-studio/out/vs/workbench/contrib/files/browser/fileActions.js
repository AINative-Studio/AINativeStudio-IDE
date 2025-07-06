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
import { isWindows, OS } from '../../../../base/common/platform.js';
import { extname, basename, isAbsolute } from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Action } from '../../../../base/common/actions.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { VIEWLET_ID, VIEW_ID } from '../common/files.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IQuickInputService, ItemActivation } from '../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID, SAVE_ALL_IN_GROUP_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID } from './fileConstants.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDialogService, getFileNamesMessage } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { NewExplorerItem } from '../common/explorerModel.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { triggerUpload } from '../../../../base/browser/dom.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { timeout } from '../../../../base/common/async.js';
import { IWorkingCopyFileService } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { trim, rtrim } from '../../../../base/common/strings.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from './files.js';
import { BrowserFileUpload, FileDownload } from './fileImportExport.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ActiveEditorCanToggleReadonlyContext, ActiveEditorContext, EmptyWorkspaceSupportContext } from '../../../common/contextkeys.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { getPathForFile } from '../../../../platform/dnd/browser/dnd.js';
export const NEW_FILE_COMMAND_ID = 'explorer.newFile';
export const NEW_FILE_LABEL = nls.localize2('newFile', "New File...");
export const NEW_FOLDER_COMMAND_ID = 'explorer.newFolder';
export const NEW_FOLDER_LABEL = nls.localize2('newFolder', "New Folder...");
export const TRIGGER_RENAME_LABEL = nls.localize('rename', "Rename...");
export const MOVE_FILE_TO_TRASH_LABEL = nls.localize('delete', "Delete");
export const COPY_FILE_LABEL = nls.localize('copyFile', "Copy");
export const PASTE_FILE_LABEL = nls.localize('pasteFile', "Paste");
export const FileCopiedContext = new RawContextKey('fileCopied', false);
export const DOWNLOAD_COMMAND_ID = 'explorer.download';
export const DOWNLOAD_LABEL = nls.localize('download', "Download...");
export const UPLOAD_COMMAND_ID = 'explorer.upload';
export const UPLOAD_LABEL = nls.localize('upload', "Upload...");
const CONFIRM_DELETE_SETTING_KEY = 'explorer.confirmDelete';
const MAX_UNDO_FILE_SIZE = 5000000; // 5mb
function onError(notificationService, error) {
    if (error.message === 'string') {
        error = error.message;
    }
    notificationService.error(toErrorMessage(error, false));
}
async function refreshIfSeparator(value, explorerService) {
    if (value && ((value.indexOf('/') >= 0) || (value.indexOf('\\') >= 0))) {
        // New input contains separator, multiple resources will get created workaround for #68204
        await explorerService.refresh();
    }
}
async function deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm = false, ignoreIfNotExists = false) {
    let primaryButton;
    if (useTrash) {
        primaryButton = isWindows ? nls.localize('deleteButtonLabelRecycleBin', "&&Move to Recycle Bin") : nls.localize({ key: 'deleteButtonLabelTrash', comment: ['&& denotes a mnemonic'] }, "&&Move to Trash");
    }
    else {
        primaryButton = nls.localize({ key: 'deleteButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Delete");
    }
    // Handle dirty
    const distinctElements = resources.distinctParents(elements, e => e.resource);
    const dirtyWorkingCopies = new Set();
    for (const distinctElement of distinctElements) {
        for (const dirtyWorkingCopy of workingCopyFileService.getDirty(distinctElement.resource)) {
            dirtyWorkingCopies.add(dirtyWorkingCopy);
        }
    }
    if (dirtyWorkingCopies.size) {
        let message;
        if (distinctElements.length > 1) {
            message = nls.localize('dirtyMessageFilesDelete', "You are deleting files with unsaved changes. Do you want to continue?");
        }
        else if (distinctElements[0].isDirectory) {
            if (dirtyWorkingCopies.size === 1) {
                message = nls.localize('dirtyMessageFolderOneDelete', "You are deleting a folder {0} with unsaved changes in 1 file. Do you want to continue?", distinctElements[0].name);
            }
            else {
                message = nls.localize('dirtyMessageFolderDelete', "You are deleting a folder {0} with unsaved changes in {1} files. Do you want to continue?", distinctElements[0].name, dirtyWorkingCopies.size);
            }
        }
        else {
            message = nls.localize('dirtyMessageFileDelete', "You are deleting {0} with unsaved changes. Do you want to continue?", distinctElements[0].name);
        }
        const response = await dialogService.confirm({
            type: 'warning',
            message,
            detail: nls.localize('dirtyWarning', "Your changes will be lost if you don't save them."),
            primaryButton
        });
        if (!response.confirmed) {
            return;
        }
        else {
            skipConfirm = true;
        }
    }
    // Handle readonly
    if (!skipConfirm) {
        const readonlyResources = distinctElements.filter(e => filesConfigurationService.isReadonly(e.resource));
        if (readonlyResources.length) {
            let message;
            if (readonlyResources.length > 1) {
                message = nls.localize('readonlyMessageFilesDelete', "You are deleting files that are configured to be read-only. Do you want to continue?");
            }
            else if (readonlyResources[0].isDirectory) {
                message = nls.localize('readonlyMessageFolderOneDelete', "You are deleting a folder {0} that is configured to be read-only. Do you want to continue?", distinctElements[0].name);
            }
            else {
                message = nls.localize('readonlyMessageFolderDelete', "You are deleting a file {0} that is configured to be read-only. Do you want to continue?", distinctElements[0].name);
            }
            const response = await dialogService.confirm({
                type: 'warning',
                message,
                detail: nls.localize('continueDetail', "The read-only protection will be overridden if you continue."),
                primaryButton: nls.localize('continueButtonLabel', "Continue")
            });
            if (!response.confirmed) {
                return;
            }
        }
    }
    let confirmation;
    // We do not support undo of folders, so in that case the delete action is irreversible
    const deleteDetail = distinctElements.some(e => e.isDirectory) ? nls.localize('irreversible', "This action is irreversible!") :
        distinctElements.length > 1 ? nls.localize('restorePlural', "You can restore these files using the Undo command.") : nls.localize('restore', "You can restore this file using the Undo command.");
    // Check if we need to ask for confirmation at all
    if (skipConfirm || (useTrash && configurationService.getValue(CONFIRM_DELETE_SETTING_KEY) === false)) {
        confirmation = { confirmed: true };
    }
    // Confirm for moving to trash
    else if (useTrash) {
        let { message, detail } = getMoveToTrashMessage(distinctElements);
        detail += detail ? '\n' : '';
        if (isWindows) {
            detail += distinctElements.length > 1 ? nls.localize('undoBinFiles', "You can restore these files from the Recycle Bin.") : nls.localize('undoBin', "You can restore this file from the Recycle Bin.");
        }
        else {
            detail += distinctElements.length > 1 ? nls.localize('undoTrashFiles', "You can restore these files from the Trash.") : nls.localize('undoTrash', "You can restore this file from the Trash.");
        }
        confirmation = await dialogService.confirm({
            message,
            detail,
            primaryButton,
            checkbox: {
                label: nls.localize('doNotAskAgain', "Do not ask me again")
            }
        });
    }
    // Confirm for deleting permanently
    else {
        let { message, detail } = getDeleteMessage(distinctElements);
        detail += detail ? '\n' : '';
        detail += deleteDetail;
        confirmation = await dialogService.confirm({
            type: 'warning',
            message,
            detail,
            primaryButton
        });
    }
    // Check for confirmation checkbox
    if (confirmation.confirmed && confirmation.checkboxChecked === true) {
        await configurationService.updateValue(CONFIRM_DELETE_SETTING_KEY, false);
    }
    // Check for confirmation
    if (!confirmation.confirmed) {
        return;
    }
    // Call function
    try {
        const resourceFileEdits = distinctElements.map(e => new ResourceFileEdit(e.resource, undefined, { recursive: true, folder: e.isDirectory, ignoreIfNotExists, skipTrashBin: !useTrash, maxSize: MAX_UNDO_FILE_SIZE }));
        const options = {
            undoLabel: distinctElements.length > 1 ? nls.localize({ key: 'deleteBulkEdit', comment: ['Placeholder will be replaced by the number of files deleted'] }, "Delete {0} files", distinctElements.length) : nls.localize({ key: 'deleteFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file deleted'] }, "Delete {0}", distinctElements[0].name),
            progressLabel: distinctElements.length > 1 ? nls.localize({ key: 'deletingBulkEdit', comment: ['Placeholder will be replaced by the number of files deleted'] }, "Deleting {0} files", distinctElements.length) : nls.localize({ key: 'deletingFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file deleted'] }, "Deleting {0}", distinctElements[0].name),
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
    catch (error) {
        // Handle error to delete file(s) from a modal confirmation dialog
        let errorMessage;
        let detailMessage;
        let primaryButton;
        if (useTrash) {
            errorMessage = isWindows ? nls.localize('binFailed', "Failed to delete using the Recycle Bin. Do you want to permanently delete instead?") : nls.localize('trashFailed', "Failed to delete using the Trash. Do you want to permanently delete instead?");
            detailMessage = deleteDetail;
            primaryButton = nls.localize({ key: 'deletePermanentlyButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Delete Permanently");
        }
        else {
            errorMessage = toErrorMessage(error, false);
            primaryButton = nls.localize({ key: 'retryButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Retry");
        }
        const res = await dialogService.confirm({
            type: 'warning',
            message: errorMessage,
            detail: detailMessage,
            primaryButton
        });
        if (res.confirmed) {
            if (useTrash) {
                useTrash = false; // Delete Permanently
            }
            skipConfirm = true;
            ignoreIfNotExists = true;
            return deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm, ignoreIfNotExists);
        }
    }
}
function getMoveToTrashMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize('confirmMoveTrashMessageFilesAndDirectories', "Are you sure you want to delete the following {0} files/directories and their contents?", distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize('confirmMoveTrashMessageMultipleDirectories', "Are you sure you want to delete the following {0} directories and their contents?", distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map(e => e.resource))
            };
        }
        return {
            message: nls.localize('confirmMoveTrashMessageMultiple', "Are you sure you want to delete the following {0} files?", distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements[0].isDirectory && !distinctElements[0].isSymbolicLink) {
        return { message: nls.localize('confirmMoveTrashMessageFolder', "Are you sure you want to delete '{0}' and its contents?", distinctElements[0].name), detail: '' };
    }
    return { message: nls.localize('confirmMoveTrashMessageFile', "Are you sure you want to delete '{0}'?", distinctElements[0].name), detail: '' };
}
function getDeleteMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize('confirmDeleteMessageFilesAndDirectories', "Are you sure you want to permanently delete the following {0} files/directories and their contents?", distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize('confirmDeleteMessageMultipleDirectories', "Are you sure you want to permanently delete the following {0} directories and their contents?", distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map(e => e.resource))
            };
        }
        return {
            message: nls.localize('confirmDeleteMessageMultiple', "Are you sure you want to permanently delete the following {0} files?", distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements[0].isDirectory) {
        return { message: nls.localize('confirmDeleteMessageFolder', "Are you sure you want to permanently delete '{0}' and its contents?", distinctElements[0].name), detail: '' };
    }
    return { message: nls.localize('confirmDeleteMessageFile', "Are you sure you want to permanently delete '{0}'?", distinctElements[0].name), detail: '' };
}
function containsBothDirectoryAndFile(distinctElements) {
    const directory = distinctElements.find(element => element.isDirectory);
    const file = distinctElements.find(element => !element.isDirectory);
    return !!directory && !!file;
}
export async function findValidPasteFileTarget(explorerService, fileService, dialogService, targetFolder, fileToPaste, incrementalNaming) {
    let name = typeof fileToPaste.resource === 'string' ? fileToPaste.resource : resources.basenameOrAuthority(fileToPaste.resource);
    let candidate = resources.joinPath(targetFolder.resource, name);
    // In the disabled case we must ask if it's ok to overwrite the file if it exists
    if (incrementalNaming === 'disabled') {
        const canOverwrite = await askForOverwrite(fileService, dialogService, candidate);
        if (!canOverwrite) {
            return;
        }
    }
    while (true && !fileToPaste.allowOverwrite) {
        if (!explorerService.findClosest(candidate)) {
            break;
        }
        if (incrementalNaming !== 'disabled') {
            name = incrementFileName(name, !!fileToPaste.isDirectory, incrementalNaming);
        }
        candidate = resources.joinPath(targetFolder.resource, name);
    }
    return candidate;
}
export function incrementFileName(name, isFolder, incrementalNaming) {
    if (incrementalNaming === 'simple') {
        let namePrefix = name;
        let extSuffix = '';
        if (!isFolder) {
            extSuffix = extname(name);
            namePrefix = basename(name, extSuffix);
        }
        // name copy 5(.txt) => name copy 6(.txt)
        // name copy(.txt) => name copy 2(.txt)
        const suffixRegex = /^(.+ copy)( \d+)?$/;
        if (suffixRegex.test(namePrefix)) {
            return namePrefix.replace(suffixRegex, (match, g1, g2) => {
                const number = (g2 ? parseInt(g2) : 1);
                return number === 0
                    ? `${g1}`
                    : (number < 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
                        ? `${g1} ${number + 1}`
                        : `${g1}${g2} copy`);
            }) + extSuffix;
        }
        // name(.txt) => name copy(.txt)
        return `${namePrefix} copy${extSuffix}`;
    }
    const separators = '[\\.\\-_]';
    const maxNumber = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
    // file.1.txt=>file.2.txt
    const suffixFileRegex = RegExp('(.*' + separators + ')(\\d+)(\\..*)$');
    if (!isFolder && name.match(suffixFileRegex)) {
        return name.replace(suffixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g2);
            return number < maxNumber
                ? g1 + String(number + 1).padStart(g2.length, '0') + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.file.txt=>2.file.txt
    const prefixFileRegex = RegExp('(\\d+)(' + separators + '.*)(\\..*)$');
    if (!isFolder && name.match(prefixFileRegex)) {
        return name.replace(prefixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0') + g2 + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.txt=>2.txt
    const prefixFileNoNameRegex = RegExp('(\\d+)(\\..*)$');
    if (!isFolder && name.match(prefixFileNoNameRegex)) {
        return name.replace(prefixFileNoNameRegex, (match, g1, g2) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0') + g2
                : `${g1}.1${g2}`;
        });
    }
    // file.txt=>file.1.txt
    const lastIndexOfDot = name.lastIndexOf('.');
    if (!isFolder && lastIndexOfDot >= 0) {
        return `${name.substr(0, lastIndexOfDot)}.1${name.substr(lastIndexOfDot)}`;
    }
    // 123 => 124
    const noNameNoExtensionRegex = RegExp('(\\d+)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noNameNoExtensionRegex)) {
        return name.replace(noNameNoExtensionRegex, (match, g1) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0')
                : `${g1}.1`;
        });
    }
    // file => file1
    // file1 => file2
    const noExtensionRegex = RegExp('(.*)(\\d*)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noExtensionRegex)) {
        return name.replace(noExtensionRegex, (match, g1, g2) => {
            let number = parseInt(g2);
            if (isNaN(number)) {
                number = 0;
            }
            return number < maxNumber
                ? g1 + String(number + 1).padStart(g2.length, '0')
                : `${g1}${g2}.1`;
        });
    }
    // folder.1=>folder.2
    if (isFolder && name.match(/(\d+)$/)) {
        return name.replace(/(\d+)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0')
                : `${groups[0]}.1`;
        });
    }
    // 1.folder=>2.folder
    if (isFolder && name.match(/^(\d+)/)) {
        return name.replace(/^(\d+)(.*)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0') + groups[1]
                : `${groups[0]}${groups[1]}.1`;
        });
    }
    // file/folder=>file.1/folder.1
    return `${name}.1`;
}
/**
 * Checks to see if the resource already exists, if so prompts the user if they would be ok with it being overwritten
 * @param fileService The file service
 * @param dialogService The dialog service
 * @param targetResource The resource to be overwritten
 * @return A boolean indicating if the user is ok with resource being overwritten, if the resource does not exist it returns true.
 */
async function askForOverwrite(fileService, dialogService, targetResource) {
    const exists = await fileService.exists(targetResource);
    if (!exists) {
        return true;
    }
    // Ask for overwrite confirmation
    const { confirmed } = await dialogService.confirm({
        type: Severity.Warning,
        message: nls.localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", basename(targetResource.path)),
        primaryButton: nls.localize('replaceButtonLabel', "&&Replace")
    });
    return confirmed;
}
// Global Compare with
export class GlobalCompareResourcesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareFileWith'; }
    static { this.LABEL = nls.localize2('globalCompareFile', "Compare Active File With..."); }
    constructor() {
        super({
            id: GlobalCompareResourcesAction.ID,
            title: GlobalCompareResourcesAction.LABEL,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorContext,
            metadata: {
                description: nls.localize2('compareFileWithMeta', "Opens a picker to select a file to diff with the active editor.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const textModelService = accessor.get(ITextModelService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeInput = editorService.activeEditor;
        const activeResource = EditorResourceAccessor.getOriginalUri(activeInput);
        if (activeResource && textModelService.canHandleResource(activeResource)) {
            const picks = await quickInputService.quickAccess.pick('', { itemActivation: ItemActivation.SECOND });
            if (picks?.length === 1) {
                const resource = picks[0].resource;
                if (URI.isUri(resource) && textModelService.canHandleResource(resource)) {
                    editorService.openEditor({
                        original: { resource: activeResource },
                        modified: { resource: resource },
                        options: { pinned: true }
                    });
                }
            }
        }
    }
}
export class ToggleAutoSaveAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAutoSave'; }
    constructor() {
        super({
            id: ToggleAutoSaveAction.ID,
            title: nls.localize2('toggleAutoSave', "Toggle Auto Save"),
            f1: true,
            category: Categories.File,
            metadata: { description: nls.localize2('toggleAutoSaveDescription', "Toggle the ability to save files automatically after typing") }
        });
    }
    run(accessor) {
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        return filesConfigurationService.toggleAutoSave();
    }
}
let BaseSaveAllAction = class BaseSaveAllAction extends Action {
    constructor(id, label, commandService, notificationService, workingCopyService) {
        super(id, label);
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.workingCopyService = workingCopyService;
        this.lastDirtyState = this.workingCopyService.hasDirty;
        this.enabled = this.lastDirtyState;
        this.registerListeners();
    }
    registerListeners() {
        // update enablement based on working copy changes
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.updateEnablement(workingCopy)));
    }
    updateEnablement(workingCopy) {
        const hasDirty = workingCopy.isDirty() || this.workingCopyService.hasDirty;
        if (this.lastDirtyState !== hasDirty) {
            this.enabled = hasDirty;
            this.lastDirtyState = this.enabled;
        }
    }
    async run(context) {
        try {
            await this.doRun(context);
        }
        catch (error) {
            onError(this.notificationService, error);
        }
    }
};
BaseSaveAllAction = __decorate([
    __param(2, ICommandService),
    __param(3, INotificationService),
    __param(4, IWorkingCopyService)
], BaseSaveAllAction);
export class SaveAllInGroupAction extends BaseSaveAllAction {
    static { this.ID = 'workbench.files.action.saveAllInGroup'; }
    static { this.LABEL = nls.localize('saveAllInGroup', "Save All in Group"); }
    get class() {
        return 'explorer-action ' + ThemeIcon.asClassName(Codicon.saveAll);
    }
    doRun(context) {
        return this.commandService.executeCommand(SAVE_ALL_IN_GROUP_COMMAND_ID, {}, context);
    }
}
let CloseGroupAction = class CloseGroupAction extends Action {
    static { this.ID = 'workbench.files.action.closeGroup'; }
    static { this.LABEL = nls.localize('closeGroup', "Close Group"); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.closeAll));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, {}, context);
    }
};
CloseGroupAction = __decorate([
    __param(2, ICommandService)
], CloseGroupAction);
export { CloseGroupAction };
export class FocusFilesExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.focusFilesExplorer'; }
    static { this.LABEL = nls.localize2('focusFilesExplorer', "Focus on Files Explorer"); }
    constructor() {
        super({
            id: FocusFilesExplorer.ID,
            title: FocusFilesExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('focusFilesExplorerMetadata', "Moves focus to the file explorer view container.")
            }
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        await paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
    }
}
export class ShowActiveFileInExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.showActiveFileInExplorer'; }
    static { this.LABEL = nls.localize2('showInExplorer', "Reveal Active File in Explorer View"); }
    constructor() {
        super({
            id: ShowActiveFileInExplorer.ID,
            title: ShowActiveFileInExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('showInExplorerMetadata', "Reveals and selects the active file within the explorer view.")
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (resource) {
            commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, resource);
        }
    }
}
export class OpenActiveFileInEmptyWorkspace extends Action2 {
    static { this.ID = 'workbench.action.files.showOpenedFileInNewWindow'; }
    static { this.LABEL = nls.localize2('openFileInEmptyWorkspace', "Open Active File in New Empty Workspace"); }
    constructor() {
        super({
            id: OpenActiveFileInEmptyWorkspace.ID,
            title: OpenActiveFileInEmptyWorkspace.LABEL,
            f1: true,
            category: Categories.File,
            precondition: EmptyWorkspaceSupportContext,
            metadata: {
                description: nls.localize2('openFileInEmptyWorkspaceMetadata', "Opens the active file in a new window with no folders open.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const hostService = accessor.get(IHostService);
        const dialogService = accessor.get(IDialogService);
        const fileService = accessor.get(IFileService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (fileResource) {
            if (fileService.hasProvider(fileResource)) {
                hostService.openWindow([{ fileUri: fileResource }], { forceNewWindow: true });
            }
            else {
                dialogService.error(nls.localize('openFileToShowInNewWindow.unsupportedschema', "The active editor must contain an openable resource."));
            }
        }
    }
}
export function validateFileName(pathService, item, name, os) {
    // Produce a well formed file name
    name = getWellFormedFileName(name);
    // Name not provided
    if (!name || name.length === 0 || /^\s+$/.test(name)) {
        return {
            content: nls.localize('emptyFileNameError', "A file or folder name must be provided."),
            severity: Severity.Error
        };
    }
    // Relative paths only
    if (name[0] === '/' || name[0] === '\\') {
        return {
            content: nls.localize('fileNameStartsWithSlashError', "A file or folder name cannot start with a slash."),
            severity: Severity.Error
        };
    }
    const names = coalesce(name.split(/[\\/]/));
    const parent = item.parent;
    if (name !== item.name) {
        // Do not allow to overwrite existing file
        const child = parent?.getChild(name);
        if (child && child !== item) {
            return {
                content: nls.localize('fileNameExistsError', "A file or folder **{0}** already exists at this location. Please choose a different name.", name),
                severity: Severity.Error
            };
        }
    }
    // Check for invalid file name.
    if (names.some(folderName => !pathService.hasValidBasename(item.resource, os, folderName))) {
        // Escape * characters
        const escapedName = name.replace(/\*/g, '\\*'); // CodeQL [SM02383] This only processes filenames which are enforced against having backslashes in them farther up in the stack.
        return {
            content: nls.localize('invalidFileNameError', "The name **{0}** is not valid as a file or folder name. Please choose a different name.", trimLongName(escapedName)),
            severity: Severity.Error
        };
    }
    if (names.some(name => /^\s|\s$/.test(name))) {
        return {
            content: nls.localize('fileNameWhitespaceWarning', "Leading or trailing whitespace detected in file or folder name."),
            severity: Severity.Warning
        };
    }
    return null;
}
function trimLongName(name) {
    if (name?.length > 255) {
        return `${name.substr(0, 255)}...`;
    }
    return name;
}
function getWellFormedFileName(filename) {
    if (!filename) {
        return filename;
    }
    // Trim tabs
    filename = trim(filename, '\t');
    // Remove trailing slashes
    filename = rtrim(filename, '/');
    filename = rtrim(filename, '\\');
    return filename;
}
export class CompareNewUntitledTextFilesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareNewUntitledTextFiles'; }
    static { this.LABEL = nls.localize2('compareNewUntitledTextFiles', "Compare New Untitled Text Files"); }
    constructor() {
        super({
            id: CompareNewUntitledTextFilesAction.ID,
            title: CompareNewUntitledTextFilesAction.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2('compareNewUntitledTextFilesMeta', "Opens a new diff editor with two untitled files.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            original: { resource: undefined },
            modified: { resource: undefined },
            options: { pinned: true }
        });
    }
}
export class CompareWithClipboardAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareWithClipboard'; }
    static { this.LABEL = nls.localize2('compareWithClipboard', "Compare Active File with Clipboard"); }
    static { this.SCHEME_COUNTER = 0; }
    constructor() {
        super({
            id: CompareWithClipboardAction.ID,
            title: CompareWithClipboardAction.LABEL,
            f1: true,
            category: Categories.File,
            keybinding: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 33 /* KeyCode.KeyC */), weight: 200 /* KeybindingWeight.WorkbenchContrib */ },
            metadata: {
                description: nls.localize2('compareWithClipboardMeta', "Opens a new diff editor to compare the active file with the contents of the clipboard.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const fileService = accessor.get(IFileService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const scheme = `clipboardCompare${CompareWithClipboardAction.SCHEME_COUNTER++}`;
        if (resource && (fileService.hasProvider(resource) || resource.scheme === Schemas.untitled)) {
            if (!this.registrationDisposal) {
                const provider = instantiationService.createInstance(ClipboardContentProvider);
                this.registrationDisposal = textModelService.registerTextModelContentProvider(scheme, provider);
            }
            const name = resources.basename(resource);
            const editorLabel = nls.localize('clipboardComparisonLabel', "Clipboard ↔ {0}", name);
            await editorService.openEditor({
                original: { resource: resource.with({ scheme }) },
                modified: { resource: resource },
                label: editorLabel,
                options: { pinned: true }
            }).finally(() => {
                dispose(this.registrationDisposal);
                this.registrationDisposal = undefined;
            });
        }
    }
    dispose() {
        dispose(this.registrationDisposal);
        this.registrationDisposal = undefined;
    }
}
let ClipboardContentProvider = class ClipboardContentProvider {
    constructor(clipboardService, languageService, modelService) {
        this.clipboardService = clipboardService;
        this.languageService = languageService;
        this.modelService = modelService;
    }
    async provideTextContent(resource) {
        const text = await this.clipboardService.readText();
        const model = this.modelService.createModel(text, this.languageService.createByFilepathOrFirstLine(resource), resource);
        return model;
    }
};
ClipboardContentProvider = __decorate([
    __param(0, IClipboardService),
    __param(1, ILanguageService),
    __param(2, IModelService)
], ClipboardContentProvider);
function onErrorWithRetry(notificationService, error, retry) {
    notificationService.prompt(Severity.Error, toErrorMessage(error, false), [{
            label: nls.localize('retry', "Retry"),
            run: () => retry()
        }]);
}
async function openExplorerAndCreate(accessor, isFolder) {
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const configService = accessor.get(IConfigurationService);
    const filesConfigService = accessor.get(IFilesConfigurationService);
    const editorService = accessor.get(IEditorService);
    const viewsService = accessor.get(IViewsService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const commandService = accessor.get(ICommandService);
    const pathService = accessor.get(IPathService);
    const wasHidden = !viewsService.isViewVisible(VIEW_ID);
    const view = await viewsService.openView(VIEW_ID, true);
    if (wasHidden) {
        // Give explorer some time to resolve itself #111218
        await timeout(500);
    }
    if (!view) {
        // Can happen in empty workspace case (https://github.com/microsoft/vscode/issues/100604)
        if (isFolder) {
            throw new Error('Open a folder or workspace first.');
        }
        return commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
    }
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    let folder;
    if (stat) {
        folder = stat.isDirectory ? stat : (stat.parent || explorerService.roots[0]);
    }
    else {
        folder = explorerService.roots[0];
    }
    if (folder.isReadonly) {
        throw new Error('Parent folder is readonly.');
    }
    const newStat = new NewExplorerItem(fileService, configService, filesConfigService, folder, isFolder);
    folder.addChild(newStat);
    const onSuccess = async (value) => {
        try {
            const resourceToCreate = resources.joinPath(folder.resource, value);
            if (value.endsWith('/')) {
                isFolder = true;
            }
            await explorerService.applyBulkEdit([new ResourceFileEdit(undefined, resourceToCreate, { folder: isFolder })], {
                undoLabel: nls.localize('createBulkEdit', "Create {0}", value),
                progressLabel: nls.localize('creatingBulkEdit', "Creating {0}", value),
                confirmBeforeUndo: true
            });
            await refreshIfSeparator(value, explorerService);
            if (isFolder) {
                await explorerService.select(resourceToCreate, true);
            }
            else {
                await editorService.openEditor({ resource: resourceToCreate, options: { pinned: true } });
            }
        }
        catch (error) {
            onErrorWithRetry(notificationService, error, () => onSuccess(value));
        }
    };
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(newStat, {
        validationMessage: value => validateFileName(pathService, newStat, value, os),
        onFinish: async (value, success) => {
            folder.removeChild(newStat);
            await explorerService.setEditable(newStat, null);
            if (success) {
                onSuccess(value);
            }
        }
    });
}
CommandsRegistry.registerCommand({
    id: NEW_FILE_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, false);
    }
});
CommandsRegistry.registerCommand({
    id: NEW_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, true);
    }
});
export const renameHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const pathService = accessor.get(IPathService);
    const configurationService = accessor.get(IConfigurationService);
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    if (!stat) {
        return;
    }
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(stat, {
        validationMessage: value => validateFileName(pathService, stat, value, os),
        onFinish: async (value, success) => {
            if (success) {
                const parentResource = stat.parent.resource;
                const targetResource = resources.joinPath(parentResource, value);
                if (stat.resource.toString() !== targetResource.toString()) {
                    try {
                        await explorerService.applyBulkEdit([new ResourceFileEdit(stat.resource, targetResource)], {
                            confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
                            undoLabel: nls.localize('renameBulkEdit', "Rename {0} to {1}", stat.name, value),
                            progressLabel: nls.localize('renamingBulkEdit', "Renaming {0} to {1}", stat.name, value),
                        });
                        await refreshIfSeparator(value, explorerService);
                    }
                    catch (e) {
                        notificationService.error(e);
                    }
                }
            }
            await explorerService.setEditable(stat, null);
        }
    });
};
export const moveFileToTrashHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter(s => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, true);
    }
};
export const deleteFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter(s => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, false);
    }
};
let pasteShouldMove = false;
export const copyFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, false);
        pasteShouldMove = false;
    }
};
export const cutFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, true);
        pasteShouldMove = true;
    }
};
const downloadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(true);
    const explorerItems = context.length ? context : explorerService.roots;
    const downloadHandler = instantiationService.createInstance(FileDownload);
    try {
        await downloadHandler.download(explorerItems);
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: DOWNLOAD_COMMAND_ID,
    handler: downloadFileHandler
});
const uploadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(false);
    const element = context.length ? context[0] : explorerService.roots[0];
    try {
        const files = await triggerUpload();
        if (files) {
            const browserUpload = instantiationService.createInstance(BrowserFileUpload);
            await browserUpload.upload(element, files);
        }
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: UPLOAD_COMMAND_ID,
    handler: uploadFileHandler
});
export const pasteFileHandler = async (accessor, fileList) => {
    const clipboardService = accessor.get(IClipboardService);
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const notificationService = accessor.get(INotificationService);
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const uriIdentityService = accessor.get(IUriIdentityService);
    const dialogService = accessor.get(IDialogService);
    const hostService = accessor.get(IHostService);
    const context = explorerService.getContext(false);
    const hasNativeFilesToPaste = fileList && fileList.length > 0;
    const confirmPasteNative = hasNativeFilesToPaste && configurationService.getValue('explorer.confirmPasteNative');
    const toPaste = await getFilesToPaste(fileList, clipboardService, hostService);
    if (confirmPasteNative && toPaste.files.length >= 1) {
        const message = toPaste.files.length > 1 ?
            nls.localize('confirmMultiPasteNative', "Are you sure you want to paste the following {0} items?", toPaste.files.length) :
            nls.localize('confirmPasteNative', "Are you sure you want to paste '{0}'?", basename(toPaste.type === 'paths' ? toPaste.files[0].fsPath : toPaste.files[0].name));
        const detail = toPaste.files.length > 1 ? getFileNamesMessage(toPaste.files.map(item => {
            if (URI.isUri(item)) {
                return item.fsPath;
            }
            if (toPaste.type === 'paths') {
                const path = getPathForFile(item);
                if (path) {
                    return path;
                }
            }
            return item.name;
        })) : undefined;
        const confirmation = await dialogService.confirm({
            message,
            detail,
            checkbox: {
                label: nls.localize('doNotAskAgain', "Do not ask me again")
            },
            primaryButton: nls.localize({ key: 'pasteButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Paste")
        });
        if (!confirmation.confirmed) {
            return;
        }
        // Check for confirmation checkbox
        if (confirmation.checkboxChecked === true) {
            await configurationService.updateValue('explorer.confirmPasteNative', false);
        }
    }
    const element = context.length ? context[0] : explorerService.roots[0];
    const incrementalNaming = configurationService.getValue().explorer.incrementalNaming;
    const editableItem = explorerService.getEditable();
    // If it's an editable item, just do nothing
    if (editableItem) {
        return;
    }
    try {
        let targets = [];
        if (toPaste.type === 'paths') { // Pasting from files on disk
            // Check if target is ancestor of pasted folder
            const sourceTargetPairs = coalesce(await Promise.all(toPaste.files.map(async (fileToPaste) => {
                if (element.resource.toString() !== fileToPaste.toString() && resources.isEqualOrParent(element.resource, fileToPaste)) {
                    throw new Error(nls.localize('fileIsAncestor', "File to paste is an ancestor of the destination folder"));
                }
                const fileToPasteStat = await fileService.stat(fileToPaste);
                // Find target
                let target;
                if (uriIdentityService.extUri.isEqual(element.resource, fileToPaste)) {
                    target = element.parent;
                }
                else {
                    target = element.isDirectory ? element : element.parent;
                }
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, { resource: fileToPaste, isDirectory: fileToPasteStat.isDirectory, allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled' }, incrementalNaming);
                if (!targetFile) {
                    return undefined;
                }
                return { source: fileToPaste, target: targetFile };
            })));
            if (sourceTargetPairs.length >= 1) {
                // Move/Copy File
                if (pasteShouldMove) {
                    const resourceFileEdits = sourceTargetPairs.map(pair => new ResourceFileEdit(pair.source, pair.target, { overwrite: incrementalNaming === 'disabled' }));
                    const options = {
                        confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
                        progressLabel: sourceTargetPairs.length > 1 ? nls.localize({ key: 'movingBulkEdit', comment: ['Placeholder will be replaced by the number of files being moved'] }, "Moving {0} files", sourceTargetPairs.length)
                            : nls.localize({ key: 'movingFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file moved.'] }, "Moving {0}", resources.basenameOrAuthority(sourceTargetPairs[0].target)),
                        undoLabel: sourceTargetPairs.length > 1 ? nls.localize({ key: 'moveBulkEdit', comment: ['Placeholder will be replaced by the number of files being moved'] }, "Move {0} files", sourceTargetPairs.length)
                            : nls.localize({ key: 'moveFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file moved.'] }, "Move {0}", resources.basenameOrAuthority(sourceTargetPairs[0].target))
                    };
                    await explorerService.applyBulkEdit(resourceFileEdits, options);
                }
                else {
                    const resourceFileEdits = sourceTargetPairs.map(pair => new ResourceFileEdit(pair.source, pair.target, { copy: true, overwrite: incrementalNaming === 'disabled' }));
                    await applyCopyResourceEdit(sourceTargetPairs.map(pair => pair.target), resourceFileEdits);
                }
            }
            targets = sourceTargetPairs.map(pair => pair.target);
        }
        else { // Pasting from file data
            const targetAndEdits = coalesce(await Promise.all(toPaste.files.map(async (file) => {
                const target = element.isDirectory ? element : element.parent;
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, { resource: file.name, isDirectory: false, allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled' }, incrementalNaming);
                if (!targetFile) {
                    return;
                }
                return {
                    target: targetFile,
                    edit: new ResourceFileEdit(undefined, targetFile, {
                        overwrite: incrementalNaming === 'disabled',
                        contents: (async () => VSBuffer.wrap(new Uint8Array(await file.arrayBuffer())))(),
                    })
                };
            })));
            await applyCopyResourceEdit(targetAndEdits.map(pair => pair.target), targetAndEdits.map(pair => pair.edit));
            targets = targetAndEdits.map(pair => pair.target);
        }
        if (targets.length) {
            const firstTarget = targets[0];
            await explorerService.select(firstTarget);
            if (targets.length === 1) {
                const item = explorerService.findClosest(firstTarget);
                if (item && !item.isDirectory) {
                    await editorService.openEditor({ resource: item.resource, options: { pinned: true, preserveFocus: true } });
                }
            }
        }
    }
    catch (e) {
        onError(notificationService, new Error(nls.localize('fileDeleted', "The file(s) to paste have been deleted or moved since you copied them. {0}", getErrorMessage(e))));
    }
    finally {
        if (pasteShouldMove) {
            // Cut is done. Make sure to clear cut state.
            await explorerService.setToCopy([], false);
            pasteShouldMove = false;
        }
    }
    async function applyCopyResourceEdit(targets, resourceFileEdits) {
        const undoLevel = configurationService.getValue().explorer.confirmUndo;
        const options = {
            confirmBeforeUndo: undoLevel === "default" /* UndoConfirmLevel.Default */ || undoLevel === "verbose" /* UndoConfirmLevel.Verbose */,
            progressLabel: targets.length > 1 ? nls.localize({ key: 'copyingBulkEdit', comment: ['Placeholder will be replaced by the number of files being copied'] }, "Copying {0} files", targets.length)
                : nls.localize({ key: 'copyingFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file copied.'] }, "Copying {0}", resources.basenameOrAuthority(targets[0])),
            undoLabel: targets.length > 1 ? nls.localize({ key: 'copyBulkEdit', comment: ['Placeholder will be replaced by the number of files being copied'] }, "Paste {0} files", targets.length)
                : nls.localize({ key: 'copyFileBulkEdit', comment: ['Placeholder will be replaced by the name of the file copied.'] }, "Paste {0}", resources.basenameOrAuthority(targets[0]))
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
};
async function getFilesToPaste(fileList, clipboardService, hostService) {
    if (fileList && fileList.length > 0) {
        // with a `fileList` we support natively pasting file from disk from clipboard
        const resources = [...fileList].map(file => getPathForFile(file)).filter(filePath => !!filePath && isAbsolute(filePath)).map((filePath) => URI.file(filePath));
        if (resources.length) {
            return { type: 'paths', files: resources, };
        }
        // Support pasting files that we can't read from disk
        return { type: 'data', files: [...fileList].filter(file => !getPathForFile(file)) };
    }
    else {
        // otherwise we fallback to reading resources from our clipboard service
        return { type: 'paths', files: resources.distinctParents(await clipboardService.readResources(), resource => resource) };
    }
}
export const openFilePreserveFocusHandler = async (accessor) => {
    const editorService = accessor.get(IEditorService);
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    await editorService.openEditors(stats.filter(s => !s.isDirectory).map(s => ({
        resource: s.resource,
        options: { preserveFocus: true }
    })));
};
class BaseSetActiveEditorReadonlyInSession extends Action2 {
    constructor(id, title, newReadonlyState) {
        super({
            id,
            title,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorCanToggleReadonlyContext
        });
        this.newReadonlyState = newReadonlyState;
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!fileResource) {
            return;
        }
        await filesConfigurationService.updateReadonly(fileResource, this.newReadonlyState);
    }
}
export class SetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('setActiveEditorReadonlyInSession', "Set Active Editor Read-only in Session"); }
    constructor() {
        super(SetActiveEditorReadonlyInSession.ID, SetActiveEditorReadonlyInSession.LABEL, true);
    }
}
export class SetActiveEditorWriteableInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorWriteableInSession'; }
    static { this.LABEL = nls.localize2('setActiveEditorWriteableInSession', "Set Active Editor Writeable in Session"); }
    constructor() {
        super(SetActiveEditorWriteableInSession.ID, SetActiveEditorWriteableInSession.LABEL, false);
    }
}
export class ToggleActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.toggleActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('toggleActiveEditorReadonlyInSession', "Toggle Active Editor Read-only in Session"); }
    constructor() {
        super(ToggleActiveEditorReadonlyInSession.ID, ToggleActiveEditorReadonlyInSession.LABEL, 'toggle');
    }
}
export class ResetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.resetActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2('resetActiveEditorReadonlyInSession', "Reset Active Editor Read-only in Session"); }
    constructor() {
        super(ResetActiveEditorReadonlyInSession.ID, ResetActiveEditorReadonlyInSession.LABEL, 'reset');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFNBQVMsRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEYsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBdUIsT0FBTyxFQUFvQixNQUFNLG9CQUFvQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBRXJILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFP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