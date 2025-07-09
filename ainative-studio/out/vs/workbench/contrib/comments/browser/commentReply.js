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
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CommentFormActions } from './commentFormActions.js';
import { ICommentService } from './commentService.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { MIN_EDITOR_HEIGHT, SimpleCommentEditor, calculateEditorHeight } from './simpleCommentEditor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Position } from '../../../../editor/common/core/position.js';
let INMEM_MODEL_ID = 0;
export const COMMENTEDITOR_DECORATION_KEY = 'commenteditordecoration';
let CommentReply = class CommentReply extends Disposable {
    constructor(owner, container, _parentEditor, _commentThread, _scopedInstatiationService, _contextKeyService, _commentMenus, _commentOptions, _pendingComment, _parentThread, focus, _actionRunDelegate, commentService, configurationService, keybindingService, contextMenuService, hoverService, textModelService) {
        super();
        this.owner = owner;
        this._parentEditor = _parentEditor;
        this._commentThread = _commentThread;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._contextKeyService = _contextKeyService;
        this._commentMenus = _commentMenus;
        this._commentOptions = _commentOptions;
        this._pendingComment = _pendingComment;
        this._parentThread = _parentThread;
        this._actionRunDelegate = _actionRunDelegate;
        this.commentService = commentService;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.textModelService = textModelService;
        this._commentThreadDisposables = [];
        this._editorHeight = MIN_EDITOR_HEIGHT;
        this.form = dom.append(container, dom.$('.comment-form'));
        this.commentEditor = this._register(this._scopedInstatiationService.createInstance(SimpleCommentEditor, this.form, SimpleCommentEditor.getEditorOptions(configurationService), _contextKeyService, this._parentThread));
        this.commentEditorIsEmpty = CommentContextKeys.commentIsEmpty.bindTo(this._contextKeyService);
        this.commentEditorIsEmpty.set(!this._pendingComment);
        this.initialize(focus);
    }
    async initialize(focus) {
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const modeId = generateUuid() + '-' + (hasExistingComments ? this._commentThread.threadId : ++INMEM_MODEL_ID);
        const params = JSON.stringify({
            extensionId: this._commentThread.extensionId,
            commentThreadId: this._commentThread.threadId
        });
        let resource = URI.from({
            scheme: Schemas.commentsInput,
            path: `/${this._commentThread.extensionId}/commentinput-${modeId}.md?${params}` // TODO. Remove params once extensions adopt authority.
        });
        const commentController = this.commentService.getCommentController(this.owner);
        if (commentController) {
            resource = resource.with({ authority: commentController.id });
        }
        const model = await this.textModelService.createModelReference(resource);
        model.object.textEditorModel.setValue(this._pendingComment?.body || '');
        this._register(model);
        this.commentEditor.setModel(model.object.textEditorModel);
        if (this._pendingComment) {
            this.commentEditor.setPosition(this._pendingComment.cursor);
        }
        this.calculateEditorHeight();
        this._register(model.object.textEditorModel.onDidChangeContent(() => {
            this.setCommentEditorDecorations();
            this.commentEditorIsEmpty?.set(!this.commentEditor.getValue());
            if (this.calculateEditorHeight()) {
                this.commentEditor.layout({ height: this._editorHeight, width: this.commentEditor.getLayoutInfo().width });
                this.commentEditor.render(true);
            }
        }));
        this.createTextModelListener(this.commentEditor, this.form);
        this.setCommentEditorDecorations();
        // Only add the additional step of clicking a reply button to expand the textarea when there are existing comments
        if (this._pendingComment) {
            this.expandReplyArea();
        }
        else if (hasExistingComments) {
            this.createReplyButton(this.commentEditor, this.form);
        }
        else if (focus && (this._commentThread.comments && this._commentThread.comments.length === 0)) {
            this.expandReplyArea();
        }
        this._error = dom.append(this.form, dom.$('.validation-error.hidden'));
        const formActions = dom.append(this.form, dom.$('.form-actions'));
        this._formActions = dom.append(formActions, dom.$('.other-actions'));
        this.createCommentWidgetFormActions(this._formActions, model.object.textEditorModel);
        this._editorActions = dom.append(formActions, dom.$('.editor-actions'));
        this.createCommentWidgetEditorActions(this._editorActions, model.object.textEditorModel);
    }
    calculateEditorHeight() {
        const newEditorHeight = calculateEditorHeight(this._parentEditor, this.commentEditor, this._editorHeight);
        if (newEditorHeight !== this._editorHeight) {
            this._editorHeight = newEditorHeight;
            return true;
        }
        return false;
    }
    updateCommentThread(commentThread) {
        const isReplying = this.commentEditor.hasTextFocus();
        const oldAndNewBothEmpty = !this._commentThread.comments?.length && !commentThread.comments?.length;
        if (!this._reviewThreadReplyButton) {
            this.createReplyButton(this.commentEditor, this.form);
        }
        if (this._commentThread.comments && this._commentThread.comments.length === 0 && !oldAndNewBothEmpty) {
            this.expandReplyArea();
        }
        if (isReplying) {
            this.commentEditor.focus();
        }
    }
    getPendingComment() {
        const model = this.commentEditor.getModel();
        if (model && model.getValueLength() > 0) { // checking length is cheap
            return { body: model.getValue(), cursor: this.commentEditor.getPosition() ?? new Position(1, 1) };
        }
        return undefined;
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this.expandReplyArea();
        this.commentEditor.setValue(pending.body);
        this.commentEditor.setPosition(pending.cursor);
    }
    layout(widthInPixel) {
        this.commentEditor.layout({ height: this._editorHeight, width: widthInPixel - 54 /* margin 20px * 10 + scrollbar 14px*/ });
    }
    focusIfNeeded() {
        if (!this._commentThread.comments || !this._commentThread.comments.length) {
            this.commentEditor.focus();
        }
        else if ((this.commentEditor.getModel()?.getValueLength() ?? 0) > 0) {
            this.expandReplyArea();
        }
    }
    focusCommentEditor() {
        this.commentEditor.focus();
    }
    expandReplyAreaAndFocusCommentEditor() {
        this.expandReplyArea();
        this.commentEditor.focus();
    }
    isCommentEditorFocused() {
        return this.commentEditor.hasWidgetFocus();
    }
    updateCanReply() {
        if (!this._commentThread.canReply) {
            this.form.style.display = 'none';
        }
        else {
            this.form.style.display = 'block';
        }
    }
    async submitComment() {
        await this._commentFormActions?.triggerDefaultAction();
        this._pendingComment = undefined;
    }
    setCommentEditorDecorations() {
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const placeholder = hasExistingComments
            ? (this._commentOptions?.placeHolder || nls.localize('reply', "Reply..."))
            : (this._commentOptions?.placeHolder || nls.localize('newComment', "Type a new comment"));
        this.commentEditor.updateOptions({ placeholder });
    }
    createTextModelListener(commentEditor, commentForm) {
        this._commentThreadDisposables.push(commentEditor.onDidFocusEditorWidget(() => {
            this._commentThread.input = {
                uri: commentEditor.getModel().uri,
                value: commentEditor.getValue()
            };
            this.commentService.setActiveEditingCommentThread(this._commentThread);
            this.commentService.setActiveCommentAndThread(this.owner, { thread: this._commentThread });
        }));
        this._commentThreadDisposables.push(commentEditor.getModel().onDidChangeContent(() => {
            const modelContent = commentEditor.getValue();
            if (this._commentThread.input && this._commentThread.input.uri === commentEditor.getModel().uri && this._commentThread.input.value !== modelContent) {
                const newInput = this._commentThread.input;
                newInput.value = modelContent;
                this._commentThread.input = newInput;
            }
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeInput(input => {
            const thread = this._commentThread;
            const model = commentEditor.getModel();
            if (thread.input && model && (thread.input.uri !== model.uri)) {
                return;
            }
            if (!input) {
                return;
            }
            if (commentEditor.getValue() !== input.value) {
                commentEditor.setValue(input.value);
                if (input.value === '') {
                    this._pendingComment = { body: '', cursor: new Position(1, 1) };
                    commentForm.classList.remove('expand');
                    commentEditor.getDomNode().style.outline = '';
                    this._error.textContent = '';
                    this._error.classList.add('hidden');
                }
            }
        }));
    }
    /**
     * Command based actions.
     */
    createCommentWidgetFormActions(container, model) {
        const menu = this._commentMenus.getCommentThreadActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions.setActions(menu);
        }));
        this._commentFormActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            await this._actionRunDelegate?.();
            await action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */
            });
            this.hideReplyArea();
        });
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu);
    }
    createCommentWidgetEditorActions(container, model) {
        const editorMenu = this._commentMenus.getCommentEditorActions(this._contextKeyService);
        this._register(editorMenu);
        this._register(editorMenu.onDidChange(() => {
            this._commentEditorActions.setActions(editorMenu, true);
        }));
        this._commentEditorActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            this._actionRunDelegate?.();
            action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */
            });
            this.focusCommentEditor();
        });
        this._register(this._commentEditorActions);
        this._commentEditorActions.setActions(editorMenu, true);
    }
    get isReplyExpanded() {
        return this.form.classList.contains('expand');
    }
    expandReplyArea() {
        if (!this.isReplyExpanded) {
            this.form.classList.add('expand');
            this.commentEditor.focus();
            this.commentEditor.layout();
        }
    }
    clearAndExpandReplyArea() {
        if (!this.isReplyExpanded) {
            this.commentEditor.setValue('');
            this.expandReplyArea();
        }
    }
    hideReplyArea() {
        const domNode = this.commentEditor.getDomNode();
        if (domNode) {
            domNode.style.outline = '';
        }
        this.commentEditor.setValue('');
        this._pendingComment = { body: '', cursor: new Position(1, 1) };
        this.form.classList.remove('expand');
        this._error.textContent = '';
        this._error.classList.add('hidden');
    }
    createReplyButton(commentEditor, commentForm) {
        this._reviewThreadReplyButton = dom.append(commentForm, dom.$(`button.review-thread-reply-button.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this._reviewThreadReplyButton, this._commentOptions?.prompt || nls.localize('reply', "Reply...")));
        this._reviewThreadReplyButton.textContent = this._commentOptions?.prompt || nls.localize('reply', "Reply...");
        // bind click/escape actions for reviewThreadReplyButton and textArea
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'click', _ => this.clearAndExpandReplyArea()));
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'focus', _ => this.clearAndExpandReplyArea()));
        this._register(commentEditor.onDidBlurEditorWidget(() => {
            if (commentEditor.getModel().getValueLength() === 0 && commentForm.classList.contains('expand')) {
                commentForm.classList.remove('expand');
            }
        }));
    }
    dispose() {
        super.dispose();
        dispose(this._commentThreadDisposables);
    }
};
CommentReply = __decorate([
    __param(12, ICommentService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService),
    __param(15, IContextMenuService),
    __param(16, IHoverService),
    __param(17, ITextModelService)
], CommentReply);
export { CommentReply };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFJlcGx5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFJlcGx5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFMUcsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUsvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUdyRSxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFF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