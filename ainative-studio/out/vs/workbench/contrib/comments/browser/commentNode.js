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
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as languages from '../../../../editor/common/languages.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action, Separator, ActionRunner } from '../../../../base/common/actions.js';
import { Disposable, DisposableStore, MutableDisposable, dispose } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommentService } from './commentService.js';
import { MIN_EDITOR_HEIGHT, SimpleCommentEditor, calculateEditorHeight } from './simpleCommentEditor.js';
import { Emitter } from '../../../../base/common/event.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ToggleReactionsAction, ReactionAction, ReactionActionViewItem } from './reactionsAction.js';
import { MenuItemAction, SubmenuItemAction, MenuId } from '../../../../platform/actions/common/actions.js';
import { MenuEntryActionViewItem, SubmenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { CommentFormActions } from './commentFormActions.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { TimestampWidget } from './timestamp.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Scrollable } from '../../../../base/common/scrollable.js';
import { SmoothScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Position } from '../../../../editor/common/core/position.js';
class CommentsActionRunner extends ActionRunner {
    async runAction(action, context) {
        await action.run(...context);
    }
}
let CommentNode = class CommentNode extends Disposable {
    get domNode() {
        return this._domNode;
    }
    constructor(parentEditor, commentThread, comment, pendingEdit, owner, resource, parentThread, markdownRenderer, instantiationService, commentService, notificationService, contextMenuService, contextKeyService, configurationService, hoverService, accessibilityService, keybindingService, textModelService) {
        super();
        this.parentEditor = parentEditor;
        this.commentThread = commentThread;
        this.comment = comment;
        this.pendingEdit = pendingEdit;
        this.owner = owner;
        this.resource = resource;
        this.parentThread = parentThread;
        this.markdownRenderer = markdownRenderer;
        this.instantiationService = instantiationService;
        this.commentService = commentService;
        this.notificationService = notificationService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.accessibilityService = accessibilityService;
        this.keybindingService = keybindingService;
        this.textModelService = textModelService;
        this._md = this._register(new MutableDisposable());
        this._editAction = null;
        this._commentEditContainer = null;
        this._reactionsActionBar = this._register(new MutableDisposable());
        this._reactionActions = this._register(new DisposableStore());
        this._commentEditor = null;
        this._commentEditorDisposables = [];
        this._commentEditorModel = null;
        this._editorHeight = MIN_EDITOR_HEIGHT;
        this._actionRunner = this._register(new CommentsActionRunner());
        this.toolbar = this._register(new MutableDisposable());
        this._commentFormActions = null;
        this._commentEditorActions = null;
        this._onDidClick = new Emitter();
        this.isEditing = false;
        this._domNode = dom.$('div.review-comment');
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domNode));
        this._commentContextValue = CommentContextKeys.commentContext.bindTo(this._contextKeyService);
        if (this.comment.contextValue) {
            this._commentContextValue.set(this.comment.contextValue);
        }
        this._commentMenus = this.commentService.getCommentMenus(this.owner);
        this._domNode.tabIndex = -1;
        this._avatar = dom.append(this._domNode, dom.$('div.avatar-container'));
        this.updateCommentUserIcon(this.comment.userIconPath);
        this._commentDetailsContainer = dom.append(this._domNode, dom.$('.review-comment-contents'));
        this.createHeader(this._commentDetailsContainer);
        this._body = document.createElement(`div`);
        this._body.classList.add('comment-body', MOUSE_CURSOR_TEXT_CSS_CLASS_NAME);
        if (configurationService.getValue(COMMENTS_SECTION)?.maxHeight !== false) {
            this._body.classList.add('comment-body-max-height');
        }
        this.createScroll(this._commentDetailsContainer, this._body);
        this.updateCommentBody(this.comment.body);
        this.createReactionsContainer(this._commentDetailsContainer);
        this._domNode.setAttribute('aria-label', `${comment.userName}, ${this.commentBodyValue}`);
        this._domNode.setAttribute('role', 'treeitem');
        this._clearTimeout = null;
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.CLICK, () => this.isEditing || this._onDidClick.fire(this)));
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.CONTEXT_MENU, e => {
            return this.onContextMenu(e);
        }));
        if (pendingEdit) {
            this.switchToEditMode();
        }
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => {
            this.toggleToolbarHidden(true);
        }));
        this.activeCommentListeners();
    }
    activeCommentListeners() {
        this._register(dom.addDisposableListener(this._domNode, dom.EventType.FOCUS_IN, () => {
            this.commentService.setActiveCommentAndThread(this.owner, { thread: this.commentThread, comment: this.comment });
        }, true));
    }
    createScroll(container, body) {
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 125,
            scheduleAtNextAnimationFrame: cb => dom.scheduleAtNextAnimationFrame(dom.getWindow(container), cb)
        }));
        this._scrollableElement = this._register(new SmoothScrollableElement(body, {
            horizontal: 3 /* ScrollbarVisibility.Visible */,
            vertical: 3 /* ScrollbarVisibility.Visible */
        }, this._scrollable));
        this._register(this._scrollableElement.onScroll(e => {
            if (e.scrollLeftChanged) {
                body.scrollLeft = e.scrollLeft;
            }
            if (e.scrollTopChanged) {
                body.scrollTop = e.scrollTop;
            }
        }));
        const onDidScrollViewContainer = this._register(new DomEmitter(body, 'scroll')).event;
        this._register(onDidScrollViewContainer(_ => {
            const position = this._scrollableElement.getScrollPosition();
            const scrollLeft = Math.abs(body.scrollLeft - position.scrollLeft) <= 1 ? undefined : body.scrollLeft;
            const scrollTop = Math.abs(body.scrollTop - position.scrollTop) <= 1 ? undefined : body.scrollTop;
            if (scrollLeft !== undefined || scrollTop !== undefined) {
                this._scrollableElement.setScrollPosition({ scrollLeft, scrollTop });
            }
        }));
        container.appendChild(this._scrollableElement.getDomNode());
    }
    updateCommentBody(body) {
        this._body.innerText = '';
        this._md.clear();
        this._plainText = undefined;
        if (typeof body === 'string') {
            this._plainText = dom.append(this._body, dom.$('.comment-body-plainstring'));
            this._plainText.innerText = body;
        }
        else {
            this._md.value = this.markdownRenderer.render(body);
            this._body.appendChild(this._md.value.element);
        }
    }
    updateCommentUserIcon(userIconPath) {
        this._avatar.textContent = '';
        if (userIconPath) {
            const img = dom.append(this._avatar, dom.$('img.avatar'));
            img.src = FileAccess.uriToBrowserUri(URI.revive(userIconPath)).toString(true);
            img.onerror = _ => img.remove();
        }
    }
    get onDidClick() {
        return this._onDidClick.event;
    }
    createTimestamp(container) {
        this._timestamp = dom.append(container, dom.$('span.timestamp-container'));
        this.updateTimestamp(this.comment.timestamp);
    }
    updateTimestamp(raw) {
        if (!this._timestamp) {
            return;
        }
        const timestamp = raw !== undefined ? new Date(raw) : undefined;
        if (!timestamp) {
            this._timestampWidget?.dispose();
        }
        else {
            if (!this._timestampWidget) {
                this._timestampWidget = new TimestampWidget(this.configurationService, this.hoverService, this._timestamp, timestamp);
                this._register(this._timestampWidget);
            }
            else {
                this._timestampWidget.setTimestamp(timestamp);
            }
        }
    }
    createHeader(commentDetailsContainer) {
        const header = dom.append(commentDetailsContainer, dom.$(`div.comment-title.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        const infoContainer = dom.append(header, dom.$('comment-header-info'));
        const author = dom.append(infoContainer, dom.$('strong.author'));
        author.innerText = this.comment.userName;
        this.createTimestamp(infoContainer);
        this._isPendingLabel = dom.append(infoContainer, dom.$('span.isPending'));
        if (this.comment.label) {
            this._isPendingLabel.innerText = this.comment.label;
        }
        else {
            this._isPendingLabel.innerText = '';
        }
        this._actionsToolbarContainer = dom.append(header, dom.$('.comment-actions'));
        this.toggleToolbarHidden(true);
        this.createActionsToolbar();
    }
    toggleToolbarHidden(hidden) {
        if (hidden && !this.accessibilityService.isScreenReaderOptimized()) {
            this._actionsToolbarContainer.classList.add('hidden');
        }
        else {
            this._actionsToolbarContainer.classList.remove('hidden');
        }
    }
    getToolbarActions(menu) {
        const contributedActions = menu.getActions({ shouldForwardArgs: true });
        const primary = [];
        const secondary = [];
        const result = { primary, secondary };
        fillInActions(contributedActions, result, false, g => /^inline/.test(g));
        return result;
    }
    get commentNodeContext() {
        return [{
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                $mid: 10 /* MarshalledId.CommentNode */
            },
            {
                commentControlHandle: this.commentThread.controllerHandle,
                commentThreadHandle: this.commentThread.commentThreadHandle,
                $mid: 7 /* MarshalledId.CommentThread */
            }];
    }
    createToolbar() {
        this.toolbar.value = new ToolBar(this._actionsToolbarContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return new DropdownMenuActionViewItem(action, action.menuActions, this.contextMenuService, {
                        ...options,
                        actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
                        classNames: ['toolbar-toggle-pickReactions', ...ThemeIcon.asClassNameArray(Codicon.reactions)],
                        anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */
                    });
                }
                return this.actionViewItemProvider(action, options);
            },
            orientation: 0 /* ActionsOrientation.HORIZONTAL */
        });
        this.toolbar.value.context = this.commentNodeContext;
        this.toolbar.value.actionRunner = this._actionRunner;
        this.registerActionBarListeners(this._actionsToolbarContainer);
    }
    createActionsToolbar() {
        const actions = [];
        const hasReactionHandler = this.commentService.hasReactionHandler(this.owner);
        const toggleReactionAction = hasReactionHandler ? this.createReactionPicker(this.comment.commentReactions || []) : undefined;
        if (toggleReactionAction) {
            actions.push(toggleReactionAction);
        }
        const menu = this._commentMenus.getCommentTitleActions(this.comment, this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(e => {
            const { primary, secondary } = this.getToolbarActions(menu);
            if (!this.toolbar && (primary.length || secondary.length)) {
                this.createToolbar();
            }
            if (toggleReactionAction) {
                primary.unshift(toggleReactionAction);
            }
            this.toolbar.value.setActions(primary, secondary);
        }));
        const { primary, secondary } = this.getToolbarActions(menu);
        actions.push(...primary);
        if (actions.length || secondary.length) {
            this.createToolbar();
            this.toolbar.value.setActions(actions, secondary);
        }
    }
    actionViewItemProvider(action, options) {
        if (action.id === ToggleReactionsAction.ID) {
            options = { label: false, icon: true };
        }
        else {
            options = { label: false, icon: true };
        }
        if (action.id === ReactionAction.ID) {
            const item = new ReactionActionViewItem(action);
            return item;
        }
        else if (action instanceof MenuItemAction) {
            return this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate });
        }
        else if (action instanceof SubmenuItemAction) {
            return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, options);
        }
        else {
            const item = new ActionViewItem({}, action, options);
            return item;
        }
    }
    async submitComment() {
        if (this._commentEditor && this._commentFormActions) {
            await this._commentFormActions.triggerDefaultAction();
            this.pendingEdit = undefined;
        }
    }
    createReactionPicker(reactionGroup) {
        const toggleReactionAction = this._reactionActions.add(new ToggleReactionsAction(() => {
            toggleReactionActionViewItem?.show();
        }, nls.localize('commentToggleReaction', "Toggle Reaction")));
        let reactionMenuActions = [];
        if (reactionGroup && reactionGroup.length) {
            reactionMenuActions = reactionGroup.map((reaction) => {
                return this._reactionActions.add(new Action(`reaction.command.${reaction.label}`, `${reaction.label}`, '', true, async () => {
                    try {
                        await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
                    }
                    catch (e) {
                        const error = e.message
                            ? nls.localize('commentToggleReactionError', "Toggling the comment reaction failed: {0}.", e.message)
                            : nls.localize('commentToggleReactionDefaultError', "Toggling the comment reaction failed");
                        this.notificationService.error(error);
                    }
                }));
            });
        }
        toggleReactionAction.menuActions = reactionMenuActions;
        const toggleReactionActionViewItem = this._reactionActions.add(new DropdownMenuActionViewItem(toggleReactionAction, toggleReactionAction.menuActions, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return toggleReactionActionViewItem;
                }
                return this.actionViewItemProvider(action, options);
            },
            classNames: 'toolbar-toggle-pickReactions',
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */
        }));
        return toggleReactionAction;
    }
    createReactionsContainer(commentDetailsContainer) {
        this._reactionActionsContainer?.remove();
        this._reactionsActionBar.clear();
        this._reactionActions.clear();
        this._reactionActionsContainer = dom.append(commentDetailsContainer, dom.$('div.comment-reactions'));
        this._reactionsActionBar.value = new ActionBar(this._reactionActionsContainer, {
            actionViewItemProvider: (action, options) => {
                if (action.id === ToggleReactionsAction.ID) {
                    return new DropdownMenuActionViewItem(action, action.menuActions, this.contextMenuService, {
                        actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
                        classNames: ['toolbar-toggle-pickReactions', ...ThemeIcon.asClassNameArray(Codicon.reactions)],
                        anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */
                    });
                }
                return this.actionViewItemProvider(action, options);
            }
        });
        const hasReactionHandler = this.commentService.hasReactionHandler(this.owner);
        this.comment.commentReactions?.filter(reaction => !!reaction.count).map(reaction => {
            const action = this._reactionActions.add(new ReactionAction(`reaction.${reaction.label}`, `${reaction.label}`, reaction.hasReacted && (reaction.canEdit || hasReactionHandler) ? 'active' : '', (reaction.canEdit || hasReactionHandler), async () => {
                try {
                    await this.commentService.toggleReaction(this.owner, this.resource, this.commentThread, this.comment, reaction);
                }
                catch (e) {
                    let error;
                    if (reaction.hasReacted) {
                        error = e.message
                            ? nls.localize('commentDeleteReactionError', "Deleting the comment reaction failed: {0}.", e.message)
                            : nls.localize('commentDeleteReactionDefaultError', "Deleting the comment reaction failed");
                    }
                    else {
                        error = e.message
                            ? nls.localize('commentAddReactionError', "Deleting the comment reaction failed: {0}.", e.message)
                            : nls.localize('commentAddReactionDefaultError', "Deleting the comment reaction failed");
                    }
                    this.notificationService.error(error);
                }
            }, reaction.reactors, reaction.iconPath, reaction.count));
            this._reactionsActionBar.value?.push(action, { label: true, icon: true });
        });
        if (hasReactionHandler) {
            const toggleReactionAction = this.createReactionPicker(this.comment.commentReactions || []);
            this._reactionsActionBar.value?.push(toggleReactionAction, { label: false, icon: true });
        }
    }
    get commentBodyValue() {
        return (typeof this.comment.body === 'string') ? this.comment.body : this.comment.body.value;
    }
    async createCommentEditor(editContainer) {
        const container = dom.append(editContainer, dom.$('.edit-textarea'));
        this._commentEditor = this.instantiationService.createInstance(SimpleCommentEditor, container, SimpleCommentEditor.getEditorOptions(this.configurationService), this._contextKeyService, this.parentThread);
        const resource = URI.from({
            scheme: Schemas.commentsInput,
            path: `/commentinput-${this.comment.uniqueIdInThread}-${Date.now()}.md`
        });
        const modelRef = await this.textModelService.createModelReference(resource);
        this._commentEditorModel = modelRef;
        this._commentEditor.setModel(this._commentEditorModel.object.textEditorModel);
        this._commentEditor.setValue(this.pendingEdit?.body ?? this.commentBodyValue);
        if (this.pendingEdit) {
            this._commentEditor.setPosition(this.pendingEdit.cursor);
        }
        else {
            const lastLine = this._commentEditorModel.object.textEditorModel.getLineCount();
            const lastColumn = this._commentEditorModel.object.textEditorModel.getLineLength(lastLine) + 1;
            this._commentEditor.setPosition(new Position(lastLine, lastColumn));
        }
        this.pendingEdit = undefined;
        this._commentEditor.layout({ width: container.clientWidth - 14, height: this._editorHeight });
        this._commentEditor.focus();
        dom.scheduleAtNextAnimationFrame(dom.getWindow(editContainer), () => {
            this._commentEditor.layout({ width: container.clientWidth - 14, height: this._editorHeight });
            this._commentEditor.focus();
        });
        const commentThread = this.commentThread;
        commentThread.input = {
            uri: this._commentEditor.getModel().uri,
            value: this.commentBodyValue
        };
        this.commentService.setActiveEditingCommentThread(commentThread);
        this.commentService.setActiveCommentAndThread(this.owner, { thread: commentThread, comment: this.comment });
        this._commentEditorDisposables.push(this._commentEditor.onDidFocusEditorWidget(() => {
            commentThread.input = {
                uri: this._commentEditor.getModel().uri,
                value: this.commentBodyValue
            };
            this.commentService.setActiveEditingCommentThread(commentThread);
            this.commentService.setActiveCommentAndThread(this.owner, { thread: commentThread, comment: this.comment });
        }));
        this._commentEditorDisposables.push(this._commentEditor.onDidChangeModelContent(e => {
            if (commentThread.input && this._commentEditor && this._commentEditor.getModel().uri === commentThread.input.uri) {
                const newVal = this._commentEditor.getValue();
                if (newVal !== commentThread.input.value) {
                    const input = commentThread.input;
                    input.value = newVal;
                    commentThread.input = input;
                    this.commentService.setActiveEditingCommentThread(commentThread);
                    this.commentService.setActiveCommentAndThread(this.owner, { thread: commentThread, comment: this.comment });
                }
            }
        }));
        this.calculateEditorHeight();
        this._register((this._commentEditorModel.object.textEditorModel.onDidChangeContent(() => {
            if (this._commentEditor && this.calculateEditorHeight()) {
                this._commentEditor.layout({ height: this._editorHeight, width: this._commentEditor.getLayoutInfo().width });
                this._commentEditor.render(true);
            }
        })));
        this._register(this._commentEditor);
        this._register(this._commentEditorModel);
    }
    calculateEditorHeight() {
        if (this._commentEditor) {
            const newEditorHeight = calculateEditorHeight(this.parentEditor, this._commentEditor, this._editorHeight);
            if (newEditorHeight !== this._editorHeight) {
                this._editorHeight = newEditorHeight;
                return true;
            }
        }
        return false;
    }
    getPendingEdit() {
        const model = this._commentEditor?.getModel();
        if (this._commentEditor && model && model.getValueLength() > 0) {
            return { body: model.getValue(), cursor: this._commentEditor.getPosition() };
        }
        return undefined;
    }
    removeCommentEditor() {
        this.isEditing = false;
        if (this._editAction) {
            this._editAction.enabled = true;
        }
        this._body.classList.remove('hidden');
        this._commentEditorModel?.dispose();
        dispose(this._commentEditorDisposables);
        this._commentEditorDisposables = [];
        this._commentEditor?.dispose();
        this._commentEditor = null;
        this._commentEditContainer.remove();
    }
    layout(widthInPixel) {
        const editorWidth = widthInPixel !== undefined ? widthInPixel - 72 /* - margin and scrollbar*/ : (this._commentEditor?.getLayoutInfo().width ?? 0);
        this._commentEditor?.layout({ width: editorWidth, height: this._editorHeight });
        const scrollWidth = this._body.scrollWidth;
        const width = dom.getContentWidth(this._body);
        const scrollHeight = this._body.scrollHeight;
        const height = dom.getContentHeight(this._body) + 4;
        this._scrollableElement.setScrollDimensions({ width, scrollWidth, height, scrollHeight });
    }
    async switchToEditMode() {
        if (this.isEditing) {
            return;
        }
        this.isEditing = true;
        this._body.classList.add('hidden');
        this._commentEditContainer = dom.append(this._commentDetailsContainer, dom.$('.edit-container'));
        await this.createCommentEditor(this._commentEditContainer);
        const formActions = dom.append(this._commentEditContainer, dom.$('.form-actions'));
        const otherActions = dom.append(formActions, dom.$('.other-actions'));
        this.createCommentWidgetFormActions(otherActions);
        const editorActions = dom.append(formActions, dom.$('.editor-actions'));
        this.createCommentWidgetEditorActions(editorActions);
    }
    createCommentWidgetFormActions(container) {
        const menus = this.commentService.getCommentMenus(this.owner);
        const menu = menus.getCommentActions(this.comment, this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions?.setActions(menu);
        }));
        this._commentFormActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, (action) => {
            const text = this._commentEditor.getValue();
            action.run({
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                text: text,
                $mid: 11 /* MarshalledId.CommentThreadNode */
            });
            this.removeCommentEditor();
        });
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu);
    }
    createCommentWidgetEditorActions(container) {
        const menus = this.commentService.getCommentMenus(this.owner);
        const menu = menus.getCommentEditorActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentEditorActions?.setActions(menu, true);
        }));
        this._commentEditorActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, (action) => {
            const text = this._commentEditor.getValue();
            action.run({
                thread: this.commentThread,
                commentUniqueId: this.comment.uniqueIdInThread,
                text: text,
                $mid: 11 /* MarshalledId.CommentThreadNode */
            });
            this._commentEditor?.focus();
        });
        this._register(this._commentEditorActions);
        this._commentEditorActions.setActions(menu, true);
    }
    setFocus(focused, visible = false) {
        if (focused) {
            this._domNode.focus();
            this.toggleToolbarHidden(false);
            this._actionsToolbarContainer.classList.add('tabfocused');
            this._domNode.tabIndex = 0;
            if (this.comment.mode === languages.CommentMode.Editing) {
                this._commentEditor?.focus();
            }
        }
        else {
            if (this._actionsToolbarContainer.classList.contains('tabfocused') && !this._actionsToolbarContainer.classList.contains('mouseover')) {
                this.toggleToolbarHidden(true);
                this._domNode.tabIndex = -1;
            }
            this._actionsToolbarContainer.classList.remove('tabfocused');
        }
    }
    registerActionBarListeners(actionsContainer) {
        this._register(dom.addDisposableListener(this._domNode, 'mouseenter', () => {
            this.toggleToolbarHidden(false);
            actionsContainer.classList.add('mouseover');
        }));
        this._register(dom.addDisposableListener(this._domNode, 'mouseleave', () => {
            if (actionsContainer.classList.contains('mouseover') && !actionsContainer.classList.contains('tabfocused')) {
                this.toggleToolbarHidden(true);
            }
            actionsContainer.classList.remove('mouseover');
        }));
    }
    async update(newComment) {
        if (newComment.body !== this.comment.body) {
            this.updateCommentBody(newComment.body);
        }
        if (this.comment.userIconPath && newComment.userIconPath && (URI.from(this.comment.userIconPath).toString() !== URI.from(newComment.userIconPath).toString())) {
            this.updateCommentUserIcon(newComment.userIconPath);
        }
        const isChangingMode = newComment.mode !== undefined && newComment.mode !== this.comment.mode;
        this.comment = newComment;
        if (isChangingMode) {
            if (newComment.mode === languages.CommentMode.Editing) {
                await this.switchToEditMode();
            }
            else {
                this.removeCommentEditor();
            }
        }
        if (newComment.label) {
            this._isPendingLabel.innerText = newComment.label;
        }
        else {
            this._isPendingLabel.innerText = '';
        }
        // update comment reactions
        this.createReactionsContainer(this._commentDetailsContainer);
        if (this.comment.contextValue) {
            this._commentContextValue.set(this.comment.contextValue);
        }
        else {
            this._commentContextValue.reset();
        }
        if (this.comment.timestamp) {
            this.updateTimestamp(this.comment.timestamp);
        }
    }
    onContextMenu(e) {
        const event = new StandardMouseEvent(dom.getWindow(this._domNode), e);
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            menuId: MenuId.CommentThreadCommentContext,
            menuActionOptions: { shouldForwardArgs: true },
            contextKeyService: this._contextKeyService,
            actionRunner: this._actionRunner,
            getActionsContext: () => {
                return this.commentNodeContext;
            },
        });
    }
    focus() {
        this.domNode.focus();
        if (!this._clearTimeout) {
            this.domNode.classList.add('focus');
            this._clearTimeout = setTimeout(() => {
                this.domNode.classList.remove('focus');
            }, 3000);
        }
    }
    dispose() {
        super.dispose();
        dispose(this._commentEditorDisposables);
    }
};
CommentNode = __decorate([
    __param(8, IInstantiationService),
    __param(9, ICommentService),
    __param(10, INotificationService),
    __param(11, IContextMenuService),
    __param(12, IContextKeyService),
    __param(13, IConfigurationService),
    __param(14, IHoverService),
    __param(15, IAccessibilityService),
    __param(16, IKeybindingService),
    __param(17, ITextModelService)
], CommentNode);
export { CommentNode };
function fillInActions(groups, target, useAlternativeActions, isPrimaryGroup = group => group === 'navigation') {
    for (const tuple of groups) {
        let [group, actions] = tuple;
        if (useAlternativeActions) {
            actions = actions.map(a => (a instanceof MenuItemAction) && !!a.alt ? a.alt : a);
        }
        if (isPrimaryGroup(group)) {
            const to = Array.isArray(target) ? target : target.primary;
            to.unshift(...actions);
        }
        else {
            const to = Array.isArray(target) ? target : target.secondary;
            if (to.length > 0) {
                to.push(new Separator());
            }
            to.push(...actions);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50Tm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQXNCLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUEyQixpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4SSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0gsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQs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