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
var StickyScrollController_1;
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { StickyScrollWidget, StickyScrollWidgetState } from './stickyScrollWidget.js';
import { StickyLineCandidateProvider } from './stickyScrollProvider.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ClickLinkGesture } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { Range } from '../../../common/core/range.js';
import { getDefinitionsAtPosition } from '../../gotoSymbol/browser/goToSymbol.js';
import { goToDefinitionWithLocation } from '../../inlayHints/browser/inlayHintsLocations.js';
import { Position } from '../../../common/core/position.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import * as dom from '../../../../base/browser/dom.js';
import { StickyRange } from './stickyScrollElement.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { FoldingController } from '../../folding/browser/folding.js';
import { toggleCollapseState } from '../../folding/browser/foldingModel.js';
import { Emitter } from '../../../../base/common/event.js';
import { mainWindow } from '../../../../base/browser/window.js';
let StickyScrollController = class StickyScrollController extends Disposable {
    static { StickyScrollController_1 = this; }
    static { this.ID = 'store.contrib.stickyScrollController'; }
    constructor(_editor, _contextMenuService, _languageFeaturesService, _instaService, _languageConfigurationService, _languageFeatureDebounceService, _contextKeyService) {
        super();
        this._editor = _editor;
        this._contextMenuService = _contextMenuService;
        this._languageFeaturesService = _languageFeaturesService;
        this._instaService = _instaService;
        this._contextKeyService = _contextKeyService;
        this._sessionStore = new DisposableStore();
        this._maxStickyLines = Number.MAX_SAFE_INTEGER;
        this._candidateDefinitionsLength = -1;
        this._focusedStickyElementIndex = -1;
        this._enabled = false;
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
        this._endLineNumbers = [];
        this._mouseTarget = null;
        this._onDidChangeStickyScrollHeight = this._register(new Emitter());
        this.onDidChangeStickyScrollHeight = this._onDidChangeStickyScrollHeight.event;
        this._stickyScrollWidget = new StickyScrollWidget(this._editor);
        this._stickyLineCandidateProvider = new StickyLineCandidateProvider(this._editor, _languageFeaturesService, _languageConfigurationService);
        this._register(this._stickyScrollWidget);
        this._register(this._stickyLineCandidateProvider);
        this._widgetState = StickyScrollWidgetState.Empty;
        const stickyScrollDomNode = this._stickyScrollWidget.getDomNode();
        this._register(this._editor.onDidChangeConfiguration(e => {
            this._readConfigurationChange(e);
        }));
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.CONTEXT_MENU, async (event) => {
            this._onContextMenu(dom.getWindow(stickyScrollDomNode), event);
        }));
        this._stickyScrollFocusedContextKey = EditorContextKeys.stickyScrollFocused.bindTo(this._contextKeyService);
        this._stickyScrollVisibleContextKey = EditorContextKeys.stickyScrollVisible.bindTo(this._contextKeyService);
        const focusTracker = this._register(dom.trackFocus(stickyScrollDomNode));
        this._register(focusTracker.onDidBlur(_ => {
            // Suppose that the blurring is caused by scrolling, then keep the focus on the sticky scroll
            // This is determined by the fact that the height of the widget has become zero and there has been no position revealing
            if (this._positionRevealed === false && stickyScrollDomNode.clientHeight === 0) {
                this._focusedStickyElementIndex = -1;
                this.focus();
            }
            // In all other casees, dispose the focus on the sticky scroll
            else {
                this._disposeFocusStickyScrollStore();
            }
        }));
        this._register(focusTracker.onDidFocus(_ => {
            this.focus();
        }));
        this._registerMouseListeners();
        // Suppose that mouse down on the sticky scroll, then do not focus on the sticky scroll because this will be followed by the revealing of a position
        this._register(dom.addDisposableListener(stickyScrollDomNode, dom.EventType.MOUSE_DOWN, (e) => {
            this._onMouseDown = true;
        }));
        this._register(this._stickyScrollWidget.onDidChangeStickyScrollHeight((e) => {
            this._onDidChangeStickyScrollHeight.fire(e);
        }));
        this._onDidResize();
        this._readConfiguration();
    }
    get stickyScrollCandidateProvider() {
        return this._stickyLineCandidateProvider;
    }
    get stickyScrollWidgetState() {
        return this._widgetState;
    }
    get stickyScrollWidgetHeight() {
        return this._stickyScrollWidget.height;
    }
    static get(editor) {
        return editor.getContribution(StickyScrollController_1.ID);
    }
    _disposeFocusStickyScrollStore() {
        this._stickyScrollFocusedContextKey.set(false);
        this._focusDisposableStore?.dispose();
        this._focused = false;
        this._positionRevealed = false;
        this._onMouseDown = false;
    }
    isFocused() {
        return this._focused;
    }
    focus() {
        // If the mouse is down, do not focus on the sticky scroll
        if (this._onMouseDown) {
            this._onMouseDown = false;
            this._editor.focus();
            return;
        }
        const focusState = this._stickyScrollFocusedContextKey.get();
        if (focusState === true) {
            return;
        }
        this._focused = true;
        this._focusDisposableStore = new DisposableStore();
        this._stickyScrollFocusedContextKey.set(true);
        this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumbers.length - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    focusNext() {
        if (this._focusedStickyElementIndex < this._stickyScrollWidget.lineNumberCount - 1) {
            this._focusNav(true);
        }
    }
    focusPrevious() {
        if (this._focusedStickyElementIndex > 0) {
            this._focusNav(false);
        }
    }
    selectEditor() {
        this._editor.focus();
    }
    // True is next, false is previous
    _focusNav(direction) {
        this._focusedStickyElementIndex = direction ? this._focusedStickyElementIndex + 1 : this._focusedStickyElementIndex - 1;
        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
    }
    goToFocused() {
        const lineNumbers = this._stickyScrollWidget.lineNumbers;
        this._disposeFocusStickyScrollStore();
        this._revealPosition({ lineNumber: lineNumbers[this._focusedStickyElementIndex], column: 1 });
    }
    _revealPosition(position) {
        this._reveaInEditor(position, () => this._editor.revealPosition(position));
    }
    _revealLineInCenterIfOutsideViewport(position) {
        this._reveaInEditor(position, () => this._editor.revealLineInCenterIfOutsideViewport(position.lineNumber, 0 /* ScrollType.Smooth */));
    }
    _reveaInEditor(position, revealFunction) {
        if (this._focused) {
            this._disposeFocusStickyScrollStore();
        }
        this._positionRevealed = true;
        revealFunction();
        this._editor.setSelection(Range.fromPositions(position));
        this._editor.focus();
    }
    _registerMouseListeners() {
        const sessionStore = this._register(new DisposableStore());
        const gesture = this._register(new ClickLinkGesture(this._editor, {
            extractLineNumberFromMouseEvent: (e) => {
                const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
                return position ? position.lineNumber : 0;
            }
        }));
        const getMouseEventTarget = (mouseEvent) => {
            if (!this._editor.hasModel()) {
                return null;
            }
            if (mouseEvent.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ || mouseEvent.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return null;
            }
            const mouseTargetElement = mouseEvent.target.element;
            if (!mouseTargetElement || mouseTargetElement.innerText !== mouseTargetElement.innerHTML) {
                // not on a span element rendering text
                return null;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(mouseTargetElement);
            if (!position) {
                // not hovering a sticky scroll line
                return null;
            }
            return {
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column + mouseTargetElement.innerText.length),
                textElement: mouseTargetElement
            };
        };
        const stickyScrollWidgetDomNode = this._stickyScrollWidget.getDomNode();
        this._register(dom.addStandardDisposableListener(stickyScrollWidgetDomNode, dom.EventType.CLICK, (mouseEvent) => {
            if (mouseEvent.ctrlKey || mouseEvent.altKey || mouseEvent.metaKey) {
                // modifier pressed
                return;
            }
            if (!mouseEvent.leftButton) {
                // not left click
                return;
            }
            if (mouseEvent.shiftKey) {
                // shift click
                const lineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(mouseEvent.target);
                if (lineIndex === null) {
                    return;
                }
                const position = new Position(this._endLineNumbers[lineIndex], 1);
                this._revealLineInCenterIfOutsideViewport(position);
                return;
            }
            const isInFoldingIconDomNode = this._stickyScrollWidget.isInFoldingIconDomNode(mouseEvent.target);
            if (isInFoldingIconDomNode) {
                // clicked on folding icon
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                this._toggleFoldingRegionForLine(lineNumber);
                return;
            }
            const isInStickyLine = this._stickyScrollWidget.isInStickyLine(mouseEvent.target);
            if (!isInStickyLine) {
                return;
            }
            // normal click
            let position = this._stickyScrollWidget.getEditorPositionFromNode(mouseEvent.target);
            if (!position) {
                const lineNumber = this._stickyScrollWidget.getLineNumberFromChildDomNode(mouseEvent.target);
                if (lineNumber === null) {
                    // not hovering a sticky scroll line
                    return;
                }
                position = new Position(lineNumber, 1);
            }
            this._revealPosition(position);
        }));
        const mouseMoveListener = (mouseEvent) => {
            this._mouseTarget = mouseEvent.target;
            this._onMouseMoveOrKeyDown(mouseEvent);
        };
        const keyDownListener = (mouseEvent) => {
            this._onMouseMoveOrKeyDown(mouseEvent);
        };
        const keyUpListener = (e) => {
            if (this._showEndForLine !== undefined) {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }
        };
        mainWindow.addEventListener(dom.EventType.MOUSE_MOVE, mouseMoveListener);
        mainWindow.addEventListener(dom.EventType.KEY_DOWN, keyDownListener);
        mainWindow.addEventListener(dom.EventType.KEY_UP, keyUpListener);
        this._register(toDisposable(() => {
            mainWindow.removeEventListener(dom.EventType.MOUSE_MOVE, mouseMoveListener);
            mainWindow.removeEventListener(dom.EventType.KEY_DOWN, keyDownListener);
            mainWindow.removeEventListener(dom.EventType.KEY_UP, keyUpListener);
        }));
        this._register(gesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, _keyboardEvent]) => {
            const mouseTarget = getMouseEventTarget(mouseEvent);
            if (!mouseTarget || !mouseEvent.hasTriggerModifier || !this._editor.hasModel()) {
                sessionStore.clear();
                return;
            }
            const { range, textElement } = mouseTarget;
            if (!range.equalsRange(this._stickyRangeProjectedOnEditor)) {
                this._stickyRangeProjectedOnEditor = range;
                sessionStore.clear();
            }
            else if (textElement.style.textDecoration === 'underline') {
                return;
            }
            const cancellationToken = new CancellationTokenSource();
            sessionStore.add(toDisposable(() => cancellationToken.dispose(true)));
            let currentHTMLChild;
            getDefinitionsAtPosition(this._languageFeaturesService.definitionProvider, this._editor.getModel(), new Position(range.startLineNumber, range.startColumn + 1), false, cancellationToken.token).then((candidateDefinitions => {
                if (cancellationToken.token.isCancellationRequested) {
                    return;
                }
                if (candidateDefinitions.length !== 0) {
                    this._candidateDefinitionsLength = candidateDefinitions.length;
                    const childHTML = textElement;
                    if (currentHTMLChild !== childHTML) {
                        sessionStore.clear();
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                    else if (!currentHTMLChild) {
                        currentHTMLChild = childHTML;
                        currentHTMLChild.style.textDecoration = 'underline';
                        sessionStore.add(toDisposable(() => {
                            currentHTMLChild.style.textDecoration = 'none';
                        }));
                    }
                }
                else {
                    sessionStore.clear();
                }
            }));
        }));
        this._register(gesture.onCancel(() => {
            sessionStore.clear();
        }));
        this._register(gesture.onExecute(async (e) => {
            if (e.target.type !== 12 /* MouseTargetType.OVERLAY_WIDGET */ || e.target.detail !== this._stickyScrollWidget.getId()) {
                // not hovering over our widget
                return;
            }
            const position = this._stickyScrollWidget.getEditorPositionFromNode(e.target.element);
            if (!position) {
                // not hovering a sticky scroll line
                return;
            }
            if (!this._editor.hasModel() || !this._stickyRangeProjectedOnEditor) {
                return;
            }
            if (this._candidateDefinitionsLength > 1) {
                if (this._focused) {
                    this._disposeFocusStickyScrollStore();
                }
                this._revealPosition({ lineNumber: position.lineNumber, column: 1 });
            }
            this._instaService.invokeFunction(goToDefinitionWithLocation, e, this._editor, { uri: this._editor.getModel().uri, range: this._stickyRangeProjectedOnEditor });
        }));
    }
    _onContextMenu(targetWindow, e) {
        const event = new StandardMouseEvent(targetWindow, e);
        this._contextMenuService.showContextMenu({
            menuId: MenuId.StickyScrollContext,
            getAnchor: () => event,
        });
    }
    _onMouseMoveOrKeyDown(mouseEvent) {
        if (!mouseEvent.shiftKey) {
            return;
        }
        if (!this._mouseTarget || !dom.isHTMLElement(this._mouseTarget)) {
            return;
        }
        const currentEndForLineIndex = this._stickyScrollWidget.getLineIndexFromChildDomNode(this._mouseTarget);
        if (currentEndForLineIndex === null || this._showEndForLine === currentEndForLineIndex) {
            return;
        }
        this._showEndForLine = currentEndForLineIndex;
        this._renderStickyScroll();
    }
    _toggleFoldingRegionForLine(line) {
        if (!this._foldingModel || line === null) {
            return;
        }
        const stickyLine = this._stickyScrollWidget.getRenderedStickyLine(line);
        const foldingIcon = stickyLine?.foldingIcon;
        if (!foldingIcon) {
            return;
        }
        toggleCollapseState(this._foldingModel, 1, [line]);
        foldingIcon.isCollapsed = !foldingIcon.isCollapsed;
        const scrollTop = (foldingIcon.isCollapsed ?
            this._editor.getTopForLineNumber(foldingIcon.foldingEndLine)
            : this._editor.getTopForLineNumber(foldingIcon.foldingStartLine))
            - this._editor.getOption(68 /* EditorOption.lineHeight */) * stickyLine.index + 1;
        this._editor.setScrollTop(scrollTop);
        this._renderStickyScroll(line);
    }
    _readConfiguration() {
        const options = this._editor.getOption(120 /* EditorOption.stickyScroll */);
        if (options.enabled === false) {
            this._editor.removeOverlayWidget(this._stickyScrollWidget);
            this._resetState();
            this._sessionStore.clear();
            this._enabled = false;
            return;
        }
        else if (options.enabled && !this._enabled) {
            // When sticky scroll was just enabled, add the listeners on the sticky scroll
            this._editor.addOverlayWidget(this._stickyScrollWidget);
            this._sessionStore.add(this._editor.onDidScrollChange((e) => {
                if (e.scrollTopChanged) {
                    this._showEndForLine = undefined;
                    this._renderStickyScroll();
                }
            }));
            this._sessionStore.add(this._editor.onDidLayoutChange(() => this._onDidResize()));
            this._sessionStore.add(this._editor.onDidChangeModelTokens((e) => this._onTokensChange(e)));
            this._sessionStore.add(this._stickyLineCandidateProvider.onDidChangeStickyScroll(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll();
            }));
            this._enabled = true;
        }
        const lineNumberOption = this._editor.getOption(69 /* EditorOption.lineNumbers */);
        if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            this._sessionStore.add(this._editor.onDidChangeCursorPosition(() => {
                this._showEndForLine = undefined;
                this._renderStickyScroll(0);
            }));
        }
    }
    _readConfigurationChange(event) {
        if (event.hasChanged(120 /* EditorOption.stickyScroll */)
            || event.hasChanged(74 /* EditorOption.minimap */)
            || event.hasChanged(68 /* EditorOption.lineHeight */)
            || event.hasChanged(115 /* EditorOption.showFoldingControls */)
            || event.hasChanged(69 /* EditorOption.lineNumbers */)) {
            this._readConfiguration();
        }
        if (event.hasChanged(69 /* EditorOption.lineNumbers */) || event.hasChanged(45 /* EditorOption.folding */) || event.hasChanged(115 /* EditorOption.showFoldingControls */)) {
            this._renderStickyScroll(0);
        }
    }
    _needsUpdate(event) {
        const stickyLineNumbers = this._stickyScrollWidget.getCurrentLines();
        for (const stickyLineNumber of stickyLineNumbers) {
            for (const range of event.ranges) {
                if (stickyLineNumber >= range.fromLineNumber && stickyLineNumber <= range.toLineNumber) {
                    return true;
                }
            }
        }
        return false;
    }
    _onTokensChange(event) {
        if (this._needsUpdate(event)) {
            // Rebuilding the whole widget from line 0
            this._renderStickyScroll(0);
        }
    }
    _onDidResize() {
        const layoutInfo = this._editor.getLayoutInfo();
        // Make sure sticky scroll doesn't take up more than 25% of the editor
        const theoreticalLines = layoutInfo.height / this._editor.getOption(68 /* EditorOption.lineHeight */);
        this._maxStickyLines = Math.round(theoreticalLines * .25);
        this._renderStickyScroll(0);
    }
    async _renderStickyScroll(rebuildFromLine) {
        const model = this._editor.getModel();
        if (!model || model.isTooLargeForTokenization()) {
            this._resetState();
            return;
        }
        const nextRebuildFromLine = this._updateAndGetMinRebuildFromLine(rebuildFromLine);
        const stickyWidgetVersion = this._stickyLineCandidateProvider.getVersionId();
        const shouldUpdateState = stickyWidgetVersion === undefined || stickyWidgetVersion === model.getVersionId();
        if (shouldUpdateState) {
            if (!this._focused) {
                await this._updateState(nextRebuildFromLine);
            }
            else {
                // Suppose that previously the sticky scroll widget had height 0, then if there are visible lines, set the last line as focused
                if (this._focusedStickyElementIndex === -1) {
                    await this._updateState(nextRebuildFromLine);
                    this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                    if (this._focusedStickyElementIndex !== -1) {
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
                else {
                    const focusedStickyElementLineNumber = this._stickyScrollWidget.lineNumbers[this._focusedStickyElementIndex];
                    await this._updateState(nextRebuildFromLine);
                    // Suppose that after setting the state, there are no sticky lines, set the focused index to -1
                    if (this._stickyScrollWidget.lineNumberCount === 0) {
                        this._focusedStickyElementIndex = -1;
                    }
                    else {
                        const previousFocusedLineNumberExists = this._stickyScrollWidget.lineNumbers.includes(focusedStickyElementLineNumber);
                        // If the line number is still there, do not change anything
                        // If the line number is not there, set the new focused line to be the last line
                        if (!previousFocusedLineNumberExists) {
                            this._focusedStickyElementIndex = this._stickyScrollWidget.lineNumberCount - 1;
                        }
                        this._stickyScrollWidget.focusLineWithIndex(this._focusedStickyElementIndex);
                    }
                }
            }
        }
    }
    _updateAndGetMinRebuildFromLine(rebuildFromLine) {
        if (rebuildFromLine !== undefined) {
            const minRebuildFromLineOrInfinity = this._minRebuildFromLine !== undefined ? this._minRebuildFromLine : Infinity;
            this._minRebuildFromLine = Math.min(rebuildFromLine, minRebuildFromLineOrInfinity);
        }
        return this._minRebuildFromLine;
    }
    async _updateState(rebuildFromLine) {
        this._minRebuildFromLine = undefined;
        this._foldingModel = await FoldingController.get(this._editor)?.getFoldingModel() ?? undefined;
        this._widgetState = this.findScrollWidgetState();
        const stickyWidgetHasLines = this._widgetState.startLineNumbers.length > 0;
        this._stickyScrollVisibleContextKey.set(stickyWidgetHasLines);
        this._stickyScrollWidget.setState(this._widgetState, this._foldingModel, rebuildFromLine);
    }
    async _resetState() {
        this._minRebuildFromLine = undefined;
        this._foldingModel = undefined;
        this._widgetState = StickyScrollWidgetState.Empty;
        this._stickyScrollVisibleContextKey.set(false);
        this._stickyScrollWidget.setState(undefined, undefined);
    }
    findScrollWidgetState() {
        if (!this._editor.hasModel()) {
            return StickyScrollWidgetState.Empty;
        }
        const textModel = this._editor.getModel();
        const maxNumberStickyLines = Math.min(this._maxStickyLines, this._editor.getOption(120 /* EditorOption.stickyScroll */).maxLineCount);
        const scrollTop = this._editor.getScrollTop();
        let lastLineRelativePosition = 0;
        const startLineNumbers = [];
        const endLineNumbers = [];
        const arrayVisibleRanges = this._editor.getVisibleRanges();
        if (arrayVisibleRanges.length !== 0) {
            const fullVisibleRange = new StickyRange(arrayVisibleRanges[0].startLineNumber, arrayVisibleRanges[arrayVisibleRanges.length - 1].endLineNumber);
            const candidateRanges = this._stickyLineCandidateProvider.getCandidateStickyLinesIntersecting(fullVisibleRange);
            for (const range of candidateRanges) {
                const start = range.startLineNumber;
                const end = range.endLineNumber;
                const isValidRange = textModel.isValidRange({ startLineNumber: start, endLineNumber: end, startColumn: 1, endColumn: 1 });
                if (isValidRange && end - start > 0) {
                    const topOfElement = range.top;
                    const bottomOfElement = topOfElement + range.height;
                    const topOfBeginningLine = this._editor.getTopForLineNumber(start) - scrollTop;
                    const bottomOfEndLine = this._editor.getBottomForLineNumber(end) - scrollTop;
                    if (topOfElement > topOfBeginningLine && topOfElement <= bottomOfEndLine) {
                        startLineNumbers.push(start);
                        endLineNumbers.push(end + 1);
                        if (bottomOfElement > bottomOfEndLine) {
                            lastLineRelativePosition = bottomOfEndLine - bottomOfElement;
                        }
                    }
                    if (startLineNumbers.length === maxNumberStickyLines) {
                        break;
                    }
                }
            }
        }
        this._endLineNumbers = endLineNumbers;
        return new StickyScrollWidgetState(startLineNumbers, endLineNumbers, lastLineRelativePosition, this._showEndForLine);
    }
    dispose() {
        super.dispose();
        this._sessionStore.dispose();
    }
};
StickyScrollController = StickyScrollController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, ILanguageFeaturesService),
    __param(3, IInstantiationService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILanguageFeatureDebounceService),
    __param(6, IContextKeyService)
], StickyScrollController);
export { StickyScrollController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci9zdGlja3lTY3JvbGxDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RixPQUFPLEVBQWdDLDJCQUEyQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBdUIsTUFBTSxtREFBbUQsQ0FBQztBQUMxRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtD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