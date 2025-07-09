/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { isWorkspaceToOpen } from '../../../../platform/window/common/window.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService, UNTITLED_WORKSPACE_NAME } from '../../../../platform/workspace/common/workspace.js';
import { ExplorerFocusCondition, TextFileContentProvider, VIEWLET_ID, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLastFocusContext, FilesExplorerFocusCondition, ExplorerFolderContext, VIEW_ID } from '../common/files.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { getResourceForCommand, getMultiSelectedResources, getOpenEditorsViewMultiSelection, IExplorerService } from './files.js';
import { IWorkspaceEditingService } from '../../../services/workspaces/common/workspaceEditing.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { Schemas } from '../../../../base/common/network.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { basename, joinPath, isEqual } from '../../../../base/common/resources.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toAction } from '../../../../base/common/actions.js';
import { EditorOpenSource, EditorResolution } from '../../../../platform/editor/common/editor.js';
import { hash } from '../../../../base/common/hash.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { OPEN_TO_SIDE_COMMAND_ID, COMPARE_WITH_SAVED_COMMAND_ID, SELECT_FOR_COMPARE_COMMAND_ID, ResourceSelectedForCompareContext, COMPARE_SELECTED_COMMAND_ID, COMPARE_RESOURCE_COMMAND_ID, COPY_PATH_COMMAND_ID, COPY_RELATIVE_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID, OPEN_WITH_EXPLORER_COMMAND_ID, SAVE_FILE_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID, SAVE_FILE_AS_COMMAND_ID, SAVE_ALL_COMMAND_ID, SAVE_ALL_IN_GROUP_COMMAND_ID, SAVE_FILES_COMMAND_ID, REVERT_FILE_COMMAND_ID, REMOVE_ROOT_FOLDER_COMMAND_ID, PREVIOUS_COMPRESSED_FOLDER, NEXT_COMPRESSED_FOLDER, FIRST_COMPRESSED_FOLDER, LAST_COMPRESSED_FOLDER, NEW_UNTITLED_FILE_COMMAND_ID, NEW_UNTITLED_FILE_LABEL, NEW_FILE_COMMAND_ID } from './fileConstants.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { RemoveRootFolderAction } from '../../../browser/actions/workspaceActions.js';
import { OpenEditorsView } from './views/openEditorsView.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
export const openWindowCommand = (accessor, toOpen, options) => {
    if (Array.isArray(toOpen)) {
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(IEnvironmentService);
        // rewrite untitled: workspace URIs to the absolute path on disk
        toOpen = toOpen.map(openable => {
            if (isWorkspaceToOpen(openable) && openable.workspaceUri.scheme === Schemas.untitled) {
                return {
                    workspaceUri: joinPath(environmentService.untitledWorkspacesHome, openable.workspaceUri.path, UNTITLED_WORKSPACE_NAME)
                };
            }
            return openable;
        });
        hostService.openWindow(toOpen, options);
    }
};
export const newWindowCommand = (accessor, options) => {
    const hostService = accessor.get(IHostService);
    hostService.openWindow(options);
};
// Command registration
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ExplorerFocusCondition,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
    },
    id: OPEN_TO_SIDE_COMMAND_ID, handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const explorerService = accessor.get(IExplorerService);
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IEditorGroupsService), explorerService);
        // Set side input
        if (resources.length) {
            const untitledResources = resources.filter(resource => resource.scheme === Schemas.untitled);
            const fileResources = resources.filter(resource => resource.scheme !== Schemas.untitled);
            const items = await Promise.all(fileResources.map(async (resource) => {
                const item = explorerService.findClosest(resource);
                if (item) {
                    // Explorer already resolved the item, no need to go to the file service #109780
                    return item;
                }
                return await fileService.stat(resource);
            }));
            const files = items.filter(i => !i.isDirectory);
            const editors = files.map(f => ({
                resource: f.resource,
                options: { pinned: true }
            })).concat(...untitledResources.map(untitledResource => ({ resource: untitledResource, options: { pinned: true } })));
            await editorService.openEditors(editors, SIDE_GROUP);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext.toNegated()),
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
    },
    id: 'explorer.openAndPassFocus', handler: async (accessor, _resource) => {
        const editorService = accessor.get(IEditorService);
        const explorerService = accessor.get(IExplorerService);
        const resources = explorerService.getContext(true);
        if (resources.length) {
            await editorService.openEditors(resources.map(r => ({ resource: r.resource, options: { preserveFocus: false, pinned: true } })));
        }
    }
});
const COMPARE_WITH_SAVED_SCHEMA = 'showModifications';
let providerDisposables = [];
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COMPARE_WITH_SAVED_COMMAND_ID,
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 34 /* KeyCode.KeyD */),
    handler: async (accessor, resource) => {
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const listService = accessor.get(IListService);
        // Register provider at first as needed
        let registerEditorListener = false;
        if (providerDisposables.length === 0) {
            registerEditorListener = true;
            const provider = instantiationService.createInstance(TextFileContentProvider);
            providerDisposables.push(provider);
            providerDisposables.push(textModelService.registerTextModelContentProvider(COMPARE_WITH_SAVED_SCHEMA, provider));
        }
        // Open editor (only resources that can be handled by file service are supported)
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri && fileService.hasProvider(uri)) {
            const name = basename(uri);
            const editorLabel = nls.localize('modifiedLabel', "{0} (in file) ↔ {1}", name, name);
            try {
                await TextFileContentProvider.open(uri, COMPARE_WITH_SAVED_SCHEMA, editorLabel, editorService, { pinned: true });
                // Dispose once no more diff editor is opened with the scheme
                if (registerEditorListener) {
                    providerDisposables.push(editorService.onDidVisibleEditorsChange(() => {
                        if (!editorService.editors.some(editor => !!EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY, filterByScheme: COMPARE_WITH_SAVED_SCHEMA }))) {
                            providerDisposables = dispose(providerDisposables);
                        }
                    }));
                }
            }
            catch {
                providerDisposables = dispose(providerDisposables);
            }
        }
    }
});
let globalResourceToCompare;
let resourceSelectedForCompareContext;
CommandsRegistry.registerCommand({
    id: SELECT_FOR_COMPARE_COMMAND_ID,
    handler: (accessor, resource) => {
        globalResourceToCompare = getResourceForCommand(resource, accessor.get(IEditorService), accessor.get(IListService));
        if (!resourceSelectedForCompareContext) {
            resourceSelectedForCompareContext = ResourceSelectedForCompareContext.bindTo(accessor.get(IContextKeyService));
        }
        resourceSelectedForCompareContext.set(true);
    }
});
CommandsRegistry.registerCommand({
    id: COMPARE_SELECTED_COMMAND_ID,
    handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
        if (resources.length === 2) {
            return editorService.openEditor({
                original: { resource: resources[0] },
                modified: { resource: resources[1] },
                options: { pinned: true }
            });
        }
        return true;
    }
});
CommandsRegistry.registerCommand({
    id: COMPARE_RESOURCE_COMMAND_ID,
    handler: (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const rightResource = getResourceForCommand(resource, editorService, accessor.get(IListService));
        if (globalResourceToCompare && rightResource) {
            editorService.openEditor({
                original: { resource: globalResourceToCompare },
                modified: { resource: rightResource },
                options: { pinned: true }
            });
        }
    }
});
async function resourcesToClipboard(resources, relative, clipboardService, labelService, configurationService) {
    if (resources.length) {
        const lineDelimiter = isWindows ? '\r\n' : '\n';
        let separator = undefined;
        const copyRelativeOrFullPathSeparatorSection = relative ? 'explorer.copyRelativePathSeparator' : 'explorer.copyPathSeparator';
        const copyRelativeOrFullPathSeparator = configurationService.getValue(copyRelativeOrFullPathSeparatorSection);
        if (copyRelativeOrFullPathSeparator === '/' || copyRelativeOrFullPathSeparator === '\\') {
            separator = copyRelativeOrFullPathSeparator;
        }
        const text = resources.map(resource => labelService.getUriLabel(resource, { relative, noPrefix: true, separator })).join(lineDelimiter);
        await clipboardService.writeText(text);
    }
}
const copyPathCommandHandler = async (accessor, resource) => {
    const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    await resourcesToClipboard(resources, false, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */
    },
    id: COPY_PATH_COMMAND_ID,
    handler: copyPathCommandHandler
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */
    },
    id: COPY_PATH_COMMAND_ID,
    handler: copyPathCommandHandler
});
const copyRelativePathCommandHandler = async (accessor, resource) => {
    const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    await resourcesToClipboard(resources, true, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    win: {
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */)
    },
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    handler: copyRelativePathCommandHandler
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
    win: {
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */)
    },
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    handler: copyRelativePathCommandHandler
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 46 /* KeyCode.KeyP */),
    id: 'workbench.action.files.copyPathOfActiveFile',
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeInput = editorService.activeEditor;
        const resource = EditorResourceAccessor.getOriginalUri(activeInput, { supportSideBySide: SideBySideEditor.PRIMARY });
        const resources = resource ? [resource] : [];
        await resourcesToClipboard(resources, false, accessor.get(IClipboardService), accessor.get(ILabelService), accessor.get(IConfigurationService));
    }
});
CommandsRegistry.registerCommand({
    id: REVEAL_IN_EXPLORER_COMMAND_ID,
    handler: async (accessor, resource) => {
        const viewService = accessor.get(IViewsService);
        const contextService = accessor.get(IWorkspaceContextService);
        const explorerService = accessor.get(IExplorerService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri && contextService.isInsideWorkspace(uri)) {
            const explorerView = await viewService.openView(VIEW_ID, false);
            if (explorerView) {
                const oldAutoReveal = explorerView.autoReveal;
                // Disable autoreveal before revealing the explorer to prevent a race betwene auto reveal + selection
                // Fixes #197268
                explorerView.autoReveal = false;
                explorerView.setExpanded(true);
                await explorerService.select(uri, 'force');
                explorerView.focus();
                explorerView.autoReveal = oldAutoReveal;
            }
        }
        else {
            // Do not reveal the open editors view if it's hidden explicitly
            // See https://github.com/microsoft/vscode/issues/227378
            const openEditorsView = viewService.getViewWithId(OpenEditorsView.ID);
            if (openEditorsView) {
                openEditorsView.setExpanded(true);
                openEditorsView.focus();
            }
        }
    }
});
CommandsRegistry.registerCommand({
    id: OPEN_WITH_EXPLORER_COMMAND_ID,
    handler: async (accessor, resource) => {
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const uri = getResourceForCommand(resource, editorService, listService);
        if (uri) {
            return editorService.openEditor({ resource: uri, options: { override: EditorResolution.PICK, source: EditorOpenSource.USER } });
        }
        return undefined;
    }
});
// Save / Save As / Save All / Revert
async function saveSelectedEditors(accessor, options) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const codeEditorService = accessor.get(ICodeEditorService);
    const textFileService = accessor.get(ITextFileService);
    // Retrieve selected or active editor
    let editors = getOpenEditorsViewMultiSelection(accessor);
    if (!editors) {
        const activeGroup = editorGroupService.activeGroup;
        if (activeGroup.activeEditor) {
            editors = [];
            // Special treatment for side by side editors: if the active editor
            // has 2 sides, we consider both, to support saving both sides.
            // We only allow this when saving, not for "Save As" and not if any
            // editor is untitled which would bring up a "Save As" dialog too.
            // In addition, we require the secondary side to be modified to not
            // trigger a touch operation unexpectedly.
            //
            // See also https://github.com/microsoft/vscode/issues/4180
            // See also https://github.com/microsoft/vscode/issues/106330
            // See also https://github.com/microsoft/vscode/issues/190210
            if (activeGroup.activeEditor instanceof SideBySideEditorInput &&
                !options?.saveAs && !(activeGroup.activeEditor.primary.hasCapability(4 /* EditorInputCapabilities.Untitled */) || activeGroup.activeEditor.secondary.hasCapability(4 /* EditorInputCapabilities.Untitled */)) &&
                activeGroup.activeEditor.secondary.isModified()) {
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor.primary });
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor.secondary });
            }
            else {
                editors.push({ groupId: activeGroup.id, editor: activeGroup.activeEditor });
            }
        }
    }
    if (!editors || editors.length === 0) {
        return; // nothing to save
    }
    // Save editors
    await doSaveEditors(accessor, editors, options);
    // Special treatment for embedded editors: if we detect that focus is
    // inside an embedded code editor, we save that model as well if we
    // find it in our text file models. Currently, only textual editors
    // support embedded editors.
    const focusedCodeEditor = codeEditorService.getFocusedCodeEditor();
    if (focusedCodeEditor instanceof EmbeddedCodeEditorWidget && !focusedCodeEditor.isSimpleWidget) {
        const resource = focusedCodeEditor.getModel()?.uri;
        // Check that the resource of the model was not saved already
        if (resource && !editors.some(({ editor }) => isEqual(EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }), resource))) {
            const model = textFileService.files.get(resource);
            if (!model?.isReadonly()) {
                await textFileService.save(resource, options);
            }
        }
    }
}
function saveDirtyEditorsOfGroups(accessor, groups, options) {
    const dirtyEditors = [];
    for (const group of groups) {
        for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (editor.isDirty()) {
                dirtyEditors.push({ groupId: group.id, editor });
            }
        }
    }
    return doSaveEditors(accessor, dirtyEditors, options);
}
async function doSaveEditors(accessor, editors, options) {
    const editorService = accessor.get(IEditorService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    try {
        await editorService.save(editors, options);
    }
    catch (error) {
        if (!isCancellationError(error)) {
            const actions = [toAction({ id: 'workbench.action.files.saveEditors', label: nls.localize('retry', "Retry"), run: () => instantiationService.invokeFunction(accessor => doSaveEditors(accessor, editors, options)) })];
            const editorsToRevert = editors.filter(({ editor }) => !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) /* all except untitled to prevent unexpected data-loss */);
            if (editorsToRevert.length > 0) {
                actions.push(toAction({ id: 'workbench.action.files.revertEditors', label: editorsToRevert.length > 1 ? nls.localize('revertAll', "Revert All") : nls.localize('revert', "Revert"), run: () => editorService.revert(editorsToRevert) }));
            }
            notificationService.notify({
                id: editors.map(({ editor }) => hash(editor.resource?.toString())).join(), // ensure unique notification ID per set of editor
                severity: Severity.Error,
                message: nls.localize({ key: 'genericSaveError', comment: ['{0} is the resource that failed to save and {1} the error message'] }, "Failed to save '{0}': {1}", editors.map(({ editor }) => editor.getName()).join(', '), toErrorMessage(error, false)),
                actions: { primary: actions }
            });
        }
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 49 /* KeyCode.KeyS */,
    id: SAVE_FILE_COMMAND_ID,
    handler: accessor => {
        return saveSelectedEditors(accessor, { reason: 1 /* SaveReason.EXPLICIT */, force: true /* force save even when non-dirty */ });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 49 /* KeyCode.KeyS */),
    win: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */) },
    id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
    handler: accessor => {
        return saveSelectedEditors(accessor, { reason: 1 /* SaveReason.EXPLICIT */, force: true /* force save even when non-dirty */, skipSaveParticipants: true });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: SAVE_FILE_AS_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */,
    handler: accessor => {
        return saveSelectedEditors(accessor, { reason: 1 /* SaveReason.EXPLICIT */, saveAs: true });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    when: undefined,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: undefined,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 49 /* KeyCode.KeyS */ },
    win: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 49 /* KeyCode.KeyS */) },
    id: SAVE_ALL_COMMAND_ID,
    handler: accessor => {
        return saveDirtyEditorsOfGroups(accessor, accessor.get(IEditorGroupsService).getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */), { reason: 1 /* SaveReason.EXPLICIT */ });
    }
});
CommandsRegistry.registerCommand({
    id: SAVE_ALL_IN_GROUP_COMMAND_ID,
    handler: (accessor, _, editorContext) => {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const resolvedContext = resolveCommandsContext([editorContext], accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
        let groups = undefined;
        if (!resolvedContext.groupedEditors.length) {
            groups = editorGroupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        }
        else {
            groups = resolvedContext.groupedEditors.map(({ group }) => group);
        }
        return saveDirtyEditorsOfGroups(accessor, groups, { reason: 1 /* SaveReason.EXPLICIT */ });
    }
});
CommandsRegistry.registerCommand({
    id: SAVE_FILES_COMMAND_ID,
    handler: async (accessor) => {
        const editorService = accessor.get(IEditorService);
        const res = await editorService.saveAll({ includeUntitled: false, reason: 1 /* SaveReason.EXPLICIT */ });
        return res.success;
    }
});
CommandsRegistry.registerCommand({
    id: REVERT_FILE_COMMAND_ID,
    handler: async (accessor) => {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        // Retrieve selected or active editor
        let editors = getOpenEditorsViewMultiSelection(accessor);
        if (!editors) {
            const activeGroup = editorGroupService.activeGroup;
            if (activeGroup.activeEditor) {
                editors = [{ groupId: activeGroup.id, editor: activeGroup.activeEditor }];
            }
        }
        if (!editors || editors.length === 0) {
            return; // nothing to revert
        }
        try {
            await editorService.revert(editors.filter(({ editor }) => !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) /* all except untitled */), { force: true });
        }
        catch (error) {
            const notificationService = accessor.get(INotificationService);
            notificationService.error(nls.localize('genericRevertError', "Failed to revert '{0}': {1}", editors.map(({ editor }) => editor.getName()).join(', '), toErrorMessage(error, false)));
        }
    }
});
CommandsRegistry.registerCommand({
    id: REMOVE_ROOT_FOLDER_COMMAND_ID,
    handler: (accessor, resource) => {
        const contextService = accessor.get(IWorkspaceContextService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const workspace = contextService.getWorkspace();
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService)).filter(resource => workspace.folders.some(folder => uriIdentityService.extUri.isEqual(folder.uri, resource)) // Need to verify resources are workspaces since multi selection can trigger this command on some non workspace resources
        );
        if (resources.length === 0) {
            const commandService = accessor.get(ICommandService);
            // Show a picker for the user to choose which folder to remove
            return commandService.executeCommand(RemoveRootFolderAction.ID);
        }
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        return workspaceEditingService.removeFolders(resources);
    }
});
// Compressed item navigation
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negate()),
    primary: 15 /* KeyCode.LeftArrow */,
    id: PREVIOUS_COMPRESSED_FOLDER,
    handler: accessor => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.previousCompressedStat();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLastFocusContext.negate()),
    primary: 17 /* KeyCode.RightArrow */,
    id: NEXT_COMPRESSED_FOLDER,
    handler: accessor => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.nextCompressedStat();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext.negate()),
    primary: 14 /* KeyCode.Home */,
    id: FIRST_COMPRESSED_FOLDER,
    handler: accessor => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.firstCompressedStat();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerCompressedFocusContext, ExplorerCompressedLastFocusContext.negate()),
    primary: 13 /* KeyCode.End */,
    id: LAST_COMPRESSED_FOLDER,
    handler: accessor => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (viewlet?.getId() !== VIEWLET_ID) {
            return;
        }
        const explorer = viewlet.getViewPaneContainer();
        const view = explorer.getExplorerView();
        view.lastCompressedStat();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: null,
    primary: isWeb ? (isWindows ? KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 44 /* KeyCode.KeyN */) : 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 44 /* KeyCode.KeyN */) : 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
    secondary: isWeb ? [2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */] : undefined,
    id: NEW_UNTITLED_FILE_COMMAND_ID,
    metadata: {
        description: NEW_UNTITLED_FILE_LABEL,
        args: [
            {
                isOptional: true,
                name: 'New Untitled Text File arguments',
                description: 'The editor view type or language ID if known',
                schema: {
                    'type': 'object',
                    'properties': {
                        'viewType': {
                            'type': 'string'
                        },
                        'languageId': {
                            'type': 'string'
                        }
                    }
                }
            }
        ]
    },
    handler: async (accessor, args) => {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource: undefined,
            options: {
                override: args?.viewType,
                pinned: true
            },
            languageId: args?.languageId,
        });
    }
});
CommandsRegistry.registerCommand({
    id: NEW_FILE_COMMAND_ID,
    handler: async (accessor, args) => {
        const editorService = accessor.get(IEditorService);
        const dialogService = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const createFileLocalized = nls.localize('newFileCommand.saveLabel', "Create File");
        const defaultFileUri = joinPath(await dialogService.defaultFilePath(), args?.fileName ?? 'Untitled.txt');
        const saveUri = await dialogService.showSaveDialog({ saveLabel: createFileLocalized, title: createFileLocalized, defaultUri: defaultFileUri });
        if (!saveUri) {
            return;
        }
        await fileService.createFile(saveUri, undefined, { overwrite: true });
        await editorService.openEditor({
            resource: saveUri,
            options: {
                override: args?.viewType,
                pinned: true
            },
            languageId: args?.languageId,
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZmlsZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLHNCQUFzQixFQUEwQixnQkFBZ0IsRUFBd0UsTUFBTSwyQkFBMkIsQ0FBQztBQUNuTCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4RixPQUFPLEVBQXVDLGlCQUFpQixFQUEyQixNQUFNLDhDQUE4QyxDQUFDO0FBQy9JLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQW9CLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHVCQUF1QixFQUFFLFVBQVUsRUFBRSw4QkFBOEIsRUFBRSxtQ0FBbUMsRUFBRSxrQ0FBa0MsRUFBRSwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV2USxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFtQixlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0SCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkgsT0FB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