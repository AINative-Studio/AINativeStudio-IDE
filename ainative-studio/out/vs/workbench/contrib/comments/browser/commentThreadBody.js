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
import * as nls from '../../../../nls.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../../editor/common/languages.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICommentService } from './commentService.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { CommentNode } from './commentNode.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
let CommentThreadBody = class CommentThreadBody extends Disposable {
    get length() {
        return this._commentThread.comments ? this._commentThread.comments.length : 0;
    }
    get activeComment() {
        return this._commentElements.filter(node => node.isEditing)[0];
    }
    constructor(_parentEditor, owner, parentResourceUri, container, _options, _commentThread, _pendingEdits, _scopedInstatiationService, _parentCommentThreadWidget, commentService, openerService, languageService) {
        super();
        this._parentEditor = _parentEditor;
        this.owner = owner;
        this.parentResourceUri = parentResourceUri;
        this.container = container;
        this._options = _options;
        this._commentThread = _commentThread;
        this._pendingEdits = _pendingEdits;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._parentCommentThreadWidget = _parentCommentThreadWidget;
        this.commentService = commentService;
        this.openerService = openerService;
        this.languageService = languageService;
        this._commentElements = [];
        this._focusedComment = undefined;
        this._onDidResize = new Emitter();
        this.onDidResize = this._onDidResize.event;
        this._commentDisposable = new DisposableMap();
        this._register(dom.addDisposableListener(container, dom.EventType.FOCUS_IN, e => {
            // TODO @rebornix, limit T to IRange | ICellRange
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
        this._markdownRenderer = new MarkdownRenderer(this._options, this.languageService, this.openerService);
    }
    focus(commentUniqueId) {
        if (commentUniqueId !== undefined) {
            const comment = this._commentElements.find(commentNode => commentNode.comment.uniqueIdInThread === commentUniqueId);
            if (comment) {
                comment.focus();
                return;
            }
        }
        this._commentsElement.focus();
    }
    hasCommentsInEditMode() {
        return this._commentElements.some(commentNode => commentNode.isEditing);
    }
    ensureFocusIntoNewEditingComment() {
        if (this._commentElements.length === 1 && this._commentElements[0].isEditing) {
            this._commentElements[0].setFocus(true);
        }
    }
    async display() {
        this._commentsElement = dom.append(this.container, dom.$('div.comments-container'));
        this._commentsElement.setAttribute('role', 'presentation');
        this._commentsElement.tabIndex = 0;
        this._updateAriaLabel();
        this._register(dom.addDisposableListener(this._commentsElement, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if ((event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */)) && (!this._focusedComment || !this._commentElements[this._focusedComment].isEditing)) {
                const moveFocusWithinBounds = (change) => {
                    if (this._focusedComment === undefined && change >= 0) {
                        return 0;
                    }
                    if (this._focusedComment === undefined && change < 0) {
                        return this._commentElements.length - 1;
                    }
                    const newIndex = this._focusedComment + change;
                    return Math.min(Math.max(0, newIndex), this._commentElements.length - 1);
                };
                this._setFocusedComment(event.equals(16 /* KeyCode.UpArrow */) ? moveFocusWithinBounds(-1) : moveFocusWithinBounds(1));
            }
        }));
        this._commentDisposable.clearAndDisposeAll();
        this._commentElements = [];
        if (this._commentThread.comments) {
            for (const comment of this._commentThread.comments) {
                const newCommentNode = this.createNewCommentNode(comment);
                this._commentElements.push(newCommentNode);
                this._commentsElement.appendChild(newCommentNode.domNode);
                if (comment.mode === languages.CommentMode.Editing) {
                    await newCommentNode.switchToEditMode();
                }
            }
        }
        this._resizeObserver = new MutationObserver(this._refresh.bind(this));
        this._resizeObserver.observe(this.container, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
        });
    }
    _refresh() {
        const dimensions = dom.getClientArea(this.container);
        this._onDidResize.fire(dimensions);
    }
    getDimensions() {
        return dom.getClientArea(this.container);
    }
    layout(widthInPixel) {
        this._commentElements.forEach(element => {
            element.layout(widthInPixel);
        });
    }
    getPendingEdits() {
        const pendingEdits = {};
        this._commentElements.forEach(element => {
            if (element.isEditing) {
                const pendingEdit = element.getPendingEdit();
                if (pendingEdit) {
                    pendingEdits[element.comment.uniqueIdInThread] = pendingEdit;
                }
            }
        });
        return pendingEdits;
    }
    getCommentCoords(commentUniqueId) {
        const matchedNode = this._commentElements.filter(commentNode => commentNode.comment.uniqueIdInThread === commentUniqueId);
        if (matchedNode && matchedNode.length) {
            const commentThreadCoords = dom.getDomNodePagePosition(this._commentElements[0].domNode);
            const commentCoords = dom.getDomNodePagePosition(matchedNode[0].domNode);
            return {
                thread: commentThreadCoords,
                comment: commentCoords
            };
        }
        return;
    }
    async updateCommentThread(commentThread, preserveFocus) {
        const oldCommentsLen = this._commentElements.length;
        const newCommentsLen = commentThread.comments ? commentThread.comments.length : 0;
        const commentElementsToDel = [];
        const commentElementsToDelIndex = [];
        for (let i = 0; i < oldCommentsLen; i++) {
            const comment = this._commentElements[i].comment;
            const newComment = commentThread.comments ? commentThread.comments.filter(c => c.uniqueIdInThread === comment.uniqueIdInThread) : [];
            if (newComment.length) {
                this._commentElements[i].update(newComment[0]);
            }
            else {
                commentElementsToDelIndex.push(i);
                commentElementsToDel.push(this._commentElements[i]);
            }
        }
        // del removed elements
        for (let i = commentElementsToDel.length - 1; i >= 0; i--) {
            const commentToDelete = commentElementsToDel[i];
            this._commentDisposable.deleteAndDispose(commentToDelete);
            this._commentElements.splice(commentElementsToDelIndex[i], 1);
            commentToDelete.domNode.remove();
        }
        let lastCommentElement = null;
        const newCommentNodeList = [];
        const newCommentsInEditMode = [];
        const startEditing = [];
        for (let i = newCommentsLen - 1; i >= 0; i--) {
            const currentComment = commentThread.comments[i];
            const oldCommentNode = this._commentElements.filter(commentNode => commentNode.comment.uniqueIdInThread === currentComment.uniqueIdInThread);
            if (oldCommentNode.length) {
                lastCommentElement = oldCommentNode[0].domNode;
                newCommentNodeList.unshift(oldCommentNode[0]);
            }
            else {
                const newElement = this.createNewCommentNode(currentComment);
                newCommentNodeList.unshift(newElement);
                if (lastCommentElement) {
                    this._commentsElement.insertBefore(newElement.domNode, lastCommentElement);
                    lastCommentElement = newElement.domNode;
                }
                else {
                    this._commentsElement.appendChild(newElement.domNode);
                    lastCommentElement = newElement.domNode;
                }
                if (currentComment.mode === languages.CommentMode.Editing) {
                    startEditing.push(newElement.switchToEditMode());
                    newCommentsInEditMode.push(newElement);
                }
            }
        }
        this._commentThread = commentThread;
        this._commentElements = newCommentNodeList;
        // Start editing *after* updating the thread and elements to avoid a sequencing issue https://github.com/microsoft/vscode/issues/239191
        await Promise.all(startEditing);
        if (newCommentsInEditMode.length) {
            const lastIndex = this._commentElements.indexOf(newCommentsInEditMode[newCommentsInEditMode.length - 1]);
            this._focusedComment = lastIndex;
        }
        this._updateAriaLabel();
        if (!preserveFocus) {
            this._setFocusedComment(this._focusedComment);
        }
    }
    _updateAriaLabel() {
        if (this._commentThread.isDocumentCommentThread()) {
            if (this._commentThread.range) {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.withRange', "Comment thread with {0} comments on lines {1} through {2}. {3}.", this._commentThread.comments?.length, this._commentThread.range.startLineNumber, this._commentThread.range.endLineNumber, this._commentThread.label);
            }
            else {
                this._commentsElement.ariaLabel = nls.localize('commentThreadAria.document', "Comment thread with {0} comments on the entire document. {1}.", this._commentThread.comments?.length, this._commentThread.label);
            }
        }
        else {
            this._commentsElement.ariaLabel = nls.localize('commentThreadAria', "Comment thread with {0} comments. {1}.", this._commentThread.comments?.length, this._commentThread.label);
        }
    }
    _setFocusedComment(value) {
        if (this._focusedComment !== undefined) {
            this._commentElements[this._focusedComment]?.setFocus(false);
        }
        if (this._commentElements.length === 0 || value === undefined) {
            this._focusedComment = undefined;
        }
        else {
            this._focusedComment = Math.min(value, this._commentElements.length - 1);
            this._commentElements[this._focusedComment].setFocus(true);
        }
    }
    createNewCommentNode(comment) {
        const newCommentNode = this._scopedInstatiationService.createInstance(CommentNode, this._parentEditor, this._commentThread, comment, this._pendingEdits ? this._pendingEdits[comment.uniqueIdInThread] : undefined, this.owner, this.parentResourceUri, this._parentCommentThreadWidget, this._markdownRenderer);
        const disposables = new DisposableStore();
        disposables.add(newCommentNode.onDidClick(clickedNode => this._setFocusedComment(this._commentElements.findIndex(commentNode => commentNode.comment.uniqueIdInThread === clickedNode.comment.uniqueIdInThread))));
        disposables.add(newCommentNode);
        this._commentDisposable.set(newCommentNode, disposables);
        return newCommentNode;
    }
    dispose() {
        super.dispose();
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        this._commentDisposable.dispose();
    }
};
CommentThreadBody = __decorate([
    __param(9, ICommentService),
    __param(10, IOpenerService),
    __param(11, ILanguageService)
], CommentThreadBody);
export { CommentThreadBody };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZEJvZHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkQm9keS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUkvQyxPQUFPLEVBQTRCLGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDNUksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBSzVFLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQTBELFNBQVEsVUFBVTtJQVd4RixJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJ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