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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXRHLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUM7QUFLcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSw4QkFBOEIsRUFBRSwwQkFBMEIsRUFBRSw4QkFBOEIsRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNSLE9B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