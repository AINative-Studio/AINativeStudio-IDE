/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { compare } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { AbstractGotoSymbolQuickAccessProvider } from '../../../../../editor/contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ActiveEditorContext, TextCompareEditorActiveContext } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { VIEW_ID as SEARCH_VIEW_ID } from '../../../../services/search/common/search.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { TEXT_FILE_EDITOR_ID } from '../../../files/common/files.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { AnythingQuickAccessProvider } from '../../../search/browser/anythingQuickAccess.js';
import { isSearchTreeFileMatch, isSearchTreeMatch } from '../../../search/browser/searchTreeModel/searchTreeCommon.js';
import { SymbolsQuickAccessProvider } from '../../../search/browser/symbolsQuickAccess.js';
import { SearchContext } from '../../../search/common/constants.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IDiagnosticVariableEntryFilterData } from '../../common/chatModel.js';
import { ChatRequestAgentPart } from '../../common/chatParserTypes.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { IChatWidgetService, IQuickChatService, showChatView, showEditsView } from '../chat.js';
import { imageToHash, isImage } from '../chatPasteProviders.js';
import { isQuickChat } from '../chatWidget.js';
import { createFolderQuickPick, createMarkersQuickPick } from '../contrib/chatDynamicVariables.js';
import { convertBufferToScreenshotVariable, ScreenshotVariableId } from '../contrib/screenshot.js';
import { resizeImage } from '../imageUtils.js';
import { COMMAND_ID as USE_PROMPT_COMMAND_ID } from '../promptSyntax/contributions/usePromptCommand.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { ATTACH_PROMPT_ACTION_ID, AttachPromptAction } from './chatAttachPromptAction/chatAttachPromptAction.js';
export function registerChatContextActions() {
    registerAction2(AttachContextAction);
    registerAction2(AttachFileToChatAction);
    registerAction2(AttachFolderToChatAction);
    registerAction2(AttachSelectionToChatAction);
    registerAction2(AttachFileToEditingSessionAction);
    registerAction2(AttachFolderToEditingSessionAction);
    registerAction2(AttachSelectionToEditingSessionAction);
    registerAction2(AttachSearchResultAction);
}
function isIGotoSymbolQuickPickItem(obj) {
    return (typeof obj === 'object'
        && typeof obj.symbolName === 'string'
        && !!obj.uri
        && !!obj.range);
}
function isISymbolQuickPickItem(obj) {
    return (typeof obj === 'object'
        && typeof obj.symbol === 'object'
        && !!obj.symbol);
}
function isIFolderSearchResultQuickPickItem(obj) {
    return (typeof obj === 'object'
        && obj.kind === 'folder-search-result');
}
function isIDiagnosticsQuickPickItemWithFilter(obj) {
    return (typeof obj === 'object'
        && obj.kind === 'diagnostic-filter');
}
function isIQuickPickItemWithResource(obj) {
    return (typeof obj === 'object'
        && typeof obj.resource === 'object'
        && URI.isUri(obj.resource));
}
function isIOpenEditorsQuickPickItem(obj) {
    return (typeof obj === 'object'
        && obj.id === 'open-editors');
}
function isISearchResultsQuickPickItem(obj) {
    return (typeof obj === 'object'
        && obj.kind === 'search-results');
}
function isScreenshotQuickPickItem(obj) {
    return (typeof obj === 'object'
        && obj.kind === 'screenshot');
}
function isRelatedFileQuickPickItem(obj) {
    return (typeof obj === 'object'
        && obj.kind === 'related-files');
}
/**
 * Checks is a provided object is a prompt instructions quick pick item.
 */
function isPromptInstructionsQuickPickItem(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    return ('kind' in obj && obj.kind === 'reusable-prompt');
}
/**
 * Quick pick item for reusable prompt attachment.
 */
const REUSABLE_PROMPT_PICK_ID = 'reusable-prompt';
class AttachResourceAction extends Action2 {
    getResources(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const contexts = Array.isArray(args[1]) ? args[1] : [args[0]];
        const files = [];
        for (const context of contexts) {
            let uri;
            if (URI.isUri(context)) {
                uri = context;
            }
            else if (isSearchTreeFileMatch(context)) {
                uri = context.resource;
            }
            else if (isSearchTreeMatch(context)) {
                uri = context.parent().resource;
            }
            else if (!context && editorService.activeTextEditorControl) {
                uri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
            }
            if (uri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(uri.scheme)) {
                files.push(uri);
            }
        }
        return files;
    }
}
class AttachFileToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFile'; }
    constructor() {
        super({
            id: AttachFileToChatAction.ID,
            title: localize2('workbench.action.chat.attachFile.label', "Add File to Chat"),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [{
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), SearchContext.SearchResultHeaderFocused.negate()),
                }]
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const files = this.getResources(accessor, ...args);
        if (files.length) {
            (await showChatView(accessor.get(IViewsService)))?.focusInput();
            for (const file of files) {
                variablesService.attachContext('file', file, ChatAgentLocation.Panel);
            }
        }
    }
}
class AttachFolderToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFolder'; }
    constructor() {
        super({
            id: AttachFolderToChatAction.ID,
            title: localize2('workbench.action.chat.attachFolder.label', "Add Folder to Chat"),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const folders = this.getResources(accessor, ...args);
        if (folders.length) {
            (await showChatView(accessor.get(IViewsService)))?.focusInput();
            for (const folder of folders) {
                variablesService.attachContext('folder', folder, ChatAgentLocation.Panel);
            }
        }
    }
}
class AttachSelectionToChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.attachSelection'; }
    constructor() {
        super({
            id: AttachSelectionToChatAction.ID,
            title: localize2('workbench.action.chat.attachSelection.label', "Add Selection to Chat"),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const editorService = accessor.get(IEditorService);
        const [_, matches] = args;
        // If we have search matches, it means this is coming from the search widget
        if (matches && matches.length > 0) {
            const uris = new Map();
            for (const match of matches) {
                if (isSearchTreeFileMatch(match)) {
                    uris.set(match.resource, undefined);
                }
                else {
                    const context = { uri: match._parent.resource, range: match._range };
                    const range = uris.get(context.uri);
                    if (!range ||
                        range.startLineNumber !== context.range.startLineNumber && range.endLineNumber !== context.range.endLineNumber) {
                        uris.set(context.uri, context.range);
                        variablesService.attachContext('file', context, ChatAgentLocation.Panel);
                    }
                }
            }
            // Add the root files for all of the ones that didn't have a match
            for (const uri of uris) {
                const [resource, range] = uri;
                if (!range) {
                    variablesService.attachContext('file', { uri: resource }, ChatAgentLocation.Panel);
                }
            }
        }
        else {
            const activeEditor = editorService.activeTextEditorControl;
            const activeUri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (editorService.activeTextEditorControl && activeUri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(activeUri.scheme)) {
                const selection = activeEditor?.getSelection();
                if (selection) {
                    (await showChatView(accessor.get(IViewsService)))?.focusInput();
                    const range = selection.isEmpty() ? new Range(selection.startLineNumber, 1, selection.startLineNumber + 1, 1) : selection;
                    variablesService.attachContext('file', { uri: activeUri, range }, ChatAgentLocation.Panel);
                }
            }
        }
    }
}
class AttachFileToEditingSessionAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.edits.attachFile'; }
    constructor() {
        super({
            id: AttachFileToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachFile.label', "Add File to {0}", 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [{
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 2,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), ChatContextKeyExprs.unifiedChatEnabled.negate(), SearchContext.SearchResultHeaderFocused.negate()),
                }]
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const files = this.getResources(accessor, ...args);
        if (files.length) {
            (await showEditsView(accessor.get(IViewsService)))?.focusInput();
            for (const file of files) {
                variablesService.attachContext('file', file, ChatAgentLocation.EditingSession);
            }
        }
    }
}
export class AttachSearchResultAction extends Action2 {
    static { this.Name = 'searchResults'; }
    static { this.ID = 'workbench.action.chat.insertSearchResults'; }
    constructor() {
        super({
            id: AttachSearchResultAction.ID,
            title: localize2('chat.insertSearchResults', 'Add Search Results to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [{
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 3,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, SearchContext.SearchResultHeaderFocused),
                }]
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const widget = (await showChatView(accessor.get(IViewsService)));
        if (!widget) {
            logService.trace('InsertSearchResultAction: no chat view available');
            return;
        }
        const editor = widget.inputEditor;
        const originalRange = editor.getSelection() ?? editor.getModel()?.getFullModelRange().collapseToEnd();
        if (!originalRange) {
            logService.trace('InsertSearchResultAction: no selection');
            return;
        }
        let insertText = `#${AttachSearchResultAction.Name}`;
        const varRange = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.startColumn + insertText.length);
        // check character before the start of the range. If it's not a space, add a space
        const model = editor.getModel();
        if (model && model.getValueInRange(new Range(originalRange.startLineNumber, originalRange.startColumn - 1, originalRange.startLineNumber, originalRange.startColumn)) !== ' ') {
            insertText = ' ' + insertText;
        }
        const success = editor.executeEdits('chatInsertSearch', [{ range: varRange, text: insertText + ' ' }]);
        if (!success) {
            logService.trace(`InsertSearchResultAction: failed to insert "${insertText}"`);
            return;
        }
    }
}
class AttachFolderToEditingSessionAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.edits.attachFolder'; }
    constructor() {
        super({
            id: AttachFolderToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachFolder.label', "Add Folder to {0}", 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeyExprs.unifiedChatEnabled.negate()),
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const folders = this.getResources(accessor, ...args);
        if (folders.length) {
            (await showEditsView(accessor.get(IViewsService)))?.focusInput();
            for (const folder of folders) {
                variablesService.attachContext('folder', folder, ChatAgentLocation.EditingSession);
            }
        }
    }
}
class AttachSelectionToEditingSessionAction extends Action2 {
    static { this.ID = 'workbench.action.edits.attachSelection'; }
    constructor() {
        super({
            id: AttachSelectionToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachSelection.label', "Add Selection to {0}", 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), ChatContextKeyExprs.unifiedChatEnabled.negate())
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeTextEditorControl;
        const activeUri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (editorService.activeTextEditorControl && activeUri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(activeUri.scheme)) {
            const selection = activeEditor?.getSelection();
            if (selection) {
                (await showEditsView(accessor.get(IViewsService)))?.focusInput();
                const range = selection.isEmpty() ? new Range(selection.startLineNumber, 1, selection.startLineNumber + 1, 1) : selection;
                variablesService.attachContext('file', { uri: activeUri, range }, ChatAgentLocation.EditingSession);
            }
        }
    }
}
export class AttachContextAction extends Action2 {
    static { this.ID = 'workbench.action.chat.attachContext'; }
    constructor(desc = {
        id: AttachContextAction.ID,
        title: localize2('workbench.action.chat.attachContext.label.2', "Add Context"),
        icon: Codicon.attach,
        category: CHAT_CATEGORY,
        keybinding: {
            when: ContextKeyExpr.and(ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.inChatInput, ChatContextKeyExprs.inNonUnifiedPanel),
            primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
            weight: 100 /* KeybindingWeight.EditorContrib */
        },
        menu: [
            {
                when: ChatContextKeyExprs.inNonUnifiedPanel,
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 2
            }
        ]
    }) {
        super(desc);
    }
    _getFileContextId(item) {
        if ('resource' in item) {
            return item.resource.toString();
        }
        return item.uri.toString() + (item.range.startLineNumber !== item.range.endLineNumber ?
            `:${item.range.startLineNumber}-${item.range.endLineNumber}` :
            `:${item.range.startLineNumber}`);
    }
    async _attachContext(widget, quickInputService, commandService, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, isInBackground, ...picks) {
        const toAttach = [];
        for (const pick of picks) {
            if (isISymbolQuickPickItem(pick) && pick.symbol) {
                // Workspace symbol
                toAttach.push({
                    kind: 'symbol',
                    id: this._getFileContextId(pick.symbol.location),
                    value: pick.symbol.location,
                    symbolKind: pick.symbol.kind,
                    fullName: pick.label,
                    name: pick.symbol.name,
                });
            }
            else if (isIFolderSearchResultQuickPickItem(pick)) {
                const folder = pick.resource;
                toAttach.push({
                    id: pick.id,
                    value: folder,
                    name: basename(folder),
                    isFile: false,
                    isDirectory: true,
                });
            }
            else if (isIDiagnosticsQuickPickItemWithFilter(pick)) {
                toAttach.push({
                    id: pick.id,
                    name: pick.label,
                    value: pick.filter,
                    kind: 'diagnostic',
                    icon: pick.icon,
                    ...pick.filter,
                });
            }
            else if (isIQuickPickItemWithResource(pick) && pick.resource) {
                if (/\.(png|jpg|jpeg|bmp|gif|tiff)$/i.test(pick.resource.path)) {
                    // checks if the file is an image
                    if (URI.isUri(pick.resource)) {
                        // read the image and attach a new file context.
                        const readFile = await fileService.readFile(pick.resource);
                        const resizedImage = await resizeImage(readFile.value.buffer);
                        toAttach.push({
                            id: pick.resource.toString(),
                            name: pick.label,
                            fullName: pick.label,
                            value: resizedImage,
                            isImage: true
                        });
                    }
                }
                else {
                    let isOmitted = false;
                    try {
                        const createdModel = await textModelService.createModelReference(pick.resource);
                        createdModel.dispose();
                    }
                    catch {
                        isOmitted = true;
                    }
                    toAttach.push({
                        id: this._getFileContextId({ resource: pick.resource }),
                        value: pick.resource,
                        name: pick.label,
                        isFile: true,
                        isOmitted
                    });
                }
            }
            else if (isIGotoSymbolQuickPickItem(pick) && pick.uri && pick.range) {
                toAttach.push({
                    range: undefined,
                    id: this._getFileContextId({ uri: pick.uri, range: pick.range.decoration }),
                    value: { uri: pick.uri, range: pick.range.decoration },
                    fullName: pick.label,
                    name: pick.symbolName,
                });
            }
            else if (isIOpenEditorsQuickPickItem(pick)) {
                for (const editor of editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput || e instanceof NotebookEditorInput)) {
                    const uri = editor instanceof DiffEditorInput ? editor.modified.resource : editor.resource;
                    if (uri) {
                        toAttach.push({
                            id: this._getFileContextId({ resource: uri }),
                            value: uri,
                            name: labelService.getUriBasenameLabel(uri),
                            isFile: true,
                        });
                    }
                }
            }
            else if (isISearchResultsQuickPickItem(pick)) {
                const searchView = viewsService.getViewWithId(SEARCH_VIEW_ID);
                for (const result of searchView.model.searchResult.matches()) {
                    toAttach.push({
                        id: this._getFileContextId({ resource: result.resource }),
                        value: result.resource,
                        name: labelService.getUriBasenameLabel(result.resource),
                        isFile: true,
                    });
                }
            }
            else if (isRelatedFileQuickPickItem(pick)) {
                // Get all provider results and show them in a second tier picker
                const chatSessionId = widget.viewModel?.sessionId;
                if (!chatSessionId || !chatEditingService) {
                    continue;
                }
                const relatedFiles = await chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None);
                if (!relatedFiles) {
                    continue;
                }
                const attachments = widget.attachmentModel.getAttachmentIDs();
                const itemsPromise = chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
                    .then((files) => (files ?? []).reduce((acc, cur) => {
                    acc.push({ type: 'separator', label: cur.group });
                    for (const file of cur.files) {
                        acc.push({
                            type: 'item',
                            label: labelService.getUriBasenameLabel(file.uri),
                            description: labelService.getUriLabel(dirname(file.uri), { relative: true }),
                            value: file.uri,
                            disabled: attachments.has(this._getFileContextId({ resource: file.uri })),
                            picked: true
                        });
                    }
                    return acc;
                }, []));
                const selectedFiles = await quickInputService.pick(itemsPromise, { placeHolder: localize('relatedFiles', 'Add related files to your working set'), canPickMany: true });
                for (const file of selectedFiles ?? []) {
                    toAttach.push({
                        id: this._getFileContextId({ resource: file.value }),
                        value: file.value,
                        name: file.label,
                        isFile: true,
                        isOmitted: false
                    });
                }
            }
            else if (isScreenshotQuickPickItem(pick)) {
                const blob = await hostService.getScreenshot();
                if (blob) {
                    toAttach.push(convertBufferToScreenshotVariable(blob));
                }
            }
            else if (isPromptInstructionsQuickPickItem(pick)) {
                const options = { widget };
                await commandService.executeCommand(ATTACH_PROMPT_ACTION_ID, options);
            }
            else {
                // Anything else is an attachment
                const attachmentPick = pick;
                if (attachmentPick.kind === 'command') {
                    // Dynamic variable with a followup command
                    const selection = await commandService.executeCommand(attachmentPick.command.id, ...(attachmentPick.command.arguments ?? []));
                    if (!selection) {
                        // User made no selection, skip this variable
                        continue;
                    }
                    toAttach.push({
                        ...attachmentPick,
                        value: attachmentPick.value,
                        name: `${typeof attachmentPick.value === 'string' && attachmentPick.value.startsWith('#') ? attachmentPick.value.slice(1) : ''}${selection}`,
                        // Apply the original icon with the new name
                        fullName: selection
                    });
                }
                else if (attachmentPick.kind === 'tool') {
                    toAttach.push({
                        id: attachmentPick.id,
                        name: attachmentPick.label,
                        fullName: attachmentPick.label,
                        value: undefined,
                        icon: attachmentPick.icon,
                        isTool: true
                    });
                }
                else if (attachmentPick.kind === 'image') {
                    const fileBuffer = await clipboardService.readImage();
                    toAttach.push({
                        id: await imageToHash(fileBuffer),
                        name: localize('pastedImage', 'Pasted Image'),
                        fullName: localize('pastedImage', 'Pasted Image'),
                        value: fileBuffer,
                        isImage: true
                    });
                }
            }
        }
        widget.attachmentModel.addContext(...toAttach);
        if (!isInBackground) {
            // Set focus back into the input once the user is done attaching items
            // so that the user can start typing their message
            widget.focusInput();
        }
    }
    async run(accessor, ...args) {
        const quickInputService = accessor.get(IQuickInputService);
        const chatAgentService = accessor.get(IChatAgentService);
        const commandService = accessor.get(ICommandService);
        const widgetService = accessor.get(IChatWidgetService);
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const quickChatService = accessor.get(IQuickChatService);
        const clipboardService = accessor.get(IClipboardService);
        const editorService = accessor.get(IEditorService);
        const labelService = accessor.get(ILabelService);
        const contextKeyService = accessor.get(IContextKeyService);
        const viewsService = accessor.get(IViewsService);
        const hostService = accessor.get(IHostService);
        const extensionService = accessor.get(IExtensionService);
        const fileService = accessor.get(IFileService);
        const textModelService = accessor.get(ITextModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const keybindingService = accessor.get(IKeybindingService);
        const context = args[0];
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatEditingService = widget.location === ChatAgentLocation.EditingSession || widget.isUnifiedPanelWidget ? accessor.get(IChatEditingService) : undefined;
        const quickPickItems = [];
        if (extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))) {
            const imageData = await clipboardService.readImage();
            if (isImage(imageData)) {
                quickPickItems.push({
                    kind: 'image',
                    id: await imageToHash(imageData),
                    label: localize('imageFromClipboard', 'Image from Clipboard'),
                    iconClass: ThemeIcon.asClassName(Codicon.fileMedia),
                });
            }
            quickPickItems.push({
                kind: 'screenshot',
                id: ScreenshotVariableId,
                icon: ThemeIcon.fromId(Codicon.deviceCamera.id),
                iconClass: ThemeIcon.asClassName(Codicon.deviceCamera),
                label: (isElectron
                    ? localize('chatContext.attachScreenshot.labelElectron.Window', 'Screenshot Window')
                    : localize('chatContext.attachScreenshot.labelWeb', 'Screenshot')),
            });
        }
        if (widget.viewModel?.sessionId) {
            const agentPart = widget.parsedInput.parts.find((part) => part instanceof ChatRequestAgentPart);
            if (agentPart) {
                const completions = await chatAgentService.getAgentCompletionItems(agentPart.agent.id, '', CancellationToken.None);
                for (const variable of completions) {
                    if (variable.fullName && variable.command) {
                        quickPickItems.push({
                            kind: 'command',
                            label: variable.fullName,
                            id: variable.id,
                            command: variable.command,
                            icon: variable.icon,
                            iconClass: variable.icon ? ThemeIcon.asClassName(variable.icon) : undefined,
                            value: variable.value,
                            name: variable.name
                        });
                    }
                    else {
                        // Currently there's nothing that falls into this category
                    }
                }
            }
        }
        for (const tool of languageModelToolsService.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                const item = {
                    kind: 'tool',
                    label: tool.displayName ?? '',
                    id: tool.id,
                    icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined // TODO need to support icon path?
                };
                if (ThemeIcon.isThemeIcon(tool.icon)) {
                    item.iconClass = ThemeIcon.asClassName(tool.icon);
                }
                else if (tool.icon) {
                    item.iconPath = tool.icon;
                }
                quickPickItems.push(item);
            }
        }
        quickPickItems.push({
            kind: 'quickaccess',
            label: localize('chatContext.symbol', 'Symbol...'),
            iconClass: ThemeIcon.asClassName(Codicon.symbolField),
            prefix: SymbolsQuickAccessProvider.PREFIX,
            id: 'symbol'
        });
        quickPickItems.push({
            kind: 'folder',
            label: localize('chatContext.folder', 'Folder...'),
            iconClass: ThemeIcon.asClassName(Codicon.folder),
            id: 'folder',
        });
        quickPickItems.push({
            kind: 'diagnostic',
            label: localize('chatContext.diagnstic', 'Problem...'),
            iconClass: ThemeIcon.asClassName(Codicon.error),
            id: 'diagnostic'
        });
        if (widget.location === ChatAgentLocation.Notebook) {
            quickPickItems.push({
                kind: 'command',
                id: 'chatContext.notebook.kernelVariable',
                icon: ThemeIcon.fromId(Codicon.serverEnvironment.id),
                iconClass: ThemeIcon.asClassName(Codicon.serverEnvironment),
                value: 'kernelVariable',
                label: localize('chatContext.notebook.kernelVariable', 'Kernel Variable...'),
                command: {
                    id: 'notebook.chat.selectAndInsertKernelVariable',
                    title: localize('chatContext.notebook.selectkernelVariable', 'Select and Insert Kernel Variable'),
                    arguments: [{ widget, range: undefined }]
                }
            });
        }
        if (context?.showFilesOnly) {
            if (chatEditingService?.hasRelatedFilesProviders() && (widget.getInput() || widget.attachmentModel.fileAttachments.length > 0)) {
                quickPickItems.unshift({
                    kind: 'related-files',
                    id: 'related-files',
                    label: localize('chatContext.relatedFiles', 'Related Files'),
                    iconClass: ThemeIcon.asClassName(Codicon.sparkle),
                });
            }
            if (editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput).length > 0) {
                quickPickItems.unshift({
                    kind: 'open-editors',
                    id: 'open-editors',
                    label: localize('chatContext.editors', 'Open Editors'),
                    iconClass: ThemeIcon.asClassName(Codicon.files),
                });
            }
            if (SearchContext.HasSearchResults.getValue(contextKeyService)) {
                quickPickItems.unshift({
                    kind: 'search-results',
                    id: 'search-results',
                    label: localize('chatContext.searchResults', 'Search Results'),
                    iconClass: ThemeIcon.asClassName(Codicon.search),
                });
            }
        }
        // if the `reusable prompts` feature is enabled, add
        // the appropriate attachment type to the list
        if (widget.attachmentModel.promptInstructions.featureEnabled) {
            const keybinding = keybindingService.lookupKeybinding(USE_PROMPT_COMMAND_ID, contextKeyService);
            quickPickItems.push({
                id: REUSABLE_PROMPT_PICK_ID,
                kind: REUSABLE_PROMPT_PICK_ID,
                label: localize('chatContext.attach.prompt.label', 'Prompt...'),
                iconClass: ThemeIcon.asClassName(Codicon.bookmark),
                keybinding,
            });
        }
        function extractTextFromIconLabel(label) {
            if (!label) {
                return '';
            }
            const match = label.match(/\$\([^\)]+\)\s*(.+)/);
            return match ? match[1] : label;
        }
        this._show(quickInputService, commandService, widget, quickChatService, quickPickItems.sort(function (a, b) {
            if (a.kind === 'open-editors') {
                return -1;
            }
            if (b.kind === 'open-editors') {
                return 1;
            }
            const first = extractTextFromIconLabel(a.label).toUpperCase();
            const second = extractTextFromIconLabel(b.label).toUpperCase();
            return compare(first, second);
        }), clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, '', context?.placeholder);
    }
    async _showDiagnosticsPick(instantiationService, onBackgroundAccept) {
        const convert = (item) => ({
            kind: 'diagnostic-filter',
            id: IDiagnosticVariableEntryFilterData.id(item),
            label: IDiagnosticVariableEntryFilterData.label(item),
            icon: IDiagnosticVariableEntryFilterData.icon,
            filter: item,
        });
        const filter = await instantiationService.invokeFunction(accessor => createMarkersQuickPick(accessor, 'problem', items => onBackgroundAccept(items.map(convert))));
        return filter && convert(filter);
    }
    _show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, query = '', placeholder) {
        const attach = (isBackgroundAccept, ...items) => {
            this._attachContext(widget, quickInputService, commandService, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, isBackgroundAccept, ...items);
        };
        const providerOptions = {
            handleAccept: async (inputItem, isBackgroundAccept) => {
                let item = inputItem;
                if ('kind' in item && item.kind === 'folder') {
                    item = await this._showFolders(instantiationService);
                }
                else if ('kind' in item && item.kind === 'diagnostic') {
                    item = await this._showDiagnosticsPick(instantiationService, i => attach(true, ...i));
                }
                if (!item) {
                    this._show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, '', placeholder);
                    return;
                }
                if ('prefix' in item) {
                    this._show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, item.prefix, placeholder);
                }
                else {
                    if (!clipboardService) {
                        return;
                    }
                    attach(isBackgroundAccept, item);
                    if (isQuickChat(widget)) {
                        quickChatService.open();
                    }
                }
            },
            additionPicks: quickPickItems,
            filter: (item) => {
                // Avoid attaching the same context twice
                const attachedContext = widget.attachmentModel.getAttachmentIDs();
                if (isIOpenEditorsQuickPickItem(item)) {
                    for (const editor of editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput)) {
                        // There is an open editor that hasn't yet been attached to the chat
                        if (editor.resource && !attachedContext.has(this._getFileContextId({ resource: editor.resource }))) {
                            return true;
                        }
                    }
                    return false;
                }
                if ('kind' in item && item.kind === 'image') {
                    return !attachedContext.has(item.id);
                }
                if ('symbol' in item && item.symbol) {
                    return !attachedContext.has(this._getFileContextId(item.symbol.location));
                }
                if (item && typeof item === 'object' && 'resource' in item && URI.isUri(item.resource)) {
                    return [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(item.resource.scheme)
                        && !attachedContext.has(this._getFileContextId({ resource: item.resource })); // Hack because Typescript doesn't narrow this type correctly
                }
                if (item && typeof item === 'object' && 'uri' in item && item.uri && item.range) {
                    return !attachedContext.has(this._getFileContextId({ uri: item.uri, range: item.range.decoration }));
                }
                if (!('command' in item) && item.id) {
                    return !attachedContext.has(item.id);
                }
                // Don't filter out dynamic variables which show secondary data (temporary)
                return true;
            }
        };
        quickInputService.quickAccess.show(query, {
            enabledProviderPrefixes: [
                AnythingQuickAccessProvider.PREFIX,
                SymbolsQuickAccessProvider.PREFIX,
                AbstractGotoSymbolQuickAccessProvider.PREFIX
            ],
            placeholder: placeholder ?? localize('chatContext.attach.placeholder', 'Search attachments'),
            providerOptions,
        });
    }
    async _showFolders(instantiationService) {
        const folder = await instantiationService.invokeFunction(accessor => createFolderQuickPick(accessor));
        if (!folder) {
            return undefined;
        }
        return {
            kind: 'folder-search-result',
            id: folder.toString(),
            label: basename(folder),
            resource: folder,
        };
    }
}
registerAction2(class AttachFilesAction extends AttachContextAction {
    constructor() {
        super({
            id: 'workbench.action.chat.editing.attachContext',
            title: localize2('workbench.action.chat.editing.attachContext.label', "Add Context to Copilot Edits"),
            shortTitle: localize2('workbench.action.chat.editing.attachContext.shortLabel', "Add Context..."),
            f1: false,
            category: CHAT_CATEGORY,
            menu: {
                when: ChatContextKeyExprs.inEditsOrUnified,
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 3
            },
            icon: Codicon.attach,
            precondition: ChatContextKeyExprs.inEditsOrUnified,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeyExprs.inEditsOrUnified),
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const attachFilesContext = { ...context, showFilesOnly: true };
        return super.run(accessor, attachFilesContext);
    }
});
registerAction2(AttachPromptAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvbnRleHRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUdqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQ0FBcUMsRUFBNEIsTUFBTSw0RUFBNEUsQ0FBQztBQUM3SixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFP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