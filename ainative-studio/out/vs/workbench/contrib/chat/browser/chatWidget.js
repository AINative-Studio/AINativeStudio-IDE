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
var ChatWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { disposableTimeout, timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { memoize } from '../../../../base/common/decorators.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { combinedDisposable, Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorunWithStore, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { extUri, isEqual } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { buttonSecondaryBackground, buttonSecondaryForeground, buttonSecondaryHoverBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { checkModeOption } from '../common/chat.js';
import { IChatAgentService, isChatWelcomeMessageContent } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, decidedChatEditingResourceContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService, inChatEditingSessionContextKey } from '../common/chatEditingService.js';
import { chatAgentLeader, ChatRequestAgentPart, chatSubcommandLeader, formatChatQuestion } from '../common/chatParserTypes.js';
import { ChatRequestParser } from '../common/chatRequestParser.js';
import { IChatService } from '../common/chatService.js';
import { IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatViewModel, isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from '../common/constants.js';
import { IChatAccessibilityService, IChatWidgetService } from './chat.js';
import { ChatAccessibilityProvider } from './chatAccessibilityProvider.js';
import { ChatInputPart } from './chatInputPart.js';
import { ChatListDelegate, ChatListItemRenderer } from './chatListRenderer.js';
import { ChatEditorOptions } from './chatOptions.js';
import './media/chat.css';
import './media/chatAgentHover.css';
import './media/chatViewWelcome.css';
import { ChatViewWelcomePart } from './viewsWelcome/chatViewWelcomeController.js';
const $ = dom.$;
export function isQuickChat(widget) {
    return 'viewContext' in widget && 'isQuickChat' in widget.viewContext && Boolean(widget.viewContext.isQuickChat);
}
const PersistWelcomeMessageContentKey = 'chat.welcomeMessageContent';
let ChatWidget = class ChatWidget extends Disposable {
    static { ChatWidget_1 = this; }
    static { this.CONTRIBS = []; }
    get visible() {
        return this._visible;
    }
    set viewModel(viewModel) {
        if (this._viewModel === viewModel) {
            return;
        }
        this.viewModelDisposables.clear();
        this._viewModel = viewModel;
        if (viewModel) {
            this.viewModelDisposables.add(viewModel);
        }
        this._onDidChangeViewModel.fire();
    }
    get viewModel() {
        return this._viewModel;
    }
    get parsedInput() {
        if (this.parsedChatRequest === undefined) {
            if (!this.viewModel) {
                return { text: '', parts: [] };
            }
            this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(this.viewModel.sessionId, this.getInput(), this.location, { selectedAgent: this._lastSelectedAgent, mode: this.input.currentMode });
        }
        return this.parsedChatRequest;
    }
    get scopedContextKeyService() {
        return this.contextKeyService;
    }
    get location() {
        return this._location.location;
    }
    get isUnifiedPanelWidget() {
        return this._location.location === ChatAgentLocation.Panel && !!this.viewOptions.supportsChangingModes && this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
    }
    constructor(location, _viewContext, viewOptions, styles, codeEditorService, configurationService, contextKeyService, instantiationService, chatService, chatAgentService, chatWidgetService, contextMenuService, chatAccessibilityService, logService, themeService, chatSlashCommandService, chatEditingService, storageService, telemetryService) {
        super();
        this.viewOptions = viewOptions;
        this.styles = styles;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.chatWidgetService = chatWidgetService;
        this.contextMenuService = contextMenuService;
        this.chatAccessibilityService = chatAccessibilityService;
        this.logService = logService;
        this.themeService = themeService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this._onDidSubmitAgent = this._register(new Emitter());
        this.onDidSubmitAgent = this._onDidSubmitAgent.event;
        this._onDidChangeAgent = this._register(new Emitter());
        this.onDidChangeAgent = this._onDidChangeAgent.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidChangeViewModel = this._register(new Emitter());
        this.onDidChangeViewModel = this._onDidChangeViewModel.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidClear = this._register(new Emitter());
        this.onDidClear = this._onDidClear.event;
        this._onDidAcceptInput = this._register(new Emitter());
        this.onDidAcceptInput = this._onDidAcceptInput.event;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidChangeParsedInput = this._register(new Emitter());
        this.onDidChangeParsedInput = this._onDidChangeParsedInput.event;
        this._onWillMaybeChangeHeight = new Emitter();
        this.onWillMaybeChangeHeight = this._onWillMaybeChangeHeight.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidChangeContentHeight = new Emitter();
        this.onDidChangeContentHeight = this._onDidChangeContentHeight.event;
        this.contribs = [];
        this.welcomePart = this._register(new MutableDisposable());
        this.visibleChangeCount = 0;
        this._visible = false;
        this.previousTreeScrollHeight = 0;
        /**
         * Whether the list is scroll-locked to the bottom. Initialize to true so that we can scroll to the bottom on first render.
         * The initial render leads to a lot of `onDidChangeTreeContentHeight` as the renderer works out the real heights of rows.
         */
        this.scrollLock = true;
        this.viewModelDisposables = this._register(new DisposableStore());
        this._editingSession = observableValue(this, undefined);
        this.viewContext = _viewContext ?? {};
        const viewModelObs = observableFromEvent(this, this.onDidChangeViewModel, () => this.viewModel);
        if (typeof location === 'object') {
            this._location = location;
        }
        else {
            this._location = { location };
        }
        ChatContextKeys.inChatSession.bindTo(contextKeyService).set(true);
        ChatContextKeys.location.bindTo(contextKeyService).set(this._location.location);
        ChatContextKeys.inQuickChat.bindTo(contextKeyService).set(isQuickChat(this));
        ChatContextKeys.inUnifiedChat.bindTo(contextKeyService)
            .set(this._location.location === ChatAgentLocation.Panel && !!this.viewOptions.supportsChangingModes && this.configurationService.getValue(ChatConfiguration.UnifiedChatView));
        this.agentInInput = ChatContextKeys.inputHasAgent.bindTo(contextKeyService);
        this.requestInProgress = ChatContextKeys.requestInProgress.bindTo(contextKeyService);
        this.isRequestPaused = ChatContextKeys.isRequestPaused.bindTo(contextKeyService);
        this.canRequestBePaused = ChatContextKeys.canRequestBePaused.bindTo(contextKeyService);
        this._register(bindContextKey(decidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return;
            }
            const entries = currentSession.entries.read(reader);
            const decidedEntries = entries.filter(entry => entry.state.read(reader) !== 0 /* WorkingSetEntryState.Modified */);
            return decidedEntries.map(entry => entry.entryId);
        }));
        this._register(bindContextKey(hasUndecidedChatEditingResourceContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            const entries = currentSession?.entries.read(reader) ?? []; // using currentSession here
            const decidedEntries = entries.filter(entry => entry.state.read(reader) === 0 /* WorkingSetEntryState.Modified */);
            return decidedEntries.length > 0;
        }));
        this._register(bindContextKey(hasAppliedChatEditsContextKey, contextKeyService, (reader) => {
            const currentSession = this._editingSession.read(reader);
            if (!currentSession) {
                return false;
            }
            const entries = currentSession.entries.read(reader);
            return entries.length > 0;
        }));
        this._register(bindContextKey(inChatEditingSessionContextKey, contextKeyService, (reader) => {
            return this._editingSession.read(reader) !== null;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanUndo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canUndo.read(r) || false;
        }));
        this._register(bindContextKey(ChatContextKeys.chatEditingCanRedo, contextKeyService, (r) => {
            return this._editingSession.read(r)?.canRedo.read(r) || false;
        }));
        this._register(bindContextKey(applyingChatEditsFailedContextKey, contextKeyService, (r) => {
            const chatModel = viewModelObs.read(r)?.model;
            const editingSession = this._editingSession.read(r);
            if (!editingSession || !chatModel) {
                return false;
            }
            const lastResponse = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)?.response).read(r);
            return lastResponse?.result?.errorDetails && !lastResponse?.result?.errorDetails.responseIsIncomplete;
        }));
        this._codeBlockModelCollection = this._register(instantiationService.createInstance(CodeBlockModelCollection, undefined));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('chat.renderRelatedFiles')) {
                this.renderChatEditingSessionState();
            }
        }));
        this._register(autorunWithStore((r, store) => {
            const viewModel = viewModelObs.read(r);
            const sessions = chatEditingService.editingSessionsObs.read(r);
            const session = sessions.find(candidate => candidate.chatSessionId === viewModel?.sessionId);
            this._editingSession.set(undefined, undefined);
            this.renderChatEditingSessionState(); // this is necessary to make sure we dispose previous buttons, etc.
            if (!session) {
                // none or for a different chat widget
                return;
            }
            this._editingSession.set(session, undefined);
            store.add(session.onDidChange(() => {
                this.renderChatEditingSessionState();
            }));
            store.add(session.onDidDispose(() => {
                this._editingSession.set(undefined, undefined);
                this.renderChatEditingSessionState();
            }));
            store.add(this.onDidChangeParsedInput(() => {
                this.renderChatEditingSessionState();
            }));
            store.add(this.inputEditor.onDidChangeModelContent(() => {
                if (this.getInput() === '') {
                    this.refreshParsedInput();
                    this.renderChatEditingSessionState();
                }
            }));
            this.renderChatEditingSessionState();
        }));
        this._register(codeEditorService.registerCodeEditorOpenHandler(async (input, _source, _sideBySide) => {
            const resource = input.resource;
            if (resource.scheme !== Schemas.vscodeChatCodeBlock) {
                return null;
            }
            const responseId = resource.path.split('/').at(1);
            if (!responseId) {
                return null;
            }
            const item = this.viewModel?.getItems().find(item => item.id === responseId);
            if (!item) {
                return null;
            }
            // TODO: needs to reveal the chat view
            this.reveal(item);
            await timeout(0); // wait for list to actually render
            for (const codeBlockPart of this.renderer.editorsInUse()) {
                if (extUri.isEqual(codeBlockPart.uri, resource, true)) {
                    const editor = codeBlockPart.editor;
                    let relativeTop = 0;
                    const editorDomNode = editor.getDomNode();
                    if (editorDomNode) {
                        const row = dom.findParentWithClass(editorDomNode, 'monaco-list-row');
                        if (row) {
                            relativeTop = dom.getTopLeftOffset(editorDomNode).top - dom.getTopLeftOffset(row).top;
                        }
                    }
                    if (input.options?.selection) {
                        const editorSelectionTopOffset = editor.getTopForPosition(input.options.selection.startLineNumber, input.options.selection.startColumn);
                        relativeTop += editorSelectionTopOffset;
                        editor.focus();
                        editor.setSelection({
                            startLineNumber: input.options.selection.startLineNumber,
                            startColumn: input.options.selection.startColumn,
                            endLineNumber: input.options.selection.endLineNumber ?? input.options.selection.startLineNumber,
                            endColumn: input.options.selection.endColumn ?? input.options.selection.startColumn
                        });
                    }
                    this.reveal(item, relativeTop);
                    return editor;
                }
            }
            return null;
        }));
        const loadedWelcomeContent = storageService.getObject(`${PersistWelcomeMessageContentKey}.${this.location}`, -1 /* StorageScope.APPLICATION */);
        if (isChatWelcomeMessageContent(loadedWelcomeContent)) {
            this.persistedWelcomeMessage = loadedWelcomeContent;
        }
        this._register(this.onDidChangeParsedInput(() => this.updateChatInputContext()));
    }
    set lastSelectedAgent(agent) {
        this.parsedChatRequest = undefined;
        this._lastSelectedAgent = agent;
        this._onDidChangeParsedInput.fire();
    }
    get lastSelectedAgent() {
        return this._lastSelectedAgent;
    }
    get supportsFileReferences() {
        return !!this.viewOptions.supportsFileReferences;
    }
    get input() {
        return this.inputPart;
    }
    get inputEditor() {
        return this.inputPart.inputEditor;
    }
    get inputUri() {
        return this.inputPart.inputUri;
    }
    get contentHeight() {
        return this.inputPart.contentHeight + this.tree.contentHeight;
    }
    get attachmentModel() {
        return this.inputPart.attachmentModel;
    }
    render(parent) {
        const viewId = 'viewId' in this.viewContext ? this.viewContext.viewId : undefined;
        this.editorOptions = this._register(this.instantiationService.createInstance(ChatEditorOptions, viewId, this.styles.listForeground, this.styles.inputEditorBackground, this.styles.resultEditorBackground));
        const renderInputOnTop = this.viewOptions.renderInputOnTop ?? false;
        const renderFollowups = this.viewOptions.renderFollowups ?? !renderInputOnTop;
        const renderStyle = this.viewOptions.renderStyle;
        this.container = dom.append(parent, $('.interactive-session'));
        this.welcomeMessageContainer = dom.append(this.container, $('.chat-welcome-view-container', { style: 'display: none' }));
        if (renderInputOnTop) {
            this.createInput(this.container, { renderFollowups, renderStyle });
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
        }
        else {
            this.listContainer = dom.append(this.container, $(`.interactive-list`));
            this.createInput(this.container, { renderFollowups, renderStyle });
        }
        this.renderWelcomeViewContentIfNeeded();
        this.createList(this.listContainer, { ...this.viewOptions.rendererOptions, renderStyle });
        const scrollDownButton = this._register(new Button(this.listContainer, {
            supportIcons: true,
            buttonBackground: asCssVariable(buttonSecondaryBackground),
            buttonForeground: asCssVariable(buttonSecondaryForeground),
            buttonHoverBackground: asCssVariable(buttonSecondaryHoverBackground),
        }));
        scrollDownButton.element.classList.add('chat-scroll-down');
        scrollDownButton.label = `$(${Codicon.chevronDown.id})`;
        scrollDownButton.setTitle(localize('scrollDownButtonLabel', "Scroll down"));
        this._register(scrollDownButton.onDidClick(() => {
            this.scrollLock = true;
            this.scrollToEnd();
        }));
        this._register(this.editorOptions.onDidChange(() => this.onDidStyleChange()));
        this.onDidStyleChange();
        // Do initial render
        if (this.viewModel) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.contribs = ChatWidget_1.CONTRIBS.map(contrib => {
            try {
                return this._register(this.instantiationService.createInstance(contrib, this));
            }
            catch (err) {
                this.logService.error('Failed to instantiate chat widget contrib', toErrorMessage(err));
                return undefined;
            }
        }).filter(isDefined);
        this._register(this.chatWidgetService.register(this));
    }
    scrollToEnd() {
        if (this.lastItem) {
            const offset = Math.max(this.lastItem.currentRenderedHeight ?? 0, 1e6);
            this.tree.reveal(this.lastItem, offset);
        }
    }
    getContrib(id) {
        return this.contribs.find(c => c.id === id);
    }
    focusInput() {
        this.inputPart.focus();
        // Sometimes focusing the input part is not possible,
        // but we'd like to be the last focused chat widget,
        // so we emit an optimistic onDidFocus event nonetheless.
        this._onDidFocus.fire();
    }
    hasInputFocus() {
        return this.inputPart.hasFocus();
    }
    refreshParsedInput() {
        if (!this.viewModel) {
            return;
        }
        this.parsedChatRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(this.viewModel.sessionId, this.getInput(), this.location, { selectedAgent: this._lastSelectedAgent, mode: this.input.currentMode });
        this._onDidChangeParsedInput.fire();
    }
    getSibling(item, type) {
        if (!isResponseVM(item)) {
            return;
        }
        const items = this.viewModel?.getItems();
        if (!items) {
            return;
        }
        const responseItems = items.filter(i => isResponseVM(i));
        const targetIndex = responseItems.indexOf(item);
        if (targetIndex === undefined) {
            return;
        }
        const indexToFocus = type === 'next' ? targetIndex + 1 : targetIndex - 1;
        if (indexToFocus < 0 || indexToFocus > responseItems.length - 1) {
            return;
        }
        return responseItems[indexToFocus];
    }
    clear() {
        if (this._dynamicMessageLayoutData) {
            this._dynamicMessageLayoutData.enabled = true;
        }
        this._onDidClear.fire();
    }
    onDidChangeItems(skipDynamicLayout) {
        if (this._visible || !this.viewModel) {
            const treeItems = (this.viewModel?.getItems() ?? [])
                .map((item) => {
                return {
                    element: item,
                    collapsed: false,
                    collapsible: false
                };
            });
            this.renderWelcomeViewContentIfNeeded();
            this._onWillMaybeChangeHeight.fire();
            this.lastItem = treeItems.at(-1)?.element;
            ChatContextKeys.lastItemId.bindTo(this.contextKeyService).set(this.lastItem ? [this.lastItem.id] : []);
            this.tree.setChildren(null, treeItems, {
                diffIdentityProvider: {
                    getId: (element) => {
                        return element.dataId +
                            // Ensure re-rendering an element once slash commands are loaded, so the colorization can be applied.
                            `${(isRequestVM(element)) /* && !!this.lastSlashCommands ? '_scLoaded' : '' */}` +
                            // If a response is in the process of progressive rendering, we need to ensure that it will
                            // be re-rendered so progressive rendering is restarted, even if the model wasn't updated.
                            `${isResponseVM(element) && element.renderData ? `_${this.visibleChangeCount}` : ''}` +
                            // Re-render once content references are loaded
                            (isResponseVM(element) ? `_${element.contentReferences.length}` : '') +
                            // Re-render if element becomes hidden due to undo/redo
                            `_${element.shouldBeRemovedOnSend ? `${element.shouldBeRemovedOnSend.afterUndoStop || '1'}` : '0'}` +
                            // Rerender request if we got new content references in the response
                            // since this may change how we render the corresponding attachments in the request
                            (isRequestVM(element) && element.contentReferences ? `_${element.contentReferences?.length}` : '') +
                            (isResponseVM(element) && element.model.isPaused.get() ? '_paused' : '');
                    },
                }
            });
            if (!skipDynamicLayout && this._dynamicMessageLayoutData) {
                this.layoutDynamicChatTreeItemMode();
            }
            if (this.lastItem && isResponseVM(this.lastItem) && this.lastItem.isComplete) {
                this.renderFollowups(this.lastItem.replyFollowups, this.lastItem);
            }
            else if (!treeItems.length && this.viewModel) {
                this.renderSampleQuestions();
            }
            else {
                this.renderFollowups(undefined);
            }
        }
    }
    renderWelcomeViewContentIfNeeded() {
        if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal') {
            return;
        }
        const numItems = this.viewModel?.getItems().length ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(this.location, this.input.currentMode);
        const welcomeContent = defaultAgent?.metadata.welcomeMessageContent ?? this.persistedWelcomeMessage;
        if (welcomeContent && !numItems && (this.welcomeMessageContainer.children.length === 0 || this.chatService.unifiedViewEnabled)) {
            dom.clearNode(this.welcomeMessageContainer);
            const tips = this.viewOptions.supportsAdditionalParticipants
                ? new MarkdownString(localize('chatWidget.tips', "{0} or type {1} to attach context\n\n{2} to chat with extensions\n\nType {3} to use commands", '$(attach)', '#', '$(mention)', '/'), { supportThemeIcons: true })
                : new MarkdownString(localize('chatWidget.tips.withoutParticipants', "{0} or type {1} to attach context", '$(attach)', '#'), { supportThemeIcons: true });
            this.welcomePart.value = this.instantiationService.createInstance(ChatViewWelcomePart, { ...welcomeContent, tips, }, {
                location: this.location,
                isWidgetAgentWelcomeViewContent: this.input?.currentMode === ChatMode.Agent
            });
            dom.append(this.welcomeMessageContainer, this.welcomePart.value.element);
        }
        if (this.viewModel) {
            dom.setVisibility(numItems === 0, this.welcomeMessageContainer);
            dom.setVisibility(numItems !== 0, this.listContainer);
        }
    }
    async renderChatEditingSessionState() {
        if (!this.inputPart) {
            return;
        }
        this.inputPart.renderChatEditingSessionState(this._editingSession.get() ?? null);
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    renderSampleQuestions() {
        if (this.viewModel?.getItems().length === 0) {
            // TODO@roblourens hack- only Chat mode supports sample questions
            this.renderFollowups(this.input.currentMode === ChatMode.Ask ? this.viewModel.model.sampleQuestions : undefined);
        }
    }
    async renderFollowups(items, response) {
        this.inputPart.renderFollowups(items, response);
        if (this.bodyDimension) {
            this.layout(this.bodyDimension.height, this.bodyDimension.width);
        }
    }
    setVisible(visible) {
        const wasVisible = this._visible;
        this._visible = visible;
        this.visibleChangeCount++;
        this.renderer.setVisible(visible);
        this.input.setVisible(visible);
        if (visible) {
            this._register(disposableTimeout(() => {
                // Progressive rendering paused while hidden, so start it up again.
                // Do it after a timeout because the container is not visible yet (it should be but offsetHeight returns 0 here)
                if (this._visible) {
                    this.onDidChangeItems(true);
                }
            }, 0));
        }
        else if (wasVisible) {
            this._onDidHide.fire();
        }
    }
    createList(listContainer, options) {
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        const delegate = scopedInstantiationService.createInstance(ChatListDelegate, this.viewOptions.defaultElementHeight ?? 200);
        const rendererDelegate = {
            getListLength: () => this.tree.getNode(null).visibleChildrenCount,
            onDidScroll: this.onDidScroll,
            container: listContainer,
            currentChatMode: () => this.input.currentMode,
        };
        // Create a dom element to hold UI from editor widgets embedded in chat messages
        const overflowWidgetsContainer = document.createElement('div');
        overflowWidgetsContainer.classList.add('chat-overflow-widget-container', 'monaco-editor');
        listContainer.append(overflowWidgetsContainer);
        this.renderer = this._register(scopedInstantiationService.createInstance(ChatListItemRenderer, this.editorOptions, options, rendererDelegate, this._codeBlockModelCollection, overflowWidgetsContainer));
        this._register(this.renderer.onDidClickFollowup(item => {
            // is this used anymore?
            this.acceptInput(item.message);
        }));
        this._register(this.renderer.onDidClickRerunWithAgentOrCommandDetection(item => {
            const request = this.chatService.getSession(item.sessionId)?.getRequests().find(candidate => candidate.id === item.requestId);
            if (request) {
                const options = {
                    noCommandDetection: true,
                    attempt: request.attempt + 1,
                    location: this.location,
                    userSelectedModelId: this.input.currentLanguageModel,
                    hasInstructionAttachments: this.input.hasInstructionAttachments,
                    mode: this.input.currentMode,
                };
                this.chatService.resendRequest(request, options).catch(e => this.logService.error('FAILED to rerun request', e));
            }
        }));
        this.tree = this._register(scopedInstantiationService.createInstance((WorkbenchObjectTree), 'Chat', listContainer, delegate, [this.renderer], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            supportDynamicHeights: true,
            hideTwistiesOfChildlessElements: true,
            accessibilityProvider: this.instantiationService.createInstance(ChatAccessibilityProvider),
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => isRequestVM(e) ? e.message : isResponseVM(e) ? e.response.value : '' }, // TODO
            setRowLineHeight: false,
            filter: this.viewOptions.filter ? { filter: this.viewOptions.filter.bind(this.viewOptions), } : undefined,
            scrollToActiveElement: true,
            overrideStyles: {
                listFocusBackground: this.styles.listBackground,
                listInactiveFocusBackground: this.styles.listBackground,
                listActiveSelectionBackground: this.styles.listBackground,
                listFocusAndSelectionBackground: this.styles.listBackground,
                listInactiveSelectionBackground: this.styles.listBackground,
                listHoverBackground: this.styles.listBackground,
                listBackground: this.styles.listBackground,
                listFocusForeground: this.styles.listForeground,
                listHoverForeground: this.styles.listForeground,
                listInactiveFocusForeground: this.styles.listForeground,
                listInactiveSelectionForeground: this.styles.listForeground,
                listActiveSelectionForeground: this.styles.listForeground,
                listFocusAndSelectionForeground: this.styles.listForeground,
                listActiveSelectionIconForeground: undefined,
                listInactiveSelectionIconForeground: undefined,
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeContentHeight(() => {
            this.onDidChangeTreeContentHeight();
        }));
        this._register(this.renderer.onDidChangeItemHeight(e => {
            this.tree.updateElementHeight(e.element, e.height);
        }));
        this._register(this.tree.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
        this._register(this.tree.onDidScroll(() => {
            this._onDidScroll.fire();
            const isScrolledDown = this.tree.scrollTop >= this.tree.scrollHeight - this.tree.renderHeight - 2;
            this.container.classList.toggle('show-scroll-down', !isScrolledDown && !this.scrollLock);
        }));
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selected = e.element;
        const scopedContextKeyService = this.contextKeyService.createOverlay([
            [ChatContextKeys.responseIsFiltered.key, isResponseVM(selected) && !!selected.errorDetails?.responseIsFiltered]
        ]);
        this.contextMenuService.showContextMenu({
            menuId: MenuId.ChatContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => selected,
        });
    }
    onDidChangeTreeContentHeight() {
        // If the list was previously scrolled all the way down, ensure it stays scrolled down, if scroll lock is on
        if (this.tree.scrollHeight !== this.previousTreeScrollHeight) {
            const lastItem = this.viewModel?.getItems().at(-1);
            const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
            if (!lastResponseIsRendering || this.scrollLock) {
                // Due to rounding, the scrollTop + renderHeight will not exactly match the scrollHeight.
                // Consider the tree to be scrolled all the way down if it is within 2px of the bottom.
                const lastElementWasVisible = this.tree.scrollTop + this.tree.renderHeight >= this.previousTreeScrollHeight - 2;
                if (lastElementWasVisible) {
                    dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                        // Can't set scrollTop during this event listener, the list might overwrite the change
                        this.scrollToEnd();
                    }, 0);
                }
            }
        }
        // TODO@roblourens add `show-scroll-down` class when button should show
        // Show the button when content height changes, the list is not fully scrolled down, and (the latest response is currently rendering OR I haven't yet scrolled all the way down since the last response)
        // So for example it would not reappear if I scroll up and delete a message
        this.previousTreeScrollHeight = this.tree.scrollHeight;
        this._onDidChangeContentHeight.fire();
    }
    getWidgetViewKindTag() {
        if (!this.viewContext) {
            return 'editor';
        }
        else if ('viewId' in this.viewContext) {
            return 'view';
        }
        else {
            return 'quick';
        }
    }
    createInput(container, options) {
        this.inputPart = this._register(this.instantiationService.createInstance(ChatInputPart, this.location, {
            renderFollowups: options?.renderFollowups ?? true,
            renderStyle: options?.renderStyle === 'minimal' ? 'compact' : options?.renderStyle,
            menus: { executeToolbar: MenuId.ChatExecute, ...this.viewOptions.menus },
            editorOverflowWidgetsDomNode: this.viewOptions.editorOverflowWidgetsDomNode,
            enableImplicitContext: this.viewOptions.enableImplicitContext,
            renderWorkingSet: this.viewOptions.enableWorkingSet === 'explicit',
            supportsChangingModes: this.viewOptions.supportsChangingModes,
            widgetViewKindTag: this.getWidgetViewKindTag()
        }, this.styles, () => this.collectInputState()));
        this.inputPart.render(container, '', this);
        this._register(this.inputPart.onDidLoadInputState(state => {
            this.contribs.forEach(c => {
                if (c.setInputState) {
                    const contribState = (typeof state === 'object' && state?.[c.id]) ?? {};
                    c.setInputState(contribState);
                }
            });
            this.refreshParsedInput();
        }));
        this._register(this.inputPart.onDidFocus(() => this._onDidFocus.fire()));
        this._register(this.inputPart.onDidAcceptFollowup(e => {
            if (!this.viewModel) {
                return;
            }
            let msg = '';
            if (e.followup.agentId && e.followup.agentId !== this.chatAgentService.getDefaultAgent(this.location, this.input.currentMode)?.id) {
                const agent = this.chatAgentService.getAgent(e.followup.agentId);
                if (!agent) {
                    return;
                }
                this.lastSelectedAgent = agent;
                msg = `${chatAgentLeader}${agent.name} `;
                if (e.followup.subCommand) {
                    msg += `${chatSubcommandLeader}${e.followup.subCommand} `;
                }
            }
            else if (!e.followup.agentId && e.followup.subCommand && this.chatSlashCommandService.hasCommand(e.followup.subCommand)) {
                msg = `${chatSubcommandLeader}${e.followup.subCommand} `;
            }
            msg += e.followup.message;
            this.acceptInput(msg);
            if (!e.response) {
                // Followups can be shown by the welcome message, then there is no response associated.
                // At some point we probably want telemetry for these too.
                return;
            }
            this.chatService.notifyUserAction({
                sessionId: this.viewModel.sessionId,
                requestId: e.response.requestId,
                agentId: e.response.agent?.id,
                command: e.response.slashCommand?.name,
                result: e.response.result,
                action: {
                    kind: 'followUp',
                    followup: e.followup
                },
            });
        }));
        this._register(this.inputPart.onDidChangeHeight(() => {
            if (this.bodyDimension) {
                this.layout(this.bodyDimension.height, this.bodyDimension.width);
            }
            this._onDidChangeContentHeight.fire();
        }));
        this._register(this.inputPart.attachmentModel.onDidChangeContext(() => {
            if (this._editingSession) {
                // TODO still needed? Do this inside input part and fire onDidChangeHeight?
                this.renderChatEditingSessionState();
            }
        }));
        this._register(this.inputEditor.onDidChangeModelContent(() => {
            this.parsedChatRequest = undefined;
            this.updateChatInputContext();
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            this.parsedChatRequest = undefined;
            // Tools agent loads -> welcome content changes
            this.renderWelcomeViewContentIfNeeded();
        }));
        this._register(this.input.onDidChangeCurrentChatMode(() => {
            this.renderSampleQuestions();
            this.renderWelcomeViewContentIfNeeded();
            this.refreshParsedInput();
        }));
    }
    onDidStyleChange() {
        this.container.style.setProperty('--vscode-interactive-result-editor-background-color', this.editorOptions.configuration.resultEditor.backgroundColor?.toString() ?? '');
        this.container.style.setProperty('--vscode-interactive-session-foreground', this.editorOptions.configuration.foreground?.toString() ?? '');
        this.container.style.setProperty('--vscode-chat-list-background', this.themeService.getColorTheme().getColor(this.styles.listBackground)?.toString() ?? '');
    }
    togglePaused() {
        this.viewModel?.model.toggleLastRequestPaused();
        this.onDidChangeItems();
    }
    setModel(model, viewState) {
        if (!this.container) {
            throw new Error('Call render() before setModel()');
        }
        if (model.sessionId === this.viewModel?.sessionId) {
            return;
        }
        this._codeBlockModelCollection.clear();
        this.container.setAttribute('data-session-id', model.sessionId);
        this.viewModel = this.instantiationService.createInstance(ChatViewModel, model, this._codeBlockModelCollection);
        this.viewModelDisposables.add(Event.accumulate(this.viewModel.onDidChange, 0)(events => {
            if (!this.viewModel) {
                return;
            }
            this.requestInProgress.set(this.viewModel.requestInProgress);
            this.isRequestPaused.set(this.viewModel.requestPausibility === 1 /* ChatPauseState.Paused */);
            this.canRequestBePaused.set(this.viewModel.requestPausibility !== 0 /* ChatPauseState.NotPausable */);
            this.onDidChangeItems();
            if (events.some(e => e?.kind === 'addRequest') && this.visible) {
                this.scrollToEnd();
            }
            if (this._editingSession) {
                this.renderChatEditingSessionState();
            }
        }));
        this.viewModelDisposables.add(this.viewModel.onDidDisposeModel(() => {
            // Ensure that view state is saved here, because we will load it again when a new model is assigned
            this.inputPart.saveState();
            // Disposes the viewmodel and listeners
            this.viewModel = undefined;
            this.onDidChangeItems();
        }));
        this.inputPart.initForNewChatModel(viewState, model.getRequests().length === 0);
        this.contribs.forEach(c => {
            if (c.setInputState && viewState.inputState?.[c.id]) {
                c.setInputState(viewState.inputState?.[c.id]);
            }
        });
        this.refreshParsedInput();
        this.viewModelDisposables.add(model.onDidChange((e) => {
            if (e.kind === 'setAgent') {
                this._onDidChangeAgent.fire({ agent: e.agent, slashCommand: e.command });
            }
        }));
        if (this.tree && this.visible) {
            this.onDidChangeItems();
            this.scrollToEnd();
        }
        this.updateChatInputContext();
    }
    getFocus() {
        return this.tree.getFocus()[0] ?? undefined;
    }
    reveal(item, relativeTop) {
        this.tree.reveal(item, relativeTop);
    }
    focus(item) {
        const items = this.tree.getNode(null).children;
        const node = items.find(i => i.element?.id === item.id);
        if (!node) {
            return;
        }
        this.tree.setFocus([node.element]);
        this.tree.domFocus();
    }
    refilter() {
        this.tree.refilter();
    }
    setInputPlaceholder(placeholder) {
        this.viewModel?.setInputPlaceholder(placeholder);
    }
    resetInputPlaceholder() {
        this.viewModel?.resetInputPlaceholder();
    }
    setInput(value = '') {
        this.inputPart.setValue(value, false);
        this.refreshParsedInput();
    }
    getInput() {
        return this.inputPart.inputEditor.getValue();
    }
    logInputHistory() {
        this.inputPart.logInputHistory();
    }
    async acceptInput(query, options) {
        return this._acceptInput(query ? { query } : undefined, options);
    }
    async rerunLastRequest() {
        if (!this.viewModel) {
            return;
        }
        const sessionId = this.viewModel.sessionId;
        const lastRequest = this.chatService.getSession(sessionId)?.getRequests().at(-1);
        if (!lastRequest) {
            return;
        }
        const options = {
            attempt: lastRequest.attempt + 1,
            location: this.location,
            userSelectedModelId: this.input.currentLanguageModel
        };
        return await this.chatService.resendRequest(lastRequest, options);
    }
    collectInputState() {
        const inputState = {};
        this.contribs.forEach(c => {
            if (c.getInputState) {
                inputState[c.id] = c.getInputState();
            }
        });
        return inputState;
    }
    async _acceptInput(query, options) {
        if (this.viewModel?.requestInProgress && this.viewModel.requestPausibility !== 1 /* ChatPauseState.Paused */) {
            return;
        }
        if (this.viewModel) {
            this._onDidAcceptInput.fire();
            this.scrollLock = !!checkModeOption(this.input.currentMode, this.viewOptions.autoScroll);
            const editorValue = this.getInput();
            const requestId = this.chatAccessibilityService.acceptRequest();
            const input = !query ? editorValue : query.query;
            const isUserQuery = !query;
            const { promptInstructions } = this.inputPart.attachmentModel;
            const instructionsEnabled = promptInstructions.featureEnabled;
            if (instructionsEnabled) {
                // instruction files may have nested child references to other prompt
                // files that are resolved asynchronously, hence we need to wait for
                // the entire prompt instruction tree to be processed
                const instructionsStarted = performance.now();
                await promptInstructions.allSettled();
                // allow-any-unicode-next-line
                this.logService.trace(`[⏱] instructions tree resolved in ${performance.now() - instructionsStarted}ms`);
            }
            let attachedContext = this.inputPart.getAttachedAndImplicitContext(this.viewModel.sessionId);
            if (this.viewOptions.enableWorkingSet !== undefined && this.input.currentMode !== ChatMode.Ask) {
                const uniqueWorkingSetEntries = new ResourceSet(); // NOTE: this is used for bookkeeping so the UI can avoid rendering references in the UI that are already shown in the working set
                const editingSessionAttachedContext = attachedContext;
                // Collect file variables from previous requests before sending the request
                const previousRequests = this.viewModel.model.getRequests();
                for (const request of previousRequests) {
                    for (const variable of request.variableData.variables) {
                        if (URI.isUri(variable.value) && variable.isFile) {
                            const uri = variable.value;
                            if (!uniqueWorkingSetEntries.has(uri)) {
                                editingSessionAttachedContext.push(variable);
                                uniqueWorkingSetEntries.add(variable.value);
                            }
                        }
                    }
                }
                attachedContext = editingSessionAttachedContext;
                this.telemetryService.publicLog2('chatEditing/workingSetSize', { originalSize: uniqueWorkingSetEntries.size, actualSize: uniqueWorkingSetEntries.size });
            }
            this.chatService.cancelCurrentRequestForSession(this.viewModel.sessionId);
            this.input.validateCurrentMode();
            const result = await this.chatService.sendRequest(this.viewModel.sessionId, input, {
                mode: this.inputPart.currentMode,
                userSelectedModelId: this.inputPart.currentLanguageModel,
                location: this.location,
                locationData: this._location.resolveData?.(),
                parserContext: { selectedAgent: this._lastSelectedAgent, mode: this.inputPart.currentMode },
                attachedContext,
                noCommandDetection: options?.noCommandDetection,
                hasInstructionAttachments: this.inputPart.hasInstructionAttachments,
                userSelectedTools: this.input.currentMode === ChatMode.Agent ? this.inputPart.selectedToolsModel.tools.get().map(tool => tool.id) : undefined
            });
            if (result) {
                this.inputPart.acceptInput(isUserQuery);
                this._onDidSubmitAgent.fire({ agent: result.agent, slashCommand: result.slashCommand });
                result.responseCompletePromise.then(() => {
                    const responses = this.viewModel?.getItems().filter(isResponseVM);
                    const lastResponse = responses?.[responses.length - 1];
                    this.chatAccessibilityService.acceptResponse(lastResponse, requestId, options?.isVoiceInput);
                    if (lastResponse?.result?.nextQuestion) {
                        const { prompt, participant, command } = lastResponse.result.nextQuestion;
                        const question = formatChatQuestion(this.chatAgentService, this.location, prompt, participant, command);
                        if (question) {
                            this.input.setValue(question, false);
                        }
                    }
                });
                return result.responseCreatedPromise;
            }
        }
        return undefined;
    }
    getCodeBlockInfosForResponse(response) {
        return this.renderer.getCodeBlockInfosForResponse(response);
    }
    getCodeBlockInfoForEditor(uri) {
        return this.renderer.getCodeBlockInfoForEditor(uri);
    }
    getFileTreeInfosForResponse(response) {
        return this.renderer.getFileTreeInfosForResponse(response);
    }
    getLastFocusedFileTreeForResponse(response) {
        return this.renderer.getLastFocusedFileTreeForResponse(response);
    }
    focusLastMessage() {
        if (!this.viewModel) {
            return;
        }
        const items = this.tree.getNode(null).children;
        const lastItem = items[items.length - 1];
        if (!lastItem) {
            return;
        }
        this.tree.setFocus([lastItem.element]);
        this.tree.domFocus();
    }
    layout(height, width) {
        width = Math.min(width, 850);
        this.bodyDimension = new dom.Dimension(width, height);
        const inputPartMaxHeight = this._dynamicMessageLayoutData?.enabled ? this._dynamicMessageLayoutData.maxHeight : height;
        this.inputPart.layout(inputPartMaxHeight, width);
        const inputPartHeight = this.inputPart.inputPartHeight;
        const lastElementVisible = this.tree.scrollTop + this.tree.renderHeight >= this.tree.scrollHeight - 2;
        const listHeight = Math.max(0, height - inputPartHeight);
        if (this.viewOptions.renderStyle === 'compact' || this.viewOptions.renderStyle === 'minimal') {
            this.listContainer.style.removeProperty('--chat-current-response-min-height');
        }
        else {
            this.listContainer.style.setProperty('--chat-current-response-min-height', listHeight * .75 + 'px');
        }
        this.tree.layout(listHeight, width);
        this.tree.getHTMLElement().style.height = `${listHeight}px`;
        // Push the welcome message down so it doesn't change position when followups or working set appear
        let extraOffset = 0;
        if (this.viewOptions.renderFollowups) {
            extraOffset = Math.max(100 - this.inputPart.followupsHeight, 0);
        }
        else if (this.viewOptions.enableWorkingSet) {
            extraOffset = Math.max(100 - this.inputPart.editSessionWidgetHeight, 0);
        }
        this.welcomeMessageContainer.style.height = `${listHeight - extraOffset}px`;
        this.welcomeMessageContainer.style.paddingBottom = `${extraOffset}px`;
        this.renderer.layout(width);
        const lastItem = this.viewModel?.getItems().at(-1);
        const lastResponseIsRendering = isResponseVM(lastItem) && lastItem.renderData;
        if (lastElementVisible && (!lastResponseIsRendering || checkModeOption(this.input.currentMode, this.viewOptions.autoScroll))) {
            this.scrollToEnd();
        }
        this.listContainer.style.height = `${listHeight}px`;
        this._onDidChangeHeight.fire(height);
    }
    // An alternative to layout, this allows you to specify the number of ChatTreeItems
    // you want to show, and the max height of the container. It will then layout the
    // tree to show that many items.
    // TODO@TylerLeonhardt: This could use some refactoring to make it clear which layout strategy is being used
    setDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        this._register(this.renderer.onDidChangeItemHeight(() => this.layoutDynamicChatTreeItemMode()));
        const mutableDisposable = this._register(new MutableDisposable());
        this._register(this.tree.onDidScroll((e) => {
            // TODO@TylerLeonhardt this should probably just be disposed when this is disabled
            // and then set up again when it is enabled again
            if (!this._dynamicMessageLayoutData?.enabled) {
                return;
            }
            mutableDisposable.value = dom.scheduleAtNextAnimationFrame(dom.getWindow(this.listContainer), () => {
                if (!e.scrollTopChanged || e.heightChanged || e.scrollHeightChanged) {
                    return;
                }
                const renderHeight = e.height;
                const diff = e.scrollHeight - renderHeight - e.scrollTop;
                if (diff === 0) {
                    return;
                }
                const possibleMaxHeight = (this._dynamicMessageLayoutData?.maxHeight ?? maxHeight);
                const width = this.bodyDimension?.width ?? this.container.offsetWidth;
                this.inputPart.layout(possibleMaxHeight, width);
                const inputPartHeight = this.inputPart.inputPartHeight;
                const newHeight = Math.min(renderHeight + diff, possibleMaxHeight - inputPartHeight);
                this.layout(newHeight + inputPartHeight, width);
            });
        }));
    }
    updateDynamicChatTreeItemLayout(numOfChatTreeItems, maxHeight) {
        this._dynamicMessageLayoutData = { numOfMessages: numOfChatTreeItems, maxHeight, enabled: true };
        let hasChanged = false;
        let height = this.bodyDimension.height;
        let width = this.bodyDimension.width;
        if (maxHeight < this.bodyDimension.height) {
            height = maxHeight;
            hasChanged = true;
        }
        const containerWidth = this.container.offsetWidth;
        if (this.bodyDimension?.width !== containerWidth) {
            width = containerWidth;
            hasChanged = true;
        }
        if (hasChanged) {
            this.layout(height, width);
        }
    }
    get isDynamicChatTreeItemLayoutEnabled() {
        return this._dynamicMessageLayoutData?.enabled ?? false;
    }
    set isDynamicChatTreeItemLayoutEnabled(value) {
        if (!this._dynamicMessageLayoutData) {
            return;
        }
        this._dynamicMessageLayoutData.enabled = value;
    }
    layoutDynamicChatTreeItemMode() {
        if (!this.viewModel || !this._dynamicMessageLayoutData?.enabled) {
            return;
        }
        const width = this.bodyDimension?.width ?? this.container.offsetWidth;
        this.inputPart.layout(this._dynamicMessageLayoutData.maxHeight, width);
        const inputHeight = this.inputPart.inputPartHeight;
        const totalMessages = this.viewModel.getItems();
        // grab the last N messages
        const messages = totalMessages.slice(-this._dynamicMessageLayoutData.numOfMessages);
        const needsRerender = messages.some(m => m.currentRenderedHeight === undefined);
        const listHeight = needsRerender
            ? this._dynamicMessageLayoutData.maxHeight
            : messages.reduce((acc, message) => acc + message.currentRenderedHeight, 0);
        this.layout(Math.min(
        // we add an additional 18px in order to show that there is scrollable content
        inputHeight + listHeight + (totalMessages.length > 2 ? 18 : 0), this._dynamicMessageLayoutData.maxHeight), width);
        if (needsRerender || !listHeight) {
            this.scrollToEnd();
        }
    }
    saveState() {
        this.inputPart.saveState();
        const welcomeContent = this.chatAgentService.getDefaultAgent(this.location, this.input.currentMode)?.metadata.welcomeMessageContent;
        if (welcomeContent) {
            this.storageService.store(`${PersistWelcomeMessageContentKey}.${this.location}`, welcomeContent, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    getViewState() {
        return {
            inputValue: this.getInput(),
            inputState: this.inputPart.getViewState()
        };
    }
    updateChatInputContext() {
        const currentAgent = this.parsedInput.parts.find(part => part instanceof ChatRequestAgentPart);
        this.agentInInput.set(!!currentAgent);
    }
};
__decorate([
    memoize
], ChatWidget.prototype, "isUnifiedPanelWidget", null);
ChatWidget = ChatWidget_1 = __decorate([
    __param(4, ICodeEditorService),
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IInstantiationService),
    __param(8, IChatService),
    __param(9, IChatAgentService),
    __param(10, IChatWidgetService),
    __param(11, IContextMenuService),
    __param(12, IChatAccessibilityService),
    __param(13, ILogService),
    __param(14, IThemeService),
    __param(15, IChatSlashCommandService),
    __param(16, IChatEditingService),
    __param(17, IStorageService),
    __param(18, ITelemetryService)
], ChatWidget);
export { ChatWidget };
export class ChatWidgetService extends Disposable {
    constructor() {
        super(...arguments);
        this._widgets = [];
        this._lastFocusedWidget = undefined;
        this._onDidAddWidget = this._register(new Emitter());
        this.onDidAddWidget = this._onDidAddWidget.event;
    }
    get lastFocusedWidget() {
        return this._lastFocusedWidget;
    }
    getAllWidgets() {
        return this._widgets;
    }
    getWidgetsByLocations(location) {
        return this._widgets.filter(w => w.location === location);
    }
    getWidgetByInputUri(uri) {
        return this._widgets.find(w => isEqual(w.inputUri, uri));
    }
    getWidgetBySessionId(sessionId) {
        return this._widgets.find(w => w.viewModel?.sessionId === sessionId);
    }
    setLastFocusedWidget(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget = widget;
    }
    register(newWidget) {
        if (this._widgets.some(widget => widget === newWidget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        this._widgets.push(newWidget);
        this._onDidAddWidget.fire(newWidget);
        return combinedDisposable(newWidget.onDidFocus(() => this.setLastFocusedWidget(newWidget)), toDisposable(() => this._widgets.splice(this._widgets.indexOf(newWidget), 1)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMs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