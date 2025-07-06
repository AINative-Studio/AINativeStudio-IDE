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
import { Dimension, getActiveWindow, trackFocus } from '../../../../../base/browser/dom.js';
import { createCancelablePromise, DeferredPromise } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { MicrotaskDelay } from '../../../../../base/common/symbols.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { showChatView } from '../../../chat/browser/chat.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { isCellTextEditOperation } from '../../../chat/common/chatModel.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { InlineChatWidget } from '../../../inlineChat/browser/inlineChatWidget.js';
import { MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { TerminalStickyScrollContribution } from '../../stickyScroll/browser/terminalStickyScrollContribution.js';
import './media/terminalChatWidget.css';
import { MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR, MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
var Constants;
(function (Constants) {
    Constants[Constants["HorizontalMargin"] = 10] = "HorizontalMargin";
    Constants[Constants["VerticalMargin"] = 30] = "VerticalMargin";
    /** The right padding of the widget, this should align exactly with that in the editor. */
    Constants[Constants["RightPadding"] = 12] = "RightPadding";
    /** The max allowed height of the widget. */
    Constants[Constants["MaxHeight"] = 480] = "MaxHeight";
    /** The max allowed height of the widget as a percentage of the terminal viewport. */
    Constants[Constants["MaxHeightPercentageOfViewport"] = 0.75] = "MaxHeightPercentageOfViewport";
})(Constants || (Constants = {}));
var Message;
(function (Message) {
    Message[Message["None"] = 0] = "None";
    Message[Message["AcceptSession"] = 1] = "AcceptSession";
    Message[Message["CancelSession"] = 2] = "CancelSession";
    Message[Message["PauseSession"] = 4] = "PauseSession";
    Message[Message["CancelRequest"] = 8] = "CancelRequest";
    Message[Message["CancelInput"] = 16] = "CancelInput";
    Message[Message["AcceptInput"] = 32] = "AcceptInput";
    Message[Message["ReturnInput"] = 64] = "ReturnInput";
})(Message || (Message = {}));
let TerminalChatWidget = class TerminalChatWidget extends Disposable {
    get inlineChatWidget() { return this._inlineChatWidget; }
    get lastResponseContent() {
        return this._lastResponseContent;
    }
    constructor(_terminalElement, _instance, _xterm, contextKeyService, _chatService, _storageService, _viewsService, instantiationService, _chatAgentService) {
        super();
        this._terminalElement = _terminalElement;
        this._instance = _instance;
        this._xterm = _xterm;
        this._chatService = _chatService;
        this._storageService = _storageService;
        this._viewsService = _viewsService;
        this._chatAgentService = _chatAgentService;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._messages = this._store.add(new Emitter());
        this._viewStateStorageKey = 'terminal-inline-chat-view-state';
        this._terminalAgentName = 'terminal';
        this._model = this._register(new MutableDisposable());
        this._requestInProgress = observableValue(this, false);
        this.requestInProgress = this._requestInProgress;
        this._focusedContextKey = TerminalChatContextKeys.focused.bindTo(contextKeyService);
        this._visibleContextKey = TerminalChatContextKeys.visible.bindTo(contextKeyService);
        this._requestActiveContextKey = TerminalChatContextKeys.requestActive.bindTo(contextKeyService);
        this._responseContainsCodeBlockContextKey = TerminalChatContextKeys.responseContainsCodeBlock.bindTo(contextKeyService);
        this._responseContainsMulitpleCodeBlocksContextKey = TerminalChatContextKeys.responseContainsMultipleCodeBlocks.bindTo(contextKeyService);
        this._container = document.createElement('div');
        this._container.classList.add('terminal-inline-chat');
        this._terminalElement.appendChild(this._container);
        this._inlineChatWidget = instantiationService.createInstance(InlineChatWidget, {
            location: ChatAgentLocation.Terminal,
            resolveData: () => {
                // TODO@meganrogge return something that identifies this terminal
                return undefined;
            }
        }, {
            statusMenuId: {
                menu: MENU_TERMINAL_CHAT_WIDGET_STATUS,
                options: {
                    buttonConfigProvider: action => ({
                        showLabel: action.id !== "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        showIcon: action.id === "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        isSecondary: action.id !== "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */ && action.id !== "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */
                    })
                }
            },
            secondaryMenuId: MENU_INLINE_CHAT_WIDGET_SECONDARY,
            chatWidgetViewOptions: {
                menus: {
                    telemetrySource: 'terminal-inline-chat',
                    executeToolbar: MenuId.ChatExecute,
                    inputSideToolbar: MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR,
                }
            }
        });
        this._register(this._inlineChatWidget.chatWidget.onDidChangeViewModel(() => this._saveViewState()));
        this._register(Event.any(this._inlineChatWidget.onDidChangeHeight, this._instance.onDimensionsChanged, this._inlineChatWidget.chatWidget.onDidChangeContentHeight, Event.debounce(this._xterm.raw.onCursorMove, () => void 0, MicrotaskDelay))(() => this._relayout()));
        const observer = new ResizeObserver(() => this._relayout());
        observer.observe(this._terminalElement);
        this._register(toDisposable(() => observer.disconnect()));
        this._resetPlaceholder();
        this._container.appendChild(this._inlineChatWidget.domNode);
        this._focusTracker = this._register(trackFocus(this._container));
        this._register(this._focusTracker.onDidFocus(() => this._focusedContextKey.set(true)));
        this._register(this._focusTracker.onDidBlur(() => this._focusedContextKey.set(false)));
        this._register(autorun(r => {
            const isBusy = this._inlineChatWidget.requestInProgress.read(r);
            this._container.classList.toggle('busy', isBusy);
            this._inlineChatWidget.toggleStatus(!!this._inlineChatWidget.responseContent);
            if (isBusy || !this._inlineChatWidget.responseContent) {
                this._responseContainsCodeBlockContextKey.set(false);
                this._responseContainsMulitpleCodeBlocksContextKey.set(false);
            }
            else {
                Promise.all([
                    this._inlineChatWidget.getCodeBlockInfo(0),
                    this._inlineChatWidget.getCodeBlockInfo(1)
                ]).then(([firstCodeBlock, secondCodeBlock]) => {
                    this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                    this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                    this._inlineChatWidget.updateToolbar(true);
                });
            }
        }));
        this.hide();
    }
    _relayout() {
        if (this._dimension) {
            this._doLayout();
        }
    }
    _doLayout() {
        const xtermElement = this._xterm.raw.element;
        if (!xtermElement) {
            return;
        }
        const style = getActiveWindow().getComputedStyle(xtermElement);
        // Calculate width
        const xtermLeftPadding = parseInt(style.paddingLeft);
        const width = xtermElement.clientWidth - xtermLeftPadding - 12 /* Constants.RightPadding */;
        if (width === 0) {
            return;
        }
        // Calculate height
        const terminalViewportHeight = this._getTerminalViewportHeight();
        const widgetAllowedPercentBasedHeight = (terminalViewportHeight ?? 0) * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (height === 0) {
            return;
        }
        // Layout
        this._dimension = new Dimension(width, height);
        this._inlineChatWidget.layout(this._dimension);
        this._inlineChatWidget.domNode.style.paddingLeft = `${xtermLeftPadding}px`;
        this._updateXtermViewportPosition();
    }
    _resetPlaceholder() {
        const defaultAgent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Terminal);
        this.inlineChatWidget.placeholder = defaultAgent?.description ?? localize('askAI', 'Ask AI');
    }
    async reveal(viewState) {
        await this._createSession(viewState);
        this._doLayout();
        this._container.classList.remove('hide');
        this._visibleContextKey.set(true);
        this._resetPlaceholder();
        this._inlineChatWidget.focus();
        this._instance.scrollToBottom();
    }
    _getTerminalCursorTop() {
        const font = this._instance.xterm?.getFont();
        if (!font?.charHeight) {
            return;
        }
        const terminalWrapperHeight = this._getTerminalViewportHeight() ?? 0;
        const cellHeight = font.charHeight * font.lineHeight;
        const topPadding = terminalWrapperHeight - (this._instance.rows * cellHeight);
        const cursorY = (this._instance.xterm?.raw.buffer.active.cursorY ?? 0) + 1;
        return topPadding + cursorY * cellHeight;
    }
    _updateXtermViewportPosition() {
        const top = this._getTerminalCursorTop();
        if (!top) {
            return;
        }
        this._container.style.top = `${top}px`;
        const terminalViewportHeight = this._getTerminalViewportHeight();
        if (!terminalViewportHeight) {
            return;
        }
        const widgetAllowedPercentBasedHeight = terminalViewportHeight * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (top > terminalViewportHeight - height && terminalViewportHeight - height > 0) {
            this._setTerminalViewportOffset(top - (terminalViewportHeight - height));
        }
        else {
            this._setTerminalViewportOffset(undefined);
        }
    }
    _getTerminalViewportHeight() {
        return this._terminalElement.clientHeight;
    }
    hide() {
        this._container.classList.add('hide');
        this._inlineChatWidget.reset();
        this._resetPlaceholder();
        this._inlineChatWidget.updateToolbar(false);
        this._visibleContextKey.set(false);
        this._inlineChatWidget.value = '';
        this._instance.focus();
        this._setTerminalViewportOffset(undefined);
        this._onDidHide.fire();
    }
    _setTerminalViewportOffset(offset) {
        if (offset === undefined || this._container.classList.contains('hide')) {
            this._terminalElement.style.position = '';
            this._terminalElement.style.bottom = '';
            TerminalStickyScrollContribution.get(this._instance)?.hideUnlock();
        }
        else {
            this._terminalElement.style.position = 'relative';
            this._terminalElement.style.bottom = `${offset}px`;
            TerminalStickyScrollContribution.get(this._instance)?.hideLock();
        }
    }
    focus() {
        this.inlineChatWidget.focus();
    }
    hasFocus() {
        return this._inlineChatWidget.hasFocus();
    }
    setValue(value) {
        this._inlineChatWidget.value = value ?? '';
    }
    async acceptCommand(shouldExecute) {
        const code = await this.inlineChatWidget.getCodeBlockInfo(0);
        if (!code) {
            return;
        }
        const value = code.getValue();
        this._instance.runCommand(value, shouldExecute);
        this.clear();
    }
    get focusTracker() {
        return this._focusTracker;
    }
    async _createSession(viewState) {
        this._sessionCtor = createCancelablePromise(async (token) => {
            if (!this._model.value) {
                this._model.value = this._chatService.startSession(ChatAgentLocation.Terminal, token);
                const model = this._model.value;
                if (model) {
                    this._inlineChatWidget.setChatModel(model, this._loadViewState());
                    model.waitForInitialization().then(() => {
                        if (token.isCancellationRequested) {
                            return;
                        }
                        this._resetPlaceholder();
                    });
                }
                if (!this._model.value) {
                    throw new Error('Failed to start chat session');
                }
            }
        });
        this._register(toDisposable(() => this._sessionCtor?.cancel()));
    }
    _loadViewState() {
        const rawViewState = this._storageService.get(this._viewStateStorageKey, 0 /* StorageScope.PROFILE */, undefined);
        let viewState;
        if (rawViewState) {
            try {
                viewState = JSON.parse(rawViewState);
            }
            catch {
                viewState = undefined;
            }
        }
        return viewState;
    }
    _saveViewState() {
        this._storageService.store(this._viewStateStorageKey, JSON.stringify(this._inlineChatWidget.chatWidget.getViewState()), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    clear() {
        this.cancel();
        this._model.clear();
        this._responseContainsCodeBlockContextKey.reset();
        this._requestActiveContextKey.reset();
        this.hide();
        this.setValue(undefined);
    }
    async acceptInput(query, options) {
        if (!this._model.value) {
            await this.reveal();
        }
        this._messages.fire(32 /* Message.AcceptInput */);
        const lastInput = this._inlineChatWidget.value;
        if (!lastInput) {
            return;
        }
        this._activeRequestCts?.cancel();
        this._activeRequestCts = new CancellationTokenSource();
        const store = new DisposableStore();
        this._requestActiveContextKey.set(true);
        const response = await this._inlineChatWidget.chatWidget.acceptInput(lastInput, { isVoiceInput: options?.isVoiceInput });
        this._currentRequestId = response?.requestId;
        const responsePromise = new DeferredPromise();
        try {
            this._requestActiveContextKey.set(true);
            if (response) {
                store.add(response.onDidChange(async () => {
                    if (response.isCanceled) {
                        this._requestActiveContextKey.set(false);
                        responsePromise.complete(undefined);
                        return;
                    }
                    if (response.isComplete) {
                        this._requestActiveContextKey.set(false);
                        this._requestActiveContextKey.set(false);
                        const firstCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(0);
                        const secondCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(1);
                        this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                        this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                        this._inlineChatWidget.updateToolbar(true);
                        responsePromise.complete(response);
                    }
                }));
            }
            await responsePromise.p;
            this._lastResponseContent = response?.response.getMarkdown();
            return response;
        }
        catch {
            this._lastResponseContent = undefined;
            return;
        }
        finally {
            store.dispose();
        }
    }
    cancel() {
        this._sessionCtor?.cancel();
        this._sessionCtor = undefined;
        this._activeRequestCts?.cancel();
        this._requestActiveContextKey.set(false);
        const model = this._inlineChatWidget.getChatModel();
        if (!model?.sessionId) {
            return;
        }
        this._chatService.cancelCurrentRequestForSession(model?.sessionId);
    }
    async viewInChat() {
        const widget = await showChatView(this._viewsService);
        const currentRequest = this._inlineChatWidget.chatWidget.viewModel?.model.getRequests().find(r => r.id === this._currentRequestId);
        if (!widget || !currentRequest?.response) {
            return;
        }
        const message = [];
        for (const item of currentRequest.response.response.value) {
            if (item.kind === 'textEditGroup') {
                for (const group of item.edits) {
                    message.push({
                        kind: 'textEdit',
                        edits: group,
                        uri: item.uri
                    });
                }
            }
            else if (item.kind === 'notebookEditGroup') {
                for (const group of item.edits) {
                    if (isCellTextEditOperation(group)) {
                        message.push({
                            kind: 'textEdit',
                            edits: [group.edit],
                            uri: group.uri
                        });
                    }
                    else {
                        message.push({
                            kind: 'notebookEdit',
                            edits: [group],
                            uri: item.uri
                        });
                    }
                }
            }
            else {
                message.push(item);
            }
        }
        this._chatService.addCompleteRequest(widget.viewModel.sessionId, `@${this._terminalAgentName} ${currentRequest.message.text}`, currentRequest.variableData, currentRequest.attempt, {
            message,
            result: currentRequest.response.result,
            followups: currentRequest.response.followups
        });
        widget.focusLastMessage();
        this.hide();
    }
};
TerminalChatWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IStorageService),
    __param(6, IViewsService),
    __param(7, IInstantiationService),
    __param(8, IChatAgentService)
], TerminalChatWidget);
export { TerminalChatWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQWlCLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2SCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG1EQUFtRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFB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