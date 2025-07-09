/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserFeatures } from '../../canIUse.js';
import * as DOM from '../../dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import { Range } from '../../../common/range.js';
import './contextview.css';
export var ContextViewDOMPosition;
(function (ContextViewDOMPosition) {
    ContextViewDOMPosition[ContextViewDOMPosition["ABSOLUTE"] = 1] = "ABSOLUTE";
    ContextViewDOMPosition[ContextViewDOMPosition["FIXED"] = 2] = "FIXED";
    ContextViewDOMPosition[ContextViewDOMPosition["FIXED_SHADOW"] = 3] = "FIXED_SHADOW";
})(ContextViewDOMPosition || (ContextViewDOMPosition = {}));
export function isAnchor(obj) {
    const anchor = obj;
    return !!anchor && typeof anchor.x === 'number' && typeof anchor.y === 'number';
}
export var AnchorAlignment;
(function (AnchorAlignment) {
    AnchorAlignment[AnchorAlignment["LEFT"] = 0] = "LEFT";
    AnchorAlignment[AnchorAlignment["RIGHT"] = 1] = "RIGHT";
})(AnchorAlignment || (AnchorAlignment = {}));
export var AnchorPosition;
(function (AnchorPosition) {
    AnchorPosition[AnchorPosition["BELOW"] = 0] = "BELOW";
    AnchorPosition[AnchorPosition["ABOVE"] = 1] = "ABOVE";
})(AnchorPosition || (AnchorPosition = {}));
export var AnchorAxisAlignment;
(function (AnchorAxisAlignment) {
    AnchorAxisAlignment[AnchorAxisAlignment["VERTICAL"] = 0] = "VERTICAL";
    AnchorAxisAlignment[AnchorAxisAlignment["HORIZONTAL"] = 1] = "HORIZONTAL";
})(AnchorAxisAlignment || (AnchorAxisAlignment = {}));
export var LayoutAnchorPosition;
(function (LayoutAnchorPosition) {
    LayoutAnchorPosition[LayoutAnchorPosition["Before"] = 0] = "Before";
    LayoutAnchorPosition[LayoutAnchorPosition["After"] = 1] = "After";
})(LayoutAnchorPosition || (LayoutAnchorPosition = {}));
export var LayoutAnchorMode;
(function (LayoutAnchorMode) {
    LayoutAnchorMode[LayoutAnchorMode["AVOID"] = 0] = "AVOID";
    LayoutAnchorMode[LayoutAnchorMode["ALIGN"] = 1] = "ALIGN";
})(LayoutAnchorMode || (LayoutAnchorMode = {}));
/**
 * Lays out a one dimensional view next to an anchor in a viewport.
 *
 * @returns The view offset within the viewport.
 */
export function layout(viewportSize, viewSize, anchor) {
    const layoutAfterAnchorBoundary = anchor.mode === LayoutAnchorMode.ALIGN ? anchor.offset : anchor.offset + anchor.size;
    const layoutBeforeAnchorBoundary = anchor.mode === LayoutAnchorMode.ALIGN ? anchor.offset + anchor.size : anchor.offset;
    if (anchor.position === 0 /* LayoutAnchorPosition.Before */) {
        if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
            return layoutAfterAnchorBoundary; // happy case, lay it out after the anchor
        }
        if (viewSize <= layoutBeforeAnchorBoundary) {
            return layoutBeforeAnchorBoundary - viewSize; // ok case, lay it out before the anchor
        }
        return Math.max(viewportSize - viewSize, 0); // sad case, lay it over the anchor
    }
    else {
        if (viewSize <= layoutBeforeAnchorBoundary) {
            return layoutBeforeAnchorBoundary - viewSize; // happy case, lay it out before the anchor
        }
        if (viewSize <= viewportSize - layoutAfterAnchorBoundary) {
            return layoutAfterAnchorBoundary; // ok case, lay it out after the anchor
        }
        return 0; // sad case, lay it over the anchor
    }
}
export class ContextView extends Disposable {
    static { this.BUBBLE_UP_EVENTS = ['click', 'keydown', 'focus', 'blur']; }
    static { this.BUBBLE_DOWN_EVENTS = ['click']; }
    constructor(container, domPosition) {
        super();
        this.container = null;
        this.useFixedPosition = false;
        this.useShadowDOM = false;
        this.delegate = null;
        this.toDisposeOnClean = Disposable.None;
        this.toDisposeOnSetContainer = Disposable.None;
        this.shadowRoot = null;
        this.shadowRootHostElement = null;
        this.view = DOM.$('.context-view');
        DOM.hide(this.view);
        this.setContainer(container, domPosition);
        this._register(toDisposable(() => this.setContainer(null, 1 /* ContextViewDOMPosition.ABSOLUTE */)));
    }
    setContainer(container, domPosition) {
        this.useFixedPosition = domPosition !== 1 /* ContextViewDOMPosition.ABSOLUTE */;
        const usedShadowDOM = this.useShadowDOM;
        this.useShadowDOM = domPosition === 3 /* ContextViewDOMPosition.FIXED_SHADOW */;
        if (container === this.container && usedShadowDOM === this.useShadowDOM) {
            return; // container is the same and no shadow DOM usage has changed
        }
        if (this.container) {
            this.toDisposeOnSetContainer.dispose();
            this.view.remove();
            if (this.shadowRoot) {
                this.shadowRoot = null;
                this.shadowRootHostElement?.remove();
                this.shadowRootHostElement = null;
            }
            this.container = null;
        }
        if (container) {
            this.container = container;
            if (this.useShadowDOM) {
                this.shadowRootHostElement = DOM.$('.shadow-root-host');
                this.container.appendChild(this.shadowRootHostElement);
                this.shadowRoot = this.shadowRootHostElement.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = SHADOW_ROOT_CSS;
                this.shadowRoot.appendChild(style);
                this.shadowRoot.appendChild(this.view);
                this.shadowRoot.appendChild(DOM.$('slot'));
            }
            else {
                this.container.appendChild(this.view);
            }
            const toDisposeOnSetContainer = new DisposableStore();
            ContextView.BUBBLE_UP_EVENTS.forEach(event => {
                toDisposeOnSetContainer.add(DOM.addStandardDisposableListener(this.container, event, e => {
                    this.onDOMEvent(e, false);
                }));
            });
            ContextView.BUBBLE_DOWN_EVENTS.forEach(event => {
                toDisposeOnSetContainer.add(DOM.addStandardDisposableListener(this.container, event, e => {
                    this.onDOMEvent(e, true);
                }, true));
            });
            this.toDisposeOnSetContainer = toDisposeOnSetContainer;
        }
    }
    show(delegate) {
        if (this.isVisible()) {
            this.hide();
        }
        // Show static box
        DOM.clearNode(this.view);
        this.view.className = 'context-view monaco-component';
        this.view.style.top = '0px';
        this.view.style.left = '0px';
        this.view.style.zIndex = `${2575 + (delegate.layer ?? 0)}`;
        this.view.style.position = this.useFixedPosition ? 'fixed' : 'absolute';
        DOM.show(this.view);
        // Render content
        this.toDisposeOnClean = delegate.render(this.view) || Disposable.None;
        // Set active delegate
        this.delegate = delegate;
        // Layout
        this.doLayout();
        // Focus
        this.delegate.focus?.();
    }
    getViewElement() {
        return this.view;
    }
    layout() {
        if (!this.isVisible()) {
            return;
        }
        if (this.delegate.canRelayout === false && !(platform.isIOS && BrowserFeatures.pointerEvents)) {
            this.hide();
            return;
        }
        this.delegate?.layout?.();
        this.doLayout();
    }
    doLayout() {
        // Check that we still have a delegate - this.delegate.layout may have hidden
        if (!this.isVisible()) {
            return;
        }
        // Get anchor
        const anchor = this.delegate.getAnchor();
        // Compute around
        let around;
        // Get the element's position and size (to anchor the view)
        if (DOM.isHTMLElement(anchor)) {
            const elementPosition = DOM.getDomNodePagePosition(anchor);
            // In areas where zoom is applied to the element or its ancestors, we need to adjust the size of the element
            // e.g. The title bar has counter zoom behavior meaning it applies the inverse of zoom level.
            // Window Zoom Level: 1.5, Title Bar Zoom: 1/1.5, Size Multiplier: 1.5
            const zoom = DOM.getDomNodeZoomLevel(anchor);
            around = {
                top: elementPosition.top * zoom,
                left: elementPosition.left * zoom,
                width: elementPosition.width * zoom,
                height: elementPosition.height * zoom
            };
        }
        else if (isAnchor(anchor)) {
            around = {
                top: anchor.y,
                left: anchor.x,
                width: anchor.width || 1,
                height: anchor.height || 2
            };
        }
        else {
            around = {
                top: anchor.posy,
                left: anchor.posx,
                // We are about to position the context view where the mouse
                // cursor is. To prevent the view being exactly under the mouse
                // when showing and thus potentially triggering an action within,
                // we treat the mouse location like a small sized block element.
                width: 2,
                height: 2
            };
        }
        const viewSizeWidth = DOM.getTotalWidth(this.view);
        const viewSizeHeight = DOM.getTotalHeight(this.view);
        const anchorPosition = this.delegate.anchorPosition ?? 0 /* AnchorPosition.BELOW */;
        const anchorAlignment = this.delegate.anchorAlignment ?? 0 /* AnchorAlignment.LEFT */;
        const anchorAxisAlignment = this.delegate.anchorAxisAlignment ?? 0 /* AnchorAxisAlignment.VERTICAL */;
        let top;
        let left;
        const activeWindow = DOM.getActiveWindow();
        if (anchorAxisAlignment === 0 /* AnchorAxisAlignment.VERTICAL */) {
            const verticalAnchor = { offset: around.top - activeWindow.pageYOffset, size: around.height, position: anchorPosition === 0 /* AnchorPosition.BELOW */ ? 0 /* LayoutAnchorPosition.Before */ : 1 /* LayoutAnchorPosition.After */ };
            const horizontalAnchor = { offset: around.left, size: around.width, position: anchorAlignment === 0 /* AnchorAlignment.LEFT */ ? 0 /* LayoutAnchorPosition.Before */ : 1 /* LayoutAnchorPosition.After */, mode: LayoutAnchorMode.ALIGN };
            top = layout(activeWindow.innerHeight, viewSizeHeight, verticalAnchor) + activeWindow.pageYOffset;
            // if view intersects vertically with anchor,  we must avoid the anchor
            if (Range.intersects({ start: top, end: top + viewSizeHeight }, { start: verticalAnchor.offset, end: verticalAnchor.offset + verticalAnchor.size })) {
                horizontalAnchor.mode = LayoutAnchorMode.AVOID;
            }
            left = layout(activeWindow.innerWidth, viewSizeWidth, horizontalAnchor);
        }
        else {
            const horizontalAnchor = { offset: around.left, size: around.width, position: anchorAlignment === 0 /* AnchorAlignment.LEFT */ ? 0 /* LayoutAnchorPosition.Before */ : 1 /* LayoutAnchorPosition.After */ };
            const verticalAnchor = { offset: around.top, size: around.height, position: anchorPosition === 0 /* AnchorPosition.BELOW */ ? 0 /* LayoutAnchorPosition.Before */ : 1 /* LayoutAnchorPosition.After */, mode: LayoutAnchorMode.ALIGN };
            left = layout(activeWindow.innerWidth, viewSizeWidth, horizontalAnchor);
            // if view intersects horizontally with anchor, we must avoid the anchor
            if (Range.intersects({ start: left, end: left + viewSizeWidth }, { start: horizontalAnchor.offset, end: horizontalAnchor.offset + horizontalAnchor.size })) {
                verticalAnchor.mode = LayoutAnchorMode.AVOID;
            }
            top = layout(activeWindow.innerHeight, viewSizeHeight, verticalAnchor) + activeWindow.pageYOffset;
        }
        this.view.classList.remove('top', 'bottom', 'left', 'right');
        this.view.classList.add(anchorPosition === 0 /* AnchorPosition.BELOW */ ? 'bottom' : 'top');
        this.view.classList.add(anchorAlignment === 0 /* AnchorAlignment.LEFT */ ? 'left' : 'right');
        this.view.classList.toggle('fixed', this.useFixedPosition);
        const containerPosition = DOM.getDomNodePagePosition(this.container);
        this.view.style.top = `${top - (this.useFixedPosition ? DOM.getDomNodePagePosition(this.view).top : containerPosition.top)}px`;
        this.view.style.left = `${left - (this.useFixedPosition ? DOM.getDomNodePagePosition(this.view).left : containerPosition.left)}px`;
        this.view.style.width = 'initial';
    }
    hide(data) {
        const delegate = this.delegate;
        this.delegate = null;
        if (delegate?.onHide) {
            delegate.onHide(data);
        }
        this.toDisposeOnClean.dispose();
        DOM.hide(this.view);
    }
    isVisible() {
        return !!this.delegate;
    }
    onDOMEvent(e, onCapture) {
        if (this.delegate) {
            if (this.delegate.onDOMEvent) {
                this.delegate.onDOMEvent(e, DOM.getWindow(e).document.activeElement);
            }
            else if (onCapture && !DOM.isAncestor(e.target, this.container)) {
                this.hide();
            }
        }
    }
    dispose() {
        this.hide();
        super.dispose();
    }
}
const SHADOW_ROOT_CSS = /* css */ `
	:host {
		all: initial; /* 1st rule so subsequent properties are reset. */
	}

	.codicon[class*='codicon-'] {
		font: normal normal normal 16px/1 codicon;
		display: inline-block;
		text-decoration: none;
		text-rendering: auto;
		text-align: center;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		user-select: none;
		-webkit-user-select: none;
		-ms-user-select: none;
	}

	:host {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "HelveticaNeue-Light", system-ui, "Ubuntu", "Droid Sans", sans-serif;
	}

	:host-context(.mac) { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
	:host-context(.mac:lang(zh-Hans)) { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif; }
	:host-context(.mac:lang(zh-Hant)) { font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif; }
	:host-context(.mac:lang(ja)) { font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic Pro", sans-serif; }
	:host-context(.mac:lang(ko)) { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Nanum Gothic", "AppleGothic", sans-serif; }

	:host-context(.windows) { font-family: "Segoe WPC", "Segoe UI", sans-serif; }
	:host-context(.windows:lang(zh-Hans)) { font-family: "Segoe WPC", "Segoe UI", "Microsoft YaHei", sans-serif; }
	:host-context(.windows:lang(zh-Hant)) { font-family: "Segoe WPC", "Segoe UI", "Microsoft Jhenghei", sans-serif; }
	:host-context(.windows:lang(ja)) { font-family: "Segoe WPC", "Segoe UI", "Yu Gothic UI", "Meiryo UI", sans-serif; }
	:host-context(.windows:lang(ko)) { font-family: "Segoe WPC", "Segoe UI", "Malgun Gothic", "Dotom", sans-serif; }

	:host-context(.linux) { font-family: system-ui, "Ubuntu", "Droid Sans", sans-serif; }
	:host-context(.linux:lang(zh-Hans)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans SC", "Source Han Sans CN", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(zh-Hant)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans TC", "Source Han Sans TW", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(ja)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans J", "Source Han Sans JP", "Source Han Sans", sans-serif; }
	:host-context(.linux:lang(ko)) { font-family: system-ui, "Ubuntu", "Droid Sans", "Source Han Sans K", "Source Han Sans JR", "Source Han Sans", "UnDotum", "FBaekmuk Gulim", sans-serif; }
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dHZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2NvbnRleHR2aWV3L2NvbnRleHR2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRCxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUVwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RyxPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVqRCxPQUFPLG1CQUFtQixDQUFDO0FBRTNCLE1BQU0sQ0FBTixJQUFrQixzQkFJakI7QUFKRCxXQUFrQixzQkFBc0I7SUFDdkMsMkVBQVksQ0FBQTtJQUNaLHFFQUFLLENBQUE7SUFDTCxtRkFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBSXZDO0FBU0QsTUFBTSxVQUFVLFFBQVEsQ0FBQyxHQUFZO0lBQ3BDLE1BQU0sTUFBTSxHQUFHLEdBQWtELENBQUM7SUFFbEUsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxNQUFNLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQztBQUNqRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGVBRWpCO0FBRkQsV0FBa0IsZUFBZTtJQUNoQyxxREFBSSxDQUFBO0lBQUUsdURBQUssQ0FBQTtBQUNaLENBQUMsRUFGaUIsZUFBZSxLQUFmLGVBQWUsUUFFaEM7QUFFRCxNQUFNLENBQU4s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