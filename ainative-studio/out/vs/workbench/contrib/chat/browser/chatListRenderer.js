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
var ChatListItemRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, thenIfNotDisposed, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { FileAccess } from '../../../../base/common/network.js';
import { clamp } from '../../../../base/common/numbers.js';
import { autorun } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
import { annotateSpecialMarkdownContent } from '../common/annotations.js';
import { checkModeOption } from '../common/chat.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { chatSubcommandLeader } from '../common/chatParserTypes.js';
import { ChatAgentVoteDirection, ChatAgentVoteDownReason, ChatErrorLevel, IChatService } from '../common/chatService.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { getNWords } from '../common/chatWordCounter.js';
import { CodeBlockModelCollection } from '../common/codeBlockModelCollection.js';
import { MarkUnhelpfulActionId } from './actions/chatTitleActions.js';
import { IChatWidgetService } from './chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from './chatAgentHover.js';
import { ChatAgentCommandContentPart } from './chatContentParts/chatAgentCommandContentPart.js';
import { ChatAttachmentsContentPart } from './chatContentParts/chatAttachmentsContentPart.js';
import { ChatCodeCitationContentPart } from './chatContentParts/chatCodeCitationContentPart.js';
import { ChatCommandButtonContentPart } from './chatContentParts/chatCommandContentPart.js';
import { ChatConfirmationContentPart } from './chatContentParts/chatConfirmationContentPart.js';
import { ChatMarkdownContentPart, EditorPool } from './chatContentParts/chatMarkdownContentPart.js';
import { ChatProgressContentPart, ChatWorkingProgressContentPart } from './chatContentParts/chatProgressContentPart.js';
import { ChatQuotaExceededPart } from './chatContentParts/chatQuotaExceededPart.js';
import { ChatUsedReferencesListContentPart, CollapsibleListPool } from './chatContentParts/chatReferencesContentPart.js';
import { ChatTaskContentPart } from './chatContentParts/chatTaskContentPart.js';
import { ChatTextEditContentPart, DiffEditorPool } from './chatContentParts/chatTextEditContentPart.js';
import { ChatToolInvocationPart } from './chatContentParts/chatToolInvocationPart.js';
import { ChatTreeContentPart, TreePool } from './chatContentParts/chatTreeContentPart.js';
import { ChatWarningContentPart } from './chatContentParts/chatWarningContentPart.js';
import { ChatMarkdownDecorationsRenderer } from './chatMarkdownDecorationsRenderer.js';
import { ChatMarkdownRenderer } from './chatMarkdownRenderer.js';
import { ChatCodeBlockContentProvider } from './codeBlockPart.js';
const $ = dom.$;
const forceVerboseLayoutTracing = false;
const mostRecentResponseClassName = 'chat-most-recent-response';
let ChatListItemRenderer = class ChatListItemRenderer extends Disposable {
    static { ChatListItemRenderer_1 = this; }
    static { this.ID = 'item'; }
    constructor(editorOptions, rendererOptions, delegate, codeBlockModelCollection, overflowWidgetsDomNode, instantiationService, configService, logService, contextKeyService, themeService, commandService, hoverService, chatWidgetService, chatService) {
        super();
        this.rendererOptions = rendererOptions;
        this.delegate = delegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.codeBlocksByResponseId = new Map();
        this.codeBlocksByEditorUri = new ResourceMap();
        this.fileTreesByResponseId = new Map();
        this.focusedFileTreesByResponseId = new Map();
        this._onDidClickFollowup = this._register(new Emitter());
        this.onDidClickFollowup = this._onDidClickFollowup.event;
        this._onDidClickRerunWithAgentOrCommandDetection = new Emitter();
        this.onDidClickRerunWithAgentOrCommandDetection = this._onDidClickRerunWithAgentOrCommandDetection.event;
        this._onDidChangeItemHeight = this._register(new Emitter());
        this.onDidChangeItemHeight = this._onDidChangeItemHeight.event;
        this._currentLayoutWidth = 0;
        this._isVisible = true;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.renderer = this.instantiationService.createInstance(ChatMarkdownRenderer, undefined);
        this.markdownDecorationsRenderer = this.instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
        this._editorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._toolEditorPool = this._register(this.instantiationService.createInstance(EditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._diffEditorPool = this._register(this.instantiationService.createInstance(DiffEditorPool, editorOptions, delegate, overflowWidgetsDomNode));
        this._treePool = this._register(this.instantiationService.createInstance(TreePool, this._onDidChangeVisibility.event));
        this._contentReferencesListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, undefined));
        this._register(this.instantiationService.createInstance(ChatCodeBlockContentProvider));
        this._toolInvocationCodeBlockCollection = this._register(this.instantiationService.createInstance(CodeBlockModelCollection, 'tools'));
    }
    get templateId() {
        return ChatListItemRenderer_1.ID;
    }
    editorsInUse() {
        return Iterable.concat(this._editorPool.inUse(), this._toolEditorPool.inUse());
    }
    traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListItemRenderer#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListItemRenderer#${method}: ${message}`);
        }
    }
    /**
     * Compute a rate to render at in words/s.
     */
    getProgressiveRenderRate(element) {
        let Rate;
        (function (Rate) {
            Rate[Rate["Min"] = 5] = "Min";
            Rate[Rate["Max"] = 80] = "Max";
        })(Rate || (Rate = {}));
        if (element.isComplete || element.isPaused.get()) {
            return 80 /* Rate.Max */;
        }
        if (element.contentUpdateTimings && element.contentUpdateTimings.impliedWordLoadRate) {
            const rate = element.contentUpdateTimings.impliedWordLoadRate;
            return clamp(rate, 5 /* Rate.Min */, 80 /* Rate.Max */);
        }
        return 8;
    }
    getCodeBlockInfosForResponse(response) {
        const codeBlocks = this.codeBlocksByResponseId.get(response.id);
        return codeBlocks ?? [];
    }
    getCodeBlockInfoForEditor(uri) {
        return this.codeBlocksByEditorUri.get(uri);
    }
    getFileTreeInfosForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        return fileTrees ?? [];
    }
    getLastFocusedFileTreeForResponse(response) {
        const fileTrees = this.fileTreesByResponseId.get(response.id);
        const lastFocusedFileTreeIndex = this.focusedFileTreesByResponseId.get(response.id);
        if (fileTrees?.length && lastFocusedFileTreeIndex !== undefined && lastFocusedFileTreeIndex < fileTrees.length) {
            return fileTrees[lastFocusedFileTreeIndex];
        }
        return undefined;
    }
    setVisible(visible) {
        this._isVisible = visible;
        this._onDidChangeVisibility.fire(visible);
    }
    layout(width) {
        const newWidth = width - 40; // padding
        if (newWidth !== this._currentLayoutWidth) {
            this._currentLayoutWidth = newWidth;
            for (const editor of this._editorPool.inUse()) {
                editor.layout(this._currentLayoutWidth);
            }
            for (const toolEditor of this._toolEditorPool.inUse()) {
                toolEditor.layout(this._currentLayoutWidth);
            }
            for (const diffEditor of this._diffEditorPool.inUse()) {
                diffEditor.layout(this._currentLayoutWidth);
            }
        }
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const rowContainer = dom.append(container, $('.interactive-item-container'));
        if (this.rendererOptions.renderStyle === 'compact') {
            rowContainer.classList.add('interactive-item-compact');
        }
        let headerParent = rowContainer;
        let valueParent = rowContainer;
        let detailContainerParent;
        let toolbarParent;
        if (this.rendererOptions.renderStyle === 'minimal') {
            rowContainer.classList.add('interactive-item-compact');
            rowContainer.classList.add('minimal');
            // -----------------------------------------------------
            //  icon | details
            //       | references
            //       | value
            // -----------------------------------------------------
            const lhsContainer = dom.append(rowContainer, $('.column.left'));
            const rhsContainer = dom.append(rowContainer, $('.column.right'));
            headerParent = lhsContainer;
            detailContainerParent = rhsContainer;
            valueParent = rhsContainer;
            toolbarParent = dom.append(rowContainer, $('.header'));
        }
        const header = dom.append(headerParent, $('.header'));
        const user = dom.append(header, $('.user'));
        const avatarContainer = dom.append(user, $('.avatar-container'));
        const username = dom.append(user, $('h3.username'));
        username.tabIndex = 0;
        const detailContainer = dom.append(detailContainerParent ?? user, $('span.detail-container'));
        const detail = dom.append(detailContainer, $('span.detail'));
        dom.append(detailContainer, $('span.chat-animated-ellipsis'));
        const value = dom.append(valueParent, $('.value'));
        const elementDisposables = new DisposableStore();
        const contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(rowContainer));
        const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
        let titleToolbar;
        if (this.rendererOptions.noHeader) {
            header.classList.add('hidden');
        }
        else {
            titleToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, toolbarParent ?? header, MenuId.ChatMessageTitle, {
                menuOptions: {
                    shouldForwardArgs: true
                },
                toolbarOptions: {
                    shouldInlineSubmenu: submenu => submenu.actions.length <= 1
                },
            }));
        }
        const footerToolbarContainer = dom.append(rowContainer, $('.chat-footer-toolbar'));
        const footerToolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, footerToolbarContainer, MenuId.ChatMessageFooter, {
            eventDebounceDelay: 0,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            toolbarOptions: { shouldInlineSubmenu: submenu => submenu.actions.length <= 1 },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && action.item.id === MarkUnhelpfulActionId) {
                    return scopedInstantiationService.createInstance(ChatVoteDownButton, action, options);
                }
                return createActionViewItem(scopedInstantiationService, action, options);
            }
        }));
        const agentHover = templateDisposables.add(this.instantiationService.createInstance(ChatAgentHover));
        const hoverContent = () => {
            if (isResponseVM(template.currentElement) && template.currentElement.agent && !template.currentElement.agent.isDefault) {
                agentHover.setAgent(template.currentElement.agent.id);
                return agentHover.domNode;
            }
            return undefined;
        };
        const hoverOptions = getChatAgentHoverOptions(() => isResponseVM(template.currentElement) ? template.currentElement.agent : undefined, this.commandService);
        templateDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), user, hoverContent, hoverOptions));
        templateDisposables.add(dom.addDisposableListener(user, dom.EventType.KEY_DOWN, e => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                const content = hoverContent();
                if (content) {
                    this.hoverService.showInstantHover({ content, target: user, trapFocus: true, actions: hoverOptions.actions }, true);
                }
            }
            else if (ev.equals(9 /* KeyCode.Escape */)) {
                this.hoverService.hideHover();
            }
        }));
        const template = { avatarContainer, username, detail, value, rowContainer, elementDisposables, templateDisposables, contextKeyService, instantiationService: scopedInstantiationService, agentHover, titleToolbar, footerToolbar };
        return template;
    }
    renderElement(node, index, templateData) {
        this.renderChatTreeItem(node.element, index, templateData);
    }
    clearRenderedParts(templateData) {
        if (templateData.renderedParts) {
            dispose(coalesce(templateData.renderedParts));
            templateData.renderedParts = undefined;
            dom.clearNode(templateData.value);
        }
    }
    renderChatTreeItem(element, index, templateData) {
        if (templateData.currentElement && templateData.currentElement.id !== element.id) {
            this.traceLayout('renderChatTreeItem', `Rendering a different element into the template, index=${index}`);
            this.clearRenderedParts(templateData);
        }
        templateData.currentElement = element;
        const kind = isRequestVM(element) ? 'request' :
            isResponseVM(element) ? 'response' :
                'welcome';
        this.traceLayout('renderElement', `${kind}, index=${index}`);
        ChatContextKeys.isResponse.bindTo(templateData.contextKeyService).set(isResponseVM(element));
        ChatContextKeys.itemId.bindTo(templateData.contextKeyService).set(element.id);
        ChatContextKeys.isRequest.bindTo(templateData.contextKeyService).set(isRequestVM(element));
        ChatContextKeys.responseDetectedAgentCommand.bindTo(templateData.contextKeyService).set(isResponseVM(element) && element.agentOrSlashCommandDetected);
        if (isResponseVM(element)) {
            ChatContextKeys.responseSupportsIssueReporting.bindTo(templateData.contextKeyService).set(!!element.agent?.metadata.supportIssueReporting);
            ChatContextKeys.responseVote.bindTo(templateData.contextKeyService).set(element.vote === ChatAgentVoteDirection.Up ? 'up' : element.vote === ChatAgentVoteDirection.Down ? 'down' : '');
        }
        else {
            ChatContextKeys.responseVote.bindTo(templateData.contextKeyService).set('');
        }
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = element;
        }
        templateData.footerToolbar.context = element;
        ChatContextKeys.responseHasError.bindTo(templateData.contextKeyService).set(isResponseVM(element) && !!element.errorDetails);
        const isFiltered = !!(isResponseVM(element) && element.errorDetails?.responseIsFiltered);
        ChatContextKeys.responseIsFiltered.bindTo(templateData.contextKeyService).set(isFiltered);
        const location = this.chatWidgetService.getWidgetBySessionId(element.sessionId)?.location;
        templateData.rowContainer.classList.toggle('editing-session', location && this.chatService.isEditingLocation(location));
        templateData.rowContainer.classList.toggle('interactive-request', isRequestVM(element));
        templateData.rowContainer.classList.toggle('interactive-response', isResponseVM(element));
        const progressMessageAtBottomOfResponse = checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse);
        templateData.rowContainer.classList.toggle('show-detail-progress', isResponseVM(element) && !element.isComplete && !element.progressMessages.length && !element.model.isPaused.get() && !progressMessageAtBottomOfResponse);
        templateData.username.textContent = element.username;
        if (!this.rendererOptions.noHeader) {
            this.renderAvatar(element, templateData);
        }
        dom.clearNode(templateData.detail);
        if (isResponseVM(element)) {
            this.renderDetail(element, templateData);
        }
        templateData.rowContainer.classList.toggle(mostRecentResponseClassName, index === this.delegate.getListLength() - 1);
        if (isRequestVM(element) && element.confirmation) {
            this.renderConfirmationAction(element, templateData);
        }
        // Do a progressive render if
        // - This the last response in the list
        // - And it has some content
        // - And the response is not complete
        //   - Or, we previously started a progressive rendering of this element (if the element is complete, we will finish progressive rendering with a very fast rate)
        if (isResponseVM(element) && index === this.delegate.getListLength() - 1 && (!element.isComplete || element.renderData)) {
            this.traceLayout('renderElement', `start progressive render, index=${index}`);
            const timer = templateData.elementDisposables.add(new dom.WindowIntervalTimer());
            const runProgressiveRender = (initial) => {
                try {
                    if (this.doNextProgressiveRender(element, index, templateData, !!initial)) {
                        timer.cancel();
                    }
                }
                catch (err) {
                    // Kill the timer if anything went wrong, avoid getting stuck in a nasty rendering loop.
                    timer.cancel();
                    this.logService.error(err);
                }
            };
            timer.cancelAndSet(runProgressiveRender, 50, dom.getWindow(templateData.rowContainer));
            runProgressiveRender(true);
        }
        else {
            if (isResponseVM(element)) {
                this.basicRenderElement(element, index, templateData);
            }
            else if (isRequestVM(element)) {
                this.basicRenderElement(element, index, templateData);
            }
        }
    }
    renderDetail(element, templateData) {
        templateData.elementDisposables.add(autorun(reader => {
            this._renderDetail(element, templateData);
        }));
    }
    _renderDetail(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.agentOrSlashCommandDetected) {
            const msg = element.slashCommand ? localize('usedAgentSlashCommand', "used {0} [[(rerun without)]]", `${chatSubcommandLeader}${element.slashCommand.name}`) : localize('usedAgent', "[[(rerun without)]]");
            dom.reset(templateData.detail, renderFormattedText(msg, {
                className: 'agentOrSlashCommandDetected',
                inline: true,
                actionHandler: {
                    disposables: templateData.elementDisposables,
                    callback: (content) => {
                        this._onDidClickRerunWithAgentOrCommandDetection.fire(element);
                    },
                }
            }));
        }
        else if (this.rendererOptions.renderStyle !== 'minimal' && !element.isComplete && !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            if (element.model.isPaused.get()) {
                templateData.detail.textContent = localize('paused', "Paused");
            }
            else {
                templateData.detail.textContent = localize('working', "Working");
            }
        }
    }
    renderConfirmationAction(element, templateData) {
        dom.clearNode(templateData.detail);
        if (element.confirmation) {
            templateData.detail.textContent = localize('chatConfirmationAction', 'selected "{0}"', element.confirmation);
        }
    }
    renderAvatar(element, templateData) {
        const icon = isResponseVM(element) ?
            this.getAgentIcon(element.agent?.metadata) :
            (element.avatarIcon ?? Codicon.account);
        if (icon instanceof URI) {
            const avatarIcon = dom.$('img.icon');
            avatarIcon.src = FileAccess.uriToBrowserUri(icon).toString(true);
            templateData.avatarContainer.replaceChildren(dom.$('.avatar', undefined, avatarIcon));
        }
        else {
            const avatarIcon = dom.$(ThemeIcon.asCSSSelector(icon));
            templateData.avatarContainer.replaceChildren(dom.$('.avatar.codicon-avatar', undefined, avatarIcon));
        }
    }
    getAgentIcon(agent) {
        if (agent?.themeIcon) {
            return agent.themeIcon;
        }
        else if (agent?.iconDark && this.themeService.getColorTheme().type === ColorScheme.DARK) {
            return agent.iconDark;
        }
        else if (agent?.icon) {
            return agent.icon;
        }
        else {
            return Codicon.copilot;
        }
    }
    basicRenderElement(element, index, templateData) {
        templateData.rowContainer.classList.toggle('chat-response-loading', (isResponseVM(element) && !element.isComplete));
        let value = [];
        if (isRequestVM(element) && !element.confirmation) {
            const markdown = 'message' in element.message ?
                element.message.message :
                this.markdownDecorationsRenderer.convertParsedRequestToMarkdown(element.message);
            value = [{ content: new MarkdownString(markdown), kind: 'markdownContent' }];
            if (this.rendererOptions.renderStyle === 'minimal' && !element.isComplete) {
                templateData.value.classList.add('inline-progress');
                templateData.elementDisposables.add(toDisposable(() => templateData.value.classList.remove('inline-progress')));
                value.push({ content: new MarkdownString('<span></span>', { supportHtml: true }), kind: 'markdownContent' });
            }
            else {
                templateData.value.classList.remove('inline-progress');
            }
        }
        else if (isResponseVM(element)) {
            if (element.contentReferences.length) {
                value.push({ kind: 'references', references: element.contentReferences });
            }
            value.push(...annotateSpecialMarkdownContent(element.response.value));
            if (element.codeCitations.length) {
                value.push({ kind: 'codeCitations', citations: element.codeCitations });
            }
        }
        dom.clearNode(templateData.value);
        if (isResponseVM(element)) {
            this.renderDetail(element, templateData);
        }
        const isFiltered = !!(isResponseVM(element) && element.errorDetails?.responseIsFiltered);
        const parts = [];
        if (!isFiltered) {
            let inlineSlashCommandRendered = false;
            value.forEach((data, index) => {
                const context = {
                    element,
                    contentIndex: index,
                    content: value,
                    preceedingContentParts: parts,
                };
                const newPart = this.renderChatContentPart(data, templateData, context);
                if (newPart) {
                    if (this.rendererOptions.renderDetectedCommandsWithRequest
                        && !inlineSlashCommandRendered
                        && isRequestVM(element) && element.agentOrSlashCommandDetected && element.slashCommand
                        && data.kind === 'markdownContent' // TODO this is fishy but I didn't find a better way to render on the same inline as the MD request part
                    ) {
                        if (newPart.domNode) {
                            newPart.domNode.style.display = 'inline-flex';
                        }
                        const cmdPart = this.instantiationService.createInstance(ChatAgentCommandContentPart, element.slashCommand, () => this._onDidClickRerunWithAgentOrCommandDetection.fire({ sessionId: element.sessionId, requestId: element.id }));
                        templateData.value.appendChild(cmdPart.domNode);
                        parts.push(cmdPart);
                        inlineSlashCommandRendered = true;
                    }
                    if (newPart.domNode) {
                        templateData.value.appendChild(newPart.domNode);
                    }
                    parts.push(newPart);
                }
            });
        }
        if (templateData.renderedParts) {
            dispose(templateData.renderedParts);
        }
        templateData.renderedParts = parts;
        if (!isFiltered) {
            if (isRequestVM(element) && element.variables.length) {
                const newPart = this.renderAttachments(element.variables, element.contentReferences, templateData);
                if (newPart) {
                    if (newPart.domNode) {
                        // p has a :last-child rule for margin
                        templateData.value.appendChild(newPart.domNode);
                    }
                    templateData.elementDisposables.add(newPart);
                }
            }
        }
        if (isResponseVM(element) && element.errorDetails?.message) {
            if (element.errorDetails.isQuotaExceeded) {
                const renderedError = this.instantiationService.createInstance(ChatQuotaExceededPart, element, this.renderer);
                templateData.elementDisposables.add(renderedError);
                templateData.value.appendChild(renderedError.domNode);
                templateData.elementDisposables.add(renderedError.onDidChangeHeight(() => this.updateItemHeight(templateData)));
            }
            else {
                const level = element.errorDetails.level ?? (element.errorDetails.responseIsFiltered ? ChatErrorLevel.Info : ChatErrorLevel.Error);
                const renderedError = this.instantiationService.createInstance(ChatWarningContentPart, level, new MarkdownString(element.errorDetails.message), this.renderer);
                templateData.elementDisposables.add(renderedError);
                templateData.value.appendChild(renderedError.domNode);
            }
        }
        const newHeight = templateData.rowContainer.offsetHeight;
        const fireEvent = !element.currentRenderedHeight || element.currentRenderedHeight !== newHeight;
        element.currentRenderedHeight = newHeight;
        if (fireEvent) {
            const disposable = templateData.elementDisposables.add(dom.scheduleAtNextAnimationFrame(dom.getWindow(templateData.value), () => {
                // Have to recompute the height here because codeblock rendering is currently async and it may have changed.
                // If it becomes properly sync, then this could be removed.
                element.currentRenderedHeight = templateData.rowContainer.offsetHeight;
                disposable.dispose();
                this._onDidChangeItemHeight.fire({ element, height: element.currentRenderedHeight });
            }));
        }
    }
    updateItemHeight(templateData) {
        if (!templateData.currentElement) {
            return;
        }
        const newHeight = Math.max(templateData.rowContainer.offsetHeight, 1);
        templateData.currentElement.currentRenderedHeight = newHeight;
        this._onDidChangeItemHeight.fire({ element: templateData.currentElement, height: newHeight });
    }
    /**
     *	@returns true if progressive rendering should be considered complete- the element's data is fully rendered or the view is not visible
     */
    doNextProgressiveRender(element, index, templateData, isInRenderElement) {
        if (!this._isVisible) {
            return true;
        }
        if (element.isCanceled) {
            this.traceLayout('doNextProgressiveRender', `canceled, index=${index}`);
            element.renderData = undefined;
            this.basicRenderElement(element, index, templateData);
            return true;
        }
        templateData.rowContainer.classList.toggle('chat-response-loading', true);
        this.traceLayout('doNextProgressiveRender', `START progressive render, index=${index}, renderData=${JSON.stringify(element.renderData)}`);
        const contentForThisTurn = this.getNextProgressiveRenderContent(element);
        const partsToRender = this.diff(templateData.renderedParts ?? [], contentForThisTurn.content, element);
        const contentIsAlreadyRendered = partsToRender.every(part => part === null);
        if (contentIsAlreadyRendered) {
            if (contentForThisTurn.moreContentAvailable) {
                // The content that we want to render in this turn is already rendered, but there is more content to render on the next tick
                this.traceLayout('doNextProgressiveRender', 'not rendering any new content this tick, but more available');
                return false;
            }
            else if (element.isComplete) {
                // All content is rendered, and response is done, so do a normal render
                this.traceLayout('doNextProgressiveRender', `END progressive render, index=${index} and clearing renderData, response is complete`);
                element.renderData = undefined;
                this.basicRenderElement(element, index, templateData);
                return true;
            }
            else {
                // Nothing new to render, stop rendering until next model update
                this.traceLayout('doNextProgressiveRender', 'caught up with the stream- no new content to render');
                if (!templateData.renderedParts) {
                    // First render? Initialize currentRenderedHeight. https://github.com/microsoft/vscode/issues/232096
                    const height = templateData.rowContainer.offsetHeight;
                    element.currentRenderedHeight = height;
                }
                return true;
            }
        }
        // Do an actual progressive render
        this.traceLayout('doNextProgressiveRender', `doing progressive render, ${partsToRender.length} parts to render`);
        this.renderChatContentDiff(partsToRender, contentForThisTurn.content, element, templateData);
        const height = templateData.rowContainer.offsetHeight;
        element.currentRenderedHeight = height;
        if (!isInRenderElement) {
            this._onDidChangeItemHeight.fire({ element, height });
        }
        return false;
    }
    renderChatContentDiff(partsToRender, contentForThisTurn, element, templateData) {
        const renderedParts = templateData.renderedParts ?? [];
        templateData.renderedParts = renderedParts;
        partsToRender.forEach((partToRender, index) => {
            if (!partToRender) {
                // null=no change
                return;
            }
            const alreadyRenderedPart = templateData.renderedParts?.[index];
            if (alreadyRenderedPart) {
                alreadyRenderedPart.dispose();
            }
            const preceedingContentParts = renderedParts.slice(0, index);
            const context = {
                element,
                content: contentForThisTurn,
                preceedingContentParts,
                contentIndex: index,
            };
            const newPart = this.renderChatContentPart(partToRender, templateData, context);
            if (newPart) {
                renderedParts[index] = newPart;
                // Maybe the part can't be rendered in this context, but this shouldn't really happen
                try {
                    if (alreadyRenderedPart?.domNode) {
                        if (newPart.domNode) {
                            // This method can throw HierarchyRequestError
                            alreadyRenderedPart.domNode.replaceWith(newPart.domNode);
                        }
                        else {
                            alreadyRenderedPart.domNode.remove();
                        }
                    }
                    else if (newPart.domNode) {
                        templateData.value.appendChild(newPart.domNode);
                    }
                }
                catch (err) {
                    this.logService.error('ChatListItemRenderer#renderChatContentDiff: error replacing part', err);
                }
            }
            else {
                alreadyRenderedPart?.domNode?.remove();
            }
        });
    }
    /**
     * Returns all content parts that should be rendered, and trimmed markdown content. We will diff this with the current rendered set.
     */
    getNextProgressiveRenderContent(element) {
        const data = this.getDataForProgressiveRender(element);
        const renderableResponse = annotateSpecialMarkdownContent(element.response.value);
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} at ${data.rate} words/s, counting...`);
        let numNeededWords = data.numWordsToRender;
        const partsToRender = [];
        // Always add the references to avoid shifting the content parts when a reference is added, and having to re-diff all the content.
        // The part will hide itself if the list is empty.
        partsToRender.push({ kind: 'references', references: element.contentReferences });
        let moreContentAvailable = false;
        for (let i = 0; i < renderableResponse.length; i++) {
            const part = renderableResponse[i];
            if (part.kind === 'markdownContent') {
                const wordCountResult = getNWords(part.content.value, numNeededWords);
                this.traceLayout('getNextProgressiveRenderContent', `  Chunk ${i}: Want to render ${numNeededWords} words and found ${wordCountResult.returnedWordCount} words. Total words in chunk: ${wordCountResult.totalWordCount}`);
                numNeededWords -= wordCountResult.returnedWordCount;
                if (wordCountResult.isFullString) {
                    partsToRender.push(part);
                    // Consumed full markdown chunk- need to ensure that all following non-markdown parts are rendered
                    for (const nextPart of renderableResponse.slice(i + 1)) {
                        if (nextPart.kind !== 'markdownContent') {
                            i++;
                            partsToRender.push(nextPart);
                        }
                        else {
                            break;
                        }
                    }
                }
                else {
                    // Only taking part of this markdown part
                    moreContentAvailable = true;
                    partsToRender.push({ ...part, content: new MarkdownString(wordCountResult.value, part.content) });
                }
                if (numNeededWords <= 0) {
                    // Collected all words and following non-markdown parts if needed, done
                    if (renderableResponse.slice(i + 1).some(part => part.kind === 'markdownContent')) {
                        moreContentAvailable = true;
                    }
                    break;
                }
            }
            else {
                partsToRender.push(part);
            }
        }
        const lastWordCount = element.contentUpdateTimings?.lastWordCount ?? 0;
        const newRenderedWordCount = data.numWordsToRender - numNeededWords;
        const bufferWords = lastWordCount - newRenderedWordCount;
        this.traceLayout('getNextProgressiveRenderContent', `Want to render ${data.numWordsToRender} words. Rendering ${newRenderedWordCount} words. Buffer: ${bufferWords} words`);
        if (newRenderedWordCount > 0 && newRenderedWordCount !== element.renderData?.renderedWordCount) {
            // Only update lastRenderTime when we actually render new content
            element.renderData = { lastRenderTime: Date.now(), renderedWordCount: newRenderedWordCount, renderedParts: partsToRender };
        }
        if (this.shouldShowWorkingProgress(element, partsToRender)) {
            const isPaused = element.model.isPaused.get();
            partsToRender.push({ kind: 'working', isPaused });
        }
        return { content: partsToRender, moreContentAvailable };
    }
    shouldShowWorkingProgress(element, partsToRender) {
        if (element.agentOrSlashCommandDetected || this.rendererOptions.renderStyle === 'minimal' || element.isComplete || !checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.progressMessageAtBottomOfResponse)) {
            return false;
        }
        if (element.model.isPaused.get()) {
            return true;
        }
        // Show if no content, only "used references", ends with a complete tool call, or ends with complete text edits and there is no incomplete tool call (edits are still being applied some time after they are all generated)
        const lastPart = partsToRender.at(-1);
        if (!lastPart ||
            lastPart.kind === 'references' ||
            (lastPart.kind === 'toolInvocation' && (lastPart.isComplete || lastPart.presentation === 'hidden')) ||
            ((lastPart.kind === 'textEditGroup' || lastPart.kind === 'notebookEditGroup') && lastPart.done && !partsToRender.some(part => part.kind === 'toolInvocation' && !part.isComplete))) {
            return true;
        }
        return false;
    }
    getDataForProgressiveRender(element) {
        const renderData = element.renderData ?? { lastRenderTime: 0, renderedWordCount: 0 };
        const rate = this.getProgressiveRenderRate(element);
        const numWordsToRender = renderData.lastRenderTime === 0 ?
            1 :
            renderData.renderedWordCount +
                // Additional words to render beyond what's already rendered
                Math.floor((Date.now() - renderData.lastRenderTime) / 1000 * rate);
        return {
            numWordsToRender,
            rate
        };
    }
    diff(renderedParts, contentToRender, element) {
        const diff = [];
        for (let i = 0; i < contentToRender.length; i++) {
            const content = contentToRender[i];
            const renderedPart = renderedParts[i];
            if (!renderedPart || !renderedPart.hasSameContent(content, contentToRender.slice(i + 1), element)) {
                diff.push(content);
            }
            else {
                // null -> no change
                diff.push(null);
            }
        }
        return diff;
    }
    renderChatContentPart(content, templateData, context) {
        if (content.kind === 'treeData') {
            return this.renderTreeData(content, templateData, context);
        }
        else if (content.kind === 'progressMessage') {
            return this.instantiationService.createInstance(ChatProgressContentPart, content, this.renderer, context, undefined, undefined, undefined);
        }
        else if (content.kind === 'progressTask') {
            return this.renderProgressTask(content, templateData, context);
        }
        else if (content.kind === 'command') {
            return this.instantiationService.createInstance(ChatCommandButtonContentPart, content, context);
        }
        else if (content.kind === 'textEditGroup') {
            return this.renderTextEdit(context, content, templateData);
        }
        else if (content.kind === 'confirmation') {
            return this.renderConfirmation(context, content, templateData);
        }
        else if (content.kind === 'warning') {
            return this.instantiationService.createInstance(ChatWarningContentPart, ChatErrorLevel.Warning, content.content, this.renderer);
        }
        else if (content.kind === 'markdownContent') {
            return this.renderMarkdown(content, templateData, context);
        }
        else if (content.kind === 'references') {
            return this.renderContentReferencesListData(content, undefined, context, templateData);
        }
        else if (content.kind === 'codeCitations') {
            return this.renderCodeCitations(content, context, templateData);
        }
        else if (content.kind === 'toolInvocation' || content.kind === 'toolInvocationSerialized') {
            return this.renderToolInvocation(content, context, templateData);
        }
        else if (content.kind === 'working') {
            return this.renderWorkingProgress(content, context);
        }
        else if (content.kind === 'undoStop') {
            return this.renderUndoStop(content);
        }
        return this.renderNoContent(other => content.kind === other.kind);
    }
    renderUndoStop(content) {
        return this.renderNoContent(other => other.kind === content.kind && other.id === content.id);
    }
    renderNoContent(equals) {
        return {
            dispose: () => { },
            domNode: undefined,
            hasSameContent: equals,
        };
    }
    renderTreeData(content, templateData, context) {
        const data = content.treeData;
        const treeDataIndex = context.preceedingContentParts.filter(part => part instanceof ChatTreeContentPart).length;
        const treePart = this.instantiationService.createInstance(ChatTreeContentPart, data, context.element, this._treePool, treeDataIndex);
        treePart.addDisposable(treePart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        if (isResponseVM(context.element)) {
            const fileTreeFocusInfo = {
                treeDataId: data.uri.toString(),
                treeIndex: treeDataIndex,
                focus() {
                    treePart.domFocus();
                }
            };
            // TODO@roblourens there's got to be a better way to navigate trees
            treePart.addDisposable(treePart.onDidFocus(() => {
                this.focusedFileTreesByResponseId.set(context.element.id, fileTreeFocusInfo.treeIndex);
            }));
            const fileTrees = this.fileTreesByResponseId.get(context.element.id) ?? [];
            fileTrees.push(fileTreeFocusInfo);
            this.fileTreesByResponseId.set(context.element.id, distinct(fileTrees, (v) => v.treeDataId));
            treePart.addDisposable(toDisposable(() => this.fileTreesByResponseId.set(context.element.id, fileTrees.filter(v => v.treeDataId !== data.uri.toString()))));
        }
        return treePart;
    }
    renderContentReferencesListData(references, labelOverride, context, templateData) {
        const referencesPart = this.instantiationService.createInstance(ChatUsedReferencesListContentPart, references.references, labelOverride, context, this._contentReferencesListPool, { expandedWhenEmptyResponse: checkModeOption(this.delegate.currentChatMode(), this.rendererOptions.referencesExpandedWhenEmptyResponse) });
        referencesPart.addDisposable(referencesPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return referencesPart;
    }
    renderCodeCitations(citations, context, templateData) {
        const citationsPart = this.instantiationService.createInstance(ChatCodeCitationContentPart, citations, context);
        return citationsPart;
    }
    getCodeBlockStartIndex(context) {
        return context.preceedingContentParts.reduce((acc, part) => acc + (part.codeblocks?.length ?? 0), 0);
    }
    handleRenderedCodeblocks(element, part, codeBlockStartIndex) {
        if (!part.addDisposable || part.codeblocksPartId === undefined) {
            return;
        }
        const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id) ?? [];
        this.codeBlocksByResponseId.set(element.id, codeBlocksByResponseId);
        part.addDisposable(toDisposable(() => {
            const codeBlocksByResponseId = this.codeBlocksByResponseId.get(element.id);
            if (codeBlocksByResponseId) {
                // Only delete if this is my code block
                part.codeblocks?.forEach((info, i) => {
                    const codeblock = codeBlocksByResponseId[codeBlockStartIndex + i];
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        delete codeBlocksByResponseId[codeBlockStartIndex + i];
                    }
                });
            }
        }));
        part.codeblocks?.forEach((info, i) => {
            codeBlocksByResponseId[codeBlockStartIndex + i] = info;
            part.addDisposable(thenIfNotDisposed(info.uriPromise, uri => {
                if (!uri) {
                    return;
                }
                this.codeBlocksByEditorUri.set(uri, info);
                part.addDisposable(toDisposable(() => {
                    const codeblock = this.codeBlocksByEditorUri.get(uri);
                    if (codeblock?.ownerMarkdownPartId === part.codeblocksPartId) {
                        this.codeBlocksByEditorUri.delete(uri);
                    }
                }));
            }));
        });
    }
    renderToolInvocation(toolInvocation, context, templateData) {
        const codeBlockStartIndex = this.getCodeBlockStartIndex(context);
        const part = this.instantiationService.createInstance(ChatToolInvocationPart, toolInvocation, context, this.renderer, this._contentReferencesListPool, this._toolEditorPool, () => this._currentLayoutWidth, this._toolInvocationCodeBlockCollection, codeBlockStartIndex);
        part.addDisposable(part.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(context.element, part, codeBlockStartIndex);
        return part;
    }
    renderProgressTask(task, templateData, context) {
        if (!isResponseVM(context.element)) {
            return;
        }
        const taskPart = this.instantiationService.createInstance(ChatTaskContentPart, task, this._contentReferencesListPool, this.renderer, context);
        taskPart.addDisposable(taskPart.onDidChangeHeight(() => {
            this.updateItemHeight(templateData);
        }));
        return taskPart;
    }
    renderWorkingProgress(workingProgress, context) {
        return this.instantiationService.createInstance(ChatWorkingProgressContentPart, workingProgress, this.renderer, context);
    }
    renderConfirmation(context, confirmation, templateData) {
        const part = this.instantiationService.createInstance(ChatConfirmationContentPart, confirmation, context);
        part.addDisposable(part.onDidChangeHeight(() => this.updateItemHeight(templateData)));
        return part;
    }
    renderAttachments(variables, contentReferences, templateData) {
        return this.instantiationService.createInstance(ChatAttachmentsContentPart, variables, contentReferences, undefined);
    }
    renderTextEdit(context, chatTextEdit, templateData) {
        const textEditPart = this.instantiationService.createInstance(ChatTextEditContentPart, chatTextEdit, context, this.rendererOptions, this._diffEditorPool, this._currentLayoutWidth);
        textEditPart.addDisposable(textEditPart.onDidChangeHeight(() => {
            textEditPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        return textEditPart;
    }
    renderMarkdown(markdown, templateData, context) {
        const element = context.element;
        const fillInIncompleteTokens = isResponseVM(element) && (!element.isComplete || element.isCanceled || element.errorDetails?.responseIsFiltered || element.errorDetails?.responseIsIncomplete || !!element.renderData);
        const codeBlockStartIndex = this.getCodeBlockStartIndex(context);
        const markdownPart = templateData.instantiationService.createInstance(ChatMarkdownContentPart, markdown, context, this._editorPool, fillInIncompleteTokens, codeBlockStartIndex, this.renderer, this._currentLayoutWidth, this.codeBlockModelCollection, {});
        markdownPart.addDisposable(markdownPart.onDidChangeHeight(() => {
            markdownPart.layout(this._currentLayoutWidth);
            this.updateItemHeight(templateData);
        }));
        this.handleRenderedCodeblocks(element, markdownPart, codeBlockStartIndex);
        return markdownPart;
    }
    disposeElement(node, index, templateData) {
        this.traceLayout('disposeElement', `Disposing element, index=${index}`);
        templateData.elementDisposables.clear();
        // Don't retain the toolbar context which includes chat viewmodels
        if (templateData.titleToolbar) {
            templateData.titleToolbar.context = undefined;
        }
        templateData.footerToolbar.context = undefined;
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
ChatListItemRenderer = ChatListItemRenderer_1 = __decorate([
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, ILogService),
    __param(8, IContextKeyService),
    __param(9, IThemeService),
    __param(10, ICommandService),
    __param(11, IHoverService),
    __param(12, IChatWidgetService),
    __param(13, IChatService)
], ChatListItemRenderer);
export { ChatListItemRenderer };
let ChatListDelegate = class ChatListDelegate {
    constructor(defaultElementHeight, logService) {
        this.defaultElementHeight = defaultElementHeight;
        this.logService = logService;
    }
    _traceLayout(method, message) {
        if (forceVerboseLayoutTracing) {
            this.logService.info(`ChatListDelegate#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatListDelegate#${method}: ${message}`);
        }
    }
    getHeight(element) {
        const kind = isRequestVM(element) ? 'request' : 'response';
        const height = ('currentRenderedHeight' in element ? element.currentRenderedHeight : undefined) ?? this.defaultElementHeight;
        this._traceLayout('getHeight', `${kind}, height=${height}`);
        return height;
    }
    getTemplateId(element) {
        return ChatListItemRenderer.ID;
    }
    hasDynamicHeight(element) {
        return true;
    }
};
ChatListDelegate = __decorate([
    __param(1, ILogService)
], ChatListDelegate);
export { ChatListDelegate };
const voteDownDetailLabels = {
    [ChatAgentVoteDownReason.IncorrectCode]: localize('incorrectCode', "Suggested incorrect code"),
    [ChatAgentVoteDownReason.DidNotFollowInstructions]: localize('didNotFollowInstructions', "Didn't follow instructions"),
    [ChatAgentVoteDownReason.MissingContext]: localize('missingContext', "Missing context"),
    [ChatAgentVoteDownReason.OffensiveOrUnsafe]: localize('offensiveOrUnsafe', "Offensive or unsafe"),
    [ChatAgentVoteDownReason.PoorlyWrittenOrFormatted]: localize('poorlyWrittenOrFormatted', "Poorly written or formatted"),
    [ChatAgentVoteDownReason.RefusedAValidRequest]: localize('refusedAValidRequest', "Refused a valid request"),
    [ChatAgentVoteDownReason.IncompleteCode]: localize('incompleteCode', "Incomplete code"),
    [ChatAgentVoteDownReason.WillReportIssue]: localize('reportIssue', "Report an issue"),
    [ChatAgentVoteDownReason.Other]: localize('other', "Other"),
};
let ChatVoteDownButton = class ChatVoteDownButton extends DropdownMenuActionViewItem {
    constructor(action, options, commandService, issueService, logService, contextMenuService) {
        super(action, { getActions: () => this.getActions(), }, contextMenuService, {
            ...options,
            classNames: ThemeIcon.asClassNameArray(Codicon.thumbsdown),
        });
        this.commandService = commandService;
        this.issueService = issueService;
        this.logService = logService;
    }
    getActions() {
        return [
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncorrectCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.DidNotFollowInstructions),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.IncompleteCode),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.MissingContext),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.PoorlyWrittenOrFormatted),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.RefusedAValidRequest),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.OffensiveOrUnsafe),
            this.getVoteDownDetailAction(ChatAgentVoteDownReason.Other),
            {
                id: 'reportIssue',
                label: voteDownDetailLabels[ChatAgentVoteDownReason.WillReportIssue],
                tooltip: '',
                enabled: true,
                class: undefined,
                run: async (context) => {
                    if (!isResponseVM(context)) {
                        this.logService.error('ChatVoteDownButton#run: invalid context');
                        return;
                    }
                    await this.commandService.executeCommand(MarkUnhelpfulActionId, context, ChatAgentVoteDownReason.WillReportIssue);
                    await this.issueService.openReporter({ extensionId: context.agent?.extensionId.value });
                }
            }
        ];
    }
    render(container) {
        super.render(container);
        this.element?.classList.toggle('checked', this.action.checked);
    }
    getVoteDownDetailAction(reason) {
        const label = voteDownDetailLabels[reason];
        return {
            id: MarkUnhelpfulActionId,
            label,
            tooltip: '',
            enabled: true,
            checked: this._context.voteDownReason === reason,
            class: undefined,
            run: async (context) => {
                if (!isResponseVM(context)) {
                    this.logService.error('ChatVoteDownButton#getVoteDownDetailAction: invalid context');
                    return;
                }
                await this.commandService.executeCommand(MarkUnhelpfulActionId, context, reason);
            }
        };
    }
};
ChatVoteDownButton = __decorate([
    __param(2, ICommandService),
    __param(3, IWorkbenchIssueService),
    __param(4, ILogService),
    __param(5, IContextMenuService)
], ChatVoteDownButton);
export { ChatVoteDownButton };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdExpc3RSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdExpc3RSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVsRixPQUFPLEVBQUUsMEJBQTBCLEVBQXNDLE1BQU0sZ0VBQWdFLENBQUM7QUFDaEosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFJcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNE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