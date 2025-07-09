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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRDb250ZXh0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUNBQXFDLEVBQTRCLE1BQU0sNEVBQTRFLENBQUM7QUFDN0osT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FB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