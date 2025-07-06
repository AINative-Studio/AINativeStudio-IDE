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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQVksTUFBTSwyQ0FBMkMsQ0FBQztBQUVqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFF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