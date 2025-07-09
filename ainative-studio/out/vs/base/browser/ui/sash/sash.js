/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { $, append, EventHelper, getWindow, isHTMLElement } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { DomEmitter } from '../../event.js';
import { EventType, Gesture } from '../../touch.js';
import { Delayer } from '../../../common/async.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import './sash.css';
/**
 * Allow the sashes to be visible at runtime.
 * @remark Use for development purposes only.
 */
const DEBUG = false;
export var OrthogonalEdge;
(function (OrthogonalEdge) {
    OrthogonalEdge["North"] = "north";
    OrthogonalEdge["South"] = "south";
    OrthogonalEdge["East"] = "east";
    OrthogonalEdge["West"] = "west";
})(OrthogonalEdge || (OrthogonalEdge = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["VERTICAL"] = 0] = "VERTICAL";
    Orientation[Orientation["HORIZONTAL"] = 1] = "HORIZONTAL";
})(Orientation || (Orientation = {}));
export var SashState;
(function (SashState) {
    /**
     * Disable any UI interaction.
     */
    SashState[SashState["Disabled"] = 0] = "Disabled";
    /**
     * Allow dragging down or to the right, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any smaller, but can be larger.
     */
    SashState[SashState["AtMinimum"] = 1] = "AtMinimum";
    /**
     * Allow dragging up or to the left, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any larger, but can be smaller.
     */
    SashState[SashState["AtMaximum"] = 2] = "AtMaximum";
    /**
     * Enable dragging.
     */
    SashState[SashState["Enabled"] = 3] = "Enabled";
})(SashState || (SashState = {}));
let globalSize = 4;
const onDidChangeGlobalSize = new Emitter();
export function setGlobalSashSize(size) {
    globalSize = size;
    onDidChangeGlobalSize.fire(size);
}
let globalHoverDelay = 300;
const onDidChangeHoverDelay = new Emitter();
export function setGlobalHoverDelay(size) {
    globalHoverDelay = size;
    onDidChangeHoverDelay.fire(size);
}
class MouseEventFactory {
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mousemove')).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mouseup')).event;
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerUp", null);
class GestureEventFactory {
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(this.el, EventType.Change)).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(this.el, EventType.End)).event;
    }
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerUp", null);
class OrthogonalPointerEventFactory {
    get onPointerMove() {
        return this.factory.onPointerMove;
    }
    get onPointerUp() {
        return this.factory.onPointerUp;
    }
    constructor(factory) {
        this.factory = factory;
    }
    dispose() {
        // noop
    }
}
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerUp", null);
const PointerEventsDisabledCssClass = 'pointer-events-disabled';
/**
 * The {@link Sash} is the UI component which allows the user to resize other
 * components. It's usually an invisible horizontal or vertical line which, when
 * hovered, becomes highlighted and can be dragged along the perpendicular dimension
 * to its direction.
 *
 * Features:
 * - Touch event handling
 * - Corner sash support
 * - Hover with different mouse cursor support
 * - Configurable hover size
 * - Linked sash support, for 2x2 corner sashes
 */
export class Sash extends Disposable {
    get state() { return this._state; }
    get orthogonalStartSash() { return this._orthogonalStartSash; }
    get orthogonalEndSash() { return this._orthogonalEndSash; }
    /**
     * The state of a sash defines whether it can be interacted with by the user
     * as well as what mouse cursor to use, when hovered.
     */
    set state(state) {
        if (this._state === state) {
            return;
        }
        this.el.classList.toggle('disabled', state === 0 /* SashState.Disabled */);
        this.el.classList.toggle('minimum', state === 1 /* SashState.AtMinimum */);
        this.el.classList.toggle('maximum', state === 2 /* SashState.AtMaximum */);
        this._state = state;
        this.onDidEnablementChange.fire(state);
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the start of this one. A corner sash will be created
     * automatically at that location.
     *
     * The start of a horizontal sash is its left-most position.
     * The start of a vertical sash is its top-most position.
     */
    set orthogonalStartSash(sash) {
        if (this._orthogonalStartSash === sash) {
            return;
        }
        this.orthogonalStartDragHandleDisposables.clear();
        this.orthogonalStartSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalStartDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalStartDragHandle = append(this.el, $('.orthogonal-drag-handle.start'));
                    this.orthogonalStartDragHandleDisposables.add(toDisposable(() => this._orthogonalStartDragHandle.remove()));
                    this.orthogonalStartDragHandleDisposables.add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseenter')).event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalStartDragHandleDisposables);
                    this.orthogonalStartDragHandleDisposables.add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseleave')).event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalStartDragHandleDisposables);
                }
            };
            this.orthogonalStartSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalStartSash = sash;
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the end of this one. A corner sash will be created
     * automatically at that location.
     *
     * The end of a horizontal sash is its right-most position.
     * The end of a vertical sash is its bottom-most position.
     */
    set orthogonalEndSash(sash) {
        if (this._orthogonalEndSash === sash) {
            return;
        }
        this.orthogonalEndDragHandleDisposables.clear();
        this.orthogonalEndSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalEndDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalEndDragHandle = append(this.el, $('.orthogonal-drag-handle.end'));
                    this.orthogonalEndDragHandleDisposables.add(toDisposable(() => this._orthogonalEndDragHandle.remove()));
                    this.orthogonalEndDragHandleDisposables.add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseenter')).event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalEndDragHandleDisposables);
                    this.orthogonalEndDragHandleDisposables.add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseleave')).event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalEndDragHandleDisposables);
                }
            };
            this.orthogonalEndSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalEndSash = sash;
    }
    constructor(container, layoutProvider, options) {
        super();
        this.hoverDelay = globalHoverDelay;
        this.hoverDelayer = this._register(new Delayer(this.hoverDelay));
        this._state = 3 /* SashState.Enabled */;
        this.onDidEnablementChange = this._register(new Emitter());
        this._onDidStart = this._register(new Emitter());
        this._onDidChange = this._register(new Emitter());
        this._onDidReset = this._register(new Emitter());
        this._onDidEnd = this._register(new Emitter());
        this.orthogonalStartSashDisposables = this._register(new DisposableStore());
        this.orthogonalStartDragHandleDisposables = this._register(new DisposableStore());
        this.orthogonalEndSashDisposables = this._register(new DisposableStore());
        this.orthogonalEndDragHandleDisposables = this._register(new DisposableStore());
        /**
         * An event which fires whenever the user starts dragging this sash.
         */
        this.onDidStart = this._onDidStart.event;
        /**
         * An event which fires whenever the user moves the mouse while
         * dragging this sash.
         */
        this.onDidChange = this._onDidChange.event;
        /**
         * An event which fires whenever the user double clicks this sash.
         */
        this.onDidReset = this._onDidReset.event;
        /**
         * An event which fires whenever the user stops dragging this sash.
         */
        this.onDidEnd = this._onDidEnd.event;
        /**
         * A linked sash will be forwarded the same user interactions and events
         * so it moves exactly the same way as this sash.
         *
         * Useful in 2x2 grids. Not meant for widespread usage.
         */
        this.linkedSash = undefined;
        this.el = append(container, $('.monaco-sash'));
        if (options.orthogonalEdge) {
            this.el.classList.add(`orthogonal-edge-${options.orthogonalEdge}`);
        }
        if (isMacintosh) {
            this.el.classList.add('mac');
        }
        const onMouseDown = this._register(new DomEmitter(this.el, 'mousedown')).event;
        this._register(onMouseDown(e => this.onPointerStart(e, new MouseEventFactory(container)), this));
        const onMouseDoubleClick = this._register(new DomEmitter(this.el, 'dblclick')).event;
        this._register(onMouseDoubleClick(this.onPointerDoublePress, this));
        const onMouseEnter = this._register(new DomEmitter(this.el, 'mouseenter')).event;
        this._register(onMouseEnter(() => Sash.onMouseEnter(this)));
        const onMouseLeave = this._register(new DomEmitter(this.el, 'mouseleave')).event;
        this._register(onMouseLeave(() => Sash.onMouseLeave(this)));
        this._register(Gesture.addTarget(this.el));
        const onTouchStart = this._register(new DomEmitter(this.el, EventType.Start)).event;
        this._register(onTouchStart(e => this.onPointerStart(e, new GestureEventFactory(this.el)), this));
        const onTap = this._register(new DomEmitter(this.el, EventType.Tap)).event;
        let doubleTapTimeout = undefined;
        this._register(onTap(event => {
            if (doubleTapTimeout) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = undefined;
                this.onPointerDoublePress(event);
                return;
            }
            clearTimeout(doubleTapTimeout);
            doubleTapTimeout = setTimeout(() => doubleTapTimeout = undefined, 250);
        }, this));
        if (typeof options.size === 'number') {
            this.size = options.size;
            if (options.orientation === 0 /* Orientation.VERTICAL */) {
                this.el.style.width = `${this.size}px`;
            }
            else {
                this.el.style.height = `${this.size}px`;
            }
        }
        else {
            this.size = globalSize;
            this._register(onDidChangeGlobalSize.event(size => {
                this.size = size;
                this.layout();
            }));
        }
        this._register(onDidChangeHoverDelay.event(delay => this.hoverDelay = delay));
        this.layoutProvider = layoutProvider;
        this.orthogonalStartSash = options.orthogonalStartSash;
        this.orthogonalEndSash = options.orthogonalEndSash;
        this.orientation = options.orientation || 0 /* Orientation.VERTICAL */;
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this.el.classList.add('horizontal');
            this.el.classList.remove('vertical');
        }
        else {
            this.el.classList.remove('horizontal');
            this.el.classList.add('vertical');
        }
        this.el.classList.toggle('debug', DEBUG);
        this.layout();
    }
    onPointerStart(event, pointerEventFactory) {
        EventHelper.stop(event);
        let isMultisashResize = false;
        if (!event.__orthogonalSashEvent) {
            const orthogonalSash = this.getOrthogonalSash(event);
            if (orthogonalSash) {
                isMultisashResize = true;
                event.__orthogonalSashEvent = true;
                orthogonalSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
            }
        }
        if (this.linkedSash && !event.__linkedSashEvent) {
            event.__linkedSashEvent = true;
            this.linkedSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
        }
        if (!this.state) {
            return;
        }
        const iframes = this.el.ownerDocument.getElementsByTagName('iframe');
        for (const iframe of iframes) {
            iframe.classList.add(PointerEventsDisabledCssClass); // disable mouse events on iframes as long as we drag the sash
        }
        const startX = event.pageX;
        const startY = event.pageY;
        const altKey = event.altKey;
        const startEvent = { startX, currentX: startX, startY, currentY: startY, altKey };
        this.el.classList.add('active');
        this._onDidStart.fire(startEvent);
        // fix https://github.com/microsoft/vscode/issues/21675
        const style = createStyleSheet(this.el);
        const updateStyle = () => {
            let cursor = '';
            if (isMultisashResize) {
                cursor = 'all-scroll';
            }
            else if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 's-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'n-resize';
                }
                else {
                    cursor = isMacintosh ? 'row-resize' : 'ns-resize';
                }
            }
            else {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 'e-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'w-resize';
                }
                else {
                    cursor = isMacintosh ? 'col-resize' : 'ew-resize';
                }
            }
            style.textContent = `* { cursor: ${cursor} !important; }`;
        };
        const disposables = new DisposableStore();
        updateStyle();
        if (!isMultisashResize) {
            this.onDidEnablementChange.event(updateStyle, null, disposables);
        }
        const onPointerMove = (e) => {
            EventHelper.stop(e, false);
            const event = { startX, currentX: e.pageX, startY, currentY: e.pageY, altKey };
            this._onDidChange.fire(event);
        };
        const onPointerUp = (e) => {
            EventHelper.stop(e, false);
            style.remove();
            this.el.classList.remove('active');
            this._onDidEnd.fire();
            disposables.dispose();
            for (const iframe of iframes) {
                iframe.classList.remove(PointerEventsDisabledCssClass);
            }
        };
        pointerEventFactory.onPointerMove(onPointerMove, null, disposables);
        pointerEventFactory.onPointerUp(onPointerUp, null, disposables);
        disposables.add(pointerEventFactory);
    }
    onPointerDoublePress(e) {
        const orthogonalSash = this.getOrthogonalSash(e);
        if (orthogonalSash) {
            orthogonalSash._onDidReset.fire();
        }
        if (this.linkedSash) {
            this.linkedSash._onDidReset.fire();
        }
        this._onDidReset.fire();
    }
    static onMouseEnter(sash, fromLinkedSash = false) {
        if (sash.el.classList.contains('active')) {
            sash.hoverDelayer.cancel();
            sash.el.classList.add('hover');
        }
        else {
            sash.hoverDelayer.trigger(() => sash.el.classList.add('hover'), sash.hoverDelay).then(undefined, () => { });
        }
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseEnter(sash.linkedSash, true);
        }
    }
    static onMouseLeave(sash, fromLinkedSash = false) {
        sash.hoverDelayer.cancel();
        sash.el.classList.remove('hover');
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseLeave(sash.linkedSash, true);
        }
    }
    /**
     * Forcefully stop any user interactions with this sash.
     * Useful when hiding a parent component, while the user is still
     * interacting with the sash.
     */
    clearSashHoverState() {
        Sash.onMouseLeave(this);
    }
    /**
     * Layout the sash. The sash will size and position itself
     * based on its provided {@link ISashLayoutProvider layout provider}.
     */
    layout() {
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            const verticalProvider = this.layoutProvider;
            this.el.style.left = verticalProvider.getVerticalSashLeft(this) - (this.size / 2) + 'px';
            if (verticalProvider.getVerticalSashTop) {
                this.el.style.top = verticalProvider.getVerticalSashTop(this) + 'px';
            }
            if (verticalProvider.getVerticalSashHeight) {
                this.el.style.height = verticalProvider.getVerticalSashHeight(this) + 'px';
            }
        }
        else {
            const horizontalProvider = this.layoutProvider;
            this.el.style.top = horizontalProvider.getHorizontalSashTop(this) - (this.size / 2) + 'px';
            if (horizontalProvider.getHorizontalSashLeft) {
                this.el.style.left = horizontalProvider.getHorizontalSashLeft(this) + 'px';
            }
            if (horizontalProvider.getHorizontalSashWidth) {
                this.el.style.width = horizontalProvider.getHorizontalSashWidth(this) + 'px';
            }
        }
    }
    getOrthogonalSash(e) {
        const target = e.initialTarget ?? e.target;
        if (!target || !(isHTMLElement(target))) {
            return undefined;
        }
        if (target.classList.contains('orthogonal-drag-handle')) {
            return target.classList.contains('start') ? this.orthogonalStartSash : this.orthogonalEndSash;
        }
        return undefined;
    }
    dispose() {
        super.dispose();
        this.el.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2FzaC9zYXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBYSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLFlBQVksQ0FBQztBQUVwQjs7O0dBR0c7QUFDSCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUM7QUErQnBCLE1BQU0sQ0FBTixJQUFZLGNBS1g7QUFMRCxXQUFZLGNBQWM7SUFDekIsaUNBQWUsQ0FBQTtJQUNmLGlDQUFlLENBQUE7SUFDZiwrQkFBYSxDQUFBO0lBQ2IsK0JBQWEsQ0FBQTtBQUNkLENBQUMsRUFMVyxjQUFjLEtBQWQsY0FBYyxRQUt6QjtBQXdERCxNQUFNLENBQU4sSUFBa0IsV0FHakI7QUFIRCxXQUFr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