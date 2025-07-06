/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { marked } from '../../../../../base/common/marked/marked.js';
import { observableFromEvent, waitForState } from '../../../../../base/common/observable.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ResourceNotebookCellEdit } from '../../../bulkEdit/browser/bulkCellEdits.js';
import { MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { CellKind, NOTEBOOK_EDITOR_ID } from '../../../notebook/common/notebookCommon.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../notebook/common/notebookContextKeys.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, IChatEditingService, isChatEditingActionContext } from '../../common/chatEditingService.js';
import { ChatAgentVoteDirection, IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { EditsViewId, IChatWidgetService } from '../chat.js';
import { ChatViewPane } from '../chatViewPane.js';
import { CHAT_CATEGORY } from './chatActions.js';
export const MarkUnhelpfulActionId = 'workbench.action.chat.markUnhelpful';
const enableFeedbackConfig = 'config.telemetry.feedback.enabled';
export function registerChatTitleActions() {
    registerAction2(class MarkHelpfulAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.markHelpful',
                title: localize2('interactive.helpful.label', "Helpful"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.thumbsup,
                toggled: ChatContextKeys.responseVote.isEqualTo('up'),
                menu: [{
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig))
                    }, {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig))
                    }]
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'vote',
                    direction: ChatAgentVoteDirection.Up,
                    reason: undefined
                }
            });
            item.setVote(ChatAgentVoteDirection.Up);
            item.setVoteDownReason(undefined);
        }
    });
    registerAction2(class MarkUnhelpfulAction extends Action2 {
        constructor() {
            super({
                id: MarkUnhelpfulActionId,
                title: localize2('interactive.unhelpful.label', "Unhelpful"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.thumbsdown,
                toggled: ChatContextKeys.responseVote.isEqualTo('down'),
                menu: [{
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 2,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig))
                    }, {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 2,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig))
                    }]
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const reason = args[1];
            if (typeof reason !== 'string') {
                return;
            }
            item.setVote(ChatAgentVoteDirection.Down);
            item.setVoteDownReason(reason);
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'vote',
                    direction: ChatAgentVoteDirection.Down,
                    reason: item.voteDownReason
                }
            });
        }
    });
    registerAction2(class ReportIssueForBugAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.reportIssueForBug',
                title: localize2('interactive.reportIssueForBug.label', "Report Issue"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.report,
                menu: [{
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 3,
                        when: ContextKeyExpr.and(ChatContextKeys.responseSupportsIssueReporting, ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig))
                    }, {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 3,
                        when: ContextKeyExpr.and(ChatContextKeys.responseSupportsIssueReporting, ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig))
                    }]
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'bug'
                }
            });
        }
    });
    registerAction2(class RetryChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.retry',
                title: localize2('chat.retry.label', "Retry"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.refresh,
                menu: [
                    {
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ContextKeyExpr.in(ChatContextKeys.itemId.key, ChatContextKeys.lastItemId.key))
                    },
                    {
                        id: MenuId.ChatEditingWidgetToolbar,
                        group: 'navigation',
                        when: applyingChatEditsFailedContextKey,
                        order: 0
                    }
                ]
            });
        }
        async run(accessor, ...args) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            let item = args[0];
            if (isChatEditingActionContext(item)) {
                // Resolve chat editing action context to the last response VM
                item = chatWidgetService.getWidgetBySessionId(item.sessionId)?.viewModel?.getItems().at(-1);
            }
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(item.sessionId);
            const chatRequests = chatModel?.getRequests();
            if (!chatRequests) {
                return;
            }
            const itemIndex = chatRequests?.findIndex(request => request.id === item.requestId);
            const widget = chatWidgetService.getWidgetBySessionId(item.sessionId);
            const mode = widget?.input.currentMode;
            if (chatModel?.initialLocation === ChatAgentLocation.EditingSession || chatModel && (mode === ChatMode.Edit || mode === ChatMode.Agent)) {
                const configurationService = accessor.get(IConfigurationService);
                const dialogService = accessor.get(IDialogService);
                const currentEditingSession = widget?.viewModel?.model.editingSession;
                if (!currentEditingSession) {
                    return;
                }
                // Prompt if the last request modified the working set and the user hasn't already disabled the dialog
                const entriesModifiedInLastRequest = currentEditingSession.entries.get().filter((entry) => entry.lastModifyingRequestId === item.requestId);
                const shouldPrompt = entriesModifiedInLastRequest.length > 0 && configurationService.getValue('chat.editing.confirmEditRequestRetry') === true;
                const confirmation = shouldPrompt
                    ? await dialogService.confirm({
                        title: localize('chat.retryLast.confirmation.title2', "Do you want to retry your last request?"),
                        message: entriesModifiedInLastRequest.length === 1
                            ? localize('chat.retry.confirmation.message2', "This will undo edits made to {0} since this request.", basename(entriesModifiedInLastRequest[0].modifiedURI))
                            : localize('chat.retryLast.confirmation.message2', "This will undo edits made to {0} files in your working set since this request. Do you want to proceed?", entriesModifiedInLastRequest.length),
                        primaryButton: localize('chat.retry.confirmation.primaryButton', "Yes"),
                        checkbox: { label: localize('chat.retry.confirmation.checkbox', "Don't ask again"), checked: false },
                        type: 'info'
                    })
                    : { confirmed: true };
                if (!confirmation.confirmed) {
                    return;
                }
                if (confirmation.checkboxChecked) {
                    await configurationService.updateValue('chat.editing.confirmEditRequestRetry', false);
                }
                // Reset the snapshot to the first stop (undefined undo index)
                const snapshotRequest = chatRequests[itemIndex];
                if (snapshotRequest) {
                    await currentEditingSession.restoreSnapshot(snapshotRequest.id, undefined);
                }
            }
            const request = chatModel?.getRequests().find(candidate => candidate.id === item.requestId);
            const languageModelId = widget?.input.currentLanguageModel;
            const userSelectedTools = widget?.input.currentMode === ChatMode.Agent ? widget.input.selectedToolsModel.tools.get().map(tool => tool.id) : undefined;
            chatService.resendRequest(request, {
                userSelectedModelId: languageModelId,
                userSelectedTools,
                attempt: (request?.attempt ?? -1) + 1,
                mode: widget?.input.currentMode,
            });
        }
    });
    registerAction2(class InsertToNotebookAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.insertIntoNotebook',
                title: localize2('interactive.insertIntoNotebook.label', "Insert into Notebook"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.insert,
                menu: {
                    id: MenuId.ChatMessageFooter,
                    group: 'navigation',
                    isHiddenByDefault: true,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ChatContextKeys.isResponse, ChatContextKeys.responseIsFiltered.negate())
                }
            });
        }
        async run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const editorService = accessor.get(IEditorService);
            if (editorService.activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
                const notebookEditor = editorService.activeEditorPane.getControl();
                if (!notebookEditor.hasModel()) {
                    return;
                }
                if (notebookEditor.isReadOnly) {
                    return;
                }
                const value = item.response.toString();
                const splitContents = splitMarkdownAndCodeBlocks(value);
                const focusRange = notebookEditor.getFocus();
                const index = Math.max(focusRange.end, 0);
                const bulkEditService = accessor.get(IBulkEditService);
                await bulkEditService.apply([
                    new ResourceNotebookCellEdit(notebookEditor.textModel.uri, {
                        editType: 1 /* CellEditType.Replace */,
                        index: index,
                        count: 0,
                        cells: splitContents.map(content => {
                            const kind = content.type === 'markdown' ? CellKind.Markup : CellKind.Code;
                            const language = content.type === 'markdown' ? 'markdown' : content.language;
                            const mime = content.type === 'markdown' ? 'text/markdown' : `text/x-${content.language}`;
                            return {
                                cellKind: kind,
                                language,
                                mime,
                                source: content.content,
                                outputs: [],
                                metadata: {}
                            };
                        })
                    })
                ], { quotableLabel: 'Insert into Notebook' });
            }
        }
    });
    registerAction2(class RemoveAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.remove',
                title: localize2('chat.removeRequest.label', "Remove Request"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.x,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                keybinding: {
                    primary: 20 /* KeyCode.Delete */,
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                    },
                    when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                menu: {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeys.isRequest, ChatContextKeyExprs.unifiedChatEnabled.negate())
                }
            });
        }
        run(accessor, ...args) {
            let item = args[0];
            if (!isRequestVM(item)) {
                const chatWidgetService = accessor.get(IChatWidgetService);
                const widget = chatWidgetService.lastFocusedWidget;
                item = widget?.getFocus();
            }
            if (!item) {
                return;
            }
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(item.sessionId);
            if (chatModel?.initialLocation === ChatAgentLocation.EditingSession) {
                return;
            }
            const requestId = isRequestVM(item) ? item.id :
                isResponseVM(item) ? item.requestId : undefined;
            if (requestId) {
                const chatService = accessor.get(IChatService);
                chatService.removeRequest(item.sessionId, requestId);
            }
        }
    });
    registerAction2(class ContinueEditingAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.startEditing',
                title: localize2('chat.startEditing.label2', "Edit with Copilot"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.goToEditingSession,
                precondition: ContextKeyExpr.and(ChatContextKeys.editingParticipantRegistered, ChatContextKeys.requestInProgress.toNegated(), ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                menu: {
                    id: MenuId.ChatMessageFooter,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.isResponse, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeyExprs.unifiedChatEnabled.negate())
                }
            });
        }
        async run(accessor, ...args) {
            const logService = accessor.get(ILogService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatService = accessor.get(IChatService);
            const chatAgentService = accessor.get(IChatAgentService);
            const viewsService = accessor.get(IViewsService);
            const chatEditingService = accessor.get(IChatEditingService);
            const quickPickService = accessor.get(IQuickInputService);
            const editAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession);
            if (!editAgent) {
                logService.trace('[CHAT_MOVE] No edit agent found');
                return;
            }
            const sourceWidget = chatWidgetService.lastFocusedWidget;
            if (!sourceWidget || !sourceWidget.viewModel) {
                logService.trace('[CHAT_MOVE] NO source model');
                return;
            }
            const sourceModel = sourceWidget.viewModel.model;
            let sourceRequests = sourceModel.getRequests().slice();
            // when a response is passed (clicked on) ignore all item after it
            const [first] = args;
            if (isResponseVM(first)) {
                const idx = sourceRequests.findIndex(candidate => candidate.id === first.requestId);
                if (idx >= 0) {
                    sourceRequests.length = idx + 1;
                }
            }
            // when having multiple turns, let the user pick
            if (sourceRequests.length > 1) {
                sourceRequests = await this._pickTurns(quickPickService, sourceRequests);
            }
            if (sourceRequests.length === 0) {
                logService.trace('[CHAT_MOVE] NO requests to move');
                return;
            }
            const editsView = await viewsService.openView(EditsViewId);
            if (!(editsView instanceof ChatViewPane)) {
                return;
            }
            const viewModelObs = observableFromEvent(this, editsView.widget.onDidChangeViewModel, () => editsView.widget.viewModel);
            const chatSessionId = (await waitForState(viewModelObs)).sessionId;
            const editingSession = chatEditingService.getEditingSession(chatSessionId);
            if (!editingSession) {
                return;
            }
            const state = editingSession.state.get();
            if (state === 3 /* ChatEditingSessionState.Disposed */) {
                return;
            }
            // adopt request items and collect new working set entries
            const workingSetAdditions = new ResourceSet();
            for (const request of sourceRequests) {
                await chatService.adoptRequest(editingSession.chatSessionId, request);
                this._collectWorkingSetAdditions(request, workingSetAdditions);
            }
            await Promise.all(Array.from(workingSetAdditions, async (uri) => editsView.widget.attachmentModel.addFile(uri)));
            // make request
            await chatService.sendRequest(editingSession.chatSessionId, '', {
                agentId: editAgent.id,
                acceptedConfirmationData: [{ _type: 'toEditTransfer', transferredTurnResults: sourceRequests.map(v => v.response?.result) }], // TODO@jrieken HACKY
                confirmation: typeof this.desc.title === 'string' ? this.desc.title : this.desc.title.value
            });
        }
        _collectWorkingSetAdditions(request, bucket) {
            for (const item of request.response?.response.value ?? []) {
                if (item.kind === 'inlineReference') {
                    bucket.add(isLocation(item.inlineReference)
                        ? item.inlineReference.uri
                        : URI.isUri(item.inlineReference)
                            ? item.inlineReference
                            : item.inlineReference.location.uri);
                }
            }
        }
        async _pickTurns(quickPickService, requests) {
            const timeThreshold = 2 * 60000; // 2 minutes
            const lastRequestTimestamp = requests[requests.length - 1].timestamp;
            const relatedRequests = requests.filter(request => request.timestamp >= 0 && lastRequestTimestamp - request.timestamp <= timeThreshold);
            const lastPick = {
                label: localize('chat.startEditing.last', "The last {0} requests", relatedRequests.length),
                detail: relatedRequests.map(req => req.message.text).join(', ')
            };
            const allPick = {
                label: localize('chat.startEditing.pickAll', "All requests from the conversation")
            };
            const customPick = {
                label: localize('chat.startEditing.pickCustom', "Manually select requests...")
            };
            const picks = relatedRequests.length !== 0
                ? [lastPick, allPick, customPick]
                : [allPick, customPick];
            const firstPick = await quickPickService.pick(picks, {
                placeHolder: localize('chat.startEditing.pickRequest', "Select requests that you want to use for editing")
            });
            if (!firstPick) {
                return [];
            }
            else if (firstPick === allPick) {
                return requests;
            }
            else if (firstPick === lastPick) {
                return relatedRequests;
            }
            const customPicks = requests.map(request => ({
                picked: false,
                request: request,
                label: request.message.text,
                detail: request.response?.response.toString(),
            }));
            return await new Promise(_resolve => {
                const resolve = (value) => {
                    store.dispose();
                    _resolve(value);
                    qp.hide();
                };
                const store = new DisposableStore();
                const qp = quickPickService.createQuickPick();
                qp.placeholder = localize('chat.startEditing.pickRequest', "Select requests that you want to use for editing");
                qp.canSelectMany = true;
                qp.items = customPicks;
                let ignore = false;
                store.add(qp.onDidChangeSelection(e => {
                    if (ignore) {
                        return;
                    }
                    ignore = true;
                    try {
                        const [first] = e;
                        const selected = [];
                        let disabled = false;
                        for (let i = 0; i < customPicks.length; i++) {
                            const oldItem = customPicks[i];
                            customPicks[i] = {
                                ...oldItem,
                                disabled,
                            };
                            disabled = disabled || oldItem === first;
                            if (disabled) {
                                selected.push(customPicks[i]);
                            }
                        }
                        qp.items = customPicks;
                        qp.selectedItems = selected;
                    }
                    finally {
                        ignore = false;
                    }
                }));
                store.add(qp.onDidAccept(_e => resolve(qp.selectedItems.map(i => i.request))));
                store.add(qp.onDidHide(_ => resolve([])));
                store.add(qp);
                qp.show();
            });
        }
    });
}
function splitMarkdownAndCodeBlocks(markdown) {
    const lexer = new marked.Lexer();
    const tokens = lexer.lex(markdown);
    const splitContent = [];
    let markdownPart = '';
    tokens.forEach((token) => {
        if (token.type === 'code') {
            if (markdownPart.trim()) {
                splitContent.push({ type: 'markdown', content: markdownPart });
                markdownPart = '';
            }
            splitContent.push({
                type: 'code',
                language: token.lang || '',
                content: token.text,
            });
        }
        else {
            markdownPart += token.raw;
        }
    });
    if (markdownPart.trim()) {
        splitContent.push({ type: 'markdown', content: markdownPart });
    }
    return splitContent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRpdGxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRUaXRsZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbkYsT0FBTyxFQUFFLFdB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