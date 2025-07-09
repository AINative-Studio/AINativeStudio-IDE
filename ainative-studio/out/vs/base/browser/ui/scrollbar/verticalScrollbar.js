/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardWheelEvent } from '../../mouseEvent.js';
import { AbstractScrollbar } from './abstractScrollbar.js';
import { ARROW_IMG_SIZE } from './scrollbarArrow.js';
import { ScrollbarState } from './scrollbarState.js';
import { Codicon } from '../../../common/codicons.js';
export class VerticalScrollbar extends AbstractScrollbar {
    constructor(scrollable, options, host) {
        const scrollDimensions = scrollable.getScrollDimensions();
        const scrollPosition = scrollable.getCurrentScrollPosition();
        super({
            lazyRender: options.lazyRender,
            host: host,
            scrollbarState: new ScrollbarState((options.verticalHasArrows ? options.arrowSize : 0), (options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize), 
            // give priority to vertical scroll bar over horizontal and let it scroll all the way to the bottom
            0, scrollDimensions.height, scrollDimensions.scrollHeight, scrollPosition.scrollTop),
            visibility: options.vertical,
            extraScrollbarClassName: 'vertical',
            scrollable: scrollable,
            scrollByPage: options.scrollByPage
        });
        if (options.verticalHasArrows) {
            const arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
            const scrollbarDelta = (options.verticalScrollbarSize - ARROW_IMG_SIZE) / 2;
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonUp,
                top: arrowDelta,
                left: scrollbarDelta,
                bottom: undefined,
                right: undefined,
                bgWidth: options.verticalScrollbarSize,
                bgHeight: options.arrowSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, 1)),
            });
            this._createArrow({
                className: 'scra',
                icon: Codicon.scrollbarButtonDown,
                top: undefined,
                left: scrollbarDelta,
                bottom: arrowDelta,
                right: undefined,
                bgWidth: options.verticalScrollbarSize,
                bgHeight: options.arrowSize,
                onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, -1)),
            });
        }
        this._createSlider(0, Math.floor((options.verticalScrollbarSize - options.verticalSliderSize) / 2), options.verticalSliderSize, undefined);
    }
    _updateSlider(sliderSize, sliderPosition) {
        this.slider.setHeight(sliderSize);
        this.slider.setTop(sliderPosition);
    }
    _renderDomNode(largeSize, smallSize) {
        this.domNode.setWidth(smallSize);
        this.domNode.setHeight(largeSize);
        this.domNode.setRight(0);
        this.domNode.setTop(0);
    }
    onDidScroll(e) {
        this._shouldRender = this._onElementScrollSize(e.scrollHeight) || this._shouldRender;
        this._shouldRender = this._onElementScrollPosition(e.scrollTop) || this._shouldRender;
        this._shouldRender = this._onElementSize(e.height) || this._shouldRender;
        return this._shouldRender;
    }
    _pointerDownRelativePosition(offsetX, offsetY) {
        return offsetY;
    }
    _sliderPointerPosition(e) {
        return e.pageY;
    }
    _sliderOrthogonalPointerPosition(e) {
        return e.pageX;
    }
    _updateScrollbarSize(size) {
        this.slider.setWidth(size);
    }
    writeScrollPosition(target, scrollPosition) {
        target.scrollTop = scrollPosition;
    }
    updateOptions(options) {
        this.updateScrollbarSize(options.vertical === 2 /* ScrollbarVisibility.Hidden */ ? 0 : options.verticalScrollbarSize);
        // give priority to vertical scroll bar over horizontal and let it scroll all the way to the bottom
        this._scrollbarState.setOppositeScrollbarSize(0);
        this._visibilityController.setVisibility(options.vertical);
        this._scrollByPage = options.scrollByPage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVydGljYWxTY3JvbGxiYXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Njcm9sbGJhci92ZXJ0aWNhbFNjcm9sbGJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQTBDLE1BQU0sd0JBQXdCLENBQUM7QUFFbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLdEQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGlCQUFpQjtJQUV2RCxZQUFZLFVBQXNCLEVBQUUsT0FBeUMsRUFBRSxJQUFtQjtRQUNqRyxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzFELE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQzdELEtBQUssQ0FBQztZQUNMLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixJQUFJLEVBQUUsSUFBSTtZQUNWLGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FDakMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNuRCxDQUFDLE9BQU8sQ0FBQyxRQUFRLHVDQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztZQUNyRixtR0FBbUc7WUFDbkcs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