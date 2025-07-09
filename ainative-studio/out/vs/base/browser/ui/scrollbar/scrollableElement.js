/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getZoomFactor, isChrome } from '../../browser.js';
import * as dom from '../../dom.js';
import { createFastDomNode } from '../../fastDomNode.js';
import { StandardWheelEvent } from '../../mouseEvent.js';
import { HorizontalScrollbar } from './horizontalScrollbar.js';
import { VerticalScrollbar } from './verticalScrollbar.js';
import { Widget } from '../widget.js';
import { TimeoutTimer } from '../../../common/async.js';
import { Emitter } from '../../../common/event.js';
import { dispose } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import { Scrollable } from '../../../common/scrollable.js';
import './media/scrollbars.css';
const HIDE_TIMEOUT = 500;
const SCROLL_WHEEL_SENSITIVITY = 50;
const SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED = true;
class MouseWheelClassifierItem {
    constructor(timestamp, deltaX, deltaY) {
        this.timestamp = timestamp;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
        this.score = 0;
    }
}
export class MouseWheelClassifier {
    static { this.INSTANCE = new MouseWheelClassifier(); }
    constructor() {
        this._capacity = 5;
        this._memory = [];
        this._front = -1;
        this._rear = -1;
    }
    isPhysicalMouseWheel() {
        if (this._front === -1 && this._rear === -1) {
            // no elements
            return false;
        }
        // 0.5 * last + 0.25 * 2nd last + 0.125 * 3rd last + ...
        let remainingInfluence = 1;
        let score = 0;
        let iteration = 1;
        let index = this._rear;
        do {
            const influence = (index === this._front ? remainingInfluence : Math.pow(2, -iteration));
            remainingInfluence -= influence;
            score += this._memory[index].score * influence;
            if (index === this._front) {
                break;
            }
            index = (this._capacity + index - 1) % this._capacity;
            iteration++;
        } while (true);
        return (score <= 0.5);
    }
    acceptStandardWheelEvent(e) {
        if (isChrome) {
            const targetWindow = dom.getWindow(e.browserEvent);
            const pageZoomFactor = getZoomFactor(targetWindow);
            // On Chrome, the incoming delta events are multiplied with the OS zoom factor.
            // The OS zoom factor can be reverse engineered by using the device pixel ratio and the configured zoom factor into account.
            this.accept(Date.now(), e.deltaX * pageZoomFactor, e.deltaY * pageZoomFactor);
        }
        else {
            this.accept(Date.now(), e.deltaX, e.deltaY);
        }
    }
    accept(timestamp, deltaX, deltaY) {
        let previousItem = null;
        const item = new MouseWheelClassifierItem(timestamp, deltaX, deltaY);
        if (this._front === -1 && this._rear === -1) {
            this._memory[0] = item;
            this._front = 0;
            this._rear = 0;
        }
        else {
            previousItem = this._memory[this._rear];
            this._rear = (this._rear + 1) % this._capacity;
            if (this._rear === this._front) {
                // Drop oldest
                this._front = (this._front + 1) % this._capacity;
            }
            this._memory[this._rear] = item;
        }
        item.score = this._computeScore(item, previousItem);
    }
    /**
     * A score between 0 and 1 for `item`.
     *  - a score towards 0 indicates that the source appears to be a physical mouse wheel
     *  - a score towards 1 indicates that the source appears to be a touchpad or magic mouse, etc.
     */
    _computeScore(item, previousItem) {
        if (Math.abs(item.deltaX) > 0 && Math.abs(item.deltaY) > 0) {
            // both axes exercised => definitely not a physical mouse wheel
            return 1;
        }
        let score = 0.5;
        if (!this._isAlmostInt(item.deltaX) || !this._isAlmostInt(item.deltaY)) {
            // non-integer deltas => indicator that this is not a physical mouse wheel
            score += 0.25;
        }
        // Non-accelerating scroll => indicator that this is a physical mouse wheel
        // These can be identified by seeing whether they are the module of one another.
        if (previousItem) {
            const absDeltaX = Math.abs(item.deltaX);
            const absDeltaY = Math.abs(item.deltaY);
            const absPreviousDeltaX = Math.abs(previousItem.deltaX);
            const absPreviousDeltaY = Math.abs(previousItem.deltaY);
            // Min 1 to avoid division by zero, module 1 will still be 0.
            const minDeltaX = Math.max(Math.min(absDeltaX, absPreviousDeltaX), 1);
            const minDeltaY = Math.max(Math.min(absDeltaY, absPreviousDeltaY), 1);
            const maxDeltaX = Math.max(absDeltaX, absPreviousDeltaX);
            const maxDeltaY = Math.max(absDeltaY, absPreviousDeltaY);
            const isSameModulo = (maxDeltaX % minDeltaX === 0 && maxDeltaY % minDeltaY === 0);
            if (isSameModulo) {
                score -= 0.5;
            }
        }
        return Math.min(Math.max(score, 0), 1);
    }
    _isAlmostInt(value) {
        const delta = Math.abs(Math.round(value) - value);
        return (delta < 0.01);
    }
}
export class AbstractScrollableElement extends Widget {
    get options() {
        return this._options;
    }
    constructor(element, options, scrollable) {
        super();
        this._onScroll = this._register(new Emitter());
        this.onScroll = this._onScroll.event;
        this._onWillScroll = this._register(new Emitter());
        this.onWillScroll = this._onWillScroll.event;
        element.style.overflow = 'hidden';
        this._options = resolveOptions(options);
        this._scrollable = scrollable;
        this._register(this._scrollable.onScroll((e) => {
            this._onWillScroll.fire(e);
            this._onDidScroll(e);
            this._onScroll.fire(e);
        }));
        const scrollbarHost = {
            onMouseWheel: (mouseWheelEvent) => this._onMouseWheel(mouseWheelEvent),
            onDragStart: () => this._onDragStart(),
            onDragEnd: () => this._onDragEnd(),
        };
        this._verticalScrollbar = this._register(new VerticalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._horizontalScrollbar = this._register(new HorizontalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.style.position = 'relative';
        this._domNode.style.overflow = 'hidden';
        this._domNode.appendChild(element);
        this._domNode.appendChild(this._horizontalScrollbar.domNode.domNode);
        this._domNode.appendChild(this._verticalScrollbar.domNode.domNode);
        if (this._options.useShadows) {
            this._leftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._leftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._leftShadowDomNode.domNode);
            this._topShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topShadowDomNode.domNode);
            this._topLeftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topLeftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topLeftShadowDomNode.domNode);
        }
        else {
            this._leftShadowDomNode = null;
            this._topShadowDomNode = null;
            this._topLeftShadowDomNode = null;
        }
        this._listenOnDomNode = this._options.listenOnDomNode || this._domNode;
        this._mouseWheelToDispose = [];
        this._setListeningToMouseWheel(this._options.handleMouseWheel);
        this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e));
        this.onmouseleave(this._listenOnDomNode, (e) => this._onMouseLeave(e));
        this._hideTimeout = this._register(new TimeoutTimer());
        this._isDragging = false;
        this._mouseIsOver = false;
        this._shouldRender = true;
        this._revealOnScroll = true;
    }
    dispose() {
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        super.dispose();
    }
    /**
     * Get the generated 'scrollable' dom node
     */
    getDomNode() {
        return this._domNode;
    }
    getOverviewRulerLayoutInfo() {
        return {
            parent: this._domNode,
            insertBefore: this._verticalScrollbar.domNode.domNode,
        };
    }
    /**
     * Delegate a pointer down event to the vertical scrollbar.
     * This is to help with clicking somewhere else and having the scrollbar react.
     */
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._verticalScrollbar.delegatePointerDown(browserEvent);
    }
    getScrollDimensions() {
        return this._scrollable.getScrollDimensions();
    }
    setScrollDimensions(dimensions) {
        this._scrollable.setScrollDimensions(dimensions, false);
    }
    /**
     * Update the class name of the scrollable element.
     */
    updateClassName(newClassName) {
        this._options.className = newClassName;
        // Defaults are different on Macs
        if (platform.isMacintosh) {
            this._options.className += ' mac';
        }
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
    }
    /**
     * Update configuration options for the scrollbar.
     */
    updateOptions(newOptions) {
        if (typeof newOptions.handleMouseWheel !== 'undefined') {
            this._options.handleMouseWheel = newOptions.handleMouseWheel;
            this._setListeningToMouseWheel(this._options.handleMouseWheel);
        }
        if (typeof newOptions.mouseWheelScrollSensitivity !== 'undefined') {
            this._options.mouseWheelScrollSensitivity = newOptions.mouseWheelScrollSensitivity;
        }
        if (typeof newOptions.fastScrollSensitivity !== 'undefined') {
            this._options.fastScrollSensitivity = newOptions.fastScrollSensitivity;
        }
        if (typeof newOptions.scrollPredominantAxis !== 'undefined') {
            this._options.scrollPredominantAxis = newOptions.scrollPredominantAxis;
        }
        if (typeof newOptions.horizontal !== 'undefined') {
            this._options.horizontal = newOptions.horizontal;
        }
        if (typeof newOptions.vertical !== 'undefined') {
            this._options.vertical = newOptions.vertical;
        }
        if (typeof newOptions.horizontalScrollbarSize !== 'undefined') {
            this._options.horizontalScrollbarSize = newOptions.horizontalScrollbarSize;
        }
        if (typeof newOptions.verticalScrollbarSize !== 'undefined') {
            this._options.verticalScrollbarSize = newOptions.verticalScrollbarSize;
        }
        if (typeof newOptions.scrollByPage !== 'undefined') {
            this._options.scrollByPage = newOptions.scrollByPage;
        }
        this._horizontalScrollbar.updateOptions(this._options);
        this._verticalScrollbar.updateOptions(this._options);
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    setRevealOnScroll(value) {
        this._revealOnScroll = value;
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._onMouseWheel(new StandardWheelEvent(browserEvent));
    }
    // -------------------- mouse wheel scrolling --------------------
    _setListeningToMouseWheel(shouldListen) {
        const isListening = (this._mouseWheelToDispose.length > 0);
        if (isListening === shouldListen) {
            // No change
            return;
        }
        // Stop listening (if necessary)
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        // Start listening (if necessary)
        if (shouldListen) {
            const onMouseWheel = (browserEvent) => {
                this._onMouseWheel(new StandardWheelEvent(browserEvent));
            };
            this._mouseWheelToDispose.push(dom.addDisposableListener(this._listenOnDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { passive: false }));
        }
    }
    _onMouseWheel(e) {
        if (e.browserEvent?.defaultPrevented) {
            return;
        }
        const classifier = MouseWheelClassifier.INSTANCE;
        if (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED) {
            classifier.acceptStandardWheelEvent(e);
        }
        // useful for creating unit tests:
        // console.log(`${Date.now()}, ${e.deltaY}, ${e.deltaX}`);
        let didScroll = false;
        if (e.deltaY || e.deltaX) {
            let deltaY = e.deltaY * this._options.mouseWheelScrollSensitivity;
            let deltaX = e.deltaX * this._options.mouseWheelScrollSensitivity;
            if (this._options.scrollPredominantAxis) {
                if (this._options.scrollYToX && deltaX + deltaY === 0) {
                    // when configured to map Y to X and we both see
                    // no dominant axis and X and Y are competing with
                    // identical values into opposite directions, we
                    // ignore the delta as we cannot make a decision then
                    deltaX = deltaY = 0;
                }
                else if (Math.abs(deltaY) >= Math.abs(deltaX)) {
                    deltaX = 0;
                }
                else {
                    deltaY = 0;
                }
            }
            if (this._options.flipAxes) {
                [deltaY, deltaX] = [deltaX, deltaY];
            }
            // Convert vertical scrolling to horizontal if shift is held, this
            // is handled at a higher level on Mac
            const shiftConvert = !platform.isMacintosh && e.browserEvent && e.browserEvent.shiftKey;
            if ((this._options.scrollYToX || shiftConvert) && !deltaX) {
                deltaX = deltaY;
                deltaY = 0;
            }
            if (e.browserEvent && e.browserEvent.altKey) {
                // fastScrolling
                deltaX = deltaX * this._options.fastScrollSensitivity;
                deltaY = deltaY * this._options.fastScrollSensitivity;
            }
            const futureScrollPosition = this._scrollable.getFutureScrollPosition();
            let desiredScrollPosition = {};
            if (deltaY) {
                const deltaScrollTop = SCROLL_WHEEL_SENSITIVITY * deltaY;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollTop = futureScrollPosition.scrollTop - (deltaScrollTop < 0 ? Math.floor(deltaScrollTop) : Math.ceil(deltaScrollTop));
                this._verticalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollTop);
            }
            if (deltaX) {
                const deltaScrollLeft = SCROLL_WHEEL_SENSITIVITY * deltaX;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollLeft = futureScrollPosition.scrollLeft - (deltaScrollLeft < 0 ? Math.floor(deltaScrollLeft) : Math.ceil(deltaScrollLeft));
                this._horizontalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollLeft);
            }
            // Check that we are scrolling towards a location which is valid
            desiredScrollPosition = this._scrollable.validateScrollPosition(desiredScrollPosition);
            if (futureScrollPosition.scrollLeft !== desiredScrollPosition.scrollLeft || futureScrollPosition.scrollTop !== desiredScrollPosition.scrollTop) {
                const canPerformSmoothScroll = (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED
                    && this._options.mouseWheelSmoothScroll
                    && classifier.isPhysicalMouseWheel());
                if (canPerformSmoothScroll) {
                    this._scrollable.setScrollPositionSmooth(desiredScrollPosition);
                }
                else {
                    this._scrollable.setScrollPositionNow(desiredScrollPosition);
                }
                didScroll = true;
            }
        }
        let consumeMouseWheel = didScroll;
        if (!consumeMouseWheel && this._options.alwaysConsumeMouseWheel) {
            consumeMouseWheel = true;
        }
        if (!consumeMouseWheel && this._options.consumeMouseWheelIfScrollbarIsNeeded && (this._verticalScrollbar.isNeeded() || this._horizontalScrollbar.isNeeded())) {
            consumeMouseWheel = true;
        }
        if (consumeMouseWheel) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    _onDidScroll(e) {
        this._shouldRender = this._horizontalScrollbar.onDidScroll(e) || this._shouldRender;
        this._shouldRender = this._verticalScrollbar.onDidScroll(e) || this._shouldRender;
        if (this._options.useShadows) {
            this._shouldRender = true;
        }
        if (this._revealOnScroll) {
            this._reveal();
        }
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    /**
     * Render / mutate the DOM now.
     * Should be used together with the ctor option `lazyRender`.
     */
    renderNow() {
        if (!this._options.lazyRender) {
            throw new Error('Please use `lazyRender` together with `renderNow`!');
        }
        this._render();
    }
    _render() {
        if (!this._shouldRender) {
            return;
        }
        this._shouldRender = false;
        this._horizontalScrollbar.render();
        this._verticalScrollbar.render();
        if (this._options.useShadows) {
            const scrollState = this._scrollable.getCurrentScrollPosition();
            const enableTop = scrollState.scrollTop > 0;
            const enableLeft = scrollState.scrollLeft > 0;
            const leftClassName = (enableLeft ? ' left' : '');
            const topClassName = (enableTop ? ' top' : '');
            const topLeftClassName = (enableLeft || enableTop ? ' top-left-corner' : '');
            this._leftShadowDomNode.setClassName(`shadow${leftClassName}`);
            this._topShadowDomNode.setClassName(`shadow${topClassName}`);
            this._topLeftShadowDomNode.setClassName(`shadow${topLeftClassName}${topClassName}${leftClassName}`);
        }
    }
    // -------------------- fade in / fade out --------------------
    _onDragStart() {
        this._isDragging = true;
        this._reveal();
    }
    _onDragEnd() {
        this._isDragging = false;
        this._hide();
    }
    _onMouseLeave(e) {
        this._mouseIsOver = false;
        this._hide();
    }
    _onMouseOver(e) {
        this._mouseIsOver = true;
        this._reveal();
    }
    _reveal() {
        this._verticalScrollbar.beginReveal();
        this._horizontalScrollbar.beginReveal();
        this._scheduleHide();
    }
    _hide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._verticalScrollbar.beginHide();
            this._horizontalScrollbar.beginHide();
        }
    }
    _scheduleHide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._hideTimeout.cancelAndSet(() => this._hide(), HIDE_TIMEOUT);
        }
    }
}
export class ScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback)
        });
        super(element, options, scrollable);
        this._register(scrollable);
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class SmoothScrollableElement extends AbstractScrollableElement {
    constructor(element, options, scrollable) {
        super(element, options, scrollable);
    }
    setScrollPosition(update) {
        if (update.reuseAnimation) {
            this._scrollable.setScrollPositionSmooth(update, update.reuseAnimation);
        }
        else {
            this._scrollable.setScrollPositionNow(update);
        }
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class DomScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: false, // See https://github.com/microsoft/vscode/issues/139877
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback)
        });
        super(element, options, scrollable);
        this._register(scrollable);
        this._element = element;
        this._register(this.onScroll((e) => {
            if (e.scrollTopChanged) {
                this._element.scrollTop = e.scrollTop;
            }
            if (e.scrollLeftChanged) {
                this._element.scrollLeft = e.scrollLeft;
            }
        }));
        this.scanDomNode();
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    scanDomNode() {
        // width, scrollLeft, scrollWidth, height, scrollTop, scrollHeight
        this.setScrollDimensions({
            width: this._element.clientWidth,
            scrollWidth: this._element.scrollWidth,
            height: this._element.clientHeight,
            scrollHeight: this._element.scrollHeight
        });
        this.setScrollPosition({
            scrollLeft: this._element.scrollLeft,
            scrollTop: this._element.scrollTop,
        });
    }
}
function resolveOptions(opts) {
    const result = {
        lazyRender: (typeof opts.lazyRender !== 'undefined' ? opts.lazyRender : false),
        className: (typeof opts.className !== 'undefined' ? opts.className : ''),
        useShadows: (typeof opts.useShadows !== 'undefined' ? opts.useShadows : true),
        handleMouseWheel: (typeof opts.handleMouseWheel !== 'undefined' ? opts.handleMouseWheel : true),
        flipAxes: (typeof opts.flipAxes !== 'undefined' ? opts.flipAxes : false),
        consumeMouseWheelIfScrollbarIsNeeded: (typeof opts.consumeMouseWheelIfScrollbarIsNeeded !== 'undefined' ? opts.consumeMouseWheelIfScrollbarIsNeeded : false),
        alwaysConsumeMouseWheel: (typeof opts.alwaysConsumeMouseWheel !== 'undefined' ? opts.alwaysConsumeMouseWheel : false),
        scrollYToX: (typeof opts.scrollYToX !== 'undefined' ? opts.scrollYToX : false),
        mouseWheelScrollSensitivity: (typeof opts.mouseWheelScrollSensitivity !== 'undefined' ? opts.mouseWheelScrollSensitivity : 1),
        fastScrollSensitivity: (typeof opts.fastScrollSensitivity !== 'undefined' ? opts.fastScrollSensitivity : 5),
        scrollPredominantAxis: (typeof opts.scrollPredominantAxis !== 'undefined' ? opts.scrollPredominantAxis : true),
        mouseWheelSmoothScroll: (typeof opts.mouseWheelSmoothScroll !== 'undefined' ? opts.mouseWheelSmoothScroll : true),
        arrowSize: (typeof opts.arrowSize !== 'undefined' ? opts.arrowSize : 11),
        listenOnDomNode: (typeof opts.listenOnDomNode !== 'undefined' ? opts.listenOnDomNode : null),
        horizontal: (typeof opts.horizontal !== 'undefined' ? opts.horizontal : 1 /* ScrollbarVisibility.Auto */),
        horizontalScrollbarSize: (typeof opts.horizontalScrollbarSize !== 'undefined' ? opts.horizontalScrollbarSize : 10),
        horizontalSliderSize: (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : 0),
        horizontalHasArrows: (typeof opts.horizontalHasArrows !== 'undefined' ? opts.horizontalHasArrows : false),
        vertical: (typeof opts.vertical !== 'undefined' ? opts.vertical : 1 /* ScrollbarVisibility.Auto */),
        verticalScrollbarSize: (typeof opts.verticalScrollbarSize !== 'undefined' ? opts.verticalScrollbarSize : 10),
        verticalHasArrows: (typeof opts.verticalHasArrows !== 'undefined' ? opts.verticalHasArrows : false),
        verticalSliderSize: (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : 0),
        scrollByPage: (typeof opts.scrollByPage !== 'undefined' ? opts.scrollByPage : false)
    };
    result.horizontalSliderSize = (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : result.horizontalScrollbarSize);
    result.verticalSliderSize = (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : result.verticalScrollbarSize);
    // Defaults are different on Macs
    if (platform.isMacintosh) {
        result.className += ' mac';
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZUVsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Njcm9sbGJhci9zY3JvbGxhYmxlRWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzNELE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RFLE9BQU8sRUFBaUMsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BFLE9BQU8sS0FBSyxRQUFRLE1BQU0sNkJBQTZCLENBQUM7QUFDeEQsT0FBTyxFQUE2RixVQUFVLEVBQXVCLE1BQU0sK0JBQStCLENBQUM7QUFDM0ssT0FBTyx3QkFBd0IsQ0FBQztBQUVoQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUM7QUFDekIsTUFBTSx3QkFBd0IsR0FBRyxFQUFFLENBQUM7QUFDcEMsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLENBQUM7QUFPaEQsTUFBTSx3QkFBd0I7SUFNN0IsWUFBWSxTQUFp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