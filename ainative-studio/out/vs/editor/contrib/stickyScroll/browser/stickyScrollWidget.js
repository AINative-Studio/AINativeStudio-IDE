/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../base/browser/trustedTypes.js';
import { equals } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import './stickyScroll.css';
import { getColumnOfNodeOffset } from '../../../browser/viewParts/viewLines/viewLine.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../common/core/position.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../common/viewLayout/viewLineRenderer.js';
import { foldingCollapsedIcon, foldingExpandedIcon } from '../../folding/browser/foldingDecorations.js';
import { Emitter } from '../../../../base/common/event.js';
export class StickyScrollWidgetState {
    constructor(startLineNumbers, endLineNumbers, lastLineRelativePosition, showEndForLine = null) {
        this.startLineNumbers = startLineNumbers;
        this.endLineNumbers = endLineNumbers;
        this.lastLineRelativePosition = lastLineRelativePosition;
        this.showEndForLine = showEndForLine;
    }
    equals(other) {
        return !!other
            && this.lastLineRelativePosition === other.lastLineRelativePosition
            && this.showEndForLine === other.showEndForLine
            && equals(this.startLineNumbers, other.startLineNumbers)
            && equals(this.endLineNumbers, other.endLineNumbers);
    }
    static get Empty() {
        return new StickyScrollWidgetState([], [], 0);
    }
}
const _ttPolicy = createTrustedTypesPolicy('stickyScrollViewLayer', { createHTML: value => value });
const STICKY_INDEX_ATTR = 'data-sticky-line-index';
const STICKY_IS_LINE_ATTR = 'data-sticky-is-line';
const STICKY_IS_LINE_NUMBER_ATTR = 'data-sticky-is-line-number';
const STICKY_IS_FOLDING_ICON_ATTR = 'data-sticky-is-folding-icon';
export class StickyScrollWidget extends Disposable {
    get height() { return this._height; }
    constructor(editor) {
        super();
        this._foldingIconStore = new DisposableStore();
        this._rootDomNode = document.createElement('div');
        this._lineNumbersDomNode = document.createElement('div');
        this._linesDomNodeScrollable = document.createElement('div');
        this._linesDomNode = document.createElement('div');
        this._renderedStickyLines = [];
        this._lineNumbers = [];
        this._lastLineRelativePosition = 0;
        this._minContentWidthInPx = 0;
        this._isOnGlyphMargin = false;
        this._height = -1;
        this._onDidChangeStickyScrollHeight = this._register(new Emitter());
        this.onDidChangeStickyScrollHeight = this._onDidChangeStickyScrollHeight.event;
        this._editor = editor;
        this._lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
        this._lineNumbersDomNode.className = 'sticky-widget-line-numbers';
        this._lineNumbersDomNode.setAttribute('role', 'none');
        this._linesDomNode.className = 'sticky-widget-lines';
        this._linesDomNode.setAttribute('role', 'list');
        this._linesDomNodeScrollable.className = 'sticky-widget-lines-scrollable';
        this._linesDomNodeScrollable.appendChild(this._linesDomNode);
        this._rootDomNode.className = 'sticky-widget';
        this._rootDomNode.classList.toggle('peek', editor instanceof EmbeddedCodeEditorWidget);
        this._rootDomNode.appendChild(this._lineNumbersDomNode);
        this._rootDomNode.appendChild(this._linesDomNodeScrollable);
        this._setHeight(0);
        const updateScrollLeftPosition = () => {
            this._linesDomNode.style.left = this._editor.getOption(120 /* EditorOption.stickyScroll */).scrollWithEditor ? `-${this._editor.getScrollLeft()}px` : '0px';
        };
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(120 /* EditorOption.stickyScroll */)) {
                updateScrollLeftPosition();
            }
            if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
                this._lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            }
        }));
        this._register(this._editor.onDidScrollChange((e) => {
            if (e.scrollLeftChanged) {
                updateScrollLeftPosition();
            }
            if (e.scrollWidthChanged) {
                this._updateWidgetWidth();
            }
        }));
        this._register(this._editor.onDidChangeModel(() => {
            updateScrollLeftPosition();
            this._updateWidgetWidth();
        }));
        this._register(this._foldingIconStore);
        updateScrollLeftPosition();
        this._register(this._editor.onDidLayoutChange((e) => {
            this._updateWidgetWidth();
        }));
        this._updateWidgetWidth();
    }
    get lineNumbers() {
        return this._lineNumbers;
    }
    get lineNumberCount() {
        return this._lineNumbers.length;
    }
    getRenderedStickyLine(lineNumber) {
        return this._renderedStickyLines.find(stickyLine => stickyLine.lineNumber === lineNumber);
    }
    getCurrentLines() {
        return this._lineNumbers;
    }
    setState(_state, foldingModel, _rebuildFromLine) {
        if (_rebuildFromLine === undefined &&
            ((!this._previousState && !_state) || (this._previousState && this._previousState.equals(_state)))) {
            return;
        }
        const isWidgetHeightZero = this._isWidgetHeightZero(_state);
        const state = isWidgetHeightZero ? undefined : _state;
        const rebuildFromLine = isWidgetHeightZero ? 0 : this._findLineToRebuildWidgetFrom(_state, _rebuildFromLine);
        this._renderRootNode(state, foldingModel, rebuildFromLine);
        this._previousState = _state;
    }
    _isWidgetHeightZero(state) {
        if (!state) {
            return true;
        }
        const futureWidgetHeight = state.startLineNumbers.length * this._lineHeight + state.lastLineRelativePosition;
        if (futureWidgetHeight > 0) {
            this._lastLineRelativePosition = state.lastLineRelativePosition;
            const lineNumbers = [...state.startLineNumbers];
            if (state.showEndForLine !== null) {
                lineNumbers[state.showEndForLine] = state.endLineNumbers[state.showEndForLine];
            }
            this._lineNumbers = lineNumbers;
        }
        else {
            this._lastLineRelativePosition = 0;
            this._lineNumbers = [];
        }
        return futureWidgetHeight === 0;
    }
    _findLineToRebuildWidgetFrom(state, _rebuildFromLine) {
        if (!state || !this._previousState) {
            return 0;
        }
        if (_rebuildFromLine !== undefined) {
            return _rebuildFromLine;
        }
        const previousState = this._previousState;
        const indexOfLinesAlreadyRendered = state.startLineNumbers.findIndex(startLineNumber => !previousState.startLineNumbers.includes(startLineNumber));
        return (indexOfLinesAlreadyRendered === -1) ? 0 : indexOfLinesAlreadyRendered;
    }
    _updateWidgetWidth() {
        const layoutInfo = this._editor.getLayoutInfo();
        const lineNumbersWidth = layoutInfo.contentLeft;
        this._lineNumbersDomNode.style.width = `${lineNumbersWidth}px`;
        this._linesDomNodeScrollable.style.setProperty('--vscode-editorStickyScroll-scrollableWidth', `${this._editor.getScrollWidth() - layoutInfo.verticalScrollbarWidth}px`);
        this._rootDomNode.style.width = `${layoutInfo.width - layoutInfo.verticalScrollbarWidth}px`;
    }
    _clearStickyLinesFromLine(clearFromLine) {
        this._foldingIconStore.clear();
        // Removing only the lines that need to be rerendered
        for (let i = clearFromLine; i < this._renderedStickyLines.length; i++) {
            const stickyLine = this._renderedStickyLines[i];
            stickyLine.lineNumberDomNode.remove();
            stickyLine.lineDomNode.remove();
        }
        // Keep the lines that need to be updated
        this._renderedStickyLines = this._renderedStickyLines.slice(0, clearFromLine);
    }
    _useFoldingOpacityTransition(requireTransitions) {
        this._lineNumbersDomNode.style.setProperty('--vscode-editorStickyScroll-foldingOpacityTransition', `opacity ${requireTransitions ? 0.5 : 0}s`);
    }
    _setFoldingIconsVisibility(allVisible) {
        for (const line of this._renderedStickyLines) {
            const foldingIcon = line.foldingIcon;
            if (!foldingIcon) {
                continue;
            }
            foldingIcon.setVisible(allVisible ? true : foldingIcon.isCollapsed);
        }
    }
    async _renderRootNode(state, foldingModel, rebuildFromLine) {
        this._clearStickyLinesFromLine(rebuildFromLine);
        if (!state) {
            // make sure the dom is 0 height and display:none
            this._setHeight(0);
            return;
        }
        // For existing sticky lines update the top and z-index
        for (const stickyLine of this._renderedStickyLines) {
            this._updatePosition(stickyLine);
        }
        // For new sticky lines
        const layoutInfo = this._editor.getLayoutInfo();
        const linesToRender = this._lineNumbers.slice(rebuildFromLine);
        for (const [index, line] of linesToRender.entries()) {
            const stickyLine = this._renderChildNode(index + rebuildFromLine, line, foldingModel, layoutInfo);
            if (!stickyLine) {
                continue;
            }
            this._linesDomNode.appendChild(stickyLine.lineDomNode);
            this._lineNumbersDomNode.appendChild(stickyLine.lineNumberDomNode);
            this._renderedStickyLines.push(stickyLine);
        }
        if (foldingModel) {
            this._setFoldingHoverListeners();
            this._useFoldingOpacityTransition(!this._isOnGlyphMargin);
        }
        const widgetHeight = this._lineNumbers.length * this._lineHeight + this._lastLineRelativePosition;
        this._setHeight(widgetHeight);
        this._rootDomNode.style.marginLeft = '0px';
        this._minContentWidthInPx = Math.max(...this._renderedStickyLines.map(l => l.scrollWidth)) + layoutInfo.verticalScrollbarWidth;
        this._editor.layoutOverlayWidget(this);
    }
    _setHeight(height) {
        if (this._height === height) {
            return;
        }
        this._height = height;
        if (this._height === 0) {
            this._rootDomNode.style.display = 'none';
        }
        else {
            this._rootDomNode.style.display = 'block';
            this._lineNumbersDomNode.style.height = `${this._height}px`;
            this._linesDomNodeScrollable.style.height = `${this._height}px`;
            this._rootDomNode.style.height = `${this._height}px`;
        }
        this._onDidChangeStickyScrollHeight.fire({ height: this._height });
    }
    _setFoldingHoverListeners() {
        const showFoldingControls = this._editor.getOption(115 /* EditorOption.showFoldingControls */);
        if (showFoldingControls !== 'mouseover') {
            return;
        }
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_ENTER, () => {
            this._isOnGlyphMargin = true;
            this._setFoldingIconsVisibility(true);
        }));
        this._foldingIconStore.add(dom.addDisposableListener(this._lineNumbersDomNode, dom.EventType.MOUSE_LEAVE, () => {
            this._isOnGlyphMargin = false;
            this._useFoldingOpacityTransition(true);
            this._setFoldingIconsVisibility(false);
        }));
    }
    _renderChildNode(index, line, foldingModel, layoutInfo) {
        const viewModel = this._editor._getViewModel();
        if (!viewModel) {
            return;
        }
        const viewLineNumber = viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(line, 1)).lineNumber;
        const lineRenderingData = viewModel.getViewLineRenderingData(viewLineNumber);
        const lineNumberOption = this._editor.getOption(69 /* EditorOption.lineNumbers */);
        let actualInlineDecorations;
        try {
            actualInlineDecorations = LineDecoration.filter(lineRenderingData.inlineDecorations, viewLineNumber, lineRenderingData.minColumn, lineRenderingData.maxColumn);
        }
        catch (err) {
            actualInlineDecorations = [];
        }
        const lineHeight = this._lineHeight;
        const renderLineInput = new RenderLineInput(true, true, lineRenderingData.content, lineRenderingData.continuesWithWrappedLine, lineRenderingData.isBasicASCII, lineRenderingData.containsRTL, 0, lineRenderingData.tokens, actualInlineDecorations, lineRenderingData.tabSize, lineRenderingData.startVisibleColumn, 1, 1, 1, 500, 'none', true, true, null);
        const sb = new StringBuilder(2000);
        const renderOutput = renderViewLine(renderLineInput, sb);
        let newLine;
        if (_ttPolicy) {
            newLine = _ttPolicy.createHTML(sb.build());
        }
        else {
            newLine = sb.build();
        }
        const lineHTMLNode = document.createElement('span');
        lineHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineHTMLNode.setAttribute(STICKY_IS_LINE_ATTR, '');
        lineHTMLNode.setAttribute('role', 'listitem');
        lineHTMLNode.tabIndex = 0;
        lineHTMLNode.className = 'sticky-line-content';
        lineHTMLNode.classList.add(`stickyLine${line}`);
        lineHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineHTMLNode.innerHTML = newLine;
        const lineNumberHTMLNode = document.createElement('span');
        lineNumberHTMLNode.setAttribute(STICKY_INDEX_ATTR, String(index));
        lineNumberHTMLNode.setAttribute(STICKY_IS_LINE_NUMBER_ATTR, '');
        lineNumberHTMLNode.className = 'sticky-line-number';
        lineNumberHTMLNode.style.lineHeight = `${lineHeight}px`;
        const lineNumbersWidth = layoutInfo.contentLeft;
        lineNumberHTMLNode.style.width = `${lineNumbersWidth}px`;
        const innerLineNumberHTML = document.createElement('span');
        if (lineNumberOption.renderType === 1 /* RenderLineNumbersType.On */ || lineNumberOption.renderType === 3 /* RenderLineNumbersType.Interval */ && line % 10 === 0) {
            innerLineNumberHTML.innerText = line.toString();
        }
        else if (lineNumberOption.renderType === 2 /* RenderLineNumbersType.Relative */) {
            innerLineNumberHTML.innerText = Math.abs(line - this._editor.getPosition().lineNumber).toString();
        }
        innerLineNumberHTML.className = 'sticky-line-number-inner';
        innerLineNumberHTML.style.width = `${layoutInfo.lineNumbersWidth}px`;
        innerLineNumberHTML.style.paddingLeft = `${layoutInfo.lineNumbersLeft}px`;
        lineNumberHTMLNode.appendChild(innerLineNumberHTML);
        const foldingIcon = this._renderFoldingIconForLine(foldingModel, line);
        if (foldingIcon) {
            lineNumberHTMLNode.appendChild(foldingIcon.domNode);
            foldingIcon.domNode.style.left = `${layoutInfo.lineNumbersWidth + layoutInfo.lineNumbersLeft}px`;
        }
        this._editor.applyFontInfo(lineHTMLNode);
        this._editor.applyFontInfo(lineNumberHTMLNode);
        lineNumberHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineHTMLNode.style.lineHeight = `${lineHeight}px`;
        lineNumberHTMLNode.style.height = `${lineHeight}px`;
        lineHTMLNode.style.height = `${lineHeight}px`;
        const renderedLine = new RenderedStickyLine(index, line, lineHTMLNode, lineNumberHTMLNode, foldingIcon, renderOutput.characterMapping, lineHTMLNode.scrollWidth, lineHeight);
        return this._updatePosition(renderedLine);
    }
    _updatePosition(stickyLine) {
        const index = stickyLine.index;
        const lineHTMLNode = stickyLine.lineDomNode;
        const lineNumberHTMLNode = stickyLine.lineNumberDomNode;
        const isLastLine = index === this._lineNumbers.length - 1;
        if (isLastLine) {
            const zIndex = '0';
            lineHTMLNode.style.zIndex = zIndex;
            lineNumberHTMLNode.style.zIndex = zIndex;
            const top = `${index * this._lineHeight + this._lastLineRelativePosition + (stickyLine.foldingIcon?.isCollapsed ? 1 : 0)}px`;
            lineHTMLNode.style.top = top;
            lineNumberHTMLNode.style.top = top;
        }
        else {
            const zIndex = '1';
            lineHTMLNode.style.zIndex = zIndex;
            lineNumberHTMLNode.style.zIndex = zIndex;
            const top = `${index * this._lineHeight}px`;
            lineHTMLNode.style.top = top;
            lineNumberHTMLNode.style.top = top;
        }
        return stickyLine;
    }
    _renderFoldingIconForLine(foldingModel, line) {
        const showFoldingControls = this._editor.getOption(115 /* EditorOption.showFoldingControls */);
        if (!foldingModel || showFoldingControls === 'never') {
            return;
        }
        const foldingRegions = foldingModel.regions;
        const indexOfFoldingRegion = foldingRegions.findRange(line);
        const startLineNumber = foldingRegions.getStartLineNumber(indexOfFoldingRegion);
        const isFoldingScope = line === startLineNumber;
        if (!isFoldingScope) {
            return;
        }
        const isCollapsed = foldingRegions.isCollapsed(indexOfFoldingRegion);
        const foldingIcon = new StickyFoldingIcon(isCollapsed, startLineNumber, foldingRegions.getEndLineNumber(indexOfFoldingRegion), this._lineHeight);
        foldingIcon.setVisible(this._isOnGlyphMargin ? true : (isCollapsed || showFoldingControls === 'always'));
        foldingIcon.domNode.setAttribute(STICKY_IS_FOLDING_ICON_ATTR, '');
        return foldingIcon;
    }
    getId() {
        return 'editor.contrib.stickyScrollWidget';
    }
    getDomNode() {
        return this._rootDomNode;
    }
    getPosition() {
        return {
            preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */,
            stackOridinal: 10,
        };
    }
    getMinContentWidthInPx() {
        return this._minContentWidthInPx;
    }
    focusLineWithIndex(index) {
        if (0 <= index && index < this._renderedStickyLines.length) {
            this._renderedStickyLines[index].lineDomNode.focus();
        }
    }
    /**
     * Given a leaf dom node, tries to find the editor position.
     */
    getEditorPositionFromNode(spanDomNode) {
        if (!spanDomNode || spanDomNode.children.length > 0) {
            // This is not a leaf node
            return null;
        }
        const renderedStickyLine = this._getRenderedStickyLineFromChildDomNode(spanDomNode);
        if (!renderedStickyLine) {
            return null;
        }
        const column = getColumnOfNodeOffset(renderedStickyLine.characterMapping, spanDomNode, 0);
        return new Position(renderedStickyLine.lineNumber, column);
    }
    getLineNumberFromChildDomNode(domNode) {
        return this._getRenderedStickyLineFromChildDomNode(domNode)?.lineNumber ?? null;
    }
    _getRenderedStickyLineFromChildDomNode(domNode) {
        const index = this.getLineIndexFromChildDomNode(domNode);
        if (index === null || index < 0 || index >= this._renderedStickyLines.length) {
            return null;
        }
        return this._renderedStickyLines[index];
    }
    /**
     * Given a child dom node, tries to find the line number attribute that was stored in the node.
     * @returns the attribute value or null if none is found.
     */
    getLineIndexFromChildDomNode(domNode) {
        const lineIndex = this._getAttributeValue(domNode, STICKY_INDEX_ATTR);
        return lineIndex ? parseInt(lineIndex, 10) : null;
    }
    /**
     * Given a child dom node, tries to find if it is (contained in) a sticky line.
     * @returns a boolean.
     */
    isInStickyLine(domNode) {
        const isInLine = this._getAttributeValue(domNode, STICKY_IS_LINE_ATTR);
        return isInLine !== undefined;
    }
    /**
     * Given a child dom node, tries to find if this dom node is (contained in) a sticky folding icon.
     * @returns a boolean.
     */
    isInFoldingIconDomNode(domNode) {
        const isInFoldingIcon = this._getAttributeValue(domNode, STICKY_IS_FOLDING_ICON_ATTR);
        return isInFoldingIcon !== undefined;
    }
    /**
     * Given the dom node, finds if it or its parent sequence contains the given attribute.
     * @returns the attribute value or undefined.
     */
    _getAttributeValue(domNode, attribute) {
        while (domNode && domNode !== this._rootDomNode) {
            const line = domNode.getAttribute(attribute);
            if (line !== null) {
                return line;
            }
            domNode = domNode.parentElement;
        }
        return;
    }
}
class RenderedStickyLine {
    constructor(index, lineNumber, lineDomNode, lineNumberDomNode, foldingIcon, characterMapping, scrollWidth, height) {
        this.index = index;
        this.lineNumber = lineNumber;
        this.lineDomNode = lineDomNode;
        this.lineNumberDomNode = lineNumberDomNode;
        this.foldingIcon = foldingIcon;
        this.characterMapping = characterMapping;
        this.scrollWidth = scrollWidth;
        this.height = height;
    }
}
class StickyFoldingIcon {
    constructor(isCollapsed, foldingStartLine, foldingEndLine, dimension) {
        this.isCollapsed = isCollapsed;
        this.foldingStartLine = foldingStartLine;
        this.foldingEndLine = foldingEndLine;
        this.dimension = dimension;
        this.domNode = document.createElement('div');
        this.domNode.style.width = `26px`;
        this.domNode.style.height = `${dimension}px`;
        this.domNode.style.lineHeight = `${dimension}px`;
        this.domNode.className = ThemeIcon.asClassName(isCollapsed ? foldingCollapsedIcon : foldingExpandedIcon);
    }
    setVisible(visible) {
        this.domNode.style.cursor = visible ? 'pointer' : 'default';
        this.domNode.style.opacity = visible ? '1' : '0';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3N0aWNreVNjcm9sbFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLG9CQUFvQixDQUFDO0FBRTVCLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBb0IsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLFlBQ1UsZ0JBQTBCLEVBQzFC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