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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRpdGxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0VGl0bGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxX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