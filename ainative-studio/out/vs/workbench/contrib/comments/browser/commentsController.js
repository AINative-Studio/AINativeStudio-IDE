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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBQWtDLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBaUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV0SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakcsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFN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