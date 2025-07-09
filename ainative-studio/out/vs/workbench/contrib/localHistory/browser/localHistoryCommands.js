/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { Event } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IWorkingCopyHistoryService } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { LocalHistoryFileSystemProvider } from './localHistoryFileSystemProvider.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { registerAction2, Action2, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { basename, basenameOrAuthority, dirname } from '../../../../base/common/resources.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { EditorResourceAccessor, SaveSourceRegistry, SideBySideEditor } from '../../../common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ActiveEditorContext, ResourceContextKey } from '../../../common/contextkeys.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { getLocalHistoryDateFormatter, LOCAL_HISTORY_ICON_RESTORE, LOCAL_HISTORY_MENU_CONTEXT_KEY } from './localHistory.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
const LOCAL_HISTORY_CATEGORY = localize2('localHistory.category', 'Local History');
const CTX_LOCAL_HISTORY_ENABLED = ContextKeyExpr.has('config.workbench.localHistory.enabled');
//#region Compare with File
export const COMPARE_WITH_FILE_LABEL = localize2('localHistory.compareWithFile', 'Compare with File');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithFile',
            title: COMPARE_WITH_FILE_LABEL,
            menu: {
                id: MenuId.TimelineItemContext,
                group: '1_compare',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const commandService = accessor.get(ICommandService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(entry, entry.workingCopy.resource));
        }
    }
});
//#endregion
//#region Compare with Previous
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithPrevious',
            title: localize2('localHistory.compareWithPrevious', 'Compare with Previous'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '1_compare',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const commandService = accessor.get(ICommandService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const { entry, previous } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            // Without a previous entry, just show the entry directly
            if (!previous) {
                return openEntry(entry, editorService);
            }
            // Open real diff editor
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(previous, entry));
        }
    }
});
//#endregion
//#region Select for Compare / Compare with Selected
let itemSelectedForCompare = undefined;
const LocalHistoryItemSelectedForCompare = new RawContextKey('localHistoryItemSelectedForCompare', false, true);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.selectForCompare',
            title: localize2('localHistory.selectForCompare', 'Select for Compare'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '2_compare_with',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const contextKeyService = accessor.get(IContextKeyService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            itemSelectedForCompare = item;
            LocalHistoryItemSelectedForCompare.bindTo(contextKeyService).set(true);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.compareWithSelected',
            title: localize2('localHistory.compareWithSelected', 'Compare with Selected'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '2_compare_with',
                order: 1,
                when: ContextKeyExpr.and(LOCAL_HISTORY_MENU_CONTEXT_KEY, LocalHistoryItemSelectedForCompare)
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const commandService = accessor.get(ICommandService);
        if (!itemSelectedForCompare) {
            return;
        }
        const selectedEntry = (await findLocalHistoryEntry(workingCopyHistoryService, itemSelectedForCompare)).entry;
        if (!selectedEntry) {
            return;
        }
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(selectedEntry, entry));
        }
    }
});
//#endregion
//#region Show Contents
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.open',
            title: localize2('localHistory.open', 'Show Contents'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '3_contents',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            return openEntry(entry, editorService);
        }
    }
});
//#region Restore Contents
const RESTORE_CONTENTS_LABEL = localize2('localHistory.restore', 'Restore Contents');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restoreViaEditor',
            title: RESTORE_CONTENTS_LABEL,
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                order: -10,
                when: ResourceContextKey.Scheme.isEqualTo(LocalHistoryFileSystemProvider.SCHEMA)
            },
            icon: LOCAL_HISTORY_ICON_RESTORE
        });
    }
    async run(accessor, uri) {
        const { associatedResource, location } = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(uri);
        return restore(accessor, { uri: associatedResource, handle: basenameOrAuthority(location) });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restore',
            title: RESTORE_CONTENTS_LABEL,
            menu: {
                id: MenuId.TimelineItemContext,
                group: '3_contents',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        return restore(accessor, item);
    }
});
const restoreSaveSource = SaveSourceRegistry.registerSource('localHistoryRestore.source', localize('localHistoryRestore.source', "File Restored"));
async function restore(accessor, item) {
    const fileService = accessor.get(IFileService);
    const dialogService = accessor.get(IDialogService);
    const workingCopyService = accessor.get(IWorkingCopyService);
    const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
    const editorService = accessor.get(IEditorService);
    const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
    if (entry) {
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmRestoreMessage', "Do you want to restore the contents of '{0}'?", basename(entry.workingCopy.resource)),
            detail: localize('confirmRestoreDetail', "Restoring will discard any unsaved changes."),
            primaryButton: localize({ key: 'restoreButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Restore")
        });
        if (!confirmed) {
            return;
        }
        // Revert all dirty working copies for target
        const workingCopies = workingCopyService.getAll(entry.workingCopy.resource);
        if (workingCopies) {
            for (const workingCopy of workingCopies) {
                if (workingCopy.isDirty()) {
                    await workingCopy.revert({ soft: true });
                }
            }
        }
        // Replace target with contents of history entry
        try {
            await fileService.cloneFile(entry.location, entry.workingCopy.resource);
        }
        catch (error) {
            // It is possible that we fail to copy the history entry to the
            // destination, for example when the destination is write protected.
            // In that case tell the user and return, it is still possible for
            // the user to manually copy the changes over from the diff editor.
            await dialogService.error(localize('unableToRestore', "Unable to restore '{0}'.", basename(entry.workingCopy.resource)), toErrorMessage(error));
            return;
        }
        // Restore all working copies for target
        if (workingCopies) {
            for (const workingCopy of workingCopies) {
                await workingCopy.revert({ force: true });
            }
        }
        // Open target
        await editorService.openEditor({ resource: entry.workingCopy.resource });
        // Add new entry
        await workingCopyHistoryService.addEntry({
            resource: entry.workingCopy.resource,
            source: restoreSaveSource
        }, CancellationToken.None);
        // Close source
        await closeEntry(entry, editorService);
    }
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.restoreViaPicker',
            title: localize2('localHistory.restoreViaPicker', 'Find Entry to Restore'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: CTX_LOCAL_HISTORY_ENABLED
        });
    }
    async run(accessor) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const labelService = accessor.get(ILabelService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const commandService = accessor.get(ICommandService);
        const historyService = accessor.get(IHistoryService);
        // Show all resources with associated history entries in picker
        // with progress because this operation will take longer the more
        // files have been saved overall.
        //
        // Sort the resources by history to put more relevant entries
        // to the top.
        const resourcePickerDisposables = new DisposableStore();
        const resourcePicker = resourcePickerDisposables.add(quickInputService.createQuickPick());
        let cts = new CancellationTokenSource();
        resourcePickerDisposables.add(resourcePicker.onDidHide(() => cts.dispose(true)));
        resourcePicker.busy = true;
        resourcePicker.show();
        const resources = new ResourceSet(await workingCopyHistoryService.getAll(cts.token));
        const recentEditorResources = new ResourceSet(coalesce(historyService.getHistory().map(({ resource }) => resource)));
        const resourcesSortedByRecency = [];
        for (const resource of recentEditorResources) {
            if (resources.has(resource)) {
                resourcesSortedByRecency.push(resource);
                resources.delete(resource);
            }
        }
        resourcesSortedByRecency.push(...[...resources].sort((r1, r2) => r1.fsPath < r2.fsPath ? -1 : 1));
        resourcePicker.busy = false;
        resourcePicker.placeholder = localize('restoreViaPicker.filePlaceholder', "Select the file to show local history for");
        resourcePicker.matchOnLabel = true;
        resourcePicker.matchOnDescription = true;
        resourcePicker.items = [...resourcesSortedByRecency].map(resource => ({
            resource,
            label: basenameOrAuthority(resource),
            description: labelService.getUriLabel(dirname(resource), { relative: true }),
            iconClasses: getIconClasses(modelService, languageService, resource)
        }));
        await Event.toPromise(resourcePicker.onDidAccept);
        resourcePickerDisposables.dispose();
        const resource = resourcePicker.selectedItems.at(0)?.resource;
        if (!resource) {
            return;
        }
        // Show all entries for the picked resource in another picker
        // and open the entry in the end that was selected by the user
        const entryPickerDisposables = new DisposableStore();
        const entryPicker = entryPickerDisposables.add(quickInputService.createQuickPick());
        cts = new CancellationTokenSource();
        entryPickerDisposables.add(entryPicker.onDidHide(() => cts.dispose(true)));
        entryPicker.busy = true;
        entryPicker.show();
        const entries = await workingCopyHistoryService.getEntries(resource, cts.token);
        entryPicker.busy = false;
        entryPicker.canAcceptInBackground = true;
        entryPicker.placeholder = localize('restoreViaPicker.entryPlaceholder', "Select the local history entry to open");
        entryPicker.matchOnLabel = true;
        entryPicker.matchOnDescription = true;
        entryPicker.items = Array.from(entries).reverse().map(entry => ({
            entry,
            label: `$(circle-outline) ${SaveSourceRegistry.getSourceLabel(entry.source)}`,
            description: toLocalHistoryEntryDateLabel(entry.timestamp)
        }));
        entryPickerDisposables.add(entryPicker.onDidAccept(async (e) => {
            if (!e.inBackground) {
                entryPickerDisposables.dispose();
            }
            const selectedItem = entryPicker.selectedItems.at(0);
            if (!selectedItem) {
                return;
            }
            const resourceExists = await fileService.exists(selectedItem.entry.workingCopy.resource);
            if (resourceExists) {
                return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, ...toDiffEditorArguments(selectedItem.entry, selectedItem.entry.workingCopy.resource, { preserveFocus: e.inBackground }));
            }
            return openEntry(selectedItem.entry, editorService, { preserveFocus: e.inBackground });
        }));
    }
});
MenuRegistry.appendMenuItem(MenuId.TimelineTitle, { command: { id: 'workbench.action.localHistory.restoreViaPicker', title: localize2('localHistory.restoreViaPickerMenu', 'Local History: Find Entry to Restore...') }, group: 'submenu', order: 1, when: CTX_LOCAL_HISTORY_ENABLED });
//#endregion
//#region Rename
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.rename',
            title: localize2('localHistory.rename', 'Rename'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '5_edit',
                order: 1,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            const disposables = new DisposableStore();
            const inputBox = disposables.add(quickInputService.createInputBox());
            inputBox.title = localize('renameLocalHistoryEntryTitle', "Rename Local History Entry");
            inputBox.ignoreFocusOut = true;
            inputBox.placeholder = localize('renameLocalHistoryPlaceholder', "Enter the new name of the local history entry");
            inputBox.value = SaveSourceRegistry.getSourceLabel(entry.source);
            inputBox.show();
            disposables.add(inputBox.onDidAccept(() => {
                if (inputBox.value) {
                    workingCopyHistoryService.updateEntry(entry, { source: inputBox.value }, CancellationToken.None);
                }
                disposables.dispose();
            }));
        }
    }
});
//#endregion
//#region Delete
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.delete',
            title: localize2('localHistory.delete', 'Delete'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '5_edit',
                order: 2,
                when: LOCAL_HISTORY_MENU_CONTEXT_KEY
            }
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const editorService = accessor.get(IEditorService);
        const dialogService = accessor.get(IDialogService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            // Ask for confirmation
            const { confirmed } = await dialogService.confirm({
                type: 'warning',
                message: localize('confirmDeleteMessage', "Do you want to delete the local history entry of '{0}' from {1}?", entry.workingCopy.name, toLocalHistoryEntryDateLabel(entry.timestamp)),
                detail: localize('confirmDeleteDetail', "This action is irreversible!"),
                primaryButton: localize({ key: 'deleteButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Delete"),
            });
            if (!confirmed) {
                return;
            }
            // Remove via service
            await workingCopyHistoryService.removeEntry(entry, CancellationToken.None);
            // Close any opened editors
            await closeEntry(entry, editorService);
        }
    }
});
//#endregion
//#region Delete All
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.deleteAll',
            title: localize2('localHistory.deleteAll', 'Delete All'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: CTX_LOCAL_HISTORY_ENABLED
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmDeleteAllMessage', "Do you want to delete all entries of all files in local history?"),
            detail: localize('confirmDeleteAllDetail', "This action is irreversible!"),
            primaryButton: localize({ key: 'deleteAllButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Delete All"),
        });
        if (!confirmed) {
            return;
        }
        // Remove via service
        await workingCopyHistoryService.removeAll(CancellationToken.None);
    }
});
//#endregion
//#region Create
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.create',
            title: localize2('localHistory.create', 'Create Entry'),
            f1: true,
            category: LOCAL_HISTORY_CATEGORY,
            precondition: ContextKeyExpr.and(CTX_LOCAL_HISTORY_ENABLED, ActiveEditorContext)
        });
    }
    async run(accessor) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const labelService = accessor.get(ILabelService);
        const pathService = accessor.get(IPathService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (resource?.scheme !== pathService.defaultUriScheme && resource?.scheme !== Schemas.vscodeUserData) {
            return; // only enable for selected schemes
        }
        const disposables = new DisposableStore();
        const inputBox = disposables.add(quickInputService.createInputBox());
        inputBox.title = localize('createLocalHistoryEntryTitle', "Create Local History Entry");
        inputBox.ignoreFocusOut = true;
        inputBox.placeholder = localize('createLocalHistoryPlaceholder', "Enter the new name of the local history entry for '{0}'", labelService.getUriBasenameLabel(resource));
        inputBox.show();
        disposables.add(inputBox.onDidAccept(async () => {
            const entrySource = inputBox.value;
            disposables.dispose();
            if (entrySource) {
                await workingCopyHistoryService.addEntry({ resource, source: inputBox.value }, CancellationToken.None);
            }
        }));
    }
});
//#endregion
//#region Helpers
async function openEntry(entry, editorService, options) {
    const resource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({ location: entry.location, associatedResource: entry.workingCopy.resource });
    await editorService.openEditor({
        resource,
        label: localize('localHistoryEditorLabel', "{0} ({1} • {2})", entry.workingCopy.name, SaveSourceRegistry.getSourceLabel(entry.source), toLocalHistoryEntryDateLabel(entry.timestamp)),
        options
    });
}
async function closeEntry(entry, editorService) {
    const resource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({ location: entry.location, associatedResource: entry.workingCopy.resource });
    const editors = editorService.findEditors(resource, { supportSideBySide: SideBySideEditor.ANY });
    await editorService.closeEditors(editors, { preserveFocus: true });
}
export function toDiffEditorArguments(arg1, arg2, options) {
    // Left hand side is always a working copy history entry
    const originalResource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({ location: arg1.location, associatedResource: arg1.workingCopy.resource });
    let label;
    // Right hand side depends on how the method was called
    // and is either another working copy history entry
    // or the file on disk.
    let modifiedResource;
    // Compare with file on disk
    if (URI.isUri(arg2)) {
        const resource = arg2;
        modifiedResource = resource;
        label = localize('localHistoryCompareToFileEditorLabel', "{0} ({1} • {2}) ↔ {3}", arg1.workingCopy.name, SaveSourceRegistry.getSourceLabel(arg1.source), toLocalHistoryEntryDateLabel(arg1.timestamp), arg1.workingCopy.name);
    }
    // Compare with another entry
    else {
        const modified = arg2;
        modifiedResource = LocalHistoryFileSystemProvider.toLocalHistoryFileSystem({ location: modified.location, associatedResource: modified.workingCopy.resource });
        label = localize('localHistoryCompareToPreviousEditorLabel', "{0} ({1} • {2}) ↔ {3} ({4} • {5})", arg1.workingCopy.name, SaveSourceRegistry.getSourceLabel(arg1.source), toLocalHistoryEntryDateLabel(arg1.timestamp), modified.workingCopy.name, SaveSourceRegistry.getSourceLabel(modified.source), toLocalHistoryEntryDateLabel(modified.timestamp));
    }
    return [
        originalResource,
        modifiedResource,
        label,
        options ? [undefined, options] : undefined
    ];
}
export async function findLocalHistoryEntry(workingCopyHistoryService, descriptor) {
    const entries = await workingCopyHistoryService.getEntries(descriptor.uri, CancellationToken.None);
    let currentEntry = undefined;
    let previousEntry = undefined;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.id === descriptor.handle) {
            currentEntry = entry;
            previousEntry = entries[i - 1];
            break;
        }
    }
    return {
        entry: currentEntry,
        previous: previousEntry
    };
}
const SEP = /\//g;
function toLocalHistoryEntryDateLabel(timestamp) {
    return `${getLocalHistoryDateFormatter().format(timestamp).replace(SEP, '-')}`; // preserving `/` will break editor labels, so replace it with a non-path symbol
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxIaXN0b3J5L2Jyb3dzZXIvbG9jYWxIaXN0b3J5Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUE0QiwwQkFBMEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFekgsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0gsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3ZFLE1BQU0sc0JBQXNCLEdBQUcsU0FBUyxDQUFDLHVCQUF1QixFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBQ25GLE1BQU0seUJBQXlCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBTzlGLDJCQUEyQjtBQUUzQixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsOEJBQThCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUV0RyxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSx1QkFBdUI7WUFDOUIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO2dCQUM5QixLQUFLLEVBQUUsV0FBVztnQkFDbEIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLDhCQUE4QjthQUNwQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBOEI7UUFDbkUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNyRCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUUzRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLCtCQUErQixFQUFFLEdBQUcscUJBQXFCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNwSSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVk7QUFFWiwrQkFBK0I7QUFFL0IsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1EQUFtRDtZQUN2RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGtDQUFrQyxFQUFFLHVCQUF1QixDQUFDO1lBQzdFLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDOUIsS0FBSyxFQUFFLFdBQVc7Z0JBQ2xCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSw4QkFBOEI7YUFDcEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQThCO1FBQ25FLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDckQsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDM0UsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0scUJBQXFCLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekYsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUVYLHlEQUF5RDtZQUN6RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxTQUFTLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7WUFFRCx3QkFBd0I7WUFDeEIsT0FBTyxjQUFjLENBQUMsY0FBYyxDQUFDLCtCQUErQixFQUFFLEdBQUcscUJBQXFCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbEgsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxZQUFZO0FBRVosb0RBQW9EO0FBRXBELElBQUksc0JBQXNCLEdBQXlDLFNBQVMsQ0FBQztBQUU3RSxNQUFNLGtDQUFrQyxHQUFHLElBQUksYUFBYSxDQUFVLG9DQUFvQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUV6SCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0RBQWdEO1lBQ3BELEtBQUssRUFBRSxTQUFTLENBQUMsK0JBQStCLEVBQUUsb0JBQW9CLENBQUM7WUFDdkUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO2dCQUM5QixLQUFLLEVBQUUsZ0JBQWdCO2dCQUN2QixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsOEJBQThCO2FBQ3BDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUE4QjtRQUNuRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUUzRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsc0JBQXNCLEdBQUcsSUFBSSxDQUFDO1lBQzlCLGtDQUFrQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSx1QkFBdUIsQ0FBQztZQUM3RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzlCLEtBQUssRUFBRSxnQkFBZ0I7Z0JBQ3ZCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLGtDQUFrQyxDQUFDO2FBQzVGO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUE4QjtRQUNuRSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMzRSxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQzdCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxNQUFNLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDN0csSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0scUJBQXFCLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0UsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3ZILENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWTtBQUVaLHVCQUF1QjtBQUV2QixlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsZUFBZSxDQUFDO1lBQ3RELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtnQkFDOUIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSw4QkFBOEI7YUFDcEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQThCO1FBQ25FLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbkQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0scUJBQXFCLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0UsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sU0FBUyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILDBCQUEwQjtBQUUxQixNQUFNLHNCQUFzQixHQUFHLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0FBRXJGLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxXQUFXO2dCQUN0QixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUMsRUFBRTtnQkFDVixJQUFJLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7YUFDaEY7WUFDRCxJQUFJLEVBQUUsMEJBQTBCO1NBQ2hDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBUTtRQUM3QyxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEdBQUcsOEJBQThCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEcsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUYsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1Q0FBdUM7WUFDM0MsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzlCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLEVBQUUsOEJBQThCO2FBQ3BDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUE4QjtRQUNuRSxPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLDRCQUE0QixFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBRW5KLEtBQUssVUFBVSxPQUFPLENBQUMsUUFBMEIsRUFBRSxJQUE4QjtJQUNoRixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQy9DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDN0QsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDM0UsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvRSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBRVgsdUJBQXVCO1FBQ3ZCLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFDakQsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLCtDQUErQyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pJLE1BQU0sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsNkNBQTZDLENBQUM7WUFDdkYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDO1NBQ3ZHLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxNQUFNLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1RSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLEtBQUssTUFBTSxXQUFXLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ3pDLElBQUksV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQzNCLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUVoQiwrREFBK0Q7WUFDL0Qsb0VBQW9FO1lBQ3BFLGtFQUFrRTtZQUNsRSxtRUFBbUU7WUFFbkUsTUFBTSxhQUFhLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSwwQkFBMEIsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRWhKLE9BQU87UUFDUixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsS0FBSyxNQUFNLFdBQVcsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFFRCxjQUFjO1FBQ2QsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUV6RSxnQkFBZ0I7UUFDaEIsTUFBTSx5QkFBeUIsQ0FBQyxRQUFRLENBQUM7WUFDeEMsUUFBUSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUTtZQUNwQyxNQUFNLEVBQUUsaUJBQWlCO1NBQ3pCLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0IsZUFBZTtRQUNmLE1BQU0sVUFBVSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN4QyxDQUFDO0FBQ0YsQ0FBQztBQUVELGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQywrQkFBK0IsRUFBRSx1QkFBdUIsQ0FBQztZQUMxRSxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxzQkFBc0I7WUFDaEMsWUFBWSxFQUFFLHlCQUF5QjtTQUN2QyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFckQsK0RBQStEO1FBQy9ELGlFQUFpRTtRQUNqRSxpQ0FBaUM7UUFDakMsRUFBRTtRQUNGLDZEQUE2RDtRQUM3RCxjQUFjO1FBRWQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3hELE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQXNDLENBQUMsQ0FBQztRQUU5SCxJQUFJLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDeEMseUJBQXlCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakYsY0FBYyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDM0IsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXRCLE1BQU0sU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0seUJBQXlCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckgsTUFBTSx3QkFBd0IsR0FBVSxFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLFFBQVEsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzlDLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM3Qix3QkFBd0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3hDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFDRCx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsRyxjQUFjLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUM1QixjQUFjLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1FBQ3ZILGNBQWMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ25DLGNBQWMsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDekMsY0FBYyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsd0JBQXdCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLFFBQVE7WUFDUixLQUFLLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUM1RSxXQUFXLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDO1NBQ3BFLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRCx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVwQyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7UUFDOUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFFRCw2REFBNkQ7UUFDN0QsOERBQThEO1FBRTlELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyRCxNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUF3RCxDQUFDLENBQUM7UUFFMUksR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUNwQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzRSxXQUFXLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFbkIsTUFBTSxPQUFPLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVoRixXQUFXLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUN6QixXQUFXLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3pDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7UUFDbEgsV0FBVyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDaEMsV0FBVyxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztRQUN0QyxXQUFXLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMvRCxLQUFLO1lBQ0wsS0FBSyxFQUFFLHFCQUFxQixrQkFBa0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdFLFdBQVcsRUFBRSw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1NBQzFELENBQUMsQ0FBQyxDQUFDO1FBRUosc0JBQXNCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQzVELElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3JCLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pGLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDak0sQ0FBQztZQUVELE9BQU8sU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3hGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLGdEQUFnRCxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsbUNBQW1DLEVBQUUseUNBQXlDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO0FBRXhSLFlBQVk7QUFFWixnQkFBZ0I7QUFFaEIsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQztZQUNqRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzlCLEtBQUssRUFBRSxRQUFRO2dCQUNmLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSw4QkFBOEI7YUFDcEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQThCO1FBQ25FLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzNFLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRTNELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9FLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNyRSxRQUFRLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1lBQ3hGLFFBQVEsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQy9CLFFBQVEsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLCtCQUErQixFQUFFLCtDQUErQyxDQUFDLENBQUM7WUFDbEgsUUFBUSxDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUN6QyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDcEIseUJBQXlCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xHLENBQUM7Z0JBQ0QsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVk7QUFFWixnQkFBZ0I7QUFFaEIsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQztZQUNqRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUI7Z0JBQzlCLEtBQUssRUFBRSxRQUFRO2dCQUNmLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSw4QkFBOEI7YUFDcEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQThCO1FBQ25FLE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBRVgsdUJBQXVCO1lBQ3ZCLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7Z0JBQ2pELElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsa0VBQWtFLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNwTCxNQUFNLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDhCQUE4QixDQUFDO2dCQUN2RSxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUM7YUFDckcsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixPQUFPO1lBQ1IsQ0FBQztZQUVELHFCQUFxQjtZQUNyQixNQUFNLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFM0UsMkJBQTJCO1lBQzNCLE1BQU0sVUFBVSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVk7QUFFWixvQkFBb0I7QUFFcEIsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlDQUF5QztZQUM3QyxLQUFLLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixFQUFFLFlBQVksQ0FBQztZQUN4RCxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxzQkFBc0I7WUFDaEMsWUFBWSxFQUFFLHlCQUF5QjtTQUN2QyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTNFLHVCQUF1QjtRQUN2QixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQ2pELElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxrRUFBa0UsQ0FBQztZQUNoSCxNQUFNLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDhCQUE4QixDQUFDO1lBQzFFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQztTQUM1RyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTztRQUNSLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVk7QUFFWixnQkFBZ0I7QUFFaEIsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHNDQUFzQztZQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQztZQUN2RCxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxzQkFBc0I7WUFDaEMsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsbUJBQW1CLENBQUM7U0FDaEYsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFL0MsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3BJLElBQUksUUFBUSxFQUFFLE1BQU0sS0FBSyxXQUFXLENBQUMsZ0JBQWdCLElBQUksUUFBUSxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEcsT0FBTyxDQUFDLG1DQUFtQztRQUM1QyxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDckUsUUFBUSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsOEJBQThCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUN4RixRQUFRLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUMvQixRQUFRLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSx5REFBeUQsRUFBRSxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN4SyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQy9DLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDbkMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXRCLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0seUJBQXlCLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEcsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWTtBQUVaLGlCQUFpQjtBQUVqQixLQUFLLFVBQVUsU0FBUyxDQUFDLEtBQStCLEVBQUUsYUFBNkIsRUFBRSxPQUF3QjtJQUNoSCxNQUFNLFFBQVEsR0FBRyw4QkFBOEIsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUV2SixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7UUFDOUIsUUFBUTtRQUNSLEtBQUssRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckwsT0FBTztLQUNQLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLEtBQStCLEVBQUUsYUFBNkI7SUFDdkYsTUFBTSxRQUFRLEdBQUcsOEJBQThCLENBQUMsd0JBQXdCLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFFdkosTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ2pHLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBSUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLElBQThCLEVBQUUsSUFBb0MsRUFBRSxPQUF3QjtJQUVuSSx3REFBd0Q7SUFDeEQsTUFBTSxnQkFBZ0IsR0FBRyw4QkFBOEIsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUU3SixJQUFJLEtBQWEsQ0FBQztJQUVsQix1REFBdUQ7SUFDdkQsbURBQW1EO0lBQ25ELHVCQUF1QjtJQUV2QixJQUFJLGdCQUFxQixDQUFDO0lBRTFCLDRCQUE0QjtJQUM1QixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNyQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFdEIsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDO1FBQzVCLEtBQUssR0FBRyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvTixDQUFDO0lBRUQsNkJBQTZCO1NBQ3hCLENBQUM7UUFDTCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFdEIsZ0JBQWdCLEdBQUcsOEJBQThCLENBQUMsd0JBQXdCLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0osS0FBSyxHQUFHLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxtQ0FBbUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLDRCQUE0QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3pWLENBQUM7SUFFRCxPQUFPO1FBQ04sZ0JBQWdCO1FBQ2hCLGdCQUFnQjtRQUNoQixLQUFLO1FBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztLQUMxQyxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUscUJBQXFCLENBQUMseUJBQXFELEVBQUUsVUFBb0M7SUFDdEksTUFBTSxPQUFPLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuRyxJQUFJLFlBQVksR0FBeUMsU0FBUyxDQUFDO0lBQ25FLElBQUksYUFBYSxHQUF5QyxTQUFTLENBQUM7SUFDcEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekIsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixLQUFLLEVBQUUsWUFBWTtRQUNuQixRQUFRLEVBQUUsYUFBYTtLQUN2QixDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQztBQUNsQixTQUFTLDRCQUE0QixDQUFDLFNBQWlCO0lBQ3RELE9BQU8sR0FBRyw0QkFBNEIsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxnRkFBZ0Y7QUFDakssQ0FBQztBQUVELFlBQVkifQ==