/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, chatEditingResourceContextKey, chatEditingWidgetFileStateContextKey, decidedChatEditingResourceContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { IChatWidgetService } from '../chat.js';
export class EditingSessionAction extends Action2 {
    constructor(opts) {
        super({
            category: CHAT_CATEGORY,
            ...opts
        });
    }
    run(accessor, ...args) {
        const context = getEditingSessionContext(accessor, args);
        if (!context || !context.editingSession) {
            return;
        }
        return this.runEditingSessionAction(accessor, context.editingSession, context.chatWidget, ...args);
    }
}
export function getEditingSessionContext(accessor, args) {
    const arg0 = args.at(0);
    const context = isChatViewTitleActionContext(arg0) ? arg0 : undefined;
    const chatService = accessor.get(IChatService);
    const chatWidgetService = accessor.get(IChatWidgetService);
    const chatEditingService = accessor.get(IChatEditingService);
    let chatWidget = context ? chatWidgetService.getWidgetBySessionId(context.sessionId) : undefined;
    if (!chatWidget) {
        if (chatService.unifiedViewEnabled) {
            // TODO ugly
            chatWidget = chatWidgetService.lastFocusedWidget ?? chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel).find(w => w.isUnifiedPanelWidget);
        }
        else {
            chatWidget = chatWidgetService.getWidgetsByLocations(ChatAgentLocation.EditingSession).at(0);
        }
    }
    if (!chatWidget?.viewModel) {
        return;
    }
    const chatSessionId = chatWidget.viewModel.model.sessionId;
    const editingSession = chatEditingService.getEditingSession(chatSessionId);
    if (!editingSession) {
        return;
    }
    return { editingSession, chatWidget };
}
class WorkingSetAction extends EditingSessionAction {
    runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        const uris = [];
        if (URI.isUri(args[0])) {
            uris.push(args[0]);
        }
        else if (chatWidget) {
            uris.push(...chatWidget.input.selectedElements);
        }
        if (!uris.length) {
            return;
        }
        return this.runWorkingSetAction(accessor, editingSession, chatWidget, ...uris);
    }
}
registerAction2(class RemoveFileFromWorkingSet extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.removeFileFromWorkingSet',
            title: localize2('removeFileFromWorkingSet', 'Remove File'),
            icon: Codicon.close,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [{
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    // when: ContextKeyExpr.or(ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Attached), ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Suggested), ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Transient)),
                    order: 5,
                    group: 'navigation'
                }],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        const dialogService = accessor.get(IDialogService);
        const pendingEntries = currentEditingSession.entries.get().filter((entry) => uris.includes(entry.modifiedURI) && entry.state.get() === 0 /* WorkingSetEntryState.Modified */);
        if (pendingEntries.length > 0) {
            // Ask for confirmation if there are any pending edits
            const file = pendingEntries.length > 1
                ? localize('chat.editing.removeFile.confirmationmanyFiles', "{0} files", pendingEntries.length)
                : basename(pendingEntries[0].modifiedURI);
            const confirmation = await dialogService.confirm({
                title: localize('chat.editing.removeFile.confirmation.title', "Remove {0} from working set?", file),
                message: localize('chat.editing.removeFile.confirmation.message', "This will remove {0} from your working set and undo the edits made to it. Do you want to proceed?", file),
                primaryButton: localize('chat.editing.removeFile.confirmation.primaryButton', "Yes"),
                type: 'info'
            });
            if (!confirmation.confirmed) {
                return;
            }
        }
        // Remove from working set
        await currentEditingSession.reject(...uris);
        currentEditingSession.remove(0 /* WorkingSetEntryRemovalReason.User */, ...uris);
        // Remove from chat input part
        for (const uri of uris) {
            chatWidget.attachmentModel.delete(uri.toString());
        }
        // Clear all related file suggestions
        if (chatWidget.attachmentModel.fileAttachments.length === 0) {
            chatWidget.input.relatedFiles?.clear();
        }
    }
});
registerAction2(class OpenFileInDiffAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.openFileInDiff',
            title: localize2('open.fileInDiff', 'Open Changes in Diff Editor'),
            icon: Codicon.diffSingle,
            menu: [{
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 2,
                    group: 'navigation'
                }],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, _chatWidget, ...uris) {
        const editorService = accessor.get(IEditorService);
        for (const uri of uris) {
            const editedFile = currentEditingSession.getEntry(uri);
            if (editedFile?.state.get() === 0 /* WorkingSetEntryState.Modified */) {
                await editorService.openEditor({
                    original: { resource: URI.from(editedFile.originalURI, true) },
                    modified: { resource: URI.from(editedFile.modifiedURI, true) },
                });
            }
            else {
                await editorService.openEditor({ resource: uri });
            }
        }
    }
});
registerAction2(class AcceptAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.acceptFile',
            title: localize2('accept.file', 'Keep'),
            icon: Codicon.check,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [{
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME), ContextKeyExpr.notIn(chatEditingResourceContextKey.key, decidedChatEditingResourceContextKey.key)),
                    id: MenuId.MultiDiffEditorFileToolbar,
                    order: 0,
                    group: 'navigation',
                }, {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 0,
                    group: 'navigation'
                }],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        await currentEditingSession.accept(...uris);
    }
});
registerAction2(class DiscardAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.discardFile',
            title: localize2('discard.file', 'Undo'),
            icon: Codicon.discard,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [{
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME), ContextKeyExpr.notIn(chatEditingResourceContextKey.key, decidedChatEditingResourceContextKey.key)),
                    id: MenuId.MultiDiffEditorFileToolbar,
                    order: 2,
                    group: 'navigation',
                }, {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 1,
                    group: 'navigation'
                }],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        await currentEditingSession.reject(...uris);
    }
});
export class ChatEditingAcceptAllAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'chatEditing.acceptAllFiles',
            title: localize('accept', 'Keep'),
            icon: Codicon.check,
            tooltip: localize('acceptAllEdits', 'Keep All Edits'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey, ChatContextKeys.inChatInput),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), ContextKeyExpr.and(hasUndecidedChatEditingResourceContextKey))
                }
            ]
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await editingSession.accept();
    }
}
registerAction2(ChatEditingAcceptAllAction);
export class ChatEditingDiscardAllAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'chatEditing.discardAllFiles',
            title: localize('discard', 'Undo'),
            icon: Codicon.discard,
            tooltip: localize('discardAllEdits', 'Undo All Edits'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey),
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), hasUndecidedChatEditingResourceContextKey)
                }
            ],
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey, ChatContextKeys.inChatInput, ChatContextKeys.inputHasText.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
            },
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await discardAllEditsWithConfirmation(accessor, editingSession);
    }
}
registerAction2(ChatEditingDiscardAllAction);
export async function discardAllEditsWithConfirmation(accessor, currentEditingSession) {
    const dialogService = accessor.get(IDialogService);
    // Ask for confirmation if there are any edits
    const entries = currentEditingSession.entries.get();
    if (entries.length > 0) {
        const confirmation = await dialogService.confirm({
            title: localize('chat.editing.discardAll.confirmation.title', "Undo all edits?"),
            message: entries.length === 1
                ? localize('chat.editing.discardAll.confirmation.oneFile', "This will undo changes made by {0} in {1}. Do you want to proceed?", 'Copilot Edits', basename(entries[0].modifiedURI))
                : localize('chat.editing.discardAll.confirmation.manyFiles', "This will undo changes made by {0} in {1} files. Do you want to proceed?", 'Copilot Edits', entries.length),
            primaryButton: localize('chat.editing.discardAll.confirmation.primaryButton', "Yes"),
            type: 'info'
        });
        if (!confirmation.confirmed) {
            return false;
        }
    }
    await currentEditingSession.reject();
    return true;
}
export class ChatEditingRemoveAllFilesAction extends EditingSessionAction {
    static { this.ID = 'chatEditing.clearWorkingSet'; }
    constructor() {
        super({
            id: ChatEditingRemoveAllFilesAction.ID,
            title: localize('clearWorkingSet', 'Clear Working Set'),
            icon: Codicon.clearAll,
            tooltip: localize('clearWorkingSet', 'Clear Working Set'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate()),
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 5,
                    when: hasAppliedChatEditsContextKey.negate()
                }
            ]
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        // Remove all files from working set
        const uris = [...editingSession.entries.get()].map((e) => e.modifiedURI);
        editingSession.remove(0 /* WorkingSetEntryRemovalReason.User */, ...uris);
        // Remove all file attachments
        const fileAttachments = chatWidget.attachmentModel ? chatWidget.attachmentModel.fileAttachments : [];
        const attachmentIdsToRemove = fileAttachments.map(attachment => attachment.toString());
        chatWidget.attachmentModel.delete(...attachmentIdsToRemove);
    }
}
registerAction2(ChatEditingRemoveAllFilesAction);
export class ChatEditingShowChangesAction extends EditingSessionAction {
    static { this.ID = 'chatEditing.viewChanges'; }
    static { this.LABEL = localize('chatEditing.viewChanges', 'View All Edits'); }
    constructor() {
        super({
            id: ChatEditingShowChangesAction.ID,
            title: ChatEditingShowChangesAction.LABEL,
            tooltip: ChatEditingShowChangesAction.LABEL,
            f1: false,
            icon: Codicon.diffMultiple,
            precondition: hasUndecidedChatEditingResourceContextKey,
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), ContextKeyExpr.and(hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey))
                }
            ],
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await editingSession.show();
    }
}
registerAction2(ChatEditingShowChangesAction);
registerAction2(class AddFilesToWorkingSetAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'workbench.action.chat.addSelectedFilesToWorkingSet',
            title: localize2('workbench.action.chat.addSelectedFilesToWorkingSet.label', "Add Selected Files to Working Set"),
            icon: Codicon.attach,
            precondition: ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession),
            f1: true
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        const listService = accessor.get(IListService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const uris = [];
        for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            for (const selection of group.selectedEditors) {
                if (selection.resource) {
                    uris.push(selection.resource);
                }
            }
        }
        if (uris.length === 0) {
            const selection = listService.lastFocusedList?.getSelection();
            if (selection?.length) {
                for (const file of selection) {
                    if (!!file && typeof file === 'object' && 'resource' in file && URI.isUri(file.resource)) {
                        uris.push(file.resource);
                    }
                }
            }
        }
        for (const file of uris) {
            await chatWidget.attachmentModel.addFile(file);
        }
    }
});
registerAction2(class RemoveAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.undoEdits',
            title: localize2('chat.undoEdits.label', "Undo Requests"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.x,
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                },
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, EditorContextKeys.textInputFocus.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 2,
                    when: ChatContextKeys.isRequest
                }
            ]
        });
    }
    async run(accessor, ...args) {
        let item = args[0];
        if (!isResponseVM(item) && !isRequestVM(item)) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            const widget = chatWidgetService.lastFocusedWidget;
            item = widget?.getFocus();
        }
        if (!item) {
            return;
        }
        const configurationService = accessor.get(IConfigurationService);
        const dialogService = accessor.get(IDialogService);
        const chatService = accessor.get(IChatService);
        const chatModel = chatService.getSession(item.sessionId);
        if (!chatModel) {
            return;
        }
        const session = chatModel.editingSession;
        if (!session) {
            return;
        }
        const requestId = isRequestVM(item) ? item.id :
            isResponseVM(item) ? item.requestId : undefined;
        if (requestId) {
            const chatRequests = chatModel.getRequests();
            const itemIndex = chatRequests.findIndex(request => request.id === requestId);
            const editsToUndo = chatRequests.length - itemIndex;
            const requestsToRemove = chatRequests.slice(itemIndex);
            const requestIdsToRemove = new Set(requestsToRemove.map(request => request.id));
            const entriesModifiedInRequestsToRemove = session.entries.get().filter((entry) => requestIdsToRemove.has(entry.lastModifyingRequestId)) ?? [];
            const shouldPrompt = entriesModifiedInRequestsToRemove.length > 0 && configurationService.getValue('chat.editing.confirmEditRequestRemoval') === true;
            let message;
            if (editsToUndo === 1) {
                if (entriesModifiedInRequestsToRemove.length === 1) {
                    message = localize('chat.removeLast.confirmation.message2', "This will remove your last request and undo the edits made to {0}. Do you want to proceed?", basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                }
                else {
                    message = localize('chat.removeLast.confirmation.multipleEdits.message', "This will remove your last request and undo edits made to {0} files in your working set. Do you want to proceed?", entriesModifiedInRequestsToRemove.length);
                }
            }
            else {
                if (entriesModifiedInRequestsToRemove.length === 1) {
                    message = localize('chat.remove.confirmation.message2', "This will remove all subsequent requests and undo edits made to {0}. Do you want to proceed?", basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                }
                else {
                    message = localize('chat.remove.confirmation.multipleEdits.message', "This will remove all subsequent requests and undo edits made to {0} files in your working set. Do you want to proceed?", entriesModifiedInRequestsToRemove.length);
                }
            }
            const confirmation = shouldPrompt
                ? await dialogService.confirm({
                    title: editsToUndo === 1
                        ? localize('chat.removeLast.confirmation.title', "Do you want to undo your last edit?")
                        : localize('chat.remove.confirmation.title', "Do you want to undo {0} edits?", editsToUndo),
                    message: message,
                    primaryButton: localize('chat.remove.confirmation.primaryButton', "Yes"),
                    checkbox: { label: localize('chat.remove.confirmation.checkbox', "Don't ask again"), checked: false },
                    type: 'info'
                })
                : { confirmed: true };
            if (!confirmation.confirmed) {
                return;
            }
            if (confirmation.checkboxChecked) {
                await configurationService.updateValue('chat.editing.confirmEditRequestRemoval', false);
            }
            // Restore the snapshot to what it was before the request(s) that we deleted
            const snapshotRequestId = chatRequests[itemIndex].id;
            await session.restoreSnapshot(snapshotRequestId, undefined);
        }
    }
});
registerAction2(class OpenWorkingSetHistoryAction extends Action2 {
    static { this.id = 'chat.openFileUpdatedBySnapshot'; }
    constructor() {
        super({
            id: OpenWorkingSetHistoryAction.id,
            title: localize('chat.openFileUpdatedBySnapshot.label', "Open File"),
            menu: [{
                    id: MenuId.ChatEditingCodeBlockContext,
                    group: 'navigation',
                    order: 0,
                },]
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!context?.sessionId) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({ resource: context.uri });
    }
});
registerAction2(class OpenWorkingSetHistoryAction extends Action2 {
    static { this.id = 'chat.openFileSnapshot'; }
    constructor() {
        super({
            id: OpenWorkingSetHistoryAction.id,
            title: localize('chat.openSnapshot.label', "Open File Snapshot"),
            menu: [{
                    id: MenuId.ChatEditingCodeBlockContext,
                    group: 'navigation',
                    order: 1,
                },]
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!context?.sessionId) {
            return;
        }
        const chatService = accessor.get(IChatService);
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const chatModel = chatService.getSession(context.sessionId);
        if (!chatModel) {
            return;
        }
        const snapshot = chatEditingService.getEditingSession(chatModel.sessionId)?.getSnapshotUri(context.requestId, context.uri, context.stopId);
        if (snapshot) {
            const editor = await editorService.openEditor({ resource: snapshot, label: localize('chatEditing.snapshot', '{0} (Snapshot)', basename(context.uri)), options: { transient: true, activation: EditorActivation.ACTIVATE } });
            if (isCodeEditor(editor)) {
                editor.updateOptions({ readOnly: true });
            }
        }
    }
});
registerAction2(class ResolveSymbolsContextAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'workbench.action.edits.addFilesFromReferences',
            title: localize2('addFilesFromReferences', "Add Files From References"),
            f1: false,
            category: CHAT_CATEGORY,
            menu: {
                id: MenuId.ChatInputSymbolAttachmentContext,
                group: 'navigation',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), EditorContextKeys.hasReferenceProvider)
            }
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        if (args.length === 0 || !isLocation(args[0])) {
            return;
        }
        const textModelService = accessor.get(ITextModelService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const symbol = args[0];
        const modelReference = await textModelService.createModelReference(symbol.uri);
        const textModel = modelReference.object.textEditorModel;
        if (!textModel) {
            return;
        }
        const position = new Position(symbol.range.startLineNumber, symbol.range.startColumn);
        const [references, definitions, implementations] = await Promise.all([
            this.getReferences(position, textModel, languageFeaturesService),
            this.getDefinitions(position, textModel, languageFeaturesService),
            this.getImplementations(position, textModel, languageFeaturesService)
        ]);
        // Sort the references, definitions and implementations by
        // how important it is that they make it into the working set as it has limited size
        const attachments = [];
        for (const reference of [...definitions, ...implementations, ...references]) {
            attachments.push(chatWidget.attachmentModel.asVariableEntry(reference.uri));
        }
        chatWidget.attachmentModel.addContext(...attachments);
    }
    async getReferences(position, textModel, languageFeaturesService) {
        const referenceProviders = languageFeaturesService.referenceProvider.all(textModel);
        const references = await Promise.all(referenceProviders.map(async (referenceProvider) => {
            return await referenceProvider.provideReferences(textModel, position, { includeDeclaration: true }, CancellationToken.None) ?? [];
        }));
        return references.flat();
    }
    async getDefinitions(position, textModel, languageFeaturesService) {
        const definitionProviders = languageFeaturesService.definitionProvider.all(textModel);
        const definitions = await Promise.all(definitionProviders.map(async (definitionProvider) => {
            return await definitionProvider.provideDefinition(textModel, position, CancellationToken.None) ?? [];
        }));
        return definitions.flat();
    }
    async getImplementations(position, textModel, languageFeaturesService) {
        const implementationProviders = languageFeaturesService.implementationProvider.all(textModel);
        const implementations = await Promise.all(implementationProviders.map(async (implementationProvider) => {
            return await implementationProvider.provideImplementation(textModel, position, CancellationToken.None) ?? [];
        }));
        return implementations.flat();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFZLE1BQU0sMkNBQTJDLENBQUM7QUFFakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFB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