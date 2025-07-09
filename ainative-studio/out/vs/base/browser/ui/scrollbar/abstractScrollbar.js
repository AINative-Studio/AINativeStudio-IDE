/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { createFastDomNode } from '../../fastDomNode.js';
import { GlobalPointerMoveMonitor } from '../../globalPointerMoveMonitor.js';
import { ScrollbarArrow } from './scrollbarArrow.js';
import { ScrollbarVisibilityController } from './scrollbarVisibilityController.js';
import { Widget } from '../widget.js';
import * as platform from '../../../common/platform.js';
/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const POINTER_DRAG_RESET_DISTANCE = 140;
export class AbstractScrollbar extends Widget {
    constructor(opts) {
        super();
        this._lazyRender = opts.lazyRender;
        this._host = opts.host;
        this._scrollable = opts.scrollable;
        this._scrollByPage = opts.scrollByPage;
        this._scrollbarState = opts.scrollbarState;
        this._visibilityController = this._register(new ScrollbarVisibilityController(opts.visibility, 'visible scrollbar ' + opts.extraScrollbarClassName, 'invisible scrollbar ' + opts.extraScrollbarClassName));
        this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
        this._pointerMoveMonitor = this._register(new GlobalPointerMoveMonitor());
        this._shouldRender = true;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this._visibilityController.setDomNode(this.domNode);
        this.domNode.setPosition('absolute');
        this._register(dom.addDisposableListener(this.domNode.domNode, dom.EventType.POINTER_DOWN, (e) => this._domNodePointerDown(e)));
    }
    // ----------------- creation
    /**
     * Creates the dom node for an arrow & adds it to the container
     */
    _createArrow(opts) {
        const arrow = this._register(new ScrollbarArrow(opts));
        this.domNode.domNode.appendChild(arrow.bgDomNode);
        this.domNode.domNode.appendChild(arrow.domNode);
    }
    /**
     * Creates the slider dom node, adds it to the container & hooks up the events
     */
    _createSlider(top, left, width, height) {
        this.slider = createFastDomNode(document.createElement('div'));
        this.slider.setClassName('slider');
        this.slider.setPosition('absolute');
        this.slider.setTop(top);
        this.slider.setLeft(left);
        if (typeof width === 'number') {
            this.slider.setWidth(width);
        }
        if (typeof height === 'number') {
            this.slider.setHeight(height);
        }
        this.slider.setLayerHinting(true);
        this.slider.setContain('strict');
        this.domNode.domNode.appendChild(this.slider.domNode);
        this._register(dom.addDisposableListener(this.slider.domNode, dom.EventType.POINTER_DOWN, (e) => {
            if (e.button === 0) {
                e.preventDefault();
                this._sliderPointerDown(e);
            }
        }));
        this.onclick(this.slider.domNode, e => {
            if (e.leftButton) {
                e.stopPropagation();
            }
        });
    }
    // ----------------- Update state
    _onElementSize(visibleSize) {
        if (this._scrollbarState.setVisibleSize(visibleSize)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    _onElementScrollSize(elementScrollSize) {
        if (this._scrollbarState.setScrollSize(elementScrollSize)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    _onElementScrollPosition(elementScrollPosition) {
        if (this._scrollbarState.setScrollPosition(elementScrollPosition)) {
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded());
            this._shouldRender = true;
            if (!this._lazyRender) {
                this.render();
            }
        }
        return this._shouldRender;
    }
    // ----------------- rendering
    beginReveal() {
        this._visibilityController.setShouldBeVisible(true);
    }
    beginHide() {
        this._visibilityController.setShouldBeVisible(false);
    }
    render() {
        if (!this._shouldRender) {
            return;
        }
        this._shouldRender = false;
        this._renderDomNode(this._scrollbarState.getRectangleLargeSize(), this._scrollbarState.getRectangleSmallSize());
        this._updateSlider(this._scrollbarState.getSliderSize(), this._scrollbarState.getArrowSize() + this._scrollbarState.getSliderPosition());
    }
    // ----------------- DOM events
    _domNodePointerDown(e) {
        if (e.target !== this.domNode.domNode) {
            return;
        }
        this._onPointerDown(e);
    }
    delegatePointerDown(e) {
        const domTop = this.domNode.domNode.getClientRects()[0].top;
        const sliderStart = domTop + this._scrollbarState.getSliderPosition();
        const sliderStop = domTop + this._scrollbarState.getSliderPosition() + this._scrollbarState.getSliderSize();
        const pointerPos = this._sliderPointerPosition(e);
        if (sliderStart <= pointerPos && pointerPos <= sliderStop) {
            // Act as if it was a pointer down on the slider
            if (e.button === 0) {
                e.preventDefault();
                this._sliderPointerDown(e);
            }
        }
        else {
            // Act as if it was a pointer down on the scrollbar
            this._onPointerDown(e);
        }
    }
    _onPointerDown(e) {
        let offsetX;
        let offsetY;
        if (e.target === this.domNode.domNode && typeof e.offsetX === 'number' && typeof e.offsetY === 'number') {
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        }
        else {
            const domNodePosition = dom.getDomNodePagePosition(this.domNode.domNode);
            offsetX = e.pageX - domNodePosition.left;
            offsetY = e.pageY - domNodePosition.top;
        }
        const offset = this._pointerDownRelativePosition(offsetX, offsetY);
        this._setDesiredScrollPositionNow(this._scrollByPage
            ? this._scrollbarState.getDesiredScrollPositionFromOffsetPaged(offset)
            : this._scrollbarState.getDesiredScrollPositionFromOffset(offset));
        if (e.button === 0) {
            // left button
            e.preventDefault();
            this._sliderPointerDown(e);
        }
    }
    _sliderPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const initialPointerPosition = this._sliderPointerPosition(e);
        const initialPointerOrthogonalPosition = this._sliderOrthogonalPointerPosition(e);
        const initialScrollbarState = this._scrollbarState.clone();
        this.slider.toggleClassName('active', true);
        this._pointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, (pointerMoveData) => {
            const pointerOrthogonalPosition = this._sliderOrthogonalPointerPosition(pointerMoveData);
            const pointerOrthogonalDelta = Math.abs(pointerOrthogonalPosition - initialPointerOrthogonalPosition);
            if (platform.isWindows && pointerOrthogonalDelta > POINTER_DRAG_RESET_DISTANCE) {
                // The pointer has wondered away from the scrollbar => reset dragging
                this._setDesiredScrollPositionNow(initialScrollbarState.getScrollPosition());
                return;
            }
            const pointerPosition = this._sliderPointerPosition(pointerMoveData);
            const pointerDelta = pointerPosition - initialPointerPosition;
            this._setDesiredScrollPositionNow(initialScrollbarState.getDesiredScrollPositionFromDelta(pointerDelta));
        }, () => {
            this.slider.toggleClassName('active', false);
            this._host.onDragEnd();
        });
        this._host.onDragStart();
    }
    _setDesiredScrollPositionNow(_desiredScrollPosition) {
        const desiredScrollPosition = {};
        this.writeScrollPosition(desiredScrollPosition, _desiredScrollPosition);
        this._scrollable.setScrollPositionNow(desiredScrollPosition);
    }
    updateScrollbarSize(scrollbarSize) {
        this._updateScrollbarSize(scrollbarSize);
        this._scrollbarState.setScrollbarSize(scrollbarSize);
        this._shouldRender = true;
        if (!this._lazyRender) {
            this.render();
        }
    }
    isNeeded() {
        return this._scrollbarState.isNeeded();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTY3JvbGxiYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Njcm9sbGJhci9hYnN0cmFjdFNjcm9sbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUNwQyxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSxzQkFBc0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsY0FBYyxFQUF5QixNQUFNLHFCQUFxQixDQUFDO0FBRTVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxLQUFLLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQztBQUd4RDs7R0FFRztBQUNILE1BQU0sMkJBQTJCLEdBQUcsR0FBRyxDQUFDO0FBd0J4QyxNQUFNLE9BQWdCLGlCQUFrQixTQUFRLE1BQU07SUFlckQsWUFBWSxJQUE4QjtRQUN6QyxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ25DLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDM0MsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FB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