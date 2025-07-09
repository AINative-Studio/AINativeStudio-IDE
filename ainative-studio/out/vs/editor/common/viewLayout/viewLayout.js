/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Scrollable } from '../../../base/common/scrollable.js';
import { LinesLayout } from './linesLayout.js';
import { Viewport } from '../viewModel.js';
import { ContentSizeChangedEvent } from '../viewModelEventDispatcher.js';
const SMOOTH_SCROLLING_TIME = 125;
class EditorScrollDimensions {
    constructor(width, contentWidth, height, contentHeight) {
        width = width | 0;
        contentWidth = contentWidth | 0;
        height = height | 0;
        contentHeight = contentHeight | 0;
        if (width < 0) {
            width = 0;
        }
        if (contentWidth < 0) {
            contentWidth = 0;
        }
        if (height < 0) {
            height = 0;
        }
        if (contentHeight < 0) {
            contentHeight = 0;
        }
        this.width = width;
        this.contentWidth = contentWidth;
        this.scrollWidth = Math.max(width, contentWidth);
        this.height = height;
        this.contentHeight = contentHeight;
        this.scrollHeight = Math.max(height, contentHeight);
    }
    equals(other) {
        return (this.width === other.width
            && this.contentWidth === other.contentWidth
            && this.height === other.height
            && this.contentHeight === other.contentHeight);
    }
}
class EditorScrollable extends Disposable {
    constructor(smoothScrollDuration, scheduleAtNextAnimationFrame) {
        super();
        this._onDidContentSizeChange = this._register(new Emitter());
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._dimensions = new EditorScrollDimensions(0, 0, 0, 0);
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration,
            scheduleAtNextAnimationFrame
        }));
        this.onDidScroll = this._scrollable.onScroll;
    }
    getScrollable() {
        return this._scrollable;
    }
    setSmoothScrollDuration(smoothScrollDuration) {
        this._scrollable.setSmoothScrollDuration(smoothScrollDuration);
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    getScrollDimensions() {
        return this._dimensions;
    }
    setScrollDimensions(dimensions) {
        if (this._dimensions.equals(dimensions)) {
            return;
        }
        const oldDimensions = this._dimensions;
        this._dimensions = dimensions;
        this._scrollable.setScrollDimensions({
            width: dimensions.width,
            scrollWidth: dimensions.scrollWidth,
            height: dimensions.height,
            scrollHeight: dimensions.scrollHeight
        }, true);
        const contentWidthChanged = (oldDimensions.contentWidth !== dimensions.contentWidth);
        const contentHeightChanged = (oldDimensions.contentHeight !== dimensions.contentHeight);
        if (contentWidthChanged || contentHeightChanged) {
            this._onDidContentSizeChange.fire(new ContentSizeChangedEvent(oldDimensions.contentWidth, oldDimensions.contentHeight, dimensions.contentWidth, dimensions.contentHeight));
        }
    }
    getFutureScrollPosition() {
        return this._scrollable.getFutureScrollPosition();
    }
    getCurrentScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    setScrollPositionNow(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    setScrollPositionSmooth(update) {
        this._scrollable.setScrollPositionSmooth(update);
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
}
export class ViewLayout extends Disposable {
    constructor(configuration, lineCount, scheduleAtNextAnimationFrame) {
        super();
        this._configuration = configuration;
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const padding = options.get(88 /* EditorOption.padding */);
        this._linesLayout = new LinesLayout(lineCount, options.get(68 /* EditorOption.lineHeight */), padding.top, padding.bottom);
        this._maxLineWidth = 0;
        this._overlayWidgetsMinWidth = 0;
        this._scrollable = this._register(new EditorScrollable(0, scheduleAtNextAnimationFrame));
        this._configureSmoothScrollDuration();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(layoutInfo.contentWidth, 0, layoutInfo.height, 0));
        this.onDidScroll = this._scrollable.onDidScroll;
        this.onDidContentSizeChange = this._scrollable.onDidContentSizeChange;
        this._updateHeight();
    }
    dispose() {
        super.dispose();
    }
    getScrollable() {
        return this._scrollable.getScrollable();
    }
    onHeightMaybeChanged() {
        this._updateHeight();
    }
    _configureSmoothScrollDuration() {
        this._scrollable.setSmoothScrollDuration(this._configuration.options.get(119 /* EditorOption.smoothScrolling */) ? SMOOTH_SCROLLING_TIME : 0);
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._configuration.options;
        if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
            this._linesLayout.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
        }
        if (e.hasChanged(88 /* EditorOption.padding */)) {
            const padding = options.get(88 /* EditorOption.padding */);
            this._linesLayout.setPadding(padding.top, padding.bottom);
        }
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
            const width = layoutInfo.contentWidth;
            const height = layoutInfo.height;
            const scrollDimensions = this._scrollable.getScrollDimensions();
            const contentWidth = scrollDimensions.contentWidth;
            this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
        }
        else {
            this._updateHeight();
        }
        if (e.hasChanged(119 /* EditorOption.smoothScrolling */)) {
            this._configureSmoothScrollDuration();
        }
    }
    onFlushed(lineCount) {
        this._linesLayout.onFlushed(lineCount);
    }
    onLinesDeleted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesDeleted(fromLineNumber, toLineNumber);
    }
    onLinesInserted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesInserted(fromLineNumber, toLineNumber);
    }
    // ---- end view event handlers
    _getHorizontalScrollbarHeight(width, scrollWidth) {
        const options = this._configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        if (scrollbar.horizontal === 2 /* ScrollbarVisibility.Hidden */) {
            // horizontal scrollbar not visible
            return 0;
        }
        if (width >= scrollWidth) {
            // horizontal scrollbar not visible
            return 0;
        }
        return scrollbar.horizontalScrollbarSize;
    }
    _getContentHeight(width, height, contentWidth) {
        const options = this._configuration.options;
        let result = this._linesLayout.getLinesTotalHeight();
        if (options.get(110 /* EditorOption.scrollBeyondLastLine */)) {
            result += Math.max(0, height - options.get(68 /* EditorOption.lineHeight */) - options.get(88 /* EditorOption.padding */).bottom);
        }
        else if (!options.get(108 /* EditorOption.scrollbar */).ignoreHorizontalScrollbarInContentHeight) {
            result += this._getHorizontalScrollbarHeight(width, contentWidth);
        }
        return result;
    }
    _updateHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const width = scrollDimensions.width;
        const height = scrollDimensions.height;
        const contentWidth = scrollDimensions.contentWidth;
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
    }
    // ---- Layouting logic
    getCurrentViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    getFutureViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    _computeContentWidth() {
        const options = this._configuration.options;
        const maxLineWidth = this._maxLineWidth;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        if (wrappingInfo.isViewportWrapping) {
            const minimap = options.get(74 /* EditorOption.minimap */);
            if (maxLineWidth > layoutInfo.contentWidth + fontInfo.typicalHalfwidthCharacterWidth) {
                // This is a case where viewport wrapping is on, but the line extends above the viewport
                if (minimap.enabled && minimap.side === 'right') {
                    // We need to accomodate the scrollbar width
                    return maxLineWidth + layoutInfo.verticalScrollbarWidth;
                }
            }
            return maxLineWidth;
        }
        else {
            const extraHorizontalSpace = options.get(109 /* EditorOption.scrollBeyondLastColumn */) * fontInfo.typicalHalfwidthCharacterWidth;
            const whitespaceMinWidth = this._linesLayout.getWhitespaceMinWidth();
            return Math.max(maxLineWidth + extraHorizontalSpace + layoutInfo.verticalScrollbarWidth, whitespaceMinWidth, this._overlayWidgetsMinWidth);
        }
    }
    setMaxLineWidth(maxLineWidth) {
        this._maxLineWidth = maxLineWidth;
        this._updateContentWidth();
    }
    setOverlayWidgetsMinWidth(maxMinWidth) {
        this._overlayWidgetsMinWidth = maxMinWidth;
        this._updateContentWidth();
    }
    _updateContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(scrollDimensions.width, this._computeContentWidth(), scrollDimensions.height, scrollDimensions.contentHeight));
        // The height might depend on the fact that there is a horizontal scrollbar or not
        this._updateHeight();
    }
    // ---- view state
    saveState() {
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        const scrollTop = currentScrollPosition.scrollTop;
        const firstLineNumberInViewport = this._linesLayout.getLineNumberAtOrAfterVerticalOffset(scrollTop);
        const whitespaceAboveFirstLine = this._linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(firstLineNumberInViewport);
        return {
            scrollTop: scrollTop,
            scrollTopWithoutViewZones: scrollTop - whitespaceAboveFirstLine,
            scrollLeft: currentScrollPosition.scrollLeft
        };
    }
    // ----
    changeWhitespace(callback) {
        const hadAChange = this._linesLayout.changeWhitespace(callback);
        if (hadAChange) {
            this.onHeightMaybeChanged();
        }
        return hadAChange;
    }
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetForLineNumber(lineNumber, includeViewZones);
    }
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones);
    }
    isAfterLines(verticalOffset) {
        return this._linesLayout.isAfterLines(verticalOffset);
    }
    isInTopPadding(verticalOffset) {
        return this._linesLayout.isInTopPadding(verticalOffset);
    }
    isInBottomPadding(verticalOffset) {
        return this._linesLayout.isInBottomPadding(verticalOffset);
    }
    getLineNumberAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getLineNumberAtOrAfterVerticalOffset(verticalOffset);
    }
    getWhitespaceAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getWhitespaceAtVerticalOffset(verticalOffset);
    }
    getLinesViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getLinesViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getLinesViewportDataAtScrollTop(scrollTop) {
        // do some minimal validations on scrollTop
        const scrollDimensions = this._scrollable.getScrollDimensions();
        if (scrollTop + scrollDimensions.height > scrollDimensions.scrollHeight) {
            scrollTop = scrollDimensions.scrollHeight - scrollDimensions.height;
        }
        if (scrollTop < 0) {
            scrollTop = 0;
        }
        return this._linesLayout.getLinesViewportData(scrollTop, scrollTop + scrollDimensions.height);
    }
    getWhitespaceViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getWhitespaceViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getWhitespaces() {
        return this._linesLayout.getWhitespaces();
    }
    // ----
    getContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentWidth;
    }
    getScrollWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollWidth;
    }
    getContentHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentHeight;
    }
    getScrollHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollHeight;
    }
    getCurrentScrollLeft() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollLeft;
    }
    getCurrentScrollTop() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollTop;
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    setScrollPosition(position, type) {
        if (type === 1 /* ScrollType.Immediate */) {
            this._scrollable.setScrollPositionNow(position);
        }
        else {
            this._scrollable.setScrollPositionSmooth(position);
        }
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
    deltaScrollNow(deltaScrollLeft, deltaScrollTop) {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        this._scrollable.setScrollPositionNow({
            scrollLeft: currentScrollPosition.scrollLeft + deltaScrollLeft,
            scrollTop: currentScrollPosition.scrollTop + deltaScrollTop
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheW91dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdMYXlvdXQvdmlld0xheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBZ0MsVUFBVSxFQUEyQyxNQUFNLG9DQUFvQyxDQUFDO0FBSXZJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQXlILFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2xLLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXpFLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBRWxDLE1BQU0sc0JBQXNCO0lBVTNCLFlBQ0MsS0FBYSxFQUNiLFlBQW9CLEVBQ3BCLE1BQWMsRUFDZCxhQUFxQjtRQUVyQixLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNsQixZQUFZLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUNoQyxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNwQixhQUFhLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUVsQyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBQ0QsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIs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