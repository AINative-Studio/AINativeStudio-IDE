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
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../editor/common/core/range.js';
import * as languages from '../../../../editor/common/languages.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { CommentGlyphWidget } from './commentGlyphWidget.js';
import { ICommentService } from './commentService.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../editor/common/config/editorOptions.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { CommentThreadWidget } from './commentThreadWidget.js';
import { commentThreadStateBackgroundColorVar, commentThreadStateColorVar, getCommentThreadStateBorderColor } from './commentColors.js';
import { peekViewBorder } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { StableEditorScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import Severity from '../../../../base/common/severity.js';
import * as nls from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
function getCommentThreadWidgetStateColor(thread, theme) {
    return getCommentThreadStateBorderColor(thread, theme) ?? theme.getColor(peekViewBorder);
}
export var CommentWidgetFocus;
(function (CommentWidgetFocus) {
    CommentWidgetFocus[CommentWidgetFocus["None"] = 0] = "None";
    CommentWidgetFocus[CommentWidgetFocus["Widget"] = 1] = "Widget";
    CommentWidgetFocus[CommentWidgetFocus["Editor"] = 2] = "Editor";
})(CommentWidgetFocus || (CommentWidgetFocus = {}));
export function parseMouseDownInfoFromEvent(e) {
    const range = e.target.range;
    if (!range) {
        return null;
    }
    if (!e.event.leftButton) {
        return null;
    }
    if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
        return null;
    }
    const data = e.target.detail;
    const gutterOffsetX = data.offsetX - data.glyphMarginWidth - data.lineNumbersWidth - data.glyphMarginLeft;
    // don't collide with folding and git decorations
    if (gutterOffsetX > 20) {
        return null;
    }
    return { lineNumber: range.startLineNumber };
}
export function isMouseUpEventDragFromMouseDown(mouseDownInfo, e) {
    if (!mouseDownInfo) {
        return null;
    }
    const { lineNumber } = mouseDownInfo;
    const range = e.target.range;
    if (!range) {
        return null;
    }
    return lineNumber;
}
export function isMouseUpEventMatchMouseDown(mouseDownInfo, e) {
    if (!mouseDownInfo) {
        return null;
    }
    const { lineNumber } = mouseDownInfo;
    const range = e.target.range;
    if (!range || range.startLineNumber !== lineNumber) {
        return null;
    }
    if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
        return null;
    }
    return lineNumber;
}
let ReviewZoneWidget = class ReviewZoneWidget extends ZoneWidget {
    get uniqueOwner() {
        return this._uniqueOwner;
    }
    get commentThread() {
        return this._commentThread;
    }
    get expanded() {
        return this._isExpanded;
    }
    constructor(editor, _uniqueOwner, _commentThread, _pendingComment, _pendingEdits, instantiationService, themeService, commentService, contextKeyService, configurationService, dialogService) {
        super(editor, { keepEditorSelection: true, isAccessible: true, showArrow: !!_commentThread.range });
        this._uniqueOwner = _uniqueOwner;
        this._commentThread = _commentThread;
        this._pendingComment = _pendingComment;
        this._pendingEdits = _pendingEdits;
        this.themeService = themeService;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this._onDidClose = new Emitter();
        this._onDidCreateThread = new Emitter();
        this._globalToDispose = new DisposableStore();
        this._commentThreadDisposables = [];
        this._contextKeyService = contextKeyService.createScoped(this.domNode);
        this._scopedInstantiationService = this._globalToDispose.add(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        const controller = this.commentService.getCommentController(this._uniqueOwner);
        if (controller) {
            this._commentOptions = controller.options;
        }
        this._initialCollapsibleState = _pendingComment ? languages.CommentThreadCollapsibleState.Expanded : _commentThread.initialCollapsibleState;
        _commentThread.initialCollapsibleState = this._initialCollapsibleState;
        this._commentThreadDisposables = [];
        this.create();
        this._globalToDispose.add(this.themeService.onDidColorThemeChange(this._applyTheme, this));
        this._globalToDispose.add(this.editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._applyTheme(this.themeService.getColorTheme());
            }
        }));
        this._applyTheme(this.themeService.getColorTheme());
    }
    get onDidClose() {
        return this._onDidClose.event;
    }
    get onDidCreateThread() {
        return this._onDidCreateThread.event;
    }
    getPosition() {
        if (this.position) {
            return this.position;
        }
        if (this._commentGlyph) {
            return this._commentGlyph.getPosition().position ?? undefined;
        }
        return undefined;
    }
    revealRange() {
        // we don't do anything here as we always do the reveal ourselves.
    }
    reveal(commentUniqueId, focus = CommentWidgetFocus.None) {
        this.makeVisible(commentUniqueId, focus);
        const comment = this._commentThread.comments?.find(comment => comment.uniqueIdInThread === commentUniqueId) ?? this._commentThread.comments?.[0];
        this.commentService.setActiveCommentAndThread(this.uniqueOwner, { thread: this._commentThread, comment });
    }
    _expandAndShowZoneWidget() {
        if (!this._isExpanded) {
            this.show(this.arrowPosition(this._commentThread.range), 2);
        }
    }
    _setFocus(commentUniqueId, focus) {
        if (focus === CommentWidgetFocus.Widget) {
            this._commentThreadWidget.focus(commentUniqueId);
        }
        else if (focus === CommentWidgetFocus.Editor) {
            this._commentThreadWidget.focusCommentEditor();
        }
    }
    _goToComment(commentUniqueId, focus) {
        const height = this.editor.getLayoutInfo().height;
        const coords = this._commentThreadWidget.getCommentCoords(commentUniqueId);
        if (coords) {
            let scrollTop = 1;
            if (this._commentThread.range) {
                const commentThreadCoords = coords.thread;
                const commentCoords = coords.comment;
                scrollTop = this.editor.getTopForLineNumber(this._commentThread.range.startLineNumber) - height / 2 + commentCoords.top - commentThreadCoords.top;
            }
            this.editor.setScrollTop(scrollTop);
            this._setFocus(commentUniqueId, focus);
        }
        else {
            this._goToThread(focus);
        }
    }
    _goToThread(focus) {
        const rangeToReveal = this._commentThread.range
            ? new Range(this._commentThread.range.startLineNumber, this._commentThread.range.startColumn, this._commentThread.range.endLineNumber + 1, 1)
            : new Range(1, 1, 1, 1);
        this.editor.revealRangeInCenter(rangeToReveal);
        this._setFocus(undefined, focus);
    }
    makeVisible(commentUniqueId, focus = CommentWidgetFocus.None) {
        this._expandAndShowZoneWidget();
        if (commentUniqueId !== undefined) {
            this._goToComment(commentUniqueId, focus);
        }
        else {
            this._goToThread(focus);
        }
    }
    getPendingComments() {
        return {
            newComment: this._commentThreadWidget.getPendingComment(),
            edits: this._commentThreadWidget.getPendingEdits()
        };
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this.expand();
        this._commentThreadWidget.setPendingComment(pending);
    }
    _fillContainer(container) {
        this.setCssClass('review-widget');
        this._commentThreadWidget = this._scopedInstantiationService.createInstance(CommentThreadWidget, container, this.editor, this._uniqueOwner, this.editor.getModel().uri, this._contextKeyService, this._scopedInstantiationService, this._commentThread, this._pendingComment, this._pendingEdits, { editor: this.editor, codeBlockFontSize: '', codeBlockFontFamily: this.configurationService.getValue('editor').fontFamily || EDITOR_FONT_DEFAULTS.fontFamily }, this._commentOptions, {
            actionRunner: async () => {
                if (!this._commentThread.comments || !this._commentThread.comments.length) {
                    const newPosition = this.getPosition();
                    if (newPosition) {
                        const originalRange = this._commentThread.range;
                        if (!originalRange) {
                            return;
                        }
                        let range;
                        if (newPosition.lineNumber !== originalRange.endLineNumber) {
                            // The widget could have moved as a result of editor changes.
                            // We need to try to calculate the new, more correct, range for the comment.
                            const distance = newPosition.lineNumber - originalRange.endLineNumber;
                            range = new Range(originalRange.startLineNumber + distance, originalRange.startColumn, originalRange.endLineNumber + distance, originalRange.endColumn);
                        }
                        else {
                            range = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.endColumn);
                        }
                        await this.commentService.updateCommentThreadTemplate(this.uniqueOwner, this._commentThread.commentThreadHandle, range);
                    }
                }
            },
            collapse: () => {
                return this.collapse(true);
            }
        });
        this._disposables.add(this._commentThreadWidget);
    }
    arrowPosition(range) {
        if (!range) {
            return undefined;
        }
        // Arrow on top edge of zone widget will be at the start of the line if range is multi-line, else at midpoint of range (rounding rightwards)
        return { lineNumber: range.endLineNumber, column: range.endLineNumber === range.startLineNumber ? (range.startColumn + range.endColumn + 1) / 2 : 1 };
    }
    deleteCommentThread() {
        this.dispose();
        this.commentService.disposeCommentThread(this.uniqueOwner, this._commentThread.threadId);
    }
    doCollapse() {
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
    }
    async collapse(confirm = false) {
        if (!confirm || (await this.confirmCollapse())) {
            this.doCollapse();
            return true;
        }
        else {
            return false;
        }
    }
    async confirmCollapse() {
        const confirmSetting = this.configurationService.getValue('comments.thread.confirmOnCollapse');
        if (confirmSetting === 'whenHasUnsubmittedComments' && this._commentThreadWidget.hasUnsubmittedComments) {
            const result = await this.dialogService.confirm({
                message: nls.localize('confirmCollapse', "Collapsing a comment thread will discard unsubmitted comments. Do you want to collapse this comment thread?"),
                primaryButton: nls.localize('collapse', "Collapse"),
                type: Severity.Warning,
                checkbox: { label: nls.localize('neverAskAgain', "Never ask me again"), checked: false }
            });
            if (result.checkboxChecked) {
                await this.configurationService.updateValue('comments.thread.confirmOnCollapse', 'never');
            }
            return result.confirmed;
        }
        return true;
    }
    expand(setActive) {
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
        if (setActive) {
            this.commentService.setActiveCommentAndThread(this.uniqueOwner, { thread: this._commentThread });
        }
    }
    getGlyphPosition() {
        if (this._commentGlyph) {
            return this._commentGlyph.getPosition().position.lineNumber;
        }
        return 0;
    }
    async update(commentThread) {
        if (this._commentThread !== commentThread) {
            this._commentThreadDisposables.forEach(disposable => disposable.dispose());
            this._commentThread = commentThread;
            this._commentThreadDisposables = [];
            this.bindCommentThreadListeners();
        }
        await this._commentThreadWidget.updateCommentThread(commentThread);
        // Move comment glyph widget and show position if the line has changed.
        const lineNumber = this._commentThread.range?.endLineNumber ?? 1;
        let shouldMoveWidget = false;
        if (this._commentGlyph) {
            this._commentGlyph.setThreadState(commentThread.state);
            if (this._commentGlyph.getPosition().position.lineNumber !== lineNumber) {
                shouldMoveWidget = true;
                this._commentGlyph.setLineNumber(lineNumber);
            }
        }
        if ((shouldMoveWidget && this._isExpanded) || (this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded && !this._isExpanded)) {
            this.show(this.arrowPosition(this._commentThread.range), 2);
        }
        else if (this._commentThread.collapsibleState !== languages.CommentThreadCollapsibleState.Expanded) {
            this.hide();
        }
    }
    _onWidth(widthInPixel) {
        this._commentThreadWidget.layout(widthInPixel);
    }
    _doLayout(heightInPixel, widthInPixel) {
        this._commentThreadWidget.layout(widthInPixel);
    }
    async display(range, shouldReveal) {
        if (range) {
            this._commentGlyph = new CommentGlyphWidget(this.editor, range?.endLineNumber ?? -1);
            this._commentGlyph.setThreadState(this._commentThread.state);
            this._globalToDispose.add(this._commentGlyph.onDidChangeLineNumber(async (e) => {
                if (!this._commentThread.range) {
                    return;
                }
                const shift = e - (this._commentThread.range.endLineNumber);
                const newRange = new Range(this._commentThread.range.startLineNumber + shift, this._commentThread.range.startColumn, this._commentThread.range.endLineNumber + shift, this._commentThread.range.endColumn);
                this._commentThread.range = newRange;
            }));
        }
        await this._commentThreadWidget.display(this.editor.getOption(68 /* EditorOption.lineHeight */), shouldReveal);
        this._disposables.add(this._commentThreadWidget.onDidResize(dimension => {
            this._refresh(dimension);
        }));
        if (this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded) {
            this.show(this.arrowPosition(range), 2);
        }
        // If this is a new comment thread awaiting user input then we need to reveal it.
        if (shouldReveal) {
            this.makeVisible();
        }
        this.bindCommentThreadListeners();
    }
    bindCommentThreadListeners() {
        this._commentThreadDisposables.push(this._commentThread.onDidChangeComments(async (_) => {
            await this.update(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeCollapsibleState(state => {
            if (state === languages.CommentThreadCollapsibleState.Expanded && !this._isExpanded) {
                this.show(this.arrowPosition(this._commentThread.range), 2);
                this._commentThreadWidget.ensureFocusIntoNewEditingComment();
                return;
            }
            if (state === languages.CommentThreadCollapsibleState.Collapsed && this._isExpanded) {
                this.hide();
                return;
            }
        }));
        if (this._initialCollapsibleState === undefined) {
            const onDidChangeInitialCollapsibleState = this._commentThread.onDidChangeInitialCollapsibleState(state => {
                // File comments always start expanded
                this._initialCollapsibleState = state;
                this._commentThread.collapsibleState = this._initialCollapsibleState;
                onDidChangeInitialCollapsibleState.dispose();
            });
            this._commentThreadDisposables.push(onDidChangeInitialCollapsibleState);
        }
        this._commentThreadDisposables.push(this._commentThread.onDidChangeState(() => {
            const borderColor = getCommentThreadWidgetStateColor(this._commentThread.state, this.themeService.getColorTheme()) || Color.transparent;
            this.style({
                frameColor: borderColor,
                arrowColor: borderColor,
            });
            this.container?.style.setProperty(commentThreadStateColorVar, `${borderColor}`);
            this.container?.style.setProperty(commentThreadStateBackgroundColorVar, `${borderColor.transparent(.1)}`);
        }));
    }
    async submitComment() {
        return this._commentThreadWidget.submitComment();
    }
    _refresh(dimensions) {
        if ((this._isExpanded === undefined) && (dimensions.height === 0) && (dimensions.width === 0)) {
            this.commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
            return;
        }
        if (this._isExpanded) {
            this._commentThreadWidget.layout();
            const headHeight = Math.ceil(this.editor.getOption(68 /* EditorOption.lineHeight */) * 1.2);
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            const arrowHeight = Math.round(lineHeight / 3);
            const frameThickness = Math.round(lineHeight / 9) * 2;
            const computedLinesNumber = Math.ceil((headHeight + dimensions.height + arrowHeight + frameThickness + 8 /** margin bottom to avoid margin collapse */) / lineHeight);
            if (this._viewZone?.heightInLines === computedLinesNumber) {
                return;
            }
            const currentPosition = this.getPosition();
            if (this._viewZone && currentPosition && currentPosition.lineNumber !== this._viewZone.afterLineNumber && this._viewZone.afterLineNumber !== 0) {
                this._viewZone.afterLineNumber = currentPosition.lineNumber;
            }
            const capture = StableEditorScrollState.capture(this.editor);
            this._relayout(computedLinesNumber);
            capture.restore(this.editor);
        }
    }
    _applyTheme(theme) {
        const borderColor = getCommentThreadWidgetStateColor(this._commentThread.state, this.themeService.getColorTheme()) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor
        });
        const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        // Editor decorations should also be responsive to theme changes
        this._commentThreadWidget.applyTheme(theme, fontInfo);
    }
    show(rangeOrPos, heightInLines) {
        const glyphPosition = this._commentGlyph?.getPosition();
        let range = Range.isIRange(rangeOrPos) ? rangeOrPos : (rangeOrPos ? Range.fromPositions(rangeOrPos) : undefined);
        if (glyphPosition?.position && range && glyphPosition.position.lineNumber !== range.endLineNumber) {
            // The widget could have moved as a result of editor changes.
            // We need to try to calculate the new, more correct, range for the comment.
            const distance = glyphPosition.position.lineNumber - range.endLineNumber;
            range = new Range(range.startLineNumber + distance, range.startColumn, range.endLineNumber + distance, range.endColumn);
        }
        this._isExpanded = true;
        super.show(range ?? new Range(0, 0, 0, 0), heightInLines);
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
        this._refresh(this._commentThreadWidget.getDimensions());
    }
    async collapseAndFocusRange() {
        if (await this.collapse(true) && Range.isIRange(this.commentThread.range) && isCodeEditor(this.editor)) {
            this.editor.setSelection(this.commentThread.range);
        }
    }
    hide() {
        if (this._isExpanded) {
            this._isExpanded = false;
            // Focus the container so that the comment editor will be blurred before it is hidden
            if (this.editor.hasWidgetFocus()) {
                this.editor.focus();
            }
            if (!this._commentThread.comments || !this._commentThread.comments.length) {
                this.deleteCommentThread();
            }
        }
        super.hide();
    }
    dispose() {
        super.dispose();
        if (this._commentGlyph) {
            this._commentGlyph.dispose();
            this._commentGlyph = undefined;
        }
        this._globalToDispose.dispose();
        this._commentThreadDisposables.forEach(global => global.dispose());
        this._onDidClose.fire(undefined);
    }
};
ReviewZoneWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, ICommentService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, IDialogService)
], ReviewZoneWidget);
export { ReviewZoneWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRab25lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBa0MsWUFBWSxFQUFtQixNQUFNLDZDQUE2QyxDQUFDO0FBRTVILE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0MsTUFBTSxtREFBbUQsQ0FBQztBQUN2SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFB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