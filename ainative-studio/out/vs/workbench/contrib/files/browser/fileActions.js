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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxTQUFTLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hGLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQXVCLE9BQU8sRUFBb0IsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FB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