/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import { SplitView } from '../splitview/splitview.js';
import { Event } from '../../../common/event.js';
import { DisposableStore } from '../../../common/lifecycle.js';
const defaultState = {
    targetWidth: 900,
    leftMarginRatio: 0.1909,
    rightMarginRatio: 0.1909,
};
const distributeSizing = { type: 'distribute' };
function createEmptyView(background) {
    const element = $('.centered-layout-margin');
    element.style.height = '100%';
    if (background) {
        element.style.backgroundColor = background.toString();
    }
    return {
        element,
        layout: () => undefined,
        minimumSize: 60,
        maximumSize: Number.POSITIVE_INFINITY,
        onDidChange: Event.None
    };
}
function toSplitViewView(view, getHeight) {
    return {
        element: view.element,
        get maximumSize() { return view.maximumWidth; },
        get minimumSize() { return view.minimumWidth; },
        onDidChange: Event.map(view.onDidChange, e => e && e.width),
        layout: (size, offset, ctx) => view.layout(size, getHeight(), ctx?.top ?? 0, (ctx?.left ?? 0) + offset)
    };
}
export class CenteredViewLayout {
    constructor(container, view, state = { ...defaultState }, centeredLayoutFixedWidth = false) {
        this.container = container;
        this.view = view;
        this.state = state;
        this.centeredLayoutFixedWidth = centeredLayoutFixedWidth;
        this.lastLayoutPosition = { width: 0, height: 0, left: 0, top: 0 };
        this.didLayout = false;
        this.splitViewDisposables = new DisposableStore();
        this._boundarySashes = {};
        this.container.appendChild(this.view.element);
        // Make sure to hide the split view overflow like sashes #52892
        this.container.style.overflow = 'hidden';
    }
    get minimumWidth() { return this.splitView ? this.splitView.minimumSize : this.view.minimumWidth; }
    get maximumWidth() { return this.splitView ? this.splitView.maximumSize : this.view.maximumWidth; }
    get minimumHeight() { return this.view.minimumHeight; }
    get maximumHeight() { return this.view.maximumHeight; }
    get onDidChange() { return this.view.onDidChange; }
    get boundarySashes() { return this._boundarySashes; }
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        if (!this.splitView) {
            return;
        }
        this.splitView.orthogonalStartSash = boundarySashes.top;
        this.splitView.orthogonalEndSash = boundarySashes.bottom;
    }
    layout(width, height, top, left) {
        this.lastLayoutPosition = { width, height, top, left };
        if (this.splitView) {
            this.splitView.layout(width, this.lastLayoutPosition);
            if (!this.didLayout || this.centeredLayoutFixedWidth) {
                this.resizeSplitViews();
            }
        }
        else {
            this.view.layout(width, height, top, left);
        }
        this.didLayout = true;
    }
    resizeSplitViews() {
        if (!this.splitView) {
            return;
        }
        if (this.centeredLayoutFixedWidth) {
            const centerViewWidth = Math.min(this.lastLayoutPosition.width, this.state.targetWidth);
            const marginWidthFloat = (this.lastLayoutPosition.width - centerViewWidth) / 2;
            this.splitView.resizeView(0, Math.floor(marginWidthFloat));
            this.splitView.resizeView(1, centerViewWidth);
            this.splitView.resizeView(2, Math.ceil(marginWidthFloat));
        }
        else {
            const leftMargin = this.state.leftMarginRatio * this.lastLayoutPosition.width;
            const rightMargin = this.state.rightMarginRatio * this.lastLayoutPosition.width;
            const center = this.lastLayoutPosition.width - leftMargin - rightMargin;
            this.splitView.resizeView(0, leftMargin);
            this.splitView.resizeView(1, center);
            this.splitView.resizeView(2, rightMargin);
        }
    }
    setFixedWidth(option) {
        this.centeredLayoutFixedWidth = option;
        if (!!this.splitView) {
            this.updateState();
            this.resizeSplitViews();
        }
    }
    updateState() {
        if (!!this.splitView) {
            this.state.targetWidth = this.splitView.getViewSize(1);
            this.state.leftMarginRatio = this.splitView.getViewSize(0) / this.lastLayoutPosition.width;
            this.state.rightMarginRatio = this.splitView.getViewSize(2) / this.lastLayoutPosition.width;
        }
    }
    isActive() {
        return !!this.splitView;
    }
    styles(style) {
        this.style = style;
        if (this.splitView && this.emptyViews) {
            this.splitView.style(this.style);
            this.emptyViews[0].element.style.backgroundColor = this.style.background.toString();
            this.emptyViews[1].element.style.backgroundColor = this.style.background.toString();
        }
    }
    activate(active) {
        if (active === this.isActive()) {
            return;
        }
        if (active) {
            this.view.element.remove();
            this.splitView = new SplitView(this.container, {
                inverseAltBehavior: true,
                orientation: 1 /* Orientation.HORIZONTAL */,
                styles: this.style
            });
            this.splitView.orthogonalStartSash = this.boundarySashes.top;
            this.splitView.orthogonalEndSash = this.boundarySashes.bottom;
            this.splitViewDisposables.add(this.splitView.onDidSashChange(() => {
                if (!!this.splitView) {
                    this.updateState();
                }
            }));
            this.splitViewDisposables.add(this.splitView.onDidSashReset(() => {
                this.state = { ...defaultState };
                this.resizeSplitViews();
            }));
            this.splitView.layout(this.lastLayoutPosition.width, this.lastLayoutPosition);
            const backgroundColor = this.style ? this.style.background : undefined;
            this.emptyViews = [createEmptyView(backgroundColor), createEmptyView(backgroundColor)];
            this.splitView.addView(this.emptyViews[0], distributeSizing, 0);
            this.splitView.addView(toSplitViewView(this.view, () => this.lastLayoutPosition.height), distributeSizing, 1);
            this.splitView.addView(this.emptyViews[1], distributeSizing, 2);
            this.resizeSplitViews();
        }
        else {
            this.splitView?.el.remove();
            this.splitViewDisposables.clear();
            this.splitView?.dispose();
            this.splitView = undefined;
            this.emptyViews = undefined;
            this.container.appendChild(this.view.element);
            this.view.layout(this.lastLayoutPosition.width, this.lastLayoutPosition.height, this.lastLayoutPosition.top, this.lastLayoutPosition.left);
        }
    }
    isDefault(state) {
        if (this.centeredLayoutFixedWidth) {
            return state.targetWidth === defaultState.targetWidth;
        }
        else {
            return state.leftMarginRatio === defaultState.leftMarginRatio
                && state.rightMarginRatio === defaultState.rightMarginRatio;
        }
    }
    dispose() {
        this.splitViewDisposables.dispose();
        if (this.splitView) {
            this.splitView.dispose();
            this.splitView = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VudGVyZWRWaWV3TGF5b3V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9jZW50ZXJlZC9jZW50ZXJlZFZpZXdMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBd0IsTUFBTSxjQUFjLENBQUM7QUFHdkQsT0FBTyxFQUE0RSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVoSSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBVzVFLE1BQU0sWUFBWSxHQUFzQjtJQUN2QyxXQUFXLEVBQUUsR0FBRztJQUNoQixlQUFlLEVBQUUsTUFBTTtJQUN2QixnQkFBZ0IsRUFBRSxNQUFNO0NBQ3hCLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFxQixFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQztBQUVsRSxTQUFTLGVBQWUsQ0FBQyxVQUE2QjtJQUNyRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDOUIsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDdkQsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPO1FBQ1AsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7UUFDdkIsV0FBVyxFQUFFLEVBQUU7UUFDZixXQUFXLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtRQUNyQyxXQUFXLEVBQUUsS0FBSyxDQUFD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