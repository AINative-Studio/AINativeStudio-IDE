/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
export var ScrollbarVisibility;
(function (ScrollbarVisibility) {
    ScrollbarVisibility[ScrollbarVisibility["Auto"] = 1] = "Auto";
    ScrollbarVisibility[ScrollbarVisibility["Hidden"] = 2] = "Hidden";
    ScrollbarVisibility[ScrollbarVisibility["Visible"] = 3] = "Visible";
})(ScrollbarVisibility || (ScrollbarVisibility = {}));
export class ScrollState {
    constructor(_forceIntegerValues, width, scrollWidth, scrollLeft, height, scrollHeight, scrollTop) {
        this._forceIntegerValues = _forceIntegerValues;
        this._scrollStateBrand = undefined;
        if (this._forceIntegerValues) {
            width = width | 0;
            scrollWidth = scrollWidth | 0;
            scrollLeft = scrollLeft | 0;
            height = height | 0;
            scrollHeight = scrollHeight | 0;
            scrollTop = scrollTop | 0;
        }
        this.rawScrollLeft = scrollLeft; // before validation
        this.rawScrollTop = scrollTop; // before validation
        if (width < 0) {
            width = 0;
        }
        if (scrollLeft + width > scrollWidth) {
            scrollLeft = scrollWidth - width;
        }
        if (scrollLeft < 0) {
            scrollLeft = 0;
        }
        if (height < 0) {
            height = 0;
        }
        if (scrollTop + height > scrollHeight) {
            scrollTop = scrollHeight - height;
        }
        if (scrollTop < 0) {
            scrollTop = 0;
        }
        this.width = width;
        this.scrollWidth = scrollWidth;
        this.scrollLeft = scrollLeft;
        this.height = height;
        this.scrollHeight = scrollHeight;
        this.scrollTop = scrollTop;
    }
    equals(other) {
        return (this.rawScrollLeft === other.rawScrollLeft
            && this.rawScrollTop === other.rawScrollTop
            && this.width === other.width
            && this.scrollWidth === other.scrollWidth
            && this.scrollLeft === other.scrollLeft
            && this.height === other.height
            && this.scrollHeight === other.scrollHeight
            && this.scrollTop === other.scrollTop);
    }
    withScrollDimensions(update, useRawScrollPositions) {
        return new ScrollState(this._forceIntegerValues, (typeof update.width !== 'undefined' ? update.width : this.width), (typeof update.scrollWidth !== 'undefined' ? update.scrollWidth : this.scrollWidth), useRawScrollPositions ? this.rawScrollLeft : this.scrollLeft, (typeof update.height !== 'undefined' ? update.height : this.height), (typeof update.scrollHeight !== 'undefined' ? update.scrollHeight : this.scrollHeight), useRawScrollPositions ? this.rawScrollTop : this.scrollTop);
    }
    withScrollPosition(update) {
        return new ScrollState(this._forceIntegerValues, this.width, this.scrollWidth, (typeof update.scrollLeft !== 'undefined' ? update.scrollLeft : this.rawScrollLeft), this.height, this.scrollHeight, (typeof update.scrollTop !== 'undefined' ? update.scrollTop : this.rawScrollTop));
    }
    createScrollEvent(previous, inSmoothScrolling) {
        const widthChanged = (this.width !== previous.width);
        const scrollWidthChanged = (this.scrollWidth !== previous.scrollWidth);
        const scrollLeftChanged = (this.scrollLeft !== previous.scrollLeft);
        const heightChanged = (this.height !== previous.height);
        const scrollHeightChanged = (this.scrollHeight !== previous.scrollHeight);
        const scrollTopChanged = (this.scrollTop !== previous.scrollTop);
        return {
            inSmoothScrolling: inSmoothScrolling,
            oldWidth: previous.width,
            oldScrollWidth: previous.scrollWidth,
            oldScrollLeft: previous.scrollLeft,
            width: this.width,
            scrollWidth: this.scrollWidth,
            scrollLeft: this.scrollLeft,
            oldHeight: previous.height,
            oldScrollHeight: previous.scrollHeight,
            oldScrollTop: previous.scrollTop,
            height: this.height,
            scrollHeight: this.scrollHeight,
            scrollTop: this.scrollTop,
            widthChanged: widthChanged,
            scrollWidthChanged: scrollWidthChanged,
            scrollLeftChanged: scrollLeftChanged,
            heightChanged: heightChanged,
            scrollHeightChanged: scrollHeightChanged,
            scrollTopChanged: scrollTopChanged,
        };
    }
}
export class Scrollable extends Disposable {
    constructor(options) {
        super();
        this._scrollableBrand = undefined;
        this._onScroll = this._register(new Emitter());
        this.onScroll = this._onScroll.event;
        this._smoothScrollDuration = options.smoothScrollDuration;
        this._scheduleAtNextAnimationFrame = options.scheduleAtNextAnimationFrame;
        this._state = new ScrollState(options.forceIntegerValues, 0, 0, 0, 0, 0, 0);
        this._smoothScrolling = null;
    }
    dispose() {
        if (this._smoothScrolling) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
        }
        super.dispose();
    }
    setSmoothScrollDuration(smoothScrollDuration) {
        this._smoothScrollDuration = smoothScrollDuration;
    }
    validateScrollPosition(scrollPosition) {
        return this._state.withScrollPosition(scrollPosition);
    }
    getScrollDimensions() {
        return this._state;
    }
    setScrollDimensions(dimensions, useRawScrollPositions) {
        const newState = this._state.withScrollDimensions(dimensions, useRawScrollPositions);
        this._setState(newState, Boolean(this._smoothScrolling));
        // Validate outstanding animated scroll position target
        this._smoothScrolling?.acceptScrollDimensions(this._state);
    }
    /**
     * Returns the final scroll position that the instance will have once the smooth scroll animation concludes.
     * If no scroll animation is occurring, it will return the current scroll position instead.
     */
    getFutureScrollPosition() {
        if (this._smoothScrolling) {
            return this._smoothScrolling.to;
        }
        return this._state;
    }
    /**
     * Returns the current scroll position.
     * Note: This result might be an intermediate scroll position, as there might be an ongoing smooth scroll animation.
     */
    getCurrentScrollPosition() {
        return this._state;
    }
    setScrollPositionNow(update) {
        // no smooth scrolling requested
        const newState = this._state.withScrollPosition(update);
        // Terminate any outstanding smooth scrolling
        if (this._smoothScrolling) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
        }
        this._setState(newState, false);
    }
    setScrollPositionSmooth(update, reuseAnimation) {
        if (this._smoothScrollDuration === 0) {
            // Smooth scrolling not supported.
            return this.setScrollPositionNow(update);
        }
        if (this._smoothScrolling) {
            // Combine our pending scrollLeft/scrollTop with incoming scrollLeft/scrollTop
            update = {
                scrollLeft: (typeof update.scrollLeft === 'undefined' ? this._smoothScrolling.to.scrollLeft : update.scrollLeft),
                scrollTop: (typeof update.scrollTop === 'undefined' ? this._smoothScrolling.to.scrollTop : update.scrollTop)
            };
            // Validate `update`
            const validTarget = this._state.withScrollPosition(update);
            if (this._smoothScrolling.to.scrollLeft === validTarget.scrollLeft && this._smoothScrolling.to.scrollTop === validTarget.scrollTop) {
                // No need to interrupt or extend the current animation since we're going to the same place
                return;
            }
            let newSmoothScrolling;
            if (reuseAnimation) {
                newSmoothScrolling = new SmoothScrollingOperation(this._smoothScrolling.from, validTarget, this._smoothScrolling.startTime, this._smoothScrolling.duration);
            }
            else {
                newSmoothScrolling = this._smoothScrolling.combine(this._state, validTarget, this._smoothScrollDuration);
            }
            this._smoothScrolling.dispose();
            this._smoothScrolling = newSmoothScrolling;
        }
        else {
            // Validate `update`
            const validTarget = this._state.withScrollPosition(update);
            this._smoothScrolling = SmoothScrollingOperation.start(this._state, validTarget, this._smoothScrollDuration);
        }
        // Begin smooth scrolling animation
        this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
            if (!this._smoothScrolling) {
                return;
            }
            this._smoothScrolling.animationFrameDisposable = null;
            this._performSmoothScrolling();
        });
    }
    hasPendingScrollAnimation() {
        return Boolean(this._smoothScrolling);
    }
    _performSmoothScrolling() {
        if (!this._smoothScrolling) {
            return;
        }
        const update = this._smoothScrolling.tick();
        const newState = this._state.withScrollPosition(update);
        this._setState(newState, true);
        if (!this._smoothScrolling) {
            // Looks like someone canceled the smooth scrolling
            // from the scroll event handler
            return;
        }
        if (update.isDone) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
            return;
        }
        // Continue smooth scrolling animation
        this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
            if (!this._smoothScrolling) {
                return;
            }
            this._smoothScrolling.animationFrameDisposable = null;
            this._performSmoothScrolling();
        });
    }
    _setState(newState, inSmoothScrolling) {
        const oldState = this._state;
        if (oldState.equals(newState)) {
            // no change
            return;
        }
        this._state = newState;
        this._onScroll.fire(this._state.createScrollEvent(oldState, inSmoothScrolling));
    }
}
export class SmoothScrollingUpdate {
    constructor(scrollLeft, scrollTop, isDone) {
        this.scrollLeft = scrollLeft;
        this.scrollTop = scrollTop;
        this.isDone = isDone;
    }
}
function createEaseOutCubic(from, to) {
    const delta = to - from;
    return function (completion) {
        return from + delta * easeOutCubic(completion);
    };
}
function createComposed(a, b, cut) {
    return function (completion) {
        if (completion < cut) {
            return a(completion / cut);
        }
        return b((completion - cut) / (1 - cut));
    };
}
export class SmoothScrollingOperation {
    constructor(from, to, startTime, duration) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.startTime = startTime;
        this.animationFrameDisposable = null;
        this._initAnimations();
    }
    _initAnimations() {
        this.scrollLeft = this._initAnimation(this.from.scrollLeft, this.to.scrollLeft, this.to.width);
        this.scrollTop = this._initAnimation(this.from.scrollTop, this.to.scrollTop, this.to.height);
    }
    _initAnimation(from, to, viewportSize) {
        const delta = Math.abs(from - to);
        if (delta > 2.5 * viewportSize) {
            let stop1, stop2;
            if (from < to) {
                // scroll to 75% of the viewportSize
                stop1 = from + 0.75 * viewportSize;
                stop2 = to - 0.75 * viewportSize;
            }
            else {
                stop1 = from - 0.75 * viewportSize;
                stop2 = to + 0.75 * viewportSize;
            }
            return createComposed(createEaseOutCubic(from, stop1), createEaseOutCubic(stop2, to), 0.33);
        }
        return createEaseOutCubic(from, to);
    }
    dispose() {
        if (this.animationFrameDisposable !== null) {
            this.animationFrameDisposable.dispose();
            this.animationFrameDisposable = null;
        }
    }
    acceptScrollDimensions(state) {
        this.to = state.withScrollPosition(this.to);
        this._initAnimations();
    }
    tick() {
        return this._tick(Date.now());
    }
    _tick(now) {
        const completion = (now - this.startTime) / this.duration;
        if (completion < 1) {
            const newScrollLeft = this.scrollLeft(completion);
            const newScrollTop = this.scrollTop(completion);
            return new SmoothScrollingUpdate(newScrollLeft, newScrollTop, false);
        }
        return new SmoothScrollingUpdate(this.to.scrollLeft, this.to.scrollTop, true);
    }
    combine(from, to, duration) {
        return SmoothScrollingOperation.start(from, to, duration);
    }
    static start(from, to, duration) {
        // +10 / -10 : pretend the animation already started for a quicker response to a scroll request
        duration = duration + 10;
        const startTime = Date.now() - 10;
        return new SmoothScrollingOperation(from, to, startTime, duration);
    }
}
function easeInCubic(t) {
    return Math.pow(t, 3);
}
function easeOutCubic(t) {
    return 1 - easeInCubic(1 - t);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9zY3JvbGxhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxZQUFZLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLGdCQUFnQixDQUFDO0FBRXpELE1BQU0sQ0FBTixJQUFrQixtQkFJakI7QUFKRCxXQUFrQixtQkFBbUI7SUFDcEMsNkRBQVEsQ0FBQTtJQUNSLGlFQUFVLENBQUE7SUFDVixtRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUppQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBSXBDO0FBOEJELE1BQU0sT0FBTyxXQUFXO0lBYXZCLFlBQ2tCLG1CQUE0QixFQUM3QyxLQUFhLEVBQ2IsV0FBbUIsRUFDbkIsVUFBa0IsRUFDbEIsTUFBYyxFQUNkLFlBQW9CLEVBQ3BCLFNBQWlCO1FBTkEsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFTO1FBYjlDLHNCQUFpQixHQUFTLFNBQVMsQ0FBQztRQXFCbkMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNsQixXQUFXLEdBQUcsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUM5QixVQUFVLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUM1QixNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNwQixZQUFZLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNoQyxTQUFTLEdBQUcsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQyxvQkFBb0I7UUFD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