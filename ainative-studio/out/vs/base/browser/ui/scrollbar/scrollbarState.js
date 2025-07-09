/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * The minimal size of the slider (such that it can still be clickable) -- it is artificially enlarged.
 */
const MINIMUM_SLIDER_SIZE = 20;
export class ScrollbarState {
    constructor(arrowSize, scrollbarSize, oppositeScrollbarSize, visibleSize, scrollSize, scrollPosition) {
        this._scrollbarSize = Math.round(scrollbarSize);
        this._oppositeScrollbarSize = Math.round(oppositeScrollbarSize);
        this._arrowSize = Math.round(arrowSize);
        this._visibleSize = visibleSize;
        this._scrollSize = scrollSize;
        this._scrollPosition = scrollPosition;
        this._computedAvailableSize = 0;
        this._computedIsNeeded = false;
        this._computedSliderSize = 0;
        this._computedSliderRatio = 0;
        this._computedSliderPosition = 0;
        this._refreshComputedValues();
    }
    clone() {
        return new ScrollbarState(this._arrowSize, this._scrollbarSize, this._oppositeScrollbarSize, this._visibleSize, this._scrollSize, this._scrollPosition);
    }
    setVisibleSize(visibleSize) {
        const iVisibleSize = Math.round(visibleSize);
        if (this._visibleSize !== iVisibleSize) {
            this._visibleSize = iVisibleSize;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollSize(scrollSize) {
        const iScrollSize = Math.round(scrollSize);
        if (this._scrollSize !== iScrollSize) {
            this._scrollSize = iScrollSize;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollPosition(scrollPosition) {
        const iScrollPosition = Math.round(scrollPosition);
        if (this._scrollPosition !== iScrollPosition) {
            this._scrollPosition = iScrollPosition;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollbarSize(scrollbarSize) {
        this._scrollbarSize = Math.round(scrollbarSize);
    }
    setOppositeScrollbarSize(oppositeScrollbarSize) {
        this._oppositeScrollbarSize = Math.round(oppositeScrollbarSize);
    }
    static _computeValues(oppositeScrollbarSize, arrowSize, visibleSize, scrollSize, scrollPosition) {
        const computedAvailableSize = Math.max(0, visibleSize - oppositeScrollbarSize);
        const computedRepresentableSize = Math.max(0, computedAvailableSize - 2 * arrowSize);
        const computedIsNeeded = (scrollSize > 0 && scrollSize > visibleSize);
        if (!computedIsNeeded) {
            // There is no need for a slider
            return {
                computedAvailableSize: Math.round(computedAvailableSize),
                computedIsNeeded: computedIsNeeded,
                computedSliderSize: Math.round(computedRepresentableSize),
                computedSliderRatio: 0,
                computedSliderPosition: 0,
            };
        }
        // We must artificially increase the size of the slider if needed, since the slider would be too small to grab with the mouse otherwise
        const computedSliderSize = Math.round(Math.max(MINIMUM_SLIDER_SIZE, Math.floor(visibleSize * computedRepresentableSize / scrollSize)));
        // The slider can move from 0 to `computedRepresentableSize` - `computedSliderSize`
        // in the same way `scrollPosition` can move from 0 to `scrollSize` - `visibleSize`.
        const computedSliderRatio = (computedRepresentableSize - computedSliderSize) / (scrollSize - visibleSize);
        const computedSliderPosition = (scrollPosition * computedSliderRatio);
        return {
            computedAvailableSize: Math.round(computedAvailableSize),
            computedIsNeeded: computedIsNeeded,
            computedSliderSize: Math.round(computedSliderSize),
            computedSliderRatio: computedSliderRatio,
            computedSliderPosition: Math.round(computedSliderPosition),
        };
    }
    _refreshComputedValues() {
        const r = ScrollbarState._computeValues(this._oppositeScrollbarSize, this._arrowSize, this._visibleSize, this._scrollSize, this._scrollPosition);
        this._computedAvailableSize = r.computedAvailableSize;
        this._computedIsNeeded = r.computedIsNeeded;
        this._computedSliderSize = r.computedSliderSize;
        this._computedSliderRatio = r.computedSliderRatio;
        this._computedSliderPosition = r.computedSliderPosition;
    }
    getArrowSize() {
        return this._arrowSize;
    }
    getScrollPosition() {
        return this._scrollPosition;
    }
    getRectangleLargeSize() {
        return this._computedAvailableSize;
    }
    getRectangleSmallSize() {
        return this._scrollbarSize;
    }
    isNeeded() {
        return this._computedIsNeeded;
    }
    getSliderSize() {
        return this._computedSliderSize;
    }
    getSliderPosition() {
        return this._computedSliderPosition;
    }
    /**
     * Compute a desired `scrollPosition` such that `offset` ends up in the center of the slider.
     * `offset` is based on the same coordinate system as the `sliderPosition`.
     */
    getDesiredScrollPositionFromOffset(offset) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const desiredSliderPosition = offset - this._arrowSize - this._computedSliderSize / 2;
        return Math.round(desiredSliderPosition / this._computedSliderRatio);
    }
    /**
     * Compute a desired `scrollPosition` from if offset is before or after the slider position.
     * If offset is before slider, treat as a page up (or left).  If after, page down (or right).
     * `offset` and `_computedSliderPosition` are based on the same coordinate system.
     * `_visibleSize` corresponds to a "page" of lines in the returned coordinate system.
     */
    getDesiredScrollPositionFromOffsetPaged(offset) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const correctedOffset = offset - this._arrowSize; // compensate if has arrows
        let desiredScrollPosition = this._scrollPosition;
        if (correctedOffset < this._computedSliderPosition) {
            desiredScrollPosition -= this._visibleSize; // page up/left
        }
        else {
            desiredScrollPosition += this._visibleSize; // page down/right
        }
        return desiredScrollPosition;
    }
    /**
     * Compute a desired `scrollPosition` such that the slider moves by `delta`.
     */
    getDesiredScrollPositionFromDelta(delta) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const desiredSliderPosition = this._computedSliderPosition + delta;
        return Math.round(desiredSliderPosition / this._computedSliderRatio);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYmFyU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Njcm9sbGJhci9zY3JvbGxiYXJTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7R0FFRztBQUNILE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0FBRS9CLE1BQU0sT0FBTyxjQUFjO0lBc0QxQixZQUFZLFNBQWlCLEVBQUUsYUFBcUIsRUFBRSxxQkFBNkIsRUFBRSxXQUFtQixFQUFFLFVBQWtCLEVBQUUsY0FBc0I7UUFDbkosSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhDLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBRXRDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztRQUMvQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRU0sS0FBSztRQUNY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