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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50VGhyZWFkWm9uZVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQWtDLFlBQVksRUFBbUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUU1SCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQWdDLE1BQU0sbURBQW1ELENBQUM7QUFDdkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJB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