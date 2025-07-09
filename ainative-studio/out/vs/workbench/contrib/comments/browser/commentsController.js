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
import { Action } from '../../../../base/common/actions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { createCancelablePromise, Delayer } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/review.css';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorType } from '../../../../editor/common/editorCommon.js';
import { ModelDecorationOptions, TextModel } from '../../../../editor/common/model/textModel.js';
import * as languages from '../../../../editor/common/languages.js';
import * as nls from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { CommentGlyphWidget } from './commentGlyphWidget.js';
import { ICommentService } from './commentService.js';
import { CommentWidgetFocus, isMouseUpEventDragFromMouseDown, parseMouseDownInfoFromEvent, ReviewZoneWidget } from './commentThreadZoneWidget.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { COMMENTEDITOR_DECORATION_KEY } from './commentReply.js';
import { Emitter } from '../../../../base/common/event.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { CommentThreadRangeDecorator } from './commentThreadRangeDecorator.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { URI } from '../../../../base/common/uri.js';
import { threadHasMeaningfulComments } from './commentsModel.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const ID = 'editor.contrib.review';
class CommentingRangeDecoration {
    get id() {
        return this._decorationId;
    }
    set id(id) {
        this._decorationId = id;
    }
    get range() {
        return {
            startLineNumber: this._startLineNumber, startColumn: 1,
            endLineNumber: this._endLineNumber, endColumn: 1
        };
    }
    constructor(_editor, _ownerId, _extensionId, _label, _range, options, commentingRangesInfo, isHover = false) {
        this._editor = _editor;
        this._ownerId = _ownerId;
        this._extensionId = _extensionId;
        this._label = _label;
        this._range = _range;
        this.options = options;
        this.commentingRangesInfo = commentingRangesInfo;
        this.isHover = isHover;
        this._startLineNumber = _range.startLineNumber;
        this._endLineNumber = _range.endLineNumber;
    }
    getCommentAction() {
        return {
            extensionId: this._extensionId,
            label: this._label,
            ownerId: this._ownerId,
            commentingRangesInfo: this.commentingRangesInfo
        };
    }
    getOriginalRange() {
        return this._range;
    }
    getActiveRange() {
        return this.id ? this._editor.getModel().getDecorationRange(this.id) : undefined;
    }
}
class CommentingRangeDecorator {
    static { this.description = 'commenting-range-decorator'; }
    constructor() {
        this.commentingRangeDecorations = [];
        this.decorationIds = [];
        this._lastHover = -1;
        this._onDidChangeDecorationsCount = new Emitter();
        this.onDidChangeDecorationsCount = this._onDidChangeDecorationsCount.event;
        const decorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: 'comment-range-glyph comment-diff-added'
        };
        this.decorationOptions = ModelDecorationOptions.createDynamic(decorationOptions);
        const hoverDecorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: `comment-range-glyph line-hover`
        };
        this.hoverDecorationOptions = ModelDecorationOptions.createDynamic(hoverDecorationOptions);
        const multilineDecorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: `comment-range-glyph multiline-add`
        };
        this.multilineDecorationOptions = ModelDecorationOptions.createDynamic(multilineDecorationOptions);
    }
    updateHover(hoverLine) {
        if (this._editor && this._infos && (hoverLine !== this._lastHover)) {
            this._doUpdate(this._editor, this._infos, hoverLine);
        }
        this._lastHover = hoverLine ?? -1;
    }
    updateSelection(cursorLine, range = new Range(0, 0, 0, 0)) {
        this._lastSelection = range.isEmpty() ? undefined : range;
        this._lastSelectionCursor = range.isEmpty() ? undefined : cursorLine;
        // Some scenarios:
        // Selection is made. Emphasis should show on the drag/selection end location.
        // Selection is made, then user clicks elsewhere. We should still show the decoration.
        if (this._editor && this._infos) {
            this._doUpdate(this._editor, this._infos, cursorLine, range);
        }
    }
    update(editor, commentInfos, cursorLine, range) {
        if (editor) {
            this._editor = editor;
            this._infos = commentInfos;
            this._doUpdate(editor, commentInfos, cursorLine, range);
        }
    }
    _lineHasThread(editor, lineRange) {
        return editor.getDecorationsInRange(lineRange)?.find(decoration => decoration.options.description === CommentGlyphWidget.description);
    }
    _doUpdate(editor, commentInfos, emphasisLine = -1, selectionRange = this._lastSelection) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        // If there's still a selection, use that.
        emphasisLine = this._lastSelectionCursor ?? emphasisLine;
        const commentingRangeDecorations = [];
        for (const info of commentInfos) {
            info.commentingRanges.ranges.forEach(range => {
                const rangeObject = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                let intersectingSelectionRange = selectionRange ? rangeObject.intersectRanges(selectionRange) : undefined;
                if ((selectionRange && (emphasisLine >= 0) && intersectingSelectionRange)
                    // If there's only one selection line, then just drop into the else if and show an emphasis line.
                    && !((intersectingSelectionRange.startLineNumber === intersectingSelectionRange.endLineNumber)
                        && (emphasisLine === intersectingSelectionRange.startLineNumber))) {
                    // The emphasisLine should be within the commenting range, even if the selection range stretches
                    // outside of the commenting range.
                    // Clip the emphasis and selection ranges to the commenting range
                    let intersectingEmphasisRange;
                    if (emphasisLine <= intersectingSelectionRange.startLineNumber) {
                        intersectingEmphasisRange = intersectingSelectionRange.collapseToStart();
                        intersectingSelectionRange = new Range(intersectingSelectionRange.startLineNumber + 1, 1, intersectingSelectionRange.endLineNumber, 1);
                    }
                    else {
                        intersectingEmphasisRange = new Range(intersectingSelectionRange.endLineNumber, 1, intersectingSelectionRange.endLineNumber, 1);
                        intersectingSelectionRange = new Range(intersectingSelectionRange.startLineNumber, 1, intersectingSelectionRange.endLineNumber - 1, 1);
                    }
                    commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, intersectingSelectionRange, this.multilineDecorationOptions, info.commentingRanges, true));
                    if (!this._lineHasThread(editor, intersectingEmphasisRange)) {
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, intersectingEmphasisRange, this.hoverDecorationOptions, info.commentingRanges, true));
                    }
                    const beforeRangeEndLine = Math.min(intersectingEmphasisRange.startLineNumber, intersectingSelectionRange.startLineNumber) - 1;
                    const hasBeforeRange = rangeObject.startLineNumber <= beforeRangeEndLine;
                    const afterRangeStartLine = Math.max(intersectingEmphasisRange.endLineNumber, intersectingSelectionRange.endLineNumber) + 1;
                    const hasAfterRange = rangeObject.endLineNumber >= afterRangeStartLine;
                    if (hasBeforeRange) {
                        const beforeRange = new Range(range.startLineNumber, 1, beforeRangeEndLine, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, beforeRange, this.decorationOptions, info.commentingRanges, true));
                    }
                    if (hasAfterRange) {
                        const afterRange = new Range(afterRangeStartLine, 1, range.endLineNumber, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, afterRange, this.decorationOptions, info.commentingRanges, true));
                    }
                }
                else if ((rangeObject.startLineNumber <= emphasisLine) && (emphasisLine <= rangeObject.endLineNumber)) {
                    if (rangeObject.startLineNumber < emphasisLine) {
                        const beforeRange = new Range(range.startLineNumber, 1, emphasisLine - 1, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, beforeRange, this.decorationOptions, info.commentingRanges, true));
                    }
                    const emphasisRange = new Range(emphasisLine, 1, emphasisLine, 1);
                    if (!this._lineHasThread(editor, emphasisRange)) {
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, emphasisRange, this.hoverDecorationOptions, info.commentingRanges, true));
                    }
                    if (emphasisLine < rangeObject.endLineNumber) {
                        const afterRange = new Range(emphasisLine + 1, 1, range.endLineNumber, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, afterRange, this.decorationOptions, info.commentingRanges, true));
                    }
                }
                else {
                    commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, range, this.decorationOptions, info.commentingRanges));
                }
            });
        }
        editor.changeDecorations((accessor) => {
            this.decorationIds = accessor.deltaDecorations(this.decorationIds, commentingRangeDecorations);
            commentingRangeDecorations.forEach((decoration, index) => decoration.id = this.decorationIds[index]);
        });
        const rangesDifference = this.commentingRangeDecorations.length - commentingRangeDecorations.length;
        this.commentingRangeDecorations = commentingRangeDecorations;
        if (rangesDifference) {
            this._onDidChangeDecorationsCount.fire(this.commentingRangeDecorations.length);
        }
    }
    areRangesIntersectingOrTouchingByLine(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < (b.startLineNumber - 1)) {
            return false;
        }
        // Check if `b` is before `a`
        if ((b.endLineNumber + 1) < a.startLineNumber) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    getMatchedCommentAction(commentRange) {
        if (commentRange === undefined) {
            const foundInfos = this._infos?.filter(info => info.commentingRanges.fileComments);
            if (foundInfos) {
                return foundInfos.map(foundInfo => {
                    return {
                        action: {
                            ownerId: foundInfo.uniqueOwner,
                            extensionId: foundInfo.extensionId,
                            label: foundInfo.label,
                            commentingRangesInfo: foundInfo.commentingRanges
                        }
                    };
                });
            }
            return [];
        }
        // keys is ownerId
        const foundHoverActions = new Map();
        for (const decoration of this.commentingRangeDecorations) {
            const range = decoration.getActiveRange();
            if (range && this.areRangesIntersectingOrTouchingByLine(range, commentRange)) {
                // We can have several commenting ranges that match from the same uniqueOwner because of how
                // the line hover and selection decoration is done.
                // The ranges must be merged so that we can see if the new commentRange fits within them.
                const action = decoration.getCommentAction();
                const alreadyFoundInfo = foundHoverActions.get(action.ownerId);
                if (alreadyFoundInfo?.action.commentingRangesInfo === action.commentingRangesInfo) {
                    // Merge ranges.
                    const newRange = new Range(range.startLineNumber < alreadyFoundInfo.range.startLineNumber ? range.startLineNumber : alreadyFoundInfo.range.startLineNumber, range.startColumn < alreadyFoundInfo.range.startColumn ? range.startColumn : alreadyFoundInfo.range.startColumn, range.endLineNumber > alreadyFoundInfo.range.endLineNumber ? range.endLineNumber : alreadyFoundInfo.range.endLineNumber, range.endColumn > alreadyFoundInfo.range.endColumn ? range.endColumn : alreadyFoundInfo.range.endColumn);
                    foundHoverActions.set(action.ownerId, { range: newRange, action });
                }
                else {
                    foundHoverActions.set(action.ownerId, { range, action });
                }
            }
        }
        const seenOwners = new Set();
        return Array.from(foundHoverActions.values()).filter(action => {
            if (seenOwners.has(action.action.ownerId)) {
                return false;
            }
            else {
                seenOwners.add(action.action.ownerId);
                return true;
            }
        });
    }
    getNearestCommentingRange(findPosition, reverse) {
        let findPositionContainedWithin;
        let decorations;
        if (reverse) {
            decorations = [];
            for (let i = this.commentingRangeDecorations.length - 1; i >= 0; i--) {
                decorations.push(this.commentingRangeDecorations[i]);
            }
        }
        else {
            decorations = this.commentingRangeDecorations;
        }
        for (const decoration of decorations) {
            const range = decoration.getActiveRange();
            if (!range) {
                continue;
            }
            if (findPositionContainedWithin && this.areRangesIntersectingOrTouchingByLine(range, findPositionContainedWithin)) {
                findPositionContainedWithin = Range.plusRange(findPositionContainedWithin, range);
                continue;
            }
            if (range.startLineNumber <= findPosition.lineNumber && findPosition.lineNumber <= range.endLineNumber) {
                findPositionContainedWithin = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                continue;
            }
            if (!reverse && range.endLineNumber < findPosition.lineNumber) {
                continue;
            }
            if (reverse && range.startLineNumber > findPosition.lineNumber) {
                continue;
            }
            return range;
        }
        return (decorations.length > 0 ? (decorations[0].getActiveRange() ?? undefined) : undefined);
    }
    dispose() {
        this.commentingRangeDecorations = [];
    }
}
/**
* Navigate to the next or previous comment in the current thread.
* @param type
*/
export function moveToNextCommentInThread(commentInfo, type) {
    if (!commentInfo?.comment || !commentInfo?.thread?.comments) {
        return;
    }
    const currentIndex = commentInfo.thread.comments?.indexOf(commentInfo.comment);
    if (currentIndex === undefined || currentIndex < 0) {
        return;
    }
    if (type === 'previous' && currentIndex === 0) {
        return;
    }
    if (type === 'next' && currentIndex === commentInfo.thread.comments.length - 1) {
        return;
    }
    const comment = commentInfo.thread.comments?.[type === 'previous' ? currentIndex - 1 : currentIndex + 1];
    if (!comment) {
        return;
    }
    return {
        ...commentInfo,
        comment,
    };
}
export function revealCommentThread(commentService, editorService, uriIdentityService, commentThread, comment, focusReply, pinned, preserveFocus, sideBySide) {
    if (!commentThread.resource) {
        return;
    }
    if (!commentService.isCommentingEnabled) {
        commentService.enableCommenting(true);
    }
    const range = commentThread.range;
    const focus = focusReply ? CommentWidgetFocus.Editor : (preserveFocus ? CommentWidgetFocus.None : CommentWidgetFocus.Widget);
    const activeEditor = editorService.activeTextEditorControl;
    // If the active editor is a diff editor where one of the sides has the comment,
    // then we try to reveal the comment in the diff editor.
    const currentActiveResources = isDiffEditor(activeEditor) ? [activeEditor.getOriginalEditor(), activeEditor.getModifiedEditor()]
        : (activeEditor ? [activeEditor] : []);
    const threadToReveal = commentThread.threadId;
    const commentToReveal = comment?.uniqueIdInThread;
    const resource = URI.parse(commentThread.resource);
    for (const editor of currentActiveResources) {
        const model = editor.getModel();
        if ((model instanceof TextModel) && uriIdentityService.extUri.isEqual(resource, model.uri)) {
            if (threadToReveal && isCodeEditor(editor)) {
                const controller = CommentController.get(editor);
                controller?.revealCommentThread(threadToReveal, commentToReveal, true, focus);
            }
            return;
        }
    }
    editorService.openEditor({
        resource,
        options: {
            pinned: pinned,
            preserveFocus: preserveFocus,
            selection: range ?? new Range(1, 1, 1, 1)
        }
    }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
        if (editor) {
            const control = editor.getControl();
            if (threadToReveal && isCodeEditor(control)) {
                const controller = CommentController.get(control);
                controller?.revealCommentThread(threadToReveal, commentToReveal, true, focus);
            }
        }
    });
}
let CommentController = class CommentController {
    constructor(editor, commentService, instantiationService, codeEditorService, contextMenuService, quickInputService, viewsService, configurationService, contextKeyService, editorService, keybindingService, accessibilityService, notificationService) {
        this.commentService = commentService;
        this.instantiationService = instantiationService;
        this.codeEditorService = codeEditorService;
        this.contextMenuService = contextMenuService;
        this.quickInputService = quickInputService;
        this.viewsService = viewsService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.notificationService = notificationService;
        this.globalToDispose = new DisposableStore();
        this.localToDispose = new DisposableStore();
        this.mouseDownInfo = null;
        this._commentingRangeSpaceReserved = false;
        this._commentingRangeAmountReserved = 0;
        this._emptyThreadsToAddQueue = [];
        this._inProcessContinueOnComments = new Map();
        this._editorDisposables = [];
        this._hasRespondedToEditorChange = false;
        this._commentInfos = [];
        this._commentWidgets = [];
        this._pendingNewCommentCache = {};
        this._pendingEditsCache = {};
        this._computePromise = null;
        this._activeCursorHasCommentingRange = CommentContextKeys.activeCursorHasCommentingRange.bindTo(contextKeyService);
        this._activeCursorHasComment = CommentContextKeys.activeCursorHasComment.bindTo(contextKeyService);
        this._activeEditorHasCommentingRange = CommentContextKeys.activeEditorHasCommentingRange.bindTo(contextKeyService);
        if (editor instanceof EmbeddedCodeEditorWidget) {
            return;
        }
        this.editor = editor;
        this._commentingRangeDecorator = new CommentingRangeDecorator();
        this.globalToDispose.add(this._commentingRangeDecorator.onDidChangeDecorationsCount(count => {
            if (count === 0) {
                this.clearEditorListeners();
            }
            else if (this._editorDisposables.length === 0) {
                this.registerEditorListeners();
            }
        }));
        this.globalToDispose.add(this._commentThreadRangeDecorator = new CommentThreadRangeDecorator(this.commentService));
        this.globalToDispose.add(this.commentService.onDidDeleteDataProvider(ownerId => {
            if (ownerId) {
                delete this._pendingNewCommentCache[ownerId];
                delete this._pendingEditsCache[ownerId];
            }
            else {
                this._pendingNewCommentCache = {};
                this._pendingEditsCache = {};
            }
            this.beginCompute();
        }));
        this.globalToDispose.add(this.commentService.onDidSetDataProvider(_ => this.beginComputeAndHandleEditorChange()));
        this.globalToDispose.add(this.commentService.onDidUpdateCommentingRanges(_ => this.beginComputeAndHandleEditorChange()));
        this.globalToDispose.add(this.commentService.onDidSetResourceCommentInfos(async (e) => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (editorURI && editorURI.toString() === e.resource.toString()) {
                await this.setComments(e.commentInfos.filter(commentInfo => commentInfo !== null));
            }
        }));
        this.globalToDispose.add(this.commentService.onDidChangeCommentingEnabled(e => {
            if (e) {
                this.registerEditorListeners();
                this.beginCompute();
            }
            else {
                this.tryUpdateReservedSpace();
                this.clearEditorListeners();
                this._commentingRangeDecorator.update(this.editor, []);
                this._commentThreadRangeDecorator.update(this.editor, []);
                dispose(this._commentWidgets);
                this._commentWidgets = [];
            }
        }));
        this.globalToDispose.add(this.editor.onWillChangeModel(e => this.onWillChangeModel(e)));
        this.globalToDispose.add(this.editor.onDidChangeModel(_ => this.onModelChanged()));
        this.globalToDispose.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('diffEditor.renderSideBySide')) {
                this.beginCompute();
            }
        }));
        this.onModelChanged();
        this.codeEditorService.registerDecorationType('comment-controller', COMMENTEDITOR_DECORATION_KEY, {});
        this.globalToDispose.add(this.commentService.registerContinueOnCommentProvider({
            provideContinueOnComments: () => {
                const pendingComments = [];
                if (this._commentWidgets) {
                    for (const zone of this._commentWidgets) {
                        const zonePendingComments = zone.getPendingComments();
                        const pendingNewComment = zonePendingComments.newComment;
                        if (!pendingNewComment) {
                            continue;
                        }
                        let lastCommentBody;
                        if (zone.commentThread.comments && zone.commentThread.comments.length) {
                            const lastComment = zone.commentThread.comments[zone.commentThread.comments.length - 1];
                            if (typeof lastComment.body === 'string') {
                                lastCommentBody = lastComment.body;
                            }
                            else {
                                lastCommentBody = lastComment.body.value;
                            }
                        }
                        if (pendingNewComment.body !== lastCommentBody) {
                            pendingComments.push({
                                uniqueOwner: zone.uniqueOwner,
                                uri: zone.editor.getModel().uri,
                                range: zone.commentThread.range,
                                comment: pendingNewComment,
                                isReply: (zone.commentThread.comments !== undefined) && (zone.commentThread.comments.length > 0)
                            });
                        }
                    }
                }
                return pendingComments;
            }
        }));
    }
    registerEditorListeners() {
        this._editorDisposables = [];
        if (!this.editor) {
            return;
        }
        this._editorDisposables.push(this.editor.onMouseMove(e => this.onEditorMouseMove(e)));
        this._editorDisposables.push(this.editor.onMouseLeave(() => this.onEditorMouseLeave()));
        this._editorDisposables.push(this.editor.onDidChangeCursorPosition(e => this.onEditorChangeCursorPosition(e.position)));
        this._editorDisposables.push(this.editor.onDidFocusEditorWidget(() => this.onEditorChangeCursorPosition(this.editor?.getPosition() ?? null)));
        this._editorDisposables.push(this.editor.onDidChangeCursorSelection(e => this.onEditorChangeCursorSelection(e)));
        this._editorDisposables.push(this.editor.onDidBlurEditorWidget(() => this.onEditorChangeCursorSelection()));
    }
    clearEditorListeners() {
        dispose(this._editorDisposables);
        this._editorDisposables = [];
    }
    onEditorMouseLeave() {
        this._commentingRangeDecorator.updateHover();
    }
    onEditorMouseMove(e) {
        const position = e.target.position?.lineNumber;
        if (e.event.leftButton.valueOf() && position && this.mouseDownInfo) {
            this._commentingRangeDecorator.updateSelection(position, new Range(this.mouseDownInfo.lineNumber, 1, position, 1));
        }
        else {
            this._commentingRangeDecorator.updateHover(position);
        }
    }
    onEditorChangeCursorSelection(e) {
        const position = this.editor?.getPosition()?.lineNumber;
        if (position) {
            this._commentingRangeDecorator.updateSelection(position, e?.selection);
        }
    }
    onEditorChangeCursorPosition(e) {
        if (!e) {
            return;
        }
        const range = Range.fromPositions(e, { column: -1, lineNumber: e.lineNumber });
        const decorations = this.editor?.getDecorationsInRange(range);
        let hasCommentingRange = false;
        if (decorations) {
            for (const decoration of decorations) {
                if (decoration.options.description === CommentGlyphWidget.description) {
                    // We don't allow multiple comments on the same line.
                    hasCommentingRange = false;
                    break;
                }
                else if (decoration.options.description === CommentingRangeDecorator.description) {
                    hasCommentingRange = true;
                }
            }
        }
        this._activeCursorHasCommentingRange.set(hasCommentingRange);
        this._activeCursorHasComment.set(this.getCommentsAtLine(range).length > 0);
    }
    isEditorInlineOriginal(testEditor) {
        if (this.configurationService.getValue('diffEditor.renderSideBySide')) {
            return false;
        }
        const foundEditor = this.editorService.visibleTextEditorControls.find(editor => {
            if (editor.getEditorType() === EditorType.IDiffEditor) {
                const diffEditor = editor;
                return diffEditor.getOriginalEditor() === testEditor;
            }
            return false;
        });
        return !!foundEditor;
    }
    beginCompute() {
        this._computePromise = createCancelablePromise(token => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (editorURI) {
                return this.commentService.getDocumentComments(editorURI);
            }
            return Promise.resolve([]);
        });
        this._computeAndSetPromise = this._computePromise.then(async (commentInfos) => {
            await this.setComments(coalesce(commentInfos));
            this._computePromise = null;
        }, error => console.log(error));
        this._computePromise.then(() => this._computeAndSetPromise = undefined);
        return this._computeAndSetPromise;
    }
    beginComputeCommentingRanges() {
        if (this._computeCommentingRangeScheduler) {
            if (this._computeCommentingRangePromise) {
                this._computeCommentingRangePromise.cancel();
                this._computeCommentingRangePromise = null;
            }
            this._computeCommentingRangeScheduler.trigger(() => {
                const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
                if (editorURI) {
                    return this.commentService.getDocumentComments(editorURI);
                }
                return Promise.resolve([]);
            }).then(commentInfos => {
                if (this.commentService.isCommentingEnabled) {
                    const meaningfulCommentInfos = coalesce(commentInfos);
                    this._commentingRangeDecorator.update(this.editor, meaningfulCommentInfos, this.editor?.getPosition()?.lineNumber, this.editor?.getSelection() ?? undefined);
                }
            }, (err) => {
                onUnexpectedError(err);
                return null;
            });
        }
    }
    static get(editor) {
        return editor.getContribution(ID);
    }
    revealCommentThread(threadId, commentUniqueId, fetchOnceIfNotExist, focus) {
        const commentThreadWidget = this._commentWidgets.filter(widget => widget.commentThread.threadId === threadId);
        if (commentThreadWidget.length === 1) {
            commentThreadWidget[0].reveal(commentUniqueId, focus);
        }
        else if (fetchOnceIfNotExist) {
            if (this._computeAndSetPromise) {
                this._computeAndSetPromise.then(_ => {
                    this.revealCommentThread(threadId, commentUniqueId, false, focus);
                });
            }
            else {
                this.beginCompute().then(_ => {
                    this.revealCommentThread(threadId, commentUniqueId, false, focus);
                });
            }
        }
    }
    collapseAll() {
        for (const widget of this._commentWidgets) {
            widget.collapse(true);
        }
    }
    expandAll() {
        for (const widget of this._commentWidgets) {
            widget.expand();
        }
    }
    expandUnresolved() {
        for (const widget of this._commentWidgets) {
            if (widget.commentThread.state === languages.CommentThreadState.Unresolved) {
                widget.expand();
            }
        }
    }
    nextCommentThread(focusThread) {
        this._findNearestCommentThread(focusThread);
    }
    _findNearestCommentThread(focusThread, reverse) {
        if (!this._commentWidgets.length || !this.editor?.hasModel()) {
            return;
        }
        const after = reverse ? this.editor.getSelection().getStartPosition() : this.editor.getSelection().getEndPosition();
        const sortedWidgets = this._commentWidgets.sort((a, b) => {
            if (reverse) {
                const temp = a;
                a = b;
                b = temp;
            }
            if (a.commentThread.range === undefined) {
                return -1;
            }
            if (b.commentThread.range === undefined) {
                return 1;
            }
            if (a.commentThread.range.startLineNumber < b.commentThread.range.startLineNumber) {
                return -1;
            }
            if (a.commentThread.range.startLineNumber > b.commentThread.range.startLineNumber) {
                return 1;
            }
            if (a.commentThread.range.startColumn < b.commentThread.range.startColumn) {
                return -1;
            }
            if (a.commentThread.range.startColumn > b.commentThread.range.startColumn) {
                return 1;
            }
            return 0;
        });
        const idx = findFirstIdxMonotonousOrArrLen(sortedWidgets, widget => {
            const lineValueOne = reverse ? after.lineNumber : (widget.commentThread.range?.startLineNumber ?? 0);
            const lineValueTwo = reverse ? (widget.commentThread.range?.startLineNumber ?? 0) : after.lineNumber;
            const columnValueOne = reverse ? after.column : (widget.commentThread.range?.startColumn ?? 0);
            const columnValueTwo = reverse ? (widget.commentThread.range?.startColumn ?? 0) : after.column;
            if (lineValueOne > lineValueTwo) {
                return true;
            }
            if (lineValueOne < lineValueTwo) {
                return false;
            }
            if (columnValueOne > columnValueTwo) {
                return true;
            }
            return false;
        });
        const nextWidget = sortedWidgets[idx];
        if (nextWidget !== undefined) {
            this.editor.setSelection(nextWidget.commentThread.range ?? new Range(1, 1, 1, 1));
            nextWidget.reveal(undefined, focusThread ? CommentWidgetFocus.Widget : CommentWidgetFocus.None);
        }
    }
    previousCommentThread(focusThread) {
        this._findNearestCommentThread(focusThread, true);
    }
    _findNearestCommentingRange(reverse) {
        if (!this.editor?.hasModel()) {
            return;
        }
        const after = this.editor.getSelection().getEndPosition();
        const range = this._commentingRangeDecorator.getNearestCommentingRange(after, reverse);
        if (range) {
            const position = reverse ? range.getEndPosition() : range.getStartPosition();
            this.editor.setPosition(position);
            this.editor.revealLineInCenterIfOutsideViewport(position.lineNumber);
        }
        if (this.accessibilityService.isScreenReaderOptimized()) {
            const commentRangeStart = range?.getStartPosition().lineNumber;
            const commentRangeEnd = range?.getEndPosition().lineNumber;
            if (commentRangeStart && commentRangeEnd) {
                const oneLine = commentRangeStart === commentRangeEnd;
                oneLine ? status(nls.localize('commentRange', "Line {0}", commentRangeStart)) : status(nls.localize('commentRangeStart', "Lines {0} to {1}", commentRangeStart, commentRangeEnd));
            }
        }
    }
    nextCommentingRange() {
        this._findNearestCommentingRange();
    }
    previousCommentingRange() {
        this._findNearestCommentingRange(true);
    }
    dispose() {
        this.globalToDispose.dispose();
        this.localToDispose.dispose();
        dispose(this._editorDisposables);
        dispose(this._commentWidgets);
        this.editor = null; // Strict null override - nulling out in dispose
    }
    onWillChangeModel(e) {
        if (e.newModelUrl) {
            this.tryUpdateReservedSpace(e.newModelUrl);
        }
    }
    async handleCommentAdded(editorId, uniqueOwner, thread) {
        const matchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.uniqueOwner === uniqueOwner && zoneWidget.commentThread.threadId === thread.threadId);
        if (matchedZones.length) {
            return;
        }
        const matchedNewCommentThreadZones = this._commentWidgets.filter(zoneWidget => zoneWidget.uniqueOwner === uniqueOwner && zoneWidget.commentThread.commentThreadHandle === -1 && Range.equalsRange(zoneWidget.commentThread.range, thread.range));
        if (matchedNewCommentThreadZones.length) {
            matchedNewCommentThreadZones[0].update(thread);
            return;
        }
        const continueOnCommentIndex = this._inProcessContinueOnComments.get(uniqueOwner)?.findIndex(pending => {
            if (pending.range === undefined) {
                return thread.range === undefined;
            }
            else {
                return Range.lift(pending.range).equalsRange(thread.range);
            }
        });
        let continueOnCommentText;
        if ((continueOnCommentIndex !== undefined) && continueOnCommentIndex >= 0) {
            continueOnCommentText = this._inProcessContinueOnComments.get(uniqueOwner)?.splice(continueOnCommentIndex, 1)[0].comment.body;
        }
        const pendingCommentText = (this._pendingNewCommentCache[uniqueOwner] && this._pendingNewCommentCache[uniqueOwner][thread.threadId])
            ?? continueOnCommentText;
        const pendingEdits = this._pendingEditsCache[uniqueOwner] && this._pendingEditsCache[uniqueOwner][thread.threadId];
        const shouldReveal = thread.canReply && thread.isTemplate && (!thread.comments || (thread.comments.length === 0)) && (!thread.editorId || (thread.editorId === editorId));
        await this.displayCommentThread(uniqueOwner, thread, shouldReveal, pendingCommentText, pendingEdits);
        this._commentInfos.filter(info => info.uniqueOwner === uniqueOwner)[0].threads.push(thread);
        this.tryUpdateReservedSpace();
    }
    onModelChanged() {
        this.localToDispose.clear();
        this.tryUpdateReservedSpace();
        this.removeCommentWidgetsAndStoreCache();
        if (!this.editor) {
            return;
        }
        this._hasRespondedToEditorChange = false;
        this.localToDispose.add(this.editor.onMouseDown(e => this.onEditorMouseDown(e)));
        this.localToDispose.add(this.editor.onMouseUp(e => this.onEditorMouseUp(e)));
        if (this._editorDisposables.length) {
            this.clearEditorListeners();
            this.registerEditorListeners();
        }
        this._computeCommentingRangeScheduler = new Delayer(200);
        this.localToDispose.add({
            dispose: () => {
                this._computeCommentingRangeScheduler?.cancel();
                this._computeCommentingRangeScheduler = null;
            }
        });
        this.localToDispose.add(this.editor.onDidChangeModelContent(async () => {
            this.beginComputeCommentingRanges();
        }));
        this.localToDispose.add(this.commentService.onDidUpdateCommentThreads(async (e) => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (!editorURI || !this.commentService.isCommentingEnabled) {
                return;
            }
            if (this._computePromise) {
                await this._computePromise;
            }
            const commentInfo = this._commentInfos.filter(info => info.uniqueOwner === e.uniqueOwner);
            if (!commentInfo || !commentInfo.length) {
                return;
            }
            const added = e.added.filter(thread => thread.resource && thread.resource === editorURI.toString());
            const removed = e.removed.filter(thread => thread.resource && thread.resource === editorURI.toString());
            const changed = e.changed.filter(thread => thread.resource && thread.resource === editorURI.toString());
            const pending = e.pending.filter(pending => pending.uri.toString() === editorURI.toString());
            removed.forEach(thread => {
                const matchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.uniqueOwner === e.uniqueOwner && zoneWidget.commentThread.threadId === thread.threadId && zoneWidget.commentThread.threadId !== '');
                if (matchedZones.length) {
                    const matchedZone = matchedZones[0];
                    const index = this._commentWidgets.indexOf(matchedZone);
                    this._commentWidgets.splice(index, 1);
                    matchedZone.dispose();
                }
                const infosThreads = this._commentInfos.filter(info => info.uniqueOwner === e.uniqueOwner)[0].threads;
                for (let i = 0; i < infosThreads.length; i++) {
                    if (infosThreads[i] === thread) {
                        infosThreads.splice(i, 1);
                        i--;
                    }
                }
            });
            for (const thread of changed) {
                const matchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.uniqueOwner === e.uniqueOwner && zoneWidget.commentThread.threadId === thread.threadId);
                if (matchedZones.length) {
                    const matchedZone = matchedZones[0];
                    matchedZone.update(thread);
                    this.openCommentsView(thread);
                }
            }
            const editorId = this.editor?.getId();
            for (const thread of added) {
                await this.handleCommentAdded(editorId, e.uniqueOwner, thread);
            }
            for (const thread of pending) {
                await this.resumePendingComment(editorURI, thread);
            }
            this._commentThreadRangeDecorator.update(this.editor, commentInfo);
        }));
        this.beginComputeAndHandleEditorChange();
    }
    async resumePendingComment(editorURI, thread) {
        const matchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.uniqueOwner === thread.uniqueOwner && Range.lift(zoneWidget.commentThread.range)?.equalsRange(thread.range));
        if (thread.isReply && matchedZones.length) {
            this.commentService.removeContinueOnComment({ uniqueOwner: thread.uniqueOwner, uri: editorURI, range: thread.range, isReply: true });
            matchedZones[0].setPendingComment(thread.comment);
        }
        else if (matchedZones.length) {
            this.commentService.removeContinueOnComment({ uniqueOwner: thread.uniqueOwner, uri: editorURI, range: thread.range, isReply: false });
            const existingPendingComment = matchedZones[0].getPendingComments().newComment;
            // We need to try to reconcile the existing pending comment with the incoming pending comment
            let pendingComment;
            if (!existingPendingComment || thread.comment.body.includes(existingPendingComment.body)) {
                pendingComment = thread.comment;
            }
            else if (existingPendingComment.body.includes(thread.comment.body)) {
                pendingComment = existingPendingComment;
            }
            else {
                pendingComment = { body: `${existingPendingComment}\n${thread.comment.body}`, cursor: thread.comment.cursor };
            }
            matchedZones[0].setPendingComment(pendingComment);
        }
        else if (!thread.isReply) {
            const threadStillAvailable = this.commentService.removeContinueOnComment({ uniqueOwner: thread.uniqueOwner, uri: editorURI, range: thread.range, isReply: false });
            if (!threadStillAvailable) {
                return;
            }
            if (!this._inProcessContinueOnComments.has(thread.uniqueOwner)) {
                this._inProcessContinueOnComments.set(thread.uniqueOwner, []);
            }
            this._inProcessContinueOnComments.get(thread.uniqueOwner)?.push(thread);
            await this.commentService.createCommentThreadTemplate(thread.uniqueOwner, thread.uri, thread.range ? Range.lift(thread.range) : undefined);
        }
    }
    beginComputeAndHandleEditorChange() {
        this.beginCompute().then(() => {
            if (!this._hasRespondedToEditorChange) {
                if (this._commentInfos.some(commentInfo => commentInfo.commentingRanges.ranges.length > 0 || commentInfo.commentingRanges.fileComments)) {
                    this._hasRespondedToEditorChange = true;
                    const verbose = this.configurationService.getValue("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */);
                    if (verbose) {
                        const keybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getAriaLabel();
                        if (keybinding) {
                            status(nls.localize('hasCommentRangesKb', "Editor has commenting ranges, run the command Open Accessibility Help ({0}), for more information.", keybinding));
                        }
                        else {
                            status(nls.localize('hasCommentRangesNoKb', "Editor has commenting ranges, run the command Open Accessibility Help, which is currently not triggerable via keybinding, for more information."));
                        }
                    }
                    else {
                        status(nls.localize('hasCommentRanges', "Editor has commenting ranges."));
                    }
                }
            }
        });
    }
    async openCommentsView(thread) {
        if (thread.comments && (thread.comments.length > 0) && threadHasMeaningfulComments(thread)) {
            const openViewState = this.configurationService.getValue(COMMENTS_SECTION).openView;
            if (openViewState === 'file') {
                return this.viewsService.openView(COMMENTS_VIEW_ID);
            }
            else if (openViewState === 'firstFile' || (openViewState === 'firstFileUnresolved' && thread.state === languages.CommentThreadState.Unresolved)) {
                const hasShownView = this.viewsService.getViewWithId(COMMENTS_VIEW_ID)?.hasRendered;
                if (!hasShownView) {
                    return this.viewsService.openView(COMMENTS_VIEW_ID);
                }
            }
        }
        return undefined;
    }
    async displayCommentThread(uniqueOwner, thread, shouldReveal, pendingComment, pendingEdits) {
        const editor = this.editor?.getModel();
        if (!editor) {
            return;
        }
        if (!this.editor || this.isEditorInlineOriginal(this.editor)) {
            return;
        }
        let continueOnCommentReply;
        if (thread.range && !pendingComment) {
            continueOnCommentReply = this.commentService.removeContinueOnComment({ uniqueOwner, uri: editor.uri, range: thread.range, isReply: true });
        }
        const zoneWidget = this.instantiationService.createInstance(ReviewZoneWidget, this.editor, uniqueOwner, thread, pendingComment ?? continueOnCommentReply?.comment, pendingEdits);
        await zoneWidget.display(thread.range, shouldReveal);
        this._commentWidgets.push(zoneWidget);
        this.openCommentsView(thread);
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = this._activeEditorHasCommentingRange.get() ? parseMouseDownInfoFromEvent(e) : null;
    }
    onEditorMouseUp(e) {
        const matchedLineNumber = isMouseUpEventDragFromMouseDown(this.mouseDownInfo, e);
        this.mouseDownInfo = null;
        if (!this.editor || matchedLineNumber === null || !e.target.element) {
            return;
        }
        const mouseUpIsOnDecorator = (e.target.element.className.indexOf('comment-range-glyph') >= 0);
        const lineNumber = e.target.position.lineNumber;
        let range;
        let selection;
        // Check for drag along gutter decoration
        if ((matchedLineNumber !== lineNumber)) {
            if (matchedLineNumber > lineNumber) {
                selection = new Range(matchedLineNumber, this.editor.getModel().getLineLength(matchedLineNumber) + 1, lineNumber, 1);
            }
            else {
                selection = new Range(matchedLineNumber, 1, lineNumber, this.editor.getModel().getLineLength(lineNumber) + 1);
            }
        }
        else if (mouseUpIsOnDecorator) {
            selection = this.editor.getSelection();
        }
        // Check for selection at line number.
        if (selection && (selection.startLineNumber <= lineNumber) && (lineNumber <= selection.endLineNumber)) {
            range = selection;
            this.editor.setSelection(new Range(selection.endLineNumber, 1, selection.endLineNumber, 1));
        }
        else if (mouseUpIsOnDecorator) {
            range = new Range(lineNumber, 1, lineNumber, 1);
        }
        if (range) {
            this.addOrToggleCommentAtLine(range, e);
        }
    }
    getCommentsAtLine(commentRange) {
        return this._commentWidgets.filter(widget => widget.getGlyphPosition() === (commentRange ? commentRange.endLineNumber : 0));
    }
    async addOrToggleCommentAtLine(commentRange, e) {
        // If an add is already in progress, queue the next add and process it after the current one finishes to
        // prevent empty comment threads from being added to the same line.
        if (!this._addInProgress) {
            this._addInProgress = true;
            // The widget's position is undefined until the widget has been displayed, so rely on the glyph position instead
            const existingCommentsAtLine = this.getCommentsAtLine(commentRange);
            if (existingCommentsAtLine.length) {
                const allExpanded = existingCommentsAtLine.every(widget => widget.expanded);
                existingCommentsAtLine.forEach(allExpanded ? widget => widget.collapse(true) : widget => widget.expand(true));
                this.processNextThreadToAdd();
                return;
            }
            else {
                this.addCommentAtLine(commentRange, e);
            }
        }
        else {
            this._emptyThreadsToAddQueue.push([commentRange, e]);
        }
    }
    processNextThreadToAdd() {
        this._addInProgress = false;
        const info = this._emptyThreadsToAddQueue.shift();
        if (info) {
            this.addOrToggleCommentAtLine(info[0], info[1]);
        }
    }
    clipUserRangeToCommentRange(userRange, commentRange) {
        if (userRange.startLineNumber < commentRange.startLineNumber) {
            userRange = new Range(commentRange.startLineNumber, commentRange.startColumn, userRange.endLineNumber, userRange.endColumn);
        }
        if (userRange.endLineNumber > commentRange.endLineNumber) {
            userRange = new Range(userRange.startLineNumber, userRange.startColumn, commentRange.endLineNumber, commentRange.endColumn);
        }
        return userRange;
    }
    addCommentAtLine(range, e) {
        const newCommentInfos = this._commentingRangeDecorator.getMatchedCommentAction(range);
        if (!newCommentInfos.length || !this.editor?.hasModel()) {
            this._addInProgress = false;
            if (!newCommentInfos.length) {
                if (range) {
                    this.notificationService.error(nls.localize('comments.addCommand.error', "The cursor must be within a commenting range to add a comment."));
                }
                else {
                    this.notificationService.error(nls.localize('comments.addFileCommentCommand.error', "File comments are not allowed on this file."));
                }
            }
            return Promise.resolve();
        }
        if (newCommentInfos.length > 1) {
            if (e && range) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => e.event,
                    getActions: () => this.getContextMenuActions(newCommentInfos, range),
                    getActionsContext: () => newCommentInfos.length ? newCommentInfos[0] : undefined,
                    onHide: () => { this._addInProgress = false; }
                });
                return Promise.resolve();
            }
            else {
                const picks = this.getCommentProvidersQuickPicks(newCommentInfos);
                return this.quickInputService.pick(picks, { placeHolder: nls.localize('pickCommentService', "Select Comment Provider"), matchOnDescription: true }).then(pick => {
                    if (!pick) {
                        return;
                    }
                    const commentInfos = newCommentInfos.filter(info => info.action.ownerId === pick.id);
                    if (commentInfos.length) {
                        const { ownerId } = commentInfos[0].action;
                        const clippedRange = range && commentInfos[0].range ? this.clipUserRangeToCommentRange(range, commentInfos[0].range) : range;
                        this.addCommentAtLine2(clippedRange, ownerId);
                    }
                }).then(() => {
                    this._addInProgress = false;
                });
            }
        }
        else {
            const { ownerId } = newCommentInfos[0].action;
            const clippedRange = range && newCommentInfos[0].range ? this.clipUserRangeToCommentRange(range, newCommentInfos[0].range) : range;
            this.addCommentAtLine2(clippedRange, ownerId);
        }
        return Promise.resolve();
    }
    getCommentProvidersQuickPicks(commentInfos) {
        const picks = commentInfos.map((commentInfo) => {
            const { ownerId, extensionId, label } = commentInfo.action;
            return {
                label: label ?? extensionId ?? ownerId,
                id: ownerId
            };
        });
        return picks;
    }
    getContextMenuActions(commentInfos, commentRange) {
        const actions = [];
        commentInfos.forEach(commentInfo => {
            const { ownerId, extensionId, label } = commentInfo.action;
            actions.push(new Action('addCommentThread', `${label || extensionId}`, undefined, true, () => {
                const clippedRange = commentInfo.range ? this.clipUserRangeToCommentRange(commentRange, commentInfo.range) : commentRange;
                this.addCommentAtLine2(clippedRange, ownerId);
                return Promise.resolve();
            }));
        });
        return actions;
    }
    addCommentAtLine2(range, ownerId) {
        if (!this.editor) {
            return;
        }
        this.commentService.createCommentThreadTemplate(ownerId, this.editor.getModel().uri, range, this.editor.getId());
        this.processNextThreadToAdd();
        return;
    }
    getExistingCommentEditorOptions(editor) {
        const lineDecorationsWidth = editor.getOption(67 /* EditorOption.lineDecorationsWidth */);
        let extraEditorClassName = [];
        const configuredExtraClassName = editor.getRawOptions().extraEditorClassName;
        if (configuredExtraClassName) {
            extraEditorClassName = configuredExtraClassName.split(' ');
        }
        return { lineDecorationsWidth, extraEditorClassName };
    }
    getWithoutCommentsEditorOptions(editor, extraEditorClassName, startingLineDecorationsWidth) {
        let lineDecorationsWidth = startingLineDecorationsWidth;
        const inlineCommentPos = extraEditorClassName.findIndex(name => name === 'inline-comment');
        if (inlineCommentPos >= 0) {
            extraEditorClassName.splice(inlineCommentPos, 1);
        }
        const options = editor.getOptions();
        if (options.get(45 /* EditorOption.folding */) && options.get(115 /* EditorOption.showFoldingControls */) !== 'never') {
            lineDecorationsWidth += 11; // 11 comes from https://github.com/microsoft/vscode/blob/94ee5f58619d59170983f453fe78f156c0cc73a3/src/vs/workbench/contrib/comments/browser/media/review.css#L485
        }
        lineDecorationsWidth -= 24;
        return { extraEditorClassName, lineDecorationsWidth };
    }
    getWithCommentsLineDecorationWidth(editor, startingLineDecorationsWidth) {
        let lineDecorationsWidth = startingLineDecorationsWidth;
        const options = editor.getOptions();
        if (options.get(45 /* EditorOption.folding */) && options.get(115 /* EditorOption.showFoldingControls */) !== 'never') {
            lineDecorationsWidth -= 11;
        }
        lineDecorationsWidth += 24;
        this._commentingRangeAmountReserved = lineDecorationsWidth;
        return this._commentingRangeAmountReserved;
    }
    getWithCommentsEditorOptions(editor, extraEditorClassName, startingLineDecorationsWidth) {
        extraEditorClassName.push('inline-comment');
        return { lineDecorationsWidth: this.getWithCommentsLineDecorationWidth(editor, startingLineDecorationsWidth), extraEditorClassName };
    }
    updateEditorLayoutOptions(editor, extraEditorClassName, lineDecorationsWidth) {
        editor.updateOptions({
            extraEditorClassName: extraEditorClassName.join(' '),
            lineDecorationsWidth: lineDecorationsWidth
        });
    }
    ensureCommentingRangeReservedAmount(editor) {
        const existing = this.getExistingCommentEditorOptions(editor);
        if (existing.lineDecorationsWidth !== this._commentingRangeAmountReserved) {
            editor.updateOptions({
                lineDecorationsWidth: this.getWithCommentsLineDecorationWidth(editor, existing.lineDecorationsWidth)
            });
        }
    }
    tryUpdateReservedSpace(uri) {
        if (!this.editor) {
            return;
        }
        const hasCommentsOrRangesInInfo = this._commentInfos.some(info => {
            const hasRanges = Boolean(info.commentingRanges && (Array.isArray(info.commentingRanges) ? info.commentingRanges : info.commentingRanges.ranges).length);
            return hasRanges || (info.threads.length > 0);
        });
        uri = uri ?? this.editor.getModel()?.uri;
        const resourceHasCommentingRanges = uri ? this.commentService.resourceHasCommentingRanges(uri) : false;
        const hasCommentsOrRanges = hasCommentsOrRangesInInfo || resourceHasCommentingRanges;
        if (hasCommentsOrRanges && this.commentService.isCommentingEnabled) {
            if (!this._commentingRangeSpaceReserved) {
                this._commentingRangeSpaceReserved = true;
                const { lineDecorationsWidth, extraEditorClassName } = this.getExistingCommentEditorOptions(this.editor);
                const newOptions = this.getWithCommentsEditorOptions(this.editor, extraEditorClassName, lineDecorationsWidth);
                this.updateEditorLayoutOptions(this.editor, newOptions.extraEditorClassName, newOptions.lineDecorationsWidth);
            }
            else {
                this.ensureCommentingRangeReservedAmount(this.editor);
            }
        }
        else if ((!hasCommentsOrRanges || !this.commentService.isCommentingEnabled) && this._commentingRangeSpaceReserved) {
            this._commentingRangeSpaceReserved = false;
            const { lineDecorationsWidth, extraEditorClassName } = this.getExistingCommentEditorOptions(this.editor);
            const newOptions = this.getWithoutCommentsEditorOptions(this.editor, extraEditorClassName, lineDecorationsWidth);
            this.updateEditorLayoutOptions(this.editor, newOptions.extraEditorClassName, newOptions.lineDecorationsWidth);
        }
    }
    async setComments(commentInfos) {
        if (!this.editor || !this.commentService.isCommentingEnabled) {
            return;
        }
        this._commentInfos = commentInfos;
        this.tryUpdateReservedSpace();
        // create viewzones
        this.removeCommentWidgetsAndStoreCache();
        let hasCommentingRanges = false;
        for (const info of this._commentInfos) {
            if (!hasCommentingRanges && (info.commentingRanges.ranges.length > 0 || info.commentingRanges.fileComments)) {
                hasCommentingRanges = true;
            }
            const providerCacheStore = this._pendingNewCommentCache[info.uniqueOwner];
            const providerEditsCacheStore = this._pendingEditsCache[info.uniqueOwner];
            info.threads = info.threads.filter(thread => !thread.isDisposed);
            for (const thread of info.threads) {
                let pendingComment = undefined;
                if (providerCacheStore) {
                    pendingComment = providerCacheStore[thread.threadId];
                }
                let pendingEdits = undefined;
                if (providerEditsCacheStore) {
                    pendingEdits = providerEditsCacheStore[thread.threadId];
                }
                await this.displayCommentThread(info.uniqueOwner, thread, false, pendingComment, pendingEdits);
            }
            for (const thread of info.pendingCommentThreads ?? []) {
                this.resumePendingComment(this.editor.getModel().uri, thread);
            }
        }
        this._commentingRangeDecorator.update(this.editor, this._commentInfos);
        this._commentThreadRangeDecorator.update(this.editor, this._commentInfos);
        if (hasCommentingRanges) {
            this._activeEditorHasCommentingRange.set(true);
        }
        else {
            this._activeEditorHasCommentingRange.set(false);
        }
    }
    collapseAndFocusRange(threadId) {
        this._commentWidgets?.find(widget => widget.commentThread.threadId === threadId)?.collapseAndFocusRange();
    }
    removeCommentWidgetsAndStoreCache() {
        if (this._commentWidgets) {
            this._commentWidgets.forEach(zone => {
                const pendingComments = zone.getPendingComments();
                const pendingNewComment = pendingComments.newComment;
                const providerNewCommentCacheStore = this._pendingNewCommentCache[zone.uniqueOwner];
                let lastCommentBody;
                if (zone.commentThread.comments && zone.commentThread.comments.length) {
                    const lastComment = zone.commentThread.comments[zone.commentThread.comments.length - 1];
                    if (typeof lastComment.body === 'string') {
                        lastCommentBody = lastComment.body;
                    }
                    else {
                        lastCommentBody = lastComment.body.value;
                    }
                }
                if (pendingNewComment && (pendingNewComment.body !== lastCommentBody)) {
                    if (!providerNewCommentCacheStore) {
                        this._pendingNewCommentCache[zone.uniqueOwner] = {};
                    }
                    this._pendingNewCommentCache[zone.uniqueOwner][zone.commentThread.threadId] = pendingNewComment;
                }
                else {
                    if (providerNewCommentCacheStore) {
                        delete providerNewCommentCacheStore[zone.commentThread.threadId];
                    }
                }
                const pendingEdits = pendingComments.edits;
                const providerEditsCacheStore = this._pendingEditsCache[zone.uniqueOwner];
                if (Object.keys(pendingEdits).length > 0) {
                    if (!providerEditsCacheStore) {
                        this._pendingEditsCache[zone.uniqueOwner] = {};
                    }
                    this._pendingEditsCache[zone.uniqueOwner][zone.commentThread.threadId] = pendingEdits;
                }
                else if (providerEditsCacheStore) {
                    delete providerEditsCacheStore[zone.commentThread.threadId];
                }
                zone.dispose();
            });
        }
        this._commentWidgets = [];
    }
};
CommentController = __decorate([
    __param(1, ICommentService),
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, IContextMenuService),
    __param(5, IQuickInputService),
    __param(6, IViewsService),
    __param(7, IConfigurationService),
    __param(8, IContextKeyService),
    __param(9, IEditorService),
    __param(10, IKeybindingService),
    __param(11, IAccessibilityService),
    __param(12, INotificationService)
], CommentController);
export { CommentController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFrQyxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQWlFLE1BQU0sMkNBQTJDLENBQUM7QUFFdEksT0FBTyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pHLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFB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