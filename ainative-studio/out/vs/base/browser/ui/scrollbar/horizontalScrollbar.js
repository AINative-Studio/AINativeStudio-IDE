/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardWheelEvent } from '../../mouseEvent.js';
import { AbstractScrollbar } from './abstractScrollbar.js';
import { ARROW_IMG_SIZE } from './scrollbarArrow.js';
import { ScrollbarState } from './scrollbarState.js';
import { Codicon } from '../../../common/codicons.js';
export class HorizontalScrollbar extends AbstractScrollbar {
    constructor(scrollable, options, host) {
        const scrollDimensions = scrollable.getScrollDimensions();
        const scrollPosition = scrollable.getCurrentScrollPosition();
        super({
            lazyRender: options.lazyRender,
            host: host,
            scrollbarState: new ScrollbarState((options.horizontalHasArrows ? options.arrowSize : 0), (options.horizontal === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.horizontalScrollbarSize), (options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize), scrollDimensions.width, scrollDimensions.scrollWidth, scrollPosition.scrollLeft),
            visibility: options.horizontal,
            extraScrollbarClassName: 'horizontal',
            scrollable: scrollable,
            scrollByPage: options.scrollByPage
        });
        if (options.horizontalHasArrows) {
            const arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
            const scrollbarDelta = (options.horizontalScrollbarSize - ARROW_IMG_SIZE) / 2;
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonLeft,
                top: scrollbarDelta,
                left: arrowDelta,
                bottom: undefined,
                right: undefined,
                bgWidth: options.arrowSize,
                bgHeight: options.horizontalScrollbarSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 1, 0)),
            });
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonRight,
                top: scrollbarDelta,
                left: undefined,
                bottom: undefined,
                right: arrowDelta,
                bgWidth: options.arrowSize,
                bgHeight: options.horizontalScrollbarSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, -1, 0)),
            });
        }
        this._createSlider(Math.floor((options.horizontalScrollbarSize - options.horizontalSliderSize) / 2), 0, undefined, options.horizontalSliderSize);
    }
    _updateSlider(sliderSize, sliderPosition) {
        this.slider.setWidth(sliderSize);
        this.slider.setLeft(sliderPosition);
    }
    _renderDomNode(largeSize, smallSize) {
        this.domNode.setWidth(largeSize);
        this.domNode.setHeight(smallSize);
        this.domNode.setLeft(0);
        this.domNode.setBottom(0);
    }
    onDidScroll(e) {
        this._shouldRender = this._onElementScrollSize(e.scrollWidth) || this._shouldRender;
        this._shouldRender = this._onElementScrollPosition(e.scrollLeft) || this._shouldRender;
        this._shouldRender = this._onElementSize(e.width) || this._shouldRender;
        return this._shouldRender;
    }
    _pointerDownRelativePosition(offsetX, offsetY) {
        return offsetX;
    }
    _sliderPointerPosition(e) {
        return e.pageX;
    }
    _sliderOrthogonalPointerPosition(e) {
        return e.pageY;
    }
    _updateScrollbarSize(size) {
        this.slider.setHeight(size);
    }
    writeScrollPosition(target, scrollPosition) {
        target.scrollLeft = scrollPosition;
    }
    updateOptions(options) {
        this.updateScrollbarSize(options.horizontal === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.horizontalScrollbarSize);
        this._scrollbarState.setOppositeScrollbarSize(options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize);
        this._visibilityController.setVisibility(options.horizontal);
        this._scrollByPage = options.scrollByPage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9yaXpvbnRhbFNjcm9sbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL2hvcml6b250YWxTY3JvbGxiYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUEwQyxNQUFNLHdCQUF3QixDQUFDO0FBRW5HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBTXRELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxpQkFBaUI7SUFFekQsWUFBWSxVQUFzQixFQUFFLE9BQXlDLEVBQUUsSUFBbUI7UUFDakcsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMxRCxNQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUM3RCxLQUFLLENBQUM7WUFDTCxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsSUFBSSxFQUFFLElBQUk7WUFDVixjQUFjLEVBQUUsSUFBSSxjQUFjLENBQ2pDLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDckQsQ0FBQyxPQUFPLENBQUMsVUFBVSx1Q0FBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsRUFDekYsQ0FBQyxPQUFP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