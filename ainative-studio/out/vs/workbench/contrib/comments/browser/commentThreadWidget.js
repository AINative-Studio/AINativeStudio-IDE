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
import './media/review.css';
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../../editor/common/languages.js';
import { CommentReply } from './commentReply.js';
import { ICommentService } from './commentService.js';
import { CommentThreadBody } from './commentThreadBody.js';
import { CommentThreadHeader } from './commentThreadHeader.js';
import { CommentThreadAdditionalActions } from './commentThreadAdditionalActions.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { contrastBorder, focusBorder, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, textBlockQuoteBackground, textBlockQuoteBorder, textLinkActiveForeground, textLinkForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { PANEL_BORDER } from '../../../common/theme.js';
import { Range } from '../../../../editor/common/core/range.js';
import { commentThreadStateBackgroundColorVar, commentThreadStateColorVar } from './commentColors.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { localize } from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
export const COMMENTEDITOR_DECORATION_KEY = 'commenteditordecoration';
let CommentThreadWidget = class CommentThreadWidget extends Disposable {
    get commentThread() {
        return this._commentThread;
    }
    constructor(container, _parentEditor, _owner, _parentResourceUri, _contextKeyService, _scopedInstantiationService, _commentThread, _pendingComment, _pendingEdits, _markdownOptions, _commentOptions, _containerDelegate, commentService, configurationService, _keybindingService) {
        super();
        this.container = container;
        this._parentEditor = _parentEditor;
        this._owner = _owner;
        this._parentResourceUri = _parentResourceUri;
        this._contextKeyService = _contextKeyService;
        this._scopedInstantiationService = _scopedInstantiationService;
        this._commentThread = _commentThread;
        this._pendingComment = _pendingComment;
        this._pendingEdits = _pendingEdits;
        this._markdownOptions = _markdownOptions;
        this._commentOptions = _commentOptions;
        this._containerDelegate = _containerDelegate;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this._keybindingService = _keybindingService;
        this._commentThreadDisposables = [];
        this._onDidResize = new Emitter();
        this.onDidResize = this._onDidResize.event;
        this._threadIsEmpty = CommentContextKeys.commentThreadIsEmpty.bindTo(this._contextKeyService);
        this._threadIsEmpty.set(!_commentThread.comments || !_commentThread.comments.length);
        this._focusedContextKey = CommentContextKeys.commentFocused.bindTo(this._contextKeyService);
        this._commentMenus = this.commentService.getCommentMenus(this._owner);
        this._register(this._header = this._scopedInstantiationService.createInstance(CommentThreadHeader, container, {
            collapse: this._containerDelegate.collapse.bind(this)
        }, this._commentMenus, this._commentThread));
        this._header.updateCommentThread(this._commentThread);
        const bodyElement = dom.$('.body');
        container.appendChild(bodyElement);
        this._register(toDisposable(() => bodyElement.remove()));
        const tracker = this._register(dom.trackFocus(bodyElement));
        this._register(registerNavigableContainer({
            name: 'commentThreadWidget',
            focusNotifiers: [tracker],
            focusNextWidget: () => {
                if (!this._commentReply?.isCommentEditorFocused()) {
                    this._commentReply?.expandReplyAreaAndFocusCommentEditor();
                }
            },
            focusPreviousWidget: () => {
                if (this._commentReply?.isCommentEditorFocused() && this._commentThread.comments?.length) {
                    this._body.focus();
                }
            }
        }));
        this._register(tracker.onDidFocus(() => this._focusedContextKey.set(true)));
        this._register(tracker.onDidBlur(() => this._focusedContextKey.reset()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */)) {
                this._setAriaLabel();
            }
        }));
        this._body = this._scopedInstantiationService.createInstance(CommentThreadBody, this._parentEditor, this._owner, this._parentResourceUri, bodyElement, this._markdownOptions, this._commentThread, this._pendingEdits, this._scopedInstantiationService, this);
        this._register(this._body);
        this._setAriaLabel();
        this._styleElement = domStylesheets.createStyleSheet(this.container);
        this._commentThreadContextValue = CommentContextKeys.commentThreadContext.bindTo(this._contextKeyService);
        this._commentThreadContextValue.set(_commentThread.contextValue);
        const commentControllerKey = CommentContextKeys.commentControllerContext.bindTo(this._contextKeyService);
        const controller = this.commentService.getCommentController(this._owner);
        if (controller?.contextValue) {
            commentControllerKey.set(controller.contextValue);
        }
        this.currentThreadListeners();
    }
    get hasUnsubmittedComments() {
        return !!this._commentReply?.commentEditor.getValue() || this._body.hasCommentsInEditMode();
    }
    _setAriaLabel() {
        let ariaLabel = localize('commentLabel', "Comment");
        let keybinding;
        const verbose = this.configurationService.getValue("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */);
        if (verbose) {
            keybinding = this._keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */, this._contextKeyService)?.getLabel() ?? undefined;
        }
        if (keybinding) {
            ariaLabel = localize('commentLabelWithKeybinding', "{0}, use ({1}) for accessibility help", ariaLabel, keybinding);
        }
        else if (verbose) {
            ariaLabel = localize('commentLabelWithKeybindingNoKeybinding', "{0}, run the command Open Accessibility Help which is currently not triggerable via keybinding.", ariaLabel);
        }
        this._body.container.ariaLabel = ariaLabel;
    }
    updateCurrentThread(hasMouse, hasFocus) {
        if (hasMouse || hasFocus) {
            this.commentService.setCurrentCommentThread(this.commentThread);
        }
        else {
            this.commentService.setCurrentCommentThread(undefined);
        }
    }
    currentThreadListeners() {
        let hasMouse = false;
        let hasFocus = false;
        this._register(dom.addDisposableListener(this.container, dom.EventType.MOUSE_ENTER, (e) => {
            if (e.toElement === this.container) {
                hasMouse = true;
                this.updateCurrentThread(hasMouse, hasFocus);
            }
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.MOUSE_LEAVE, (e) => {
            if (e.fromElement === this.container) {
                hasMouse = false;
                this.updateCurrentThread(hasMouse, hasFocus);
            }
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.FOCUS_IN, () => {
            hasFocus = true;
            this.updateCurrentThread(hasMouse, hasFocus);
        }, true));
        this._register(dom.addDisposableListener(this.container, dom.EventType.FOCUS_OUT, () => {
            hasFocus = false;
            this.updateCurrentThread(hasMouse, hasFocus);
        }, true));
    }
    async updateCommentThread(commentThread) {
        const shouldCollapse = (this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded) && (this._commentThreadState === languages.CommentThreadState.Unresolved)
            && (commentThread.state === languages.CommentThreadState.Resolved);
        this._commentThreadState = commentThread.state;
        this._commentThread = commentThread;
        dispose(this._commentThreadDisposables);
        this._commentThreadDisposables = [];
        this._bindCommentThreadListeners();
        await this._body.updateCommentThread(commentThread, this._commentReply?.isCommentEditorFocused() ?? false);
        this._threadIsEmpty.set(!this._body.length);
        this._header.updateCommentThread(commentThread);
        this._commentReply?.updateCommentThread(commentThread);
        if (this._commentThread.contextValue) {
            this._commentThreadContextValue.set(this._commentThread.contextValue);
        }
        else {
            this._commentThreadContextValue.reset();
        }
        if (shouldCollapse && this.configurationService.getValue(COMMENTS_SECTION).collapseOnResolve) {
            this.collapse();
        }
    }
    async display(lineHeight, focus) {
        const headHeight = Math.max(23, Math.ceil(lineHeight * 1.2)); // 23 is the value of `Math.ceil(lineHeight * 1.2)` with the default editor font size
        this._header.updateHeight(headHeight);
        await this._body.display();
        // create comment thread only when it supports reply
        if (this._commentThread.canReply) {
            this._createCommentForm(focus);
        }
        this._createAdditionalActions();
        this._register(this._body.onDidResize(dimension => {
            this._refresh(dimension);
        }));
        // If there are no existing comments, place focus on the text area. This must be done after show, which also moves focus.
        // if this._commentThread.comments is undefined, it doesn't finish initialization yet, so we don't focus the editor immediately.
        if (this._commentThread.canReply && this._commentReply) {
            this._commentReply.focusIfNeeded();
        }
        this._bindCommentThreadListeners();
    }
    _refresh(dimension) {
        this._body.layout();
        this._onDidResize.fire(dimension);
    }
    dispose() {
        super.dispose();
        dispose(this._commentThreadDisposables);
        this.updateCurrentThread(false, false);
    }
    _bindCommentThreadListeners() {
        this._commentThreadDisposables.push(this._commentThread.onDidChangeCanReply(() => {
            if (this._commentReply) {
                this._commentReply.updateCanReply();
            }
            else {
                if (this._commentThread.canReply) {
                    this._createCommentForm(false);
                }
            }
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeComments(async (_) => {
            await this.updateCommentThread(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeLabel(_ => {
            this._header.createThreadLabel();
        }));
    }
    _createCommentForm(focus) {
        this._commentReply = this._scopedInstantiationService.createInstance(CommentReply, this._owner, this._body.container, this._parentEditor, this._commentThread, this._scopedInstantiationService, this._contextKeyService, this._commentMenus, this._commentOptions, this._pendingComment, this, focus, this._containerDelegate.actionRunner);
        this._register(this._commentReply);
    }
    _createAdditionalActions() {
        this._additionalActions = this._scopedInstantiationService.createInstance(CommentThreadAdditionalActions, this._body.container, this._commentThread, this._contextKeyService, this._commentMenus, this._containerDelegate.actionRunner);
        this._register(this._additionalActions);
    }
    getCommentCoords(commentUniqueId) {
        return this._body.getCommentCoords(commentUniqueId);
    }
    getPendingEdits() {
        return this._body.getPendingEdits();
    }
    getPendingComment() {
        if (this._commentReply) {
            return this._commentReply.getPendingComment();
        }
        return undefined;
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this._commentReply?.setPendingComment(pending);
    }
    getDimensions() {
        return this._body.getDimensions();
    }
    layout(widthInPixel) {
        this._body.layout(widthInPixel);
        if (widthInPixel !== undefined) {
            this._commentReply?.layout(widthInPixel);
        }
    }
    ensureFocusIntoNewEditingComment() {
        this._body.ensureFocusIntoNewEditingComment();
    }
    focusCommentEditor() {
        this._commentReply?.expandReplyAreaAndFocusCommentEditor();
    }
    focus(commentUniqueId) {
        this._body.focus(commentUniqueId);
    }
    async submitComment() {
        const activeComment = this._body.activeComment;
        if (activeComment) {
            return activeComment.submitComment();
        }
        else if ((this._commentReply?.getPendingComment()?.body.length ?? 0) > 0) {
            return this._commentReply?.submitComment();
        }
    }
    async collapse() {
        if ((await this._containerDelegate.collapse()) && Range.isIRange(this.commentThread.range) && isCodeEditor(this._parentEditor)) {
            this._parentEditor.setSelection(this.commentThread.range);
        }
    }
    applyTheme(theme, fontInfo) {
        const content = [];
        content.push(`.monaco-editor .review-widget > .body { border-top: 1px solid var(${commentThreadStateColorVar}) }`);
        content.push(`.monaco-editor .review-widget > .head { background-color: var(${commentThreadStateBackgroundColorVar}) }`);
        const linkColor = theme.getColor(textLinkForeground);
        if (linkColor) {
            content.push(`.review-widget .body .comment-body a { color: ${linkColor} }`);
        }
        const linkActiveColor = theme.getColor(textLinkActiveForeground);
        if (linkActiveColor) {
            content.push(`.review-widget .body .comment-body a:hover, a:active { color: ${linkActiveColor} }`);
        }
        const focusColor = theme.getColor(focusBorder);
        if (focusColor) {
            content.push(`.review-widget .body .comment-body a:focus { outline: 1px solid ${focusColor}; }`);
            content.push(`.review-widget .body .monaco-editor.focused { outline: 1px solid ${focusColor}; }`);
        }
        const blockQuoteBackground = theme.getColor(textBlockQuoteBackground);
        if (blockQuoteBackground) {
            content.push(`.review-widget .body .review-comment blockquote { background: ${blockQuoteBackground}; }`);
        }
        const blockQuoteBOrder = theme.getColor(textBlockQuoteBorder);
        if (blockQuoteBOrder) {
            content.push(`.review-widget .body .review-comment blockquote { border-color: ${blockQuoteBOrder}; }`);
        }
        const border = theme.getColor(PANEL_BORDER);
        if (border) {
            content.push(`.review-widget .body .review-comment .review-comment-contents .comment-reactions .action-item a.action-label { border-color: ${border}; }`);
        }
        const hcBorder = theme.getColor(contrastBorder);
        if (hcBorder) {
            content.push(`.review-widget .body .comment-form .review-thread-reply-button { outline-color: ${hcBorder}; }`);
            content.push(`.review-widget .body .monaco-editor { outline: 1px solid ${hcBorder}; }`);
        }
        const errorBorder = theme.getColor(inputValidationErrorBorder);
        if (errorBorder) {
            content.push(`.review-widget .validation-error { border: 1px solid ${errorBorder}; }`);
        }
        const errorBackground = theme.getColor(inputValidationErrorBackground);
        if (errorBackground) {
            content.push(`.review-widget .validation-error { background: ${errorBackground}; }`);
        }
        const errorForeground = theme.getColor(inputValidationErrorForeground);
        if (errorForeground) {
            content.push(`.review-widget .body .comment-form .validation-error { color: ${errorForeground}; }`);
        }
        const fontFamilyVar = '--comment-thread-editor-font-family';
        const fontSizeVar = '--comment-thread-editor-font-size';
        const fontWeightVar = '--comment-thread-editor-font-weight';
        this.container?.style.setProperty(fontFamilyVar, fontInfo.fontFamily);
        this.container?.style.setProperty(fontSizeVar, `${fontInfo.fontSize}px`);
        this.container?.style.setProperty(fontWeightVar, fontInfo.fontWeight);
        content.push(`.review-widget .body code {
			font-family: var(${fontFamilyVar});
			font-weight: var(${fontWeightVar});
		}`);
        this._styleElement.textContent = content.join('\n');
        this._commentReply?.setCommentEditorDecorations();
    }
};
CommentThreadWidget = __decorate([
    __param(12, ICommentService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService)
], CommentThreadWidget);
export { CommentThreadWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEcsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUtwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLDhCQUE4QixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM1IsT0FB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