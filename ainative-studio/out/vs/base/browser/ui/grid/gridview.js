/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import { Sizing, SplitView } from '../splitview/splitview.js';
import { equals as arrayEquals, tail } from '../../../common/arrays.js';
import { Color } from '../../../common/color.js';
import { Emitter, Event, Relay } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import { rot } from '../../../common/numbers.js';
import { isUndefined } from '../../../common/types.js';
import './gridview.css';
export { Orientation } from '../sash/sash.js';
export { LayoutPriority, Sizing } from '../splitview/splitview.js';
const defaultStyles = {
    separatorBorder: Color.transparent
};
export function orthogonal(orientation) {
    return orientation === 0 /* Orientation.VERTICAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
}
export function isGridBranchNode(node) {
    return !!node.children;
}
class LayoutController {
    constructor(isLayoutEnabled) {
        this.isLayoutEnabled = isLayoutEnabled;
    }
}
function toAbsoluteBoundarySashes(sashes, orientation) {
    if (orientation === 1 /* Orientation.HORIZONTAL */) {
        return { left: sashes.start, right: sashes.end, top: sashes.orthogonalStart, bottom: sashes.orthogonalEnd };
    }
    else {
        return { top: sashes.start, bottom: sashes.end, left: sashes.orthogonalStart, right: sashes.orthogonalEnd };
    }
}
function fromAbsoluteBoundarySashes(sashes, orientation) {
    if (orientation === 1 /* Orientation.HORIZONTAL */) {
        return { start: sashes.left, end: sashes.right, orthogonalStart: sashes.top, orthogonalEnd: sashes.bottom };
    }
    else {
        return { start: sashes.top, end: sashes.bottom, orthogonalStart: sashes.left, orthogonalEnd: sashes.right };
    }
}
function validateIndex(index, numChildren) {
    if (Math.abs(index) > numChildren) {
        throw new Error('Invalid index');
    }
    return rot(index, numChildren + 1);
}
class BranchNode {
    get size() { return this._size; }
    get orthogonalSize() { return this._orthogonalSize; }
    get absoluteOffset() { return this._absoluteOffset; }
    get absoluteOrthogonalOffset() { return this._absoluteOrthogonalOffset; }
    get styles() { return this._styles; }
    get width() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.size : this.orthogonalSize;
    }
    get height() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.orthogonalSize : this.size;
    }
    get top() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._absoluteOffset : this._absoluteOrthogonalOffset;
    }
    get left() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._absoluteOrthogonalOffset : this._absoluteOffset;
    }
    get minimumSize() {
        return this.children.length === 0 ? 0 : Math.max(...this.children.map((c, index) => this.splitview.isViewVisible(index) ? c.minimumOrthogonalSize : 0));
    }
    get maximumSize() {
        return Math.min(...this.children.map((c, index) => this.splitview.isViewVisible(index) ? c.maximumOrthogonalSize : Number.POSITIVE_INFINITY));
    }
    get priority() {
        if (this.children.length === 0) {
            return 0 /* LayoutPriority.Normal */;
        }
        const priorities = this.children.map(c => typeof c.priority === 'undefined' ? 0 /* LayoutPriority.Normal */ : c.priority);
        if (priorities.some(p => p === 2 /* LayoutPriority.High */)) {
            return 2 /* LayoutPriority.High */;
        }
        else if (priorities.some(p => p === 1 /* LayoutPriority.Low */)) {
            return 1 /* LayoutPriority.Low */;
        }
        return 0 /* LayoutPriority.Normal */;
    }
    get proportionalLayout() {
        if (this.children.length === 0) {
            return true;
        }
        return this.children.every(c => c.proportionalLayout);
    }
    get minimumOrthogonalSize() {
        return this.splitview.minimumSize;
    }
    get maximumOrthogonalSize() {
        return this.splitview.maximumSize;
    }
    get minimumWidth() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumOrthogonalSize : this.minimumSize;
    }
    get minimumHeight() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumSize : this.minimumOrthogonalSize;
    }
    get maximumWidth() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumOrthogonalSize : this.maximumSize;
    }
    get maximumHeight() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumSize : this.maximumOrthogonalSize;
    }
    get boundarySashes() { return this._boundarySashes; }
    set boundarySashes(boundarySashes) {
        if (this._boundarySashes.start === boundarySashes.start
            && this._boundarySashes.end === boundarySashes.end
            && this._boundarySashes.orthogonalStart === boundarySashes.orthogonalStart
            && this._boundarySashes.orthogonalEnd === boundarySashes.orthogonalEnd) {
            return;
        }
        this._boundarySashes = boundarySashes;
        this.splitview.orthogonalStartSash = boundarySashes.orthogonalStart;
        this.splitview.orthogonalEndSash = boundarySashes.orthogonalEnd;
        for (let index = 0; index < this.children.length; index++) {
            const child = this.children[index];
            const first = index === 0;
            const last = index === this.children.length - 1;
            child.boundarySashes = {
                start: boundarySashes.orthogonalStart,
                end: boundarySashes.orthogonalEnd,
                orthogonalStart: first ? boundarySashes.start : child.boundarySashes.orthogonalStart,
                orthogonalEnd: last ? boundarySashes.end : child.boundarySashes.orthogonalEnd,
            };
        }
    }
    get edgeSnapping() { return this._edgeSnapping; }
    set edgeSnapping(edgeSnapping) {
        if (this._edgeSnapping === edgeSnapping) {
            return;
        }
        this._edgeSnapping = edgeSnapping;
        for (const child of this.children) {
            if (child instanceof BranchNode) {
                child.edgeSnapping = edgeSnapping;
            }
        }
        this.updateSplitviewEdgeSnappingEnablement();
    }
    constructor(orientation, layoutController, styles, splitviewProportionalLayout, size = 0, orthogonalSize = 0, edgeSnapping = false, childDescriptors) {
        this.orientation = orientation;
        this.layoutController = layoutController;
        this.splitviewProportionalLayout = splitviewProportionalLayout;
        this.children = [];
        this._absoluteOffset = 0;
        this._absoluteOrthogonalOffset = 0;
        this.absoluteOrthogonalSize = 0;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidVisibilityChange = new Emitter();
        this.onDidVisibilityChange = this._onDidVisibilityChange.event;
        this.childrenVisibilityChangeDisposable = new DisposableStore();
        this._onDidScroll = new Emitter();
        this.onDidScrollDisposable = Disposable.None;
        this.onDidScroll = this._onDidScroll.event;
        this.childrenChangeDisposable = Disposable.None;
        this._onDidSashReset = new Emitter();
        this.onDidSashReset = this._onDidSashReset.event;
        this.splitviewSashResetDisposable = Disposable.None;
        this.childrenSashResetDisposable = Disposable.None;
        this._boundarySashes = {};
        this._edgeSnapping = false;
        this._styles = styles;
        this._size = size;
        this._orthogonalSize = orthogonalSize;
        this.element = $('.monaco-grid-branch-node');
        if (!childDescriptors) {
            // Normal behavior, we have no children yet, just set up the splitview
            this.splitview = new SplitView(this.element, { orientation, styles, proportionalLayout: splitviewProportionalLayout });
            this.splitview.layout(size, { orthogonalSize, absoluteOffset: 0, absoluteOrthogonalOffset: 0, absoluteSize: size, absoluteOrthogonalSize: orthogonalSize });
        }
        else {
            // Reconstruction behavior, we want to reconstruct a splitview
            const descriptor = {
                views: childDescriptors.map(childDescriptor => {
                    return {
                        view: childDescriptor.node,
                        size: childDescriptor.node.size,
                        visible: childDescriptor.visible !== false
                    };
                }),
                size: this.orthogonalSize
            };
            const options = { proportionalLayout: splitviewProportionalLayout, orientation, styles };
            this.children = childDescriptors.map(c => c.node);
            this.splitview = new SplitView(this.element, { ...options, descriptor });
            this.children.forEach((node, index) => {
                const first = index === 0;
                const last = index === this.children.length;
                node.boundarySashes = {
                    start: this.boundarySashes.orthogonalStart,
                    end: this.boundarySashes.orthogonalEnd,
                    orthogonalStart: first ? this.boundarySashes.start : this.splitview.sashes[index - 1],
                    orthogonalEnd: last ? this.boundarySashes.end : this.splitview.sashes[index],
                };
            });
        }
        const onDidSashReset = Event.map(this.splitview.onDidSashReset, i => [i]);
        this.splitviewSashResetDisposable = onDidSashReset(this._onDidSashReset.fire, this._onDidSashReset);
        this.updateChildrenEvents();
    }
    style(styles) {
        this._styles = styles;
        this.splitview.style(styles);
        for (const child of this.children) {
            if (child instanceof BranchNode) {
                child.style(styles);
            }
        }
    }
    layout(size, offset, ctx) {
        if (!this.layoutController.isLayoutEnabled) {
            return;
        }
        if (typeof ctx === 'undefined') {
            throw new Error('Invalid state');
        }
        // branch nodes should flip the normal/orthogonal directions
        this._size = ctx.orthogonalSize;
        this._orthogonalSize = size;
        this._absoluteOffset = ctx.absoluteOffset + offset;
        this._absoluteOrthogonalOffset = ctx.absoluteOrthogonalOffset;
        this.absoluteOrthogonalSize = ctx.absoluteOrthogonalSize;
        this.splitview.layout(ctx.orthogonalSize, {
            orthogonalSize: size,
            absoluteOffset: this._absoluteOrthogonalOffset,
            absoluteOrthogonalOffset: this._absoluteOffset,
            absoluteSize: ctx.absoluteOrthogonalSize,
            absoluteOrthogonalSize: ctx.absoluteSize
        });
        this.updateSplitviewEdgeSnappingEnablement();
    }
    setVisible(visible) {
        for (const child of this.children) {
            child.setVisible(visible);
        }
    }
    addChild(node, size, index, skipLayout) {
        index = validateIndex(index, this.children.length);
        this.splitview.addView(node, size, index, skipLayout);
        this.children.splice(index, 0, node);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
    }
    removeChild(index, sizing) {
        index = validateIndex(index, this.children.length);
        const result = this.splitview.removeView(index, sizing);
        this.children.splice(index, 1);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
        return result;
    }
    removeAllChildren() {
        const result = this.splitview.removeAllViews();
        this.children.splice(0, this.children.length);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
        return result;
    }
    moveChild(from, to) {
        from = validateIndex(from, this.children.length);
        to = validateIndex(to, this.children.length);
        if (from === to) {
            return;
        }
        if (from < to) {
            to -= 1;
        }
        this.splitview.moveView(from, to);
        this.children.splice(to, 0, this.children.splice(from, 1)[0]);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
    }
    swapChildren(from, to) {
        from = validateIndex(from, this.children.length);
        to = validateIndex(to, this.children.length);
        if (from === to) {
            return;
        }
        this.splitview.swapViews(from, to);
        // swap boundary sashes
        [this.children[from].boundarySashes, this.children[to].boundarySashes]
            = [this.children[from].boundarySashes, this.children[to].boundarySashes];
        // swap children
        [this.children[from], this.children[to]] = [this.children[to], this.children[from]];
        this.onDidChildrenChange();
    }
    resizeChild(index, size) {
        index = validateIndex(index, this.children.length);
        this.splitview.resizeView(index, size);
    }
    isChildExpanded(index) {
        return this.splitview.isViewExpanded(index);
    }
    distributeViewSizes(recursive = false) {
        this.splitview.distributeViewSizes();
        if (recursive) {
            for (const child of this.children) {
                if (child instanceof BranchNode) {
                    child.distributeViewSizes(true);
                }
            }
        }
    }
    getChildSize(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.getViewSize(index);
    }
    isChildVisible(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.isViewVisible(index);
    }
    setChildVisible(index, visible) {
        index = validateIndex(index, this.children.length);
        if (this.splitview.isViewVisible(index) === visible) {
            return;
        }
        const wereAllChildrenHidden = this.splitview.contentSize === 0;
        this.splitview.setViewVisible(index, visible);
        const areAllChildrenHidden = this.splitview.contentSize === 0;
        // If all children are hidden then the parent should hide the entire splitview
        // If the entire splitview is hidden then the parent should show the splitview when a child is shown
        if ((visible && wereAllChildrenHidden) || (!visible && areAllChildrenHidden)) {
            this._onDidVisibilityChange.fire(visible);
        }
    }
    getChildCachedVisibleSize(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.getViewCachedVisibleSize(index);
    }
    updateBoundarySashes() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].boundarySashes = {
                start: this.boundarySashes.orthogonalStart,
                end: this.boundarySashes.orthogonalEnd,
                orthogonalStart: i === 0 ? this.boundarySashes.start : this.splitview.sashes[i - 1],
                orthogonalEnd: i === this.children.length - 1 ? this.boundarySashes.end : this.splitview.sashes[i],
            };
        }
    }
    onDidChildrenChange() {
        this.updateChildrenEvents();
        this._onDidChange.fire(undefined);
    }
    updateChildrenEvents() {
        const onDidChildrenChange = Event.map(Event.any(...this.children.map(c => c.onDidChange)), () => undefined);
        this.childrenChangeDisposable.dispose();
        this.childrenChangeDisposable = onDidChildrenChange(this._onDidChange.fire, this._onDidChange);
        const onDidChildrenSashReset = Event.any(...this.children.map((c, i) => Event.map(c.onDidSashReset, location => [i, ...location])));
        this.childrenSashResetDisposable.dispose();
        this.childrenSashResetDisposable = onDidChildrenSashReset(this._onDidSashReset.fire, this._onDidSashReset);
        const onDidScroll = Event.any(Event.signal(this.splitview.onDidScroll), ...this.children.map(c => c.onDidScroll));
        this.onDidScrollDisposable.dispose();
        this.onDidScrollDisposable = onDidScroll(this._onDidScroll.fire, this._onDidScroll);
        this.childrenVisibilityChangeDisposable.clear();
        this.children.forEach((child, index) => {
            if (child instanceof BranchNode) {
                this.childrenVisibilityChangeDisposable.add(child.onDidVisibilityChange((visible) => {
                    this.setChildVisible(index, visible);
                }));
            }
        });
    }
    trySet2x2(other) {
        if (this.children.length !== 2 || other.children.length !== 2) {
            return Disposable.None;
        }
        if (this.getChildSize(0) !== other.getChildSize(0)) {
            return Disposable.None;
        }
        const [firstChild, secondChild] = this.children;
        const [otherFirstChild, otherSecondChild] = other.children;
        if (!(firstChild instanceof LeafNode) || !(secondChild instanceof LeafNode)) {
            return Disposable.None;
        }
        if (!(otherFirstChild instanceof LeafNode) || !(otherSecondChild instanceof LeafNode)) {
            return Disposable.None;
        }
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = firstChild;
            firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = secondChild;
            otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = otherFirstChild;
            otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = otherSecondChild;
        }
        else {
            otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = firstChild;
            otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = secondChild;
            firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = otherFirstChild;
            secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = otherSecondChild;
        }
        const mySash = this.splitview.sashes[0];
        const otherSash = other.splitview.sashes[0];
        mySash.linkedSash = otherSash;
        otherSash.linkedSash = mySash;
        this._onDidChange.fire(undefined);
        other._onDidChange.fire(undefined);
        return toDisposable(() => {
            mySash.linkedSash = otherSash.linkedSash = undefined;
            firstChild.linkedHeightNode = firstChild.linkedWidthNode = undefined;
            secondChild.linkedHeightNode = secondChild.linkedWidthNode = undefined;
            otherFirstChild.linkedHeightNode = otherFirstChild.linkedWidthNode = undefined;
            otherSecondChild.linkedHeightNode = otherSecondChild.linkedWidthNode = undefined;
        });
    }
    updateSplitviewEdgeSnappingEnablement() {
        this.splitview.startSnappingEnabled = this._edgeSnapping || this._absoluteOrthogonalOffset > 0;
        this.splitview.endSnappingEnabled = this._edgeSnapping || this._absoluteOrthogonalOffset + this._size < this.absoluteOrthogonalSize;
    }
    dispose() {
        for (const child of this.children) {
            child.dispose();
        }
        this._onDidChange.dispose();
        this._onDidSashReset.dispose();
        this._onDidVisibilityChange.dispose();
        this.childrenVisibilityChangeDisposable.dispose();
        this.splitviewSashResetDisposable.dispose();
        this.childrenSashResetDisposable.dispose();
        this.childrenChangeDisposable.dispose();
        this.onDidScrollDisposable.dispose();
        this.splitview.dispose();
    }
}
/**
 * Creates a latched event that avoids being fired when the view
 * constraints do not change at all.
 */
function createLatchedOnDidChangeViewEvent(view) {
    const [onDidChangeViewConstraints, onDidSetViewSize] = Event.split(view.onDidChange, isUndefined);
    return Event.any(onDidSetViewSize, Event.map(Event.latch(Event.map(onDidChangeViewConstraints, _ => ([view.minimumWidth, view.maximumWidth, view.minimumHeight, view.maximumHeight])), arrayEquals), _ => undefined));
}
class LeafNode {
    get size() { return this._size; }
    get orthogonalSize() { return this._orthogonalSize; }
    get linkedWidthNode() { return this._linkedWidthNode; }
    set linkedWidthNode(node) {
        this._onDidLinkedWidthNodeChange.input = node ? node._onDidViewChange : Event.None;
        this._linkedWidthNode = node;
        this._onDidSetLinkedNode.fire(undefined);
    }
    get linkedHeightNode() { return this._linkedHeightNode; }
    set linkedHeightNode(node) {
        this._onDidLinkedHeightNodeChange.input = node ? node._onDidViewChange : Event.None;
        this._linkedHeightNode = node;
        this._onDidSetLinkedNode.fire(undefined);
    }
    constructor(view, orientation, layoutController, orthogonalSize, size = 0) {
        this.view = view;
        this.orientation = orientation;
        this.layoutController = layoutController;
        this._size = 0;
        this.absoluteOffset = 0;
        this.absoluteOrthogonalOffset = 0;
        this.onDidScroll = Event.None;
        this.onDidSashReset = Event.None;
        this._onDidLinkedWidthNodeChange = new Relay();
        this._linkedWidthNode = undefined;
        this._onDidLinkedHeightNodeChange = new Relay();
        this._linkedHeightNode = undefined;
        this._onDidSetLinkedNode = new Emitter();
        this.disposables = new DisposableStore();
        this._boundarySashes = {};
        this.cachedWidth = 0;
        this.cachedHeight = 0;
        this.cachedTop = 0;
        this.cachedLeft = 0;
        this._orthogonalSize = orthogonalSize;
        this._size = size;
        const onDidChange = createLatchedOnDidChangeViewEvent(view);
        this._onDidViewChange = Event.map(onDidChange, e => e && (this.orientation === 0 /* Orientation.VERTICAL */ ? e.width : e.height), this.disposables);
        this.onDidChange = Event.any(this._onDidViewChange, this._onDidSetLinkedNode.event, this._onDidLinkedWidthNodeChange.event, this._onDidLinkedHeightNodeChange.event);
    }
    get width() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.orthogonalSize : this.size;
    }
    get height() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.size : this.orthogonalSize;
    }
    get top() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.absoluteOffset : this.absoluteOrthogonalOffset;
    }
    get left() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.absoluteOrthogonalOffset : this.absoluteOffset;
    }
    get element() {
        return this.view.element;
    }
    get minimumWidth() {
        return this.linkedWidthNode ? Math.max(this.linkedWidthNode.view.minimumWidth, this.view.minimumWidth) : this.view.minimumWidth;
    }
    get maximumWidth() {
        return this.linkedWidthNode ? Math.min(this.linkedWidthNode.view.maximumWidth, this.view.maximumWidth) : this.view.maximumWidth;
    }
    get minimumHeight() {
        return this.linkedHeightNode ? Math.max(this.linkedHeightNode.view.minimumHeight, this.view.minimumHeight) : this.view.minimumHeight;
    }
    get maximumHeight() {
        return this.linkedHeightNode ? Math.min(this.linkedHeightNode.view.maximumHeight, this.view.maximumHeight) : this.view.maximumHeight;
    }
    get minimumSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumHeight : this.minimumWidth;
    }
    get maximumSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumHeight : this.maximumWidth;
    }
    get priority() {
        return this.view.priority;
    }
    get proportionalLayout() {
        return this.view.proportionalLayout ?? true;
    }
    get snap() {
        return this.view.snap;
    }
    get minimumOrthogonalSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumWidth : this.minimumHeight;
    }
    get maximumOrthogonalSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumWidth : this.maximumHeight;
    }
    get boundarySashes() { return this._boundarySashes; }
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        this.view.setBoundarySashes?.(toAbsoluteBoundarySashes(boundarySashes, this.orientation));
    }
    layout(size, offset, ctx) {
        if (!this.layoutController.isLayoutEnabled) {
            return;
        }
        if (typeof ctx === 'undefined') {
            throw new Error('Invalid state');
        }
        this._size = size;
        this._orthogonalSize = ctx.orthogonalSize;
        this.absoluteOffset = ctx.absoluteOffset + offset;
        this.absoluteOrthogonalOffset = ctx.absoluteOrthogonalOffset;
        this._layout(this.width, this.height, this.top, this.left);
    }
    _layout(width, height, top, left) {
        if (this.cachedWidth === width && this.cachedHeight === height && this.cachedTop === top && this.cachedLeft === left) {
            return;
        }
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.cachedTop = top;
        this.cachedLeft = left;
        this.view.layout(width, height, top, left);
    }
    setVisible(visible) {
        this.view.setVisible?.(visible);
    }
    dispose() {
        this.disposables.dispose();
    }
}
function flipNode(node, size, orthogonalSize) {
    if (node instanceof BranchNode) {
        const result = new BranchNode(orthogonal(node.orientation), node.layoutController, node.styles, node.splitviewProportionalLayout, size, orthogonalSize, node.edgeSnapping);
        let totalSize = 0;
        for (let i = node.children.length - 1; i >= 0; i--) {
            const child = node.children[i];
            const childSize = child instanceof BranchNode ? child.orthogonalSize : child.size;
            let newSize = node.size === 0 ? 0 : Math.round((size * childSize) / node.size);
            totalSize += newSize;
            // The last view to add should adjust to rounding errors
            if (i === 0) {
                newSize += size - totalSize;
            }
            result.addChild(flipNode(child, orthogonalSize, newSize), newSize, 0, true);
        }
        node.dispose();
        return result;
    }
    else {
        const result = new LeafNode(node.view, orthogonal(node.orientation), node.layoutController, orthogonalSize);
        node.dispose();
        return result;
    }
}
/**
 * The {@link GridView} is the UI component which implements a two dimensional
 * flex-like layout algorithm for a collection of {@link IView} instances, which
 * are mostly HTMLElement instances with size constraints. A {@link GridView} is a
 * tree composition of multiple {@link SplitView} instances, orthogonal between
 * one another. It will respect view's size contraints, just like the SplitView.
 *
 * It has a low-level index based API, allowing for fine grain performant operations.
 * Look into the {@link Grid} widget for a higher-level API.
 *
 * Features:
 * - flex-like layout algorithm
 * - snap support
 * - corner sash support
 * - Alt key modifier behavior, macOS style
 * - layout (de)serialization
 */
export class GridView {
    get root() { return this._root; }
    set root(root) {
        const oldRoot = this._root;
        if (oldRoot) {
            oldRoot.element.remove();
            oldRoot.dispose();
        }
        this._root = root;
        this.element.appendChild(root.element);
        this.onDidSashResetRelay.input = root.onDidSashReset;
        this._onDidChange.input = Event.map(root.onDidChange, () => undefined); // TODO
        this._onDidScroll.input = root.onDidScroll;
    }
    /**
     * The width of the grid.
     */
    get width() { return this.root.width; }
    /**
     * The height of the grid.
     */
    get height() { return this.root.height; }
    /**
     * The minimum width of the grid.
     */
    get minimumWidth() { return this.root.minimumWidth; }
    /**
     * The minimum height of the grid.
     */
    get minimumHeight() { return this.root.minimumHeight; }
    /**
     * The maximum width of the grid.
     */
    get maximumWidth() { return this.root.maximumHeight; }
    /**
     * The maximum height of the grid.
     */
    get maximumHeight() { return this.root.maximumHeight; }
    get orientation() { return this._root.orientation; }
    get boundarySashes() { return this._boundarySashes; }
    /**
     * The orientation of the grid. Matches the orientation of the root
     * {@link SplitView} in the grid's tree model.
     */
    set orientation(orientation) {
        if (this._root.orientation === orientation) {
            return;
        }
        const { size, orthogonalSize, absoluteOffset, absoluteOrthogonalOffset } = this._root;
        this.root = flipNode(this._root, orthogonalSize, size);
        this.root.layout(size, 0, { orthogonalSize, absoluteOffset: absoluteOrthogonalOffset, absoluteOrthogonalOffset: absoluteOffset, absoluteSize: size, absoluteOrthogonalSize: orthogonalSize });
        this.boundarySashes = this.boundarySashes;
    }
    /**
     * A collection of sashes perpendicular to each edge of the grid.
     * Corner sashes will be created for each intersection.
     */
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        this.root.boundarySashes = fromAbsoluteBoundarySashes(boundarySashes, this.orientation);
    }
    /**
     * Enable/disable edge snapping across all grid views.
     */
    set edgeSnapping(edgeSnapping) {
        this.root.edgeSnapping = edgeSnapping;
    }
    /**
     * Create a new {@link GridView} instance.
     *
     * @remarks It's the caller's responsibility to append the
     * {@link GridView.element} to the page's DOM.
     */
    constructor(options = {}) {
        this.onDidSashResetRelay = new Relay();
        this._onDidScroll = new Relay();
        this._onDidChange = new Relay();
        this._boundarySashes = {};
        this.disposable2x2 = Disposable.None;
        /**
         * Fires whenever the user double clicks a {@link Sash sash}.
         */
        this.onDidSashReset = this.onDidSashResetRelay.event;
        /**
         * Fires whenever the user scrolls a {@link SplitView} within
         * the grid.
         */
        this.onDidScroll = this._onDidScroll.event;
        /**
         * Fires whenever a view within the grid changes its size constraints.
         */
        this.onDidChange = this._onDidChange.event;
        this.maximizedNode = undefined;
        this._onDidChangeViewMaximized = new Emitter();
        this.onDidChangeViewMaximized = this._onDidChangeViewMaximized.event;
        this.element = $('.monaco-grid-view');
        this.styles = options.styles || defaultStyles;
        this.proportionalLayout = typeof options.proportionalLayout !== 'undefined' ? !!options.proportionalLayout : true;
        this.layoutController = new LayoutController(false);
        this.root = new BranchNode(0 /* Orientation.VERTICAL */, this.layoutController, this.styles, this.proportionalLayout);
    }
    style(styles) {
        this.styles = styles;
        this.root.style(styles);
    }
    /**
     * Layout the {@link GridView}.
     *
     * Optionally provide a `top` and `left` positions, those will propagate
     * as an origin for positions passed to {@link IView.layout}.
     *
     * @param width The width of the {@link GridView}.
     * @param height The height of the {@link GridView}.
     * @param top Optional, the top location of the {@link GridView}.
     * @param left Optional, the left location of the {@link GridView}.
     */
    layout(width, height, top = 0, left = 0) {
        this.layoutController.isLayoutEnabled = true;
        const [size, orthogonalSize, offset, orthogonalOffset] = this.root.orientation === 1 /* Orientation.HORIZONTAL */ ? [height, width, top, left] : [width, height, left, top];
        this.root.layout(size, 0, { orthogonalSize, absoluteOffset: offset, absoluteOrthogonalOffset: orthogonalOffset, absoluteSize: size, absoluteOrthogonalSize: orthogonalSize });
    }
    /**
     * Add a {@link IView view} to this {@link GridView}.
     *
     * @param view The view to add.
     * @param size Either a fixed size, or a dynamic {@link Sizing} strategy.
     * @param location The {@link GridLocation location} to insert the view on.
     */
    addView(view, size, location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (parent instanceof BranchNode) {
            const node = new LeafNode(view, orthogonal(parent.orientation), this.layoutController, parent.orthogonalSize);
            try {
                parent.addChild(node, size, index);
            }
            catch (err) {
                node.dispose();
                throw err;
            }
        }
        else {
            const [, grandParent] = tail(pathToParent);
            const [, parentIndex] = tail(rest);
            let newSiblingSize = 0;
            const newSiblingCachedVisibleSize = grandParent.getChildCachedVisibleSize(parentIndex);
            if (typeof newSiblingCachedVisibleSize === 'number') {
                newSiblingSize = Sizing.Invisible(newSiblingCachedVisibleSize);
            }
            const oldChild = grandParent.removeChild(parentIndex);
            oldChild.dispose();
            const newParent = new BranchNode(parent.orientation, parent.layoutController, this.styles, this.proportionalLayout, parent.size, parent.orthogonalSize, grandParent.edgeSnapping);
            grandParent.addChild(newParent, parent.size, parentIndex);
            const newSibling = new LeafNode(parent.view, grandParent.orientation, this.layoutController, parent.size);
            newParent.addChild(newSibling, newSiblingSize, 0);
            if (typeof size !== 'number' && size.type === 'split') {
                size = Sizing.Split(0);
            }
            const node = new LeafNode(view, grandParent.orientation, this.layoutController, parent.size);
            newParent.addChild(node, size, index);
        }
        this.trySet2x2();
    }
    /**
     * Remove a {@link IView view} from this {@link GridView}.
     *
     * @param location The {@link GridLocation location} of the {@link IView view}.
     * @param sizing Whether to distribute other {@link IView view}'s sizes.
     */
    removeView(location, sizing) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        const node = parent.children[index];
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        parent.removeChild(index, sizing);
        node.dispose();
        if (parent.children.length === 0) {
            throw new Error('Invalid grid state');
        }
        if (parent.children.length > 1) {
            this.trySet2x2();
            return node.view;
        }
        if (pathToParent.length === 0) { // parent is root
            const sibling = parent.children[0];
            if (sibling instanceof LeafNode) {
                return node.view;
            }
            // we must promote sibling to be the new root
            parent.removeChild(0);
            parent.dispose();
            this.root = sibling;
            this.boundarySashes = this.boundarySashes;
            this.trySet2x2();
            return node.view;
        }
        const [, grandParent] = tail(pathToParent);
        const [, parentIndex] = tail(rest);
        const isSiblingVisible = parent.isChildVisible(0);
        const sibling = parent.removeChild(0);
        const sizes = grandParent.children.map((_, i) => grandParent.getChildSize(i));
        grandParent.removeChild(parentIndex, sizing);
        parent.dispose();
        if (sibling instanceof BranchNode) {
            sizes.splice(parentIndex, 1, ...sibling.children.map(c => c.size));
            const siblingChildren = sibling.removeAllChildren();
            for (let i = 0; i < siblingChildren.length; i++) {
                grandParent.addChild(siblingChildren[i], siblingChildren[i].size, parentIndex + i);
            }
        }
        else {
            const newSibling = new LeafNode(sibling.view, orthogonal(sibling.orientation), this.layoutController, sibling.size);
            const sizing = isSiblingVisible ? sibling.orthogonalSize : Sizing.Invisible(sibling.orthogonalSize);
            grandParent.addChild(newSibling, sizing, parentIndex);
        }
        sibling.dispose();
        for (let i = 0; i < sizes.length; i++) {
            grandParent.resizeChild(i, sizes[i]);
        }
        this.trySet2x2();
        return node.view;
    }
    /**
     * Move a {@link IView view} within its parent.
     *
     * @param parentLocation The {@link GridLocation location} of the {@link IView view}'s parent.
     * @param from The index of the {@link IView view} to move.
     * @param to The index where the {@link IView view} should move to.
     */
    moveView(parentLocation, from, to) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [, parent] = this.getNode(parentLocation);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        parent.moveChild(from, to);
        this.trySet2x2();
    }
    /**
     * Swap two {@link IView views} within the {@link GridView}.
     *
     * @param from The {@link GridLocation location} of one view.
     * @param to The {@link GridLocation location} of another view.
     */
    swapViews(from, to) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [fromRest, fromIndex] = tail(from);
        const [, fromParent] = this.getNode(fromRest);
        if (!(fromParent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        const fromSize = fromParent.getChildSize(fromIndex);
        const fromNode = fromParent.children[fromIndex];
        if (!(fromNode instanceof LeafNode)) {
            throw new Error('Invalid from location');
        }
        const [toRest, toIndex] = tail(to);
        const [, toParent] = this.getNode(toRest);
        if (!(toParent instanceof BranchNode)) {
            throw new Error('Invalid to location');
        }
        const toSize = toParent.getChildSize(toIndex);
        const toNode = toParent.children[toIndex];
        if (!(toNode instanceof LeafNode)) {
            throw new Error('Invalid to location');
        }
        if (fromParent === toParent) {
            fromParent.swapChildren(fromIndex, toIndex);
        }
        else {
            fromParent.removeChild(fromIndex);
            toParent.removeChild(toIndex);
            fromParent.addChild(toNode, fromSize, fromIndex);
            toParent.addChild(fromNode, toSize, toIndex);
        }
        this.trySet2x2();
    }
    /**
     * Resize a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view.
     * @param size The size the view should be. Optionally provide a single dimension.
     */
    resizeView(location, size) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        if (!size.width && !size.height) {
            return;
        }
        const [parentSize, grandParentSize] = parent.orientation === 1 /* Orientation.HORIZONTAL */ ? [size.width, size.height] : [size.height, size.width];
        if (typeof grandParentSize === 'number' && pathToParent.length > 0) {
            const [, grandParent] = tail(pathToParent);
            const [, parentIndex] = tail(rest);
            grandParent.resizeChild(parentIndex, grandParentSize);
        }
        if (typeof parentSize === 'number') {
            parent.resizeChild(index, parentSize);
        }
        this.trySet2x2();
    }
    /**
     * Get the size of a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view. Provide `undefined` to get
     * the size of the grid itself.
     */
    getViewSize(location) {
        if (!location) {
            return { width: this.root.width, height: this.root.height };
        }
        const [, node] = this.getNode(location);
        return { width: node.width, height: node.height };
    }
    /**
     * Get the cached visible size of a {@link IView view}. This was the size
     * of the view at the moment it last became hidden.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    getViewCachedVisibleSize(location) {
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        return parent.getChildCachedVisibleSize(index);
    }
    /**
     * Maximize the size of a {@link IView view} by collapsing all other views
     * to their minimum sizes.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    expandView(location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [ancestors, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        for (let i = 0; i < ancestors.length; i++) {
            ancestors[i].resizeChild(location[i], Number.POSITIVE_INFINITY);
        }
    }
    /**
     * Returns whether all other {@link IView views} are at their minimum size.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewExpanded(location) {
        if (this.hasMaximizedView()) {
            // No view can be expanded when a view is maximized
            return false;
        }
        const [ancestors, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        for (let i = 0; i < ancestors.length; i++) {
            if (!ancestors[i].isChildExpanded(location[i])) {
                return false;
            }
        }
        return true;
    }
    maximizeView(location) {
        const [, nodeToMaximize] = this.getNode(location);
        if (!(nodeToMaximize instanceof LeafNode)) {
            throw new Error('Location is not a LeafNode');
        }
        if (this.maximizedNode === nodeToMaximize) {
            return;
        }
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        function hideAllViewsBut(parent, exclude) {
            for (let i = 0; i < parent.children.length; i++) {
                const child = parent.children[i];
                if (child instanceof LeafNode) {
                    if (child !== exclude) {
                        parent.setChildVisible(i, false);
                    }
                }
                else {
                    hideAllViewsBut(child, exclude);
                }
            }
        }
        hideAllViewsBut(this.root, nodeToMaximize);
        this.maximizedNode = nodeToMaximize;
        this._onDidChangeViewMaximized.fire(true);
    }
    exitMaximizedView() {
        if (!this.maximizedNode) {
            return;
        }
        this.maximizedNode = undefined;
        // When hiding a view, it's previous size is cached.
        // To restore the sizes of all views, they need to be made visible in reverse order.
        function showViewsInReverseOrder(parent) {
            for (let index = parent.children.length - 1; index >= 0; index--) {
                const child = parent.children[index];
                if (child instanceof LeafNode) {
                    parent.setChildVisible(index, true);
                }
                else {
                    showViewsInReverseOrder(child);
                }
            }
        }
        showViewsInReverseOrder(this.root);
        this._onDidChangeViewMaximized.fire(false);
    }
    hasMaximizedView() {
        return this.maximizedNode !== undefined;
    }
    /**
     * Returns whether the {@link IView view} is maximized.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewMaximized(location) {
        const [, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Location is not a LeafNode');
        }
        return node === this.maximizedNode;
    }
    /**
     * Distribute the size among all {@link IView views} within the entire
     * grid or within a single {@link SplitView}.
     *
     * @param location The {@link GridLocation location} of a view containing
     * children views, which will have their sizes distributed within the parent
     * view's size. Provide `undefined` to recursively distribute all views' sizes
     * in the entire grid.
     */
    distributeViewSizes(location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        if (!location) {
            this.root.distributeViewSizes(true);
            return;
        }
        const [, node] = this.getNode(location);
        if (!(node instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        node.distributeViewSizes();
        this.trySet2x2();
    }
    /**
     * Returns whether a {@link IView view} is visible.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewVisible(location) {
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        return parent.isChildVisible(index);
    }
    /**
     * Set the visibility state of a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    setViewVisible(location, visible) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
            return;
        }
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        parent.setChildVisible(index, visible);
    }
    getView(location) {
        const node = location ? this.getNode(location)[1] : this._root;
        return this._getViews(node, this.orientation);
    }
    /**
     * Construct a new {@link GridView} from a JSON object.
     *
     * @param json The JSON object.
     * @param deserializer A deserializer which can revive each view.
     * @returns A new {@link GridView} instance.
     */
    static deserialize(json, deserializer, options = {}) {
        if (typeof json.orientation !== 'number') {
            throw new Error('Invalid JSON: \'orientation\' property must be a number.');
        }
        else if (typeof json.width !== 'number') {
            throw new Error('Invalid JSON: \'width\' property must be a number.');
        }
        else if (typeof json.height !== 'number') {
            throw new Error('Invalid JSON: \'height\' property must be a number.');
        }
        else if (json.root?.type !== 'branch') {
            throw new Error('Invalid JSON: \'root\' property must have \'type\' value of branch.');
        }
        const orientation = json.orientation;
        const height = json.height;
        const result = new GridView(options);
        result._deserialize(json.root, orientation, deserializer, height);
        return result;
    }
    _deserialize(root, orientation, deserializer, orthogonalSize) {
        this.root = this._deserializeNode(root, orientation, deserializer, orthogonalSize);
    }
    _deserializeNode(node, orientation, deserializer, orthogonalSize) {
        let result;
        if (node.type === 'branch') {
            const serializedChildren = node.data;
            const children = serializedChildren.map(serializedChild => {
                return {
                    node: this._deserializeNode(serializedChild, orthogonal(orientation), deserializer, node.size),
                    visible: serializedChild.visible
                };
            });
            result = new BranchNode(orientation, this.layoutController, this.styles, this.proportionalLayout, node.size, orthogonalSize, undefined, children);
        }
        else {
            result = new LeafNode(deserializer.fromJSON(node.data), orientation, this.layoutController, orthogonalSize, node.size);
            if (node.maximized && !this.maximizedNode) {
                this.maximizedNode = result;
                this._onDidChangeViewMaximized.fire(true);
            }
        }
        return result;
    }
    _getViews(node, orientation, cachedVisibleSize) {
        const box = { top: node.top, left: node.left, width: node.width, height: node.height };
        if (node instanceof LeafNode) {
            return { view: node.view, box, cachedVisibleSize, maximized: this.maximizedNode === node };
        }
        const children = [];
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const cachedVisibleSize = node.getChildCachedVisibleSize(i);
            children.push(this._getViews(child, orthogonal(orientation), cachedVisibleSize));
        }
        return { children, box };
    }
    getNode(location, node = this.root, path = []) {
        if (location.length === 0) {
            return [path, node];
        }
        if (!(node instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        const [index, ...rest] = location;
        if (index < 0 || index >= node.children.length) {
            throw new Error('Invalid location');
        }
        const child = node.children[index];
        path.push(node);
        return this.getNode(rest, child, path);
    }
    /**
     * Attempt to lock the {@link Sash sashes} in this {@link GridView} so
     * the grid behaves as a 2x2 matrix, with a corner sash in the middle.
     *
     * In case the grid isn't a 2x2 grid _and_ all sashes are not aligned,
     * this method is a no-op.
     */
    trySet2x2() {
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        if (this.root.children.length !== 2) {
            return;
        }
        const [first, second] = this.root.children;
        if (!(first instanceof BranchNode) || !(second instanceof BranchNode)) {
            return;
        }
        this.disposable2x2 = first.trySet2x2(second);
    }
    /**
     * Populate a map with views to DOM nodes.
     * @remarks To be used internally only.
     */
    getViewMap(map, node) {
        if (!node) {
            node = this.root;
        }
        if (node instanceof BranchNode) {
            node.children.forEach(child => this.getViewMap(map, child));
        }
        else {
            map.set(node.view, node.element);
        }
    }
    dispose() {
        this.onDidSashResetRelay.dispose();
        this.root.dispose();
        this.element.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvZ3JpZC9ncmlkdmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRWpDLE9BQU8sRUFBMkUsTUFBTSxFQUFjLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ25KLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sZ0JBQWdCLENBQUM7QUFFeEIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFJbkUsTUFBTSxhQUFhLEdBQW9CO0lBQ3RDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVztDQUNsQyxDQUFDO0FBa0pGLE1BQU0sVUFBVSxVQUFVLENBQUMsV0FBd0I7SUFDbEQsT0FBTyxXQUFXLGlDQUF5QixDQUFDLENBQUMsZ0NBQXdCLENBQUMsNkJBQXFCLENBQUM7QUFDN0YsQ0FBQztBQXVCRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBYztJQUM5QyxPQUFPLENBQUMsQ0FBRSxJQUFZLENBQUMsUUFBUSxDQUFDO0FBQ2pDLENBQUM7QUFFRCxNQUFNLGdCQUFnQjtJQUNyQixZQUFtQixlQUF3QjtRQUF4QixvQkFBZSxHQUFmLGVBQWUsQ0FBUztJQUFJLENBQUM7Q0FDaEQ7QUF5QkQsU0FBUyx3QkFBd0IsQ0FBQyxNQUErQixFQUFFLFdBQXdCO0lBQzFGLElBQUksV0FBVyxtQ0FBMkIsRUFBRSxDQUFDO1FBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzdHLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDN0csQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUFDLE1BQXVCLEVBQUUsV0FBd0I7SUFDcEYsSUFBSSxXQUFXLG1DQUEyQixFQUFFLENBQUM7UUFDNUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0csQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM3RyxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxXQUFtQjtJQUN4RCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBRUQsTUFBTSxVQUFVO0lBT2YsSUFBSSxJQUFJLEtBQWEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUd6QyxJQUFJLGNBQWMsS0FBYSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBRzdELElBQUksY0FBYyxLQUFhLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFHN0QsSUFBSSx3QkFBd0IsS0FBYSxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7SUFLakYsSUFBSSxNQUFNLEtBQXNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFdEQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUN0RixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN0RixDQUFDO0lBRUQsSUFBSSxHQUFHO1FBQ04sT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDO0lBQzVHLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDNUcsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekosQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUMvSSxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxxQ0FBNkI7UUFDOUIsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFDLCtCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWxILElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZ0NBQXdCLENBQUMsRUFBRSxDQUFDO1lBQ3JELG1DQUEyQjtRQUM1QixDQUFDO2FBQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQywrQkFBdUIsQ0FBQyxFQUFFLENBQUM7WUFDM0Qsa0NBQTBCO1FBQzNCLENBQUM7UUFFRCxxQ0FBNkI7SUFDOUIsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO0lBQ25DLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO0lBQ25DLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDcEcsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUM7SUFDcEcsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUNwRyxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztJQUNwRyxDQUFDO0lBcUJELElBQUksY0FBYyxLQUE4QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQzlFLElBQUksY0FBYyxDQUFDLGNBQXVDO1FBQ3pELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEtBQUssY0FBYyxDQUFDLEtBQUs7ZUFDbkQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEtBQUssY0FBYyxDQUFDLEdBQUc7ZUFDL0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEtBQUssY0FBYyxDQUFDLGVBQWU7ZUFDdkUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEtBQUssY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pFLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUM7UUFFdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxjQUFjLENBQUMsZUFBZSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztRQUVoRSxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sS0FBSyxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUM7WUFDMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUVoRCxLQUFLLENBQUMsY0FBYyxHQUFHO2dCQUN0QixLQUFLLEVBQUUsY0FBYyxDQUFDLGVBQWU7Z0JBQ3JDLEdBQUcsRUFBRSxjQUFjLENBQUMsYUFBYTtnQkFDakMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlO2dCQUNwRixhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGFBQWE7YUFDN0UsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBR0QsSUFBSSxZQUFZLEtBQWMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUMxRCxJQUFJLFlBQVksQ0FBQyxZQUFxQjtRQUNyQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDekMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUVsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxJQUFJLEtBQUssWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDakMsS0FBSyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMscUNBQXFDLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRUQsWUFDVSxXQUF3QixFQUN4QixnQkFBa0MsRUFDM0MsTUFBdUIsRUFDZCwyQkFBb0MsRUFDN0MsT0FBZSxDQUFDLEVBQ2hCLGlCQUF5QixDQUFDLEVBQzFCLGVBQXdCLEtBQUssRUFDN0IsZ0JBQW9DO1FBUDNCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFFbEMsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUFTO1FBaktyQyxhQUFRLEdBQVcsRUFBRSxDQUFDO1FBU3ZCLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBRzVCLDhCQUF5QixHQUFXLENBQUMsQ0FBQztRQUd0QywyQkFBc0IsR0FBVyxDQUFDLENBQUM7UUE2RTFCLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQXNCLENBQUM7UUFDekQsZ0JBQVcsR0FBOEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFekQsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQztRQUN4RCwwQkFBcUIsR0FBbUIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUNsRSx1Q0FBa0MsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVyRixpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDbkMsMEJBQXFCLEdBQWdCLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDcEQsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFcEQsNkJBQXdCLEdBQWdCLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFFL0Msb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQztRQUN0RCxtQkFBYyxHQUF3QixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztRQUNsRSxpQ0FBNEIsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQztRQUM1RCxnQ0FBMkIsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQztRQUUzRCxvQkFBZSxHQUE0QixFQUFFLENBQUM7UUE2QjlDLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBNEI3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV0QyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTdDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLHNFQUFzRTtZQUN0RSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztZQUN2SCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQzdKLENBQUM7YUFBTSxDQUFDO1lBQ1AsOERBQThEO1lBQzlELE1BQU0sVUFBVSxHQUFHO2dCQUNsQixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO29CQUM3QyxPQUFPO3dCQUNOLElBQUksRUFBRSxlQUFlLENBQUMsSUFBSTt3QkFDMUIsSUFBSSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSTt3QkFDL0IsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEtBQUssS0FBSztxQkFDMUMsQ0FBQztnQkFDSCxDQUFDLENBQUM7Z0JBQ0YsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjO2FBQ3pCLENBQUM7WUFFRixNQUFNLE9BQU8sR0FBRyxFQUFFLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUV6RixJQUFJLENBQUMsUUFBUSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBRXpFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNyQyxNQUFNLEtBQUssR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDO2dCQUMxQixNQUFNLElBQUksR0FBRyxLQUFLLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBRTVDLElBQUksQ0FBQyxjQUFjLEdBQUc7b0JBQ3JCLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWU7b0JBQzFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWE7b0JBQ3RDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29CQUNyRixhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2lCQUM1RSxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMsNEJBQTRCLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVwRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQXVCO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25DLElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFZLEVBQUUsTUFBYyxFQUFFLEdBQStCO1FBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDNUMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUM7UUFDaEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUNuRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixDQUFDO1FBQzlELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsc0JBQXNCLENBQUM7UUFFekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtZQUN6QyxjQUFjLEVBQUUsSUFBSTtZQUNwQixjQUFjLEVBQUUsSUFBSSxDQUFDLHlCQUF5QjtZQUM5Qyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUM5QyxZQUFZLEVBQUUsR0FBRyxDQUFDLHNCQUFzQjtZQUN4QyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsWUFBWTtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQzFCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25DLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBVSxFQUFFLElBQXFCLEVBQUUsS0FBYSxFQUFFLFVBQW9CO1FBQzlFLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWEsRUFBRSxNQUFlO1FBQ3pDLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUvQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUUzQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUUvQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUUzQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLENBQUMsSUFBWSxFQUFFLEVBQVU7UUFDakMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRCxFQUFFLEdBQUcsYUFBYSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdDLElBQUksSUFBSSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDZixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBWSxFQUFFLEVBQVU7UUFDcEMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRCxFQUFFLEdBQUcsYUFBYSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdDLElBQUksSUFBSSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRW5DLHVCQUF1QjtRQUN2QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDO2NBQ25FLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxRSxnQkFBZ0I7UUFDaEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXBGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBYSxFQUFFLElBQVk7UUFDdEMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFhO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQVMsR0FBRyxLQUFLO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUVyQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25DLElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO29CQUNqQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZLENBQUMsS0FBYTtRQUN6QixLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5ELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUFhO1FBQzNCLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsZUFBZSxDQUFDLEtBQWEsRUFBRSxPQUFnQjtRQUM5QyxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5ELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDckQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUM7UUFFOUQsOEVBQThFO1FBQzlFLG9HQUFvRztRQUNwRyxJQUFJLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDOUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQyxDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLEtBQWE7UUFDdEMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRztnQkFDakMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZTtnQkFDMUMsR0FBRyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYTtnQkFDdEMsZUFBZSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRixhQUFhLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUNsRyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3hDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFL0YsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BJLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsMkJBQTJCLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTNHLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNsSCxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFcEYsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3RDLElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO29CQUNuRixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBaUI7UUFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztRQUN4QixDQUFDO1FBRUQsTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBRTNELElBQUksQ0FBQyxDQUFDLFVBQVUsWUFBWSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDN0UsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxlQUFlLFlBQVksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdkYsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLGlDQUF5QixFQUFFLENBQUM7WUFDL0MsV0FBVyxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO1lBQzVFLFVBQVUsQ0FBQyxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO1lBQzdFLGdCQUFnQixDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO1lBQ2pGLGVBQWUsQ0FBQyxlQUFlLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ25GLENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO1lBQzVFLGdCQUFnQixDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO1lBQzdFLFVBQVUsQ0FBQyxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO1lBQ2pGLFdBQVcsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ25GLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUM5QixTQUFTLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztRQUU5QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVuQyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsTUFBTSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNyRCxVQUFVLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7WUFDckUsV0FBVyxDQUFDLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1lBQ3ZFLGVBQWUsQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztZQUMvRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLHFDQUFxQztRQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLHlCQUF5QixHQUFHLENBQUMsQ0FBQztRQUMvRixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDO0lBQ3JJLENBQUM7SUFFRCxPQUFPO1FBQ04sS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXRDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLGlDQUFpQyxDQUFDLElBQVc7SUFDckQsTUFBTSxDQUFDLDBCQUEwQixFQUFFLGdCQUFnQixDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBdUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUV4SCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQ2YsZ0JBQWdCLEVBQ2hCLEtBQUssQ0FBQyxHQUFHLENBQ1IsS0FBSyxDQUFDLEtBQUssQ0FDVixLQUFLLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQzVILFdBQVcsQ0FDWCxFQUNELENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUNkLENBQ0QsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFFBQVE7SUFHYixJQUFJLElBQUksS0FBYSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBR3pDLElBQUksY0FBYyxLQUFhLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFVN0QsSUFBSSxlQUFlLEtBQTJCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUM3RSxJQUFJLGVBQWUsQ0FBQyxJQUEwQjtRQUM3QyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ25GLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBSUQsSUFBSSxnQkFBZ0IsS0FBMkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQy9FLElBQUksZ0JBQWdCLENBQUMsSUFBMEI7UUFDOUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNwRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQVFELFlBQ1UsSUFBVyxFQUNYLFdBQXdCLEVBQ3hCLGdCQUFrQyxFQUMzQyxjQUFzQixFQUN0QixPQUFlLENBQUM7UUFKUCxTQUFJLEdBQUosSUFBSSxDQUFPO1FBQ1gsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQXZDcEMsVUFBSyxHQUFXLENBQUMsQ0FBQztRQU1sQixtQkFBYyxHQUFXLENBQUMsQ0FBQztRQUMzQiw2QkFBd0IsR0FBVyxDQUFDLENBQUM7UUFFcEMsZ0JBQVcsR0FBZ0IsS0FBSyxDQUFDLElBQUksQ0FBQztRQUN0QyxtQkFBYyxHQUF3QixLQUFLLENBQUMsSUFBSSxDQUFDO1FBRWxELGdDQUEyQixHQUFHLElBQUksS0FBSyxFQUFzQixDQUFDO1FBQzlELHFCQUFnQixHQUF5QixTQUFTLENBQUM7UUFRbkQsaUNBQTRCLEdBQUcsSUFBSSxLQUFLLEVBQXNCLENBQUM7UUFDL0Qsc0JBQWlCLEdBQXlCLFNBQVMsQ0FBQztRQVEzQyx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBc0IsQ0FBQztRQUl4RCxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFpRjdDLG9CQUFlLEdBQTRCLEVBQUUsQ0FBQztRQXlCOUMsZ0JBQVcsR0FBVyxDQUFDLENBQUM7UUFDeEIsaUJBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsY0FBUyxHQUFXLENBQUMsQ0FBQztRQUN0QixlQUFVLEdBQVcsQ0FBQyxDQUFDO1FBcEc5QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUN0QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUVsQixNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3SSxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEssQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDdEYsQ0FBQztJQUVELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDdEYsQ0FBQztJQUVELElBQUksR0FBRztRQUNOLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztJQUMxRyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO0lBQzFHLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQzFCLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUNqSSxDQUFDO0lBRUQsSUFBWSxZQUFZO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDakksQ0FBQztJQUVELElBQVksYUFBYTtRQUN4QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUN0SSxDQUFDO0lBRUQsSUFBWSxhQUFhO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQ3RJLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdGLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdGLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDO0lBQzdDLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzdGLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzdGLENBQUM7SUFHRCxJQUFJLGNBQWMsS0FBOEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUM5RSxJQUFJLGNBQWMsQ0FBQyxjQUF1QztRQUN6RCxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV0QyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsd0JBQXdCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxHQUErQjtRQUNuRSxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzVDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxPQUFPLEdBQUcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUNsRCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixDQUFDO1FBRTdELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFPTyxPQUFPLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxHQUFXLEVBQUUsSUFBWTtRQUN2RSxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssS0FBSyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEgsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVCLENBQUM7Q0FDRDtBQVlELFNBQVMsUUFBUSxDQUFDLElBQVUsRUFBRSxJQUFZLEVBQUUsY0FBc0I7SUFDakUsSUFBSSxJQUFJLFlBQVksVUFBVSxFQUFFLENBQUM7UUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFM0ssSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sU0FBUyxHQUFHLEtBQUssWUFBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFFbEYsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0UsU0FBUyxJQUFJLE9BQU8sQ0FBQztZQUVyQix3REFBd0Q7WUFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUM7WUFDN0IsQ0FBQztZQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDNUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0FBQ0YsQ0FBQztBQTRDRDs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBc0JwQixJQUFZLElBQUksS0FBaUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVyRCxJQUFZLElBQUksQ0FBQyxJQUFnQjtRQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBRTNCLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPO1FBQy9FLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDNUMsQ0FBQztJQWtCRDs7T0FFRztJQUNILElBQUksS0FBSyxLQUFhLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRS9DOztPQUVHO0lBQ0gsSUFBSSxNQUFNLEtBQWEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFakQ7O09BRUc7SUFDSCxJQUFJLFlBQVksS0FBYSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUU3RDs7T0FFRztJQUNILElBQUksYUFBYSxLQUFhLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRS9EOztPQUVHO0lBQ0gsSUFBSSxZQUFZLEtBQWEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFOUQ7O09BRUc7SUFDSCxJQUFJLGFBQWEsS0FBYSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUUvRCxJQUFJLFdBQVcsS0FBa0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDakUsSUFBSSxjQUFjLEtBQXNCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFFdEU7OztPQUdHO0lBQ0gsSUFBSSxXQUFXLENBQUMsV0FBd0I7UUFDdkMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDdEYsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUM5TCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDM0MsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksY0FBYyxDQUFDLGNBQStCO1FBQ2pELElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxZQUFZLENBQUMsWUFBcUI7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ3ZDLENBQUM7SUFPRDs7Ozs7T0FLRztJQUNILFlBQVksVUFBNEIsRUFBRTtRQXhIbEMsd0JBQW1CLEdBQUcsSUFBSSxLQUFLLEVBQWdCLENBQUM7UUFDaEQsaUJBQVksR0FBRyxJQUFJLEtBQUssRUFBUSxDQUFDO1FBQ2pDLGlCQUFZLEdBQUcsSUFBSSxLQUFLLEVBQXlCLENBQUM7UUFDbEQsb0JBQWUsR0FBb0IsRUFBRSxDQUFDO1FBT3RDLGtCQUFhLEdBQWdCLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFtQnJEOztXQUVHO1FBQ00sbUJBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRXpEOzs7V0FHRztRQUNNLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFL0M7O1dBRUc7UUFDTSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBa0V2QyxrQkFBYSxHQUF5QixTQUFTLENBQUM7UUFFdkMsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQztRQUMzRCw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBU3hFLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQztRQUM5QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxPQUFPLENBQUMsa0JBQWtCLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDbEgsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFVBQVUsK0JBQXVCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9HLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBdUI7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSCxNQUFNLENBQUMsS0FBYSxFQUFFLE1BQWMsRUFBRSxNQUFjLENBQUMsRUFBRSxPQUFlLENBQUM7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFFN0MsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDL0ssQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILE9BQU8sQ0FBQyxJQUFXLEVBQUUsSUFBcUIsRUFBRSxRQUFzQjtRQUNqRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBRXJDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsRCxJQUFJLE1BQU0sWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRTlHLElBQUksQ0FBQztnQkFDSixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLE1BQU0sR0FBRyxDQUFDO1lBQ1gsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVuQyxJQUFJLGNBQWMsR0FBb0IsQ0FBQyxDQUFDO1lBRXhDLE1BQU0sMkJBQTJCLEdBQUcsV0FBVyxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZGLElBQUksT0FBTywyQkFBMkIsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckQsY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNsTCxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRTFELE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVsRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUN2RCxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3RixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxVQUFVLENBQUMsUUFBc0IsRUFBRSxNQUFzQztRQUN4RSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBRXJDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFZixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUI7WUFDakQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuQyxJQUFJLE9BQU8sWUFBWSxRQUFRLEVBQUUsQ0FBQztnQkFDakMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2xCLENBQUM7WUFFRCw2Q0FBNkM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7WUFDcEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQzFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsV0FBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWpCLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ25DLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFbkUsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFFcEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEYsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEgsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3BHLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWxCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFFBQVEsQ0FBQyxjQUE0QixFQUFFLElBQVksRUFBRSxFQUFVO1FBQzlELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVoRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTNCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLENBQUMsSUFBa0IsRUFBRSxFQUFnQjtRQUM3QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFOUMsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLENBQUMsUUFBUSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxDQUFDLFFBQVEsWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsVUFBVSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0MsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFOUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFVBQVUsQ0FBQyxRQUFzQixFQUFFLElBQXdCO1FBQzFELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxELElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTVJLElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEUsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVuQyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFdBQVcsQ0FBQyxRQUF1QjtRQUNsQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILHdCQUF3QixDQUFDLFFBQXNCO1FBQzlDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxVQUFVLENBQUMsUUFBc0I7UUFDaEMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFFRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFakQsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGNBQWMsQ0FBQyxRQUFzQjtRQUNwQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsbURBQW1EO1lBQ25ELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEQsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFzQjtRQUNsQyxNQUFNLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLGNBQWMsRUFBRSxDQUFDO1lBQzNDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFFRCxTQUFTLGVBQWUsQ0FBQyxNQUFrQixFQUFFLE9BQWlCO1lBQzdELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLEtBQUssWUFBWSxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFLENBQUM7d0JBQ3ZCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUNsQyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQztRQUNwQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1FBRS9CLG9EQUFvRDtRQUNwRCxvRkFBb0Y7UUFDcEYsU0FBUyx1QkFBdUIsQ0FBQyxNQUFrQjtZQUNsRCxLQUFLLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ2xFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksS0FBSyxZQUFZLFFBQVEsRUFBRSxDQUFDO29CQUMvQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDckMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGVBQWUsQ0FBQyxRQUFzQjtRQUNyQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxtQkFBbUIsQ0FBQyxRQUF1QjtRQUMxQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsYUFBYSxDQUFDLFFBQXNCO1FBQ25DLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxjQUFjLENBQUMsUUFBc0IsRUFBRSxPQUFnQjtRQUN0RCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQWVELE9BQU8sQ0FBQyxRQUF1QjtRQUM5QixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDL0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQThCLElBQXlCLEVBQUUsWUFBa0MsRUFBRSxVQUE0QixFQUFFO1FBQzVJLElBQUksT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMERBQTBELENBQUMsQ0FBQztRQUM3RSxDQUFDO2FBQU0sSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7YUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7UUFDeEUsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBNkIsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTNGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLFlBQVksQ0FBQyxJQUEyQixFQUFFLFdBQXdCLEVBQUUsWUFBa0QsRUFBRSxjQUFzQjtRQUNySixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQWUsQ0FBQztJQUNsRyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsSUFBcUIsRUFBRSxXQUF3QixFQUFFLFlBQWtELEVBQUUsY0FBc0I7UUFDbkosSUFBSSxNQUFZLENBQUM7UUFDakIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQXlCLENBQUM7WUFDMUQsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUN6RCxPQUFPO29CQUNOLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDOUYsT0FBTyxFQUFHLGVBQXlDLENBQUMsT0FBTztpQkFDakMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNuSixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkgsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztnQkFDNUIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxJQUFVLEVBQUUsV0FBd0IsRUFBRSxpQkFBMEI7UUFDakYsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRXZGLElBQUksSUFBSSxZQUFZLFFBQVEsRUFBRSxDQUFDO1lBQzlCLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUYsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQztRQUVoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVELFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBRUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sT0FBTyxDQUFDLFFBQXNCLEVBQUUsT0FBYSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQXFCLEVBQUU7UUFDdEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQztRQUVsQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQVM7UUFDUixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUVyQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7UUFFM0MsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxDQUFDLEdBQTRCLEVBQUUsSUFBVztRQUNuRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxJQUFJLFlBQVksVUFBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUM7YUFBTSxDQUFDO1lBQ1AsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCJ9