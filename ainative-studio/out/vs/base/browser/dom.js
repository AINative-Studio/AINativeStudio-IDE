/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { BrowserFeatures } from './canIUse.js';
import { StandardKeyboardEvent } from './keyboardEvent.js';
import { StandardMouseEvent } from './mouseEvent.js';
import { AbstractIdleValue, IntervalTimer, TimeoutTimer, _runWhenIdle } from '../common/async.js';
import { onUnexpectedError } from '../common/errors.js';
import * as event from '../common/event.js';
import dompurify from './dompurify/dompurify.js';
import { Disposable, DisposableStore, toDisposable } from '../common/lifecycle.js';
import { RemoteAuthorities, Schemas } from '../common/network.js';
import * as platform from '../common/platform.js';
import { URI } from '../common/uri.js';
import { hash } from '../common/hash.js';
import { ensureCodeWindow, mainWindow } from './window.js';
import { isPointWithinTriangle } from '../common/numbers.js';
export * from './domImpl/domObservable.js';
export * from './domImpl/n.js';
//# region Multi-Window Support Utilities
export const { registerWindow, getWindow, getDocument, getWindows, getWindowsCount, getWindowId, getWindowById, hasWindow, onDidRegisterWindow, onWillUnregisterWindow, onDidUnregisterWindow } = (function () {
    const windows = new Map();
    ensureCodeWindow(mainWindow, 1);
    const mainWindowRegistration = { window: mainWindow, disposables: new DisposableStore() };
    windows.set(mainWindow.vscodeWindowId, mainWindowRegistration);
    const onDidRegisterWindow = new event.Emitter();
    const onDidUnregisterWindow = new event.Emitter();
    const onWillUnregisterWindow = new event.Emitter();
    function getWindowById(windowId, fallbackToMain) {
        const window = typeof windowId === 'number' ? windows.get(windowId) : undefined;
        return window ?? (fallbackToMain ? mainWindowRegistration : undefined);
    }
    return {
        onDidRegisterWindow: onDidRegisterWindow.event,
        onWillUnregisterWindow: onWillUnregisterWindow.event,
        onDidUnregisterWindow: onDidUnregisterWindow.event,
        registerWindow(window) {
            if (windows.has(window.vscodeWindowId)) {
                return Disposable.None;
            }
            const disposables = new DisposableStore();
            const registeredWindow = {
                window,
                disposables: disposables.add(new DisposableStore())
            };
            windows.set(window.vscodeWindowId, registeredWindow);
            disposables.add(toDisposable(() => {
                windows.delete(window.vscodeWindowId);
                onDidUnregisterWindow.fire(window);
            }));
            disposables.add(addDisposableListener(window, EventType.BEFORE_UNLOAD, () => {
                onWillUnregisterWindow.fire(window);
            }));
            onDidRegisterWindow.fire(registeredWindow);
            return disposables;
        },
        getWindows() {
            return windows.values();
        },
        getWindowsCount() {
            return windows.size;
        },
        getWindowId(targetWindow) {
            return targetWindow.vscodeWindowId;
        },
        hasWindow(windowId) {
            return windows.has(windowId);
        },
        getWindowById,
        getWindow(e) {
            const candidateNode = e;
            if (candidateNode?.ownerDocument?.defaultView) {
                return candidateNode.ownerDocument.defaultView.window;
            }
            const candidateEvent = e;
            if (candidateEvent?.view) {
                return candidateEvent.view.window;
            }
            return mainWindow;
        },
        getDocument(e) {
            const candidateNode = e;
            return getWindow(candidateNode).document;
        }
    };
})();
//#endregion
export function clearNode(node) {
    while (node.firstChild) {
        node.firstChild.remove();
    }
}
class DomListener {
    constructor(node, type, handler, options) {
        this._node = node;
        this._type = type;
        this._handler = handler;
        this._options = (options || false);
        this._node.addEventListener(this._type, this._handler, this._options);
    }
    dispose() {
        if (!this._handler) {
            // Already disposed
            return;
        }
        this._node.removeEventListener(this._type, this._handler, this._options);
        // Prevent leakers from holding on to the dom or handler func
        this._node = null;
        this._handler = null;
    }
}
export function addDisposableListener(node, type, handler, useCaptureOrOptions) {
    return new DomListener(node, type, handler, useCaptureOrOptions);
}
function _wrapAsStandardMouseEvent(targetWindow, handler) {
    return function (e) {
        return handler(new StandardMouseEvent(targetWindow, e));
    };
}
function _wrapAsStandardKeyboardEvent(handler) {
    return function (e) {
        return handler(new StandardKeyboardEvent(e));
    };
}
export const addStandardDisposableListener = function addStandardDisposableListener(node, type, handler, useCapture) {
    let wrapHandler = handler;
    if (type === 'click' || type === 'mousedown' || type === 'contextmenu') {
        wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    }
    else if (type === 'keydown' || type === 'keypress' || type === 'keyup') {
        wrapHandler = _wrapAsStandardKeyboardEvent(handler);
    }
    return addDisposableListener(node, type, wrapHandler, useCapture);
};
export const addStandardDisposableGenericMouseDownListener = function addStandardDisposableListener(node, handler, useCapture) {
    const wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    return addDisposableGenericMouseDownListener(node, wrapHandler, useCapture);
};
export const addStandardDisposableGenericMouseUpListener = function addStandardDisposableListener(node, handler, useCapture) {
    const wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    return addDisposableGenericMouseUpListener(node, wrapHandler, useCapture);
};
export function addDisposableGenericMouseDownListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_DOWN : EventType.MOUSE_DOWN, handler, useCapture);
}
export function addDisposableGenericMouseMoveListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_MOVE : EventType.MOUSE_MOVE, handler, useCapture);
}
export function addDisposableGenericMouseUpListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_UP : EventType.MOUSE_UP, handler, useCapture);
}
/**
 * Execute the callback the next time the browser is idle, returning an
 * {@link IDisposable} that will cancel the callback when disposed. This wraps
 * [requestIdleCallback] so it will fallback to [setTimeout] if the environment
 * doesn't support it.
 *
 * @param targetWindow The window for which to run the idle callback
 * @param callback The callback to run when idle, this includes an
 * [IdleDeadline] that provides the time alloted for the idle callback by the
 * browser. Not respecting this deadline will result in a degraded user
 * experience.
 * @param timeout A timeout at which point to queue no longer wait for an idle
 * callback but queue it on the regular event loop (like setTimeout). Typically
 * this should not be used.
 *
 * [IdleDeadline]: https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 * [requestIdleCallback]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 * [setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 */
export function runWhenWindowIdle(targetWindow, callback, timeout) {
    return _runWhenIdle(targetWindow, callback, timeout);
}
/**
 * An implementation of the "idle-until-urgent"-strategy as introduced
 * here: https://philipwalton.com/articles/idle-until-urgent/
 */
export class WindowIdleValue extends AbstractIdleValue {
    constructor(targetWindow, executor) {
        super(targetWindow, executor);
    }
}
/**
 * Schedule a callback to be run at the next animation frame.
 * This allows multiple parties to register callbacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will be executed immediately.
 * @return token that can be used to cancel the scheduled runner (only if `runner` was not executed immediately).
 */
export let runAtThisOrScheduleAtNextAnimationFrame;
/**
 * Schedule a callback to be run at the next animation frame.
 * This allows multiple parties to register callbacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will be executed at the next animation frame.
 * @return token that can be used to cancel the scheduled runner.
 */
export let scheduleAtNextAnimationFrame;
export function disposableWindowInterval(targetWindow, handler, interval, iterations) {
    let iteration = 0;
    const timer = targetWindow.setInterval(() => {
        iteration++;
        if ((typeof iterations === 'number' && iteration >= iterations) || handler() === true) {
            disposable.dispose();
        }
    }, interval);
    const disposable = toDisposable(() => {
        targetWindow.clearInterval(timer);
    });
    return disposable;
}
export class WindowIntervalTimer extends IntervalTimer {
    /**
     *
     * @param node The optional node from which the target window is determined
     */
    constructor(node) {
        super();
        this.defaultTarget = node && getWindow(node);
    }
    cancelAndSet(runner, interval, targetWindow) {
        return super.cancelAndSet(runner, interval, targetWindow ?? this.defaultTarget);
    }
}
class AnimationFrameQueueItem {
    constructor(runner, priority = 0) {
        this._runner = runner;
        this.priority = priority;
        this._canceled = false;
    }
    dispose() {
        this._canceled = true;
    }
    execute() {
        if (this._canceled) {
            return;
        }
        try {
            this._runner();
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    // Sort by priority (largest to lowest)
    static sort(a, b) {
        return b.priority - a.priority;
    }
}
(function () {
    /**
     * The runners scheduled at the next animation frame
     */
    const NEXT_QUEUE = new Map();
    /**
     * The runners scheduled at the current animation frame
     */
    const CURRENT_QUEUE = new Map();
    /**
     * A flag to keep track if the native requestAnimationFrame was already called
     */
    const animFrameRequested = new Map();
    /**
     * A flag to indicate if currently handling a native requestAnimationFrame callback
     */
    const inAnimationFrameRunner = new Map();
    const animationFrameRunner = (targetWindowId) => {
        animFrameRequested.set(targetWindowId, false);
        const currentQueue = NEXT_QUEUE.get(targetWindowId) ?? [];
        CURRENT_QUEUE.set(targetWindowId, currentQueue);
        NEXT_QUEUE.set(targetWindowId, []);
        inAnimationFrameRunner.set(targetWindowId, true);
        while (currentQueue.length > 0) {
            currentQueue.sort(AnimationFrameQueueItem.sort);
            const top = currentQueue.shift();
            top.execute();
        }
        inAnimationFrameRunner.set(targetWindowId, false);
    };
    scheduleAtNextAnimationFrame = (targetWindow, runner, priority = 0) => {
        const targetWindowId = getWindowId(targetWindow);
        const item = new AnimationFrameQueueItem(runner, priority);
        let nextQueue = NEXT_QUEUE.get(targetWindowId);
        if (!nextQueue) {
            nextQueue = [];
            NEXT_QUEUE.set(targetWindowId, nextQueue);
        }
        nextQueue.push(item);
        if (!animFrameRequested.get(targetWindowId)) {
            animFrameRequested.set(targetWindowId, true);
            targetWindow.requestAnimationFrame(() => animationFrameRunner(targetWindowId));
        }
        return item;
    };
    runAtThisOrScheduleAtNextAnimationFrame = (targetWindow, runner, priority) => {
        const targetWindowId = getWindowId(targetWindow);
        if (inAnimationFrameRunner.get(targetWindowId)) {
            const item = new AnimationFrameQueueItem(runner, priority);
            let currentQueue = CURRENT_QUEUE.get(targetWindowId);
            if (!currentQueue) {
                currentQueue = [];
                CURRENT_QUEUE.set(targetWindowId, currentQueue);
            }
            currentQueue.push(item);
            return item;
        }
        else {
            return scheduleAtNextAnimationFrame(targetWindow, runner, priority);
        }
    };
})();
export function measure(targetWindow, callback) {
    return scheduleAtNextAnimationFrame(targetWindow, callback, 10000 /* must be early */);
}
export function modify(targetWindow, callback) {
    return scheduleAtNextAnimationFrame(targetWindow, callback, -10000 /* must be late */);
}
const MINIMUM_TIME_MS = 8;
const DEFAULT_EVENT_MERGER = function (lastEvent, currentEvent) {
    return currentEvent;
};
class TimeoutThrottledDomListener extends Disposable {
    constructor(node, type, handler, eventMerger = DEFAULT_EVENT_MERGER, minimumTimeMs = MINIMUM_TIME_MS) {
        super();
        let lastEvent = null;
        let lastHandlerTime = 0;
        const timeout = this._register(new TimeoutTimer());
        const invokeHandler = () => {
            lastHandlerTime = (new Date()).getTime();
            handler(lastEvent);
            lastEvent = null;
        };
        this._register(addDisposableListener(node, type, (e) => {
            lastEvent = eventMerger(lastEvent, e);
            const elapsedTime = (new Date()).getTime() - lastHandlerTime;
            if (elapsedTime >= minimumTimeMs) {
                timeout.cancel();
                invokeHandler();
            }
            else {
                timeout.setIfNotSet(invokeHandler, minimumTimeMs - elapsedTime);
            }
        }));
    }
}
export function addDisposableThrottledListener(node, type, handler, eventMerger, minimumTimeMs) {
    return new TimeoutThrottledDomListener(node, type, handler, eventMerger, minimumTimeMs);
}
export function getComputedStyle(el) {
    return getWindow(el).getComputedStyle(el, null);
}
export function getClientArea(element, defaultValue, fallbackElement) {
    const elWindow = getWindow(element);
    const elDocument = elWindow.document;
    // Try with DOM clientWidth / clientHeight
    if (element !== elDocument.body) {
        return new Dimension(element.clientWidth, element.clientHeight);
    }
    // If visual view port exits and it's on mobile, it should be used instead of window innerWidth / innerHeight, or document.body.clientWidth / document.body.clientHeight
    if (platform.isIOS && elWindow?.visualViewport) {
        return new Dimension(elWindow.visualViewport.width, elWindow.visualViewport.height);
    }
    // Try innerWidth / innerHeight
    if (elWindow?.innerWidth && elWindow.innerHeight) {
        return new Dimension(elWindow.innerWidth, elWindow.innerHeight);
    }
    // Try with document.body.clientWidth / document.body.clientHeight
    if (elDocument.body && elDocument.body.clientWidth && elDocument.body.clientHeight) {
        return new Dimension(elDocument.body.clientWidth, elDocument.body.clientHeight);
    }
    // Try with document.documentElement.clientWidth / document.documentElement.clientHeight
    if (elDocument.documentElement && elDocument.documentElement.clientWidth && elDocument.documentElement.clientHeight) {
        return new Dimension(elDocument.documentElement.clientWidth, elDocument.documentElement.clientHeight);
    }
    if (fallbackElement) {
        return getClientArea(fallbackElement, defaultValue);
    }
    if (defaultValue) {
        return defaultValue;
    }
    throw new Error('Unable to figure out browser width and height');
}
class SizeUtils {
    // Adapted from WinJS
    // Converts a CSS positioning string for the specified element to pixels.
    static convertToPixels(element, value) {
        return parseFloat(value) || 0;
    }
    static getDimension(element, cssPropertyName) {
        const computedStyle = getComputedStyle(element);
        const value = computedStyle ? computedStyle.getPropertyValue(cssPropertyName) : '0';
        return SizeUtils.convertToPixels(element, value);
    }
    static getBorderLeftWidth(element) {
        return SizeUtils.getDimension(element, 'border-left-width');
    }
    static getBorderRightWidth(element) {
        return SizeUtils.getDimension(element, 'border-right-width');
    }
    static getBorderTopWidth(element) {
        return SizeUtils.getDimension(element, 'border-top-width');
    }
    static getBorderBottomWidth(element) {
        return SizeUtils.getDimension(element, 'border-bottom-width');
    }
    static getPaddingLeft(element) {
        return SizeUtils.getDimension(element, 'padding-left');
    }
    static getPaddingRight(element) {
        return SizeUtils.getDimension(element, 'padding-right');
    }
    static getPaddingTop(element) {
        return SizeUtils.getDimension(element, 'padding-top');
    }
    static getPaddingBottom(element) {
        return SizeUtils.getDimension(element, 'padding-bottom');
    }
    static getMarginLeft(element) {
        return SizeUtils.getDimension(element, 'margin-left');
    }
    static getMarginTop(element) {
        return SizeUtils.getDimension(element, 'margin-top');
    }
    static getMarginRight(element) {
        return SizeUtils.getDimension(element, 'margin-right');
    }
    static getMarginBottom(element) {
        return SizeUtils.getDimension(element, 'margin-bottom');
    }
}
export class Dimension {
    static { this.None = new Dimension(0, 0); }
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    with(width = this.width, height = this.height) {
        if (width !== this.width || height !== this.height) {
            return new Dimension(width, height);
        }
        else {
            return this;
        }
    }
    static is(obj) {
        return typeof obj === 'object' && typeof obj.height === 'number' && typeof obj.width === 'number';
    }
    static lift(obj) {
        if (obj instanceof Dimension) {
            return obj;
        }
        else {
            return new Dimension(obj.width, obj.height);
        }
    }
    static equals(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.width === b.width && a.height === b.height;
    }
}
export function getTopLeftOffset(element) {
    // Adapted from WinJS.Utilities.getPosition
    // and added borders to the mix
    let offsetParent = element.offsetParent;
    let top = element.offsetTop;
    let left = element.offsetLeft;
    while ((element = element.parentNode) !== null
        && element !== element.ownerDocument.body
        && element !== element.ownerDocument.documentElement) {
        top -= element.scrollTop;
        const c = isShadowRoot(element) ? null : getComputedStyle(element);
        if (c) {
            left -= c.direction !== 'rtl' ? element.scrollLeft : -element.scrollLeft;
        }
        if (element === offsetParent) {
            left += SizeUtils.getBorderLeftWidth(element);
            top += SizeUtils.getBorderTopWidth(element);
            top += element.offsetTop;
            left += element.offsetLeft;
            offsetParent = element.offsetParent;
        }
    }
    return {
        left: left,
        top: top
    };
}
export function size(element, width, height) {
    if (typeof width === 'number') {
        element.style.width = `${width}px`;
    }
    if (typeof height === 'number') {
        element.style.height = `${height}px`;
    }
}
export function position(element, top, right, bottom, left, position = 'absolute') {
    if (typeof top === 'number') {
        element.style.top = `${top}px`;
    }
    if (typeof right === 'number') {
        element.style.right = `${right}px`;
    }
    if (typeof bottom === 'number') {
        element.style.bottom = `${bottom}px`;
    }
    if (typeof left === 'number') {
        element.style.left = `${left}px`;
    }
    element.style.position = position;
}
/**
 * Returns the position of a dom node relative to the entire page.
 */
export function getDomNodePagePosition(domNode) {
    const bb = domNode.getBoundingClientRect();
    const window = getWindow(domNode);
    return {
        left: bb.left + window.scrollX,
        top: bb.top + window.scrollY,
        width: bb.width,
        height: bb.height
    };
}
/**
 * Returns the effective zoom on a given element before window zoom level is applied
 */
export function getDomNodeZoomLevel(domNode) {
    let testElement = domNode;
    let zoom = 1.0;
    do {
        const elementZoomLevel = getComputedStyle(testElement).zoom;
        if (elementZoomLevel !== null && elementZoomLevel !== undefined && elementZoomLevel !== '1') {
            zoom *= elementZoomLevel;
        }
        testElement = testElement.parentElement;
    } while (testElement !== null && testElement !== testElement.ownerDocument.documentElement);
    return zoom;
}
// Adapted from WinJS
// Gets the width of the element, including margins.
export function getTotalWidth(element) {
    const margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
    return element.offsetWidth + margin;
}
export function getContentWidth(element) {
    const border = SizeUtils.getBorderLeftWidth(element) + SizeUtils.getBorderRightWidth(element);
    const padding = SizeUtils.getPaddingLeft(element) + SizeUtils.getPaddingRight(element);
    return element.offsetWidth - border - padding;
}
export function getTotalScrollWidth(element) {
    const margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
    return element.scrollWidth + margin;
}
// Adapted from WinJS
// Gets the height of the content of the specified element. The content height does not include borders or padding.
export function getContentHeight(element) {
    const border = SizeUtils.getBorderTopWidth(element) + SizeUtils.getBorderBottomWidth(element);
    const padding = SizeUtils.getPaddingTop(element) + SizeUtils.getPaddingBottom(element);
    return element.offsetHeight - border - padding;
}
// Adapted from WinJS
// Gets the height of the element, including its margins.
export function getTotalHeight(element) {
    const margin = SizeUtils.getMarginTop(element) + SizeUtils.getMarginBottom(element);
    return element.offsetHeight + margin;
}
// Gets the left coordinate of the specified element relative to the specified parent.
function getRelativeLeft(element, parent) {
    if (element === null) {
        return 0;
    }
    const elementPosition = getTopLeftOffset(element);
    const parentPosition = getTopLeftOffset(parent);
    return elementPosition.left - parentPosition.left;
}
export function getLargestChildWidth(parent, children) {
    const childWidths = children.map((child) => {
        return Math.max(getTotalScrollWidth(child), getTotalWidth(child)) + getRelativeLeft(child, parent) || 0;
    });
    const maxWidth = Math.max(...childWidths);
    return maxWidth;
}
// ----------------------------------------------------------------------------------------
export function isAncestor(testChild, testAncestor) {
    return Boolean(testAncestor?.contains(testChild));
}
const parentFlowToDataKey = 'parentFlowToElementId';
/**
 * Set an explicit parent to use for nodes that are not part of the
 * regular dom structure.
 */
export function setParentFlowTo(fromChildElement, toParentElement) {
    fromChildElement.dataset[parentFlowToDataKey] = toParentElement.id;
}
function getParentFlowToElement(node) {
    const flowToParentId = node.dataset[parentFlowToDataKey];
    if (typeof flowToParentId === 'string') {
        return node.ownerDocument.getElementById(flowToParentId);
    }
    return null;
}
/**
 * Check if `testAncestor` is an ancestor of `testChild`, observing the explicit
 * parents set by `setParentFlowTo`.
 */
export function isAncestorUsingFlowTo(testChild, testAncestor) {
    let node = testChild;
    while (node) {
        if (node === testAncestor) {
            return true;
        }
        if (isHTMLElement(node)) {
            const flowToParentElement = getParentFlowToElement(node);
            if (flowToParentElement) {
                node = flowToParentElement;
                continue;
            }
        }
        node = node.parentNode;
    }
    return false;
}
export function findParentWithClass(node, clazz, stopAtClazzOrNode) {
    while (node && node.nodeType === node.ELEMENT_NODE) {
        if (node.classList.contains(clazz)) {
            return node;
        }
        if (stopAtClazzOrNode) {
            if (typeof stopAtClazzOrNode === 'string') {
                if (node.classList.contains(stopAtClazzOrNode)) {
                    return null;
                }
            }
            else {
                if (node === stopAtClazzOrNode) {
                    return null;
                }
            }
        }
        node = node.parentNode;
    }
    return null;
}
export function hasParentWithClass(node, clazz, stopAtClazzOrNode) {
    return !!findParentWithClass(node, clazz, stopAtClazzOrNode);
}
export function isShadowRoot(node) {
    return (node && !!node.host && !!node.mode);
}
export function isInShadowDOM(domNode) {
    return !!getShadowRoot(domNode);
}
export function getShadowRoot(domNode) {
    while (domNode.parentNode) {
        if (domNode === domNode.ownerDocument?.body) {
            // reached the body
            return null;
        }
        domNode = domNode.parentNode;
    }
    return isShadowRoot(domNode) ? domNode : null;
}
/**
 * Returns the active element across all child windows
 * based on document focus. Falls back to the main
 * window if no window has focus.
 */
export function getActiveElement() {
    let result = getActiveDocument().activeElement;
    while (result?.shadowRoot) {
        result = result.shadowRoot.activeElement;
    }
    return result;
}
/**
 * Returns true if the focused window active element matches
 * the provided element. Falls back to the main window if no
 * window has focus.
 */
export function isActiveElement(element) {
    return getActiveElement() === element;
}
/**
 * Returns true if the focused window active element is contained in
 * `ancestor`. Falls back to the main window if no window has focus.
 */
export function isAncestorOfActiveElement(ancestor) {
    return isAncestor(getActiveElement(), ancestor);
}
/**
 * Returns whether the element is in the active `document`. The active
 * document has focus or will be the main windows document.
 */
export function isActiveDocument(element) {
    return element.ownerDocument === getActiveDocument();
}
/**
 * Returns the active document across main and child windows.
 * Prefers the window with focus, otherwise falls back to
 * the main windows document.
 */
export function getActiveDocument() {
    if (getWindowsCount() <= 1) {
        return mainWindow.document;
    }
    const documents = Array.from(getWindows()).map(({ window }) => window.document);
    return documents.find(doc => doc.hasFocus()) ?? mainWindow.document;
}
/**
 * Returns the active window across main and child windows.
 * Prefers the window with focus, otherwise falls back to
 * the main window.
 */
export function getActiveWindow() {
    const document = getActiveDocument();
    return (document.defaultView?.window ?? mainWindow);
}
export const sharedMutationObserver = new class {
    constructor() {
        this.mutationObservers = new Map();
    }
    observe(target, disposables, options) {
        let mutationObserversPerTarget = this.mutationObservers.get(target);
        if (!mutationObserversPerTarget) {
            mutationObserversPerTarget = new Map();
            this.mutationObservers.set(target, mutationObserversPerTarget);
        }
        const optionsHash = hash(options);
        let mutationObserverPerOptions = mutationObserversPerTarget.get(optionsHash);
        if (!mutationObserverPerOptions) {
            const onDidMutate = new event.Emitter();
            const observer = new MutationObserver(mutations => onDidMutate.fire(mutations));
            observer.observe(target, options);
            const resolvedMutationObserverPerOptions = mutationObserverPerOptions = {
                users: 1,
                observer,
                onDidMutate: onDidMutate.event
            };
            disposables.add(toDisposable(() => {
                resolvedMutationObserverPerOptions.users -= 1;
                if (resolvedMutationObserverPerOptions.users === 0) {
                    onDidMutate.dispose();
                    observer.disconnect();
                    mutationObserversPerTarget?.delete(optionsHash);
                    if (mutationObserversPerTarget?.size === 0) {
                        this.mutationObservers.delete(target);
                    }
                }
            }));
            mutationObserversPerTarget.set(optionsHash, mutationObserverPerOptions);
        }
        else {
            mutationObserverPerOptions.users += 1;
        }
        return mutationObserverPerOptions.onDidMutate;
    }
};
export function createMetaElement(container = mainWindow.document.head) {
    return createHeadElement('meta', container);
}
export function createLinkElement(container = mainWindow.document.head) {
    return createHeadElement('link', container);
}
function createHeadElement(tagName, container = mainWindow.document.head) {
    const element = document.createElement(tagName);
    container.appendChild(element);
    return element;
}
export function isHTMLElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLElement || e instanceof getWindow(e).HTMLElement;
}
export function isHTMLAnchorElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLAnchorElement || e instanceof getWindow(e).HTMLAnchorElement;
}
export function isHTMLSpanElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLSpanElement || e instanceof getWindow(e).HTMLSpanElement;
}
export function isHTMLTextAreaElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLTextAreaElement || e instanceof getWindow(e).HTMLTextAreaElement;
}
export function isHTMLInputElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLInputElement || e instanceof getWindow(e).HTMLInputElement;
}
export function isHTMLButtonElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLButtonElement || e instanceof getWindow(e).HTMLButtonElement;
}
export function isHTMLDivElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLDivElement || e instanceof getWindow(e).HTMLDivElement;
}
export function isSVGElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof SVGElement || e instanceof getWindow(e).SVGElement;
}
export function isMouseEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof MouseEvent || e instanceof getWindow(e).MouseEvent;
}
export function isKeyboardEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof KeyboardEvent || e instanceof getWindow(e).KeyboardEvent;
}
export function isPointerEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof PointerEvent || e instanceof getWindow(e).PointerEvent;
}
export function isDragEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof DragEvent || e instanceof getWindow(e).DragEvent;
}
export const EventType = {
    // Mouse
    CLICK: 'click',
    AUXCLICK: 'auxclick',
    DBLCLICK: 'dblclick',
    MOUSE_UP: 'mouseup',
    MOUSE_DOWN: 'mousedown',
    MOUSE_OVER: 'mouseover',
    MOUSE_MOVE: 'mousemove',
    MOUSE_OUT: 'mouseout',
    MOUSE_ENTER: 'mouseenter',
    MOUSE_LEAVE: 'mouseleave',
    MOUSE_WHEEL: 'wheel',
    POINTER_UP: 'pointerup',
    POINTER_DOWN: 'pointerdown',
    POINTER_MOVE: 'pointermove',
    POINTER_LEAVE: 'pointerleave',
    CONTEXT_MENU: 'contextmenu',
    WHEEL: 'wheel',
    // Keyboard
    KEY_DOWN: 'keydown',
    KEY_PRESS: 'keypress',
    KEY_UP: 'keyup',
    // HTML Document
    LOAD: 'load',
    BEFORE_UNLOAD: 'beforeunload',
    UNLOAD: 'unload',
    PAGE_SHOW: 'pageshow',
    PAGE_HIDE: 'pagehide',
    PASTE: 'paste',
    ABORT: 'abort',
    ERROR: 'error',
    RESIZE: 'resize',
    SCROLL: 'scroll',
    FULLSCREEN_CHANGE: 'fullscreenchange',
    WK_FULLSCREEN_CHANGE: 'webkitfullscreenchange',
    // Form
    SELECT: 'select',
    CHANGE: 'change',
    SUBMIT: 'submit',
    RESET: 'reset',
    FOCUS: 'focus',
    FOCUS_IN: 'focusin',
    FOCUS_OUT: 'focusout',
    BLUR: 'blur',
    INPUT: 'input',
    // Local Storage
    STORAGE: 'storage',
    // Drag
    DRAG_START: 'dragstart',
    DRAG: 'drag',
    DRAG_ENTER: 'dragenter',
    DRAG_LEAVE: 'dragleave',
    DRAG_OVER: 'dragover',
    DROP: 'drop',
    DRAG_END: 'dragend',
    // Animation
    ANIMATION_START: browser.isWebKit ? 'webkitAnimationStart' : 'animationstart',
    ANIMATION_END: browser.isWebKit ? 'webkitAnimationEnd' : 'animationend',
    ANIMATION_ITERATION: browser.isWebKit ? 'webkitAnimationIteration' : 'animationiteration'
};
export function isEventLike(obj) {
    const candidate = obj;
    return !!(candidate && typeof candidate.preventDefault === 'function' && typeof candidate.stopPropagation === 'function');
}
export const EventHelper = {
    stop: (e, cancelBubble) => {
        e.preventDefault();
        if (cancelBubble) {
            e.stopPropagation();
        }
        return e;
    }
};
export function saveParentsScrollTop(node) {
    const r = [];
    for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
        r[i] = node.scrollTop;
        node = node.parentNode;
    }
    return r;
}
export function restoreParentsScrollTop(node, state) {
    for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
        if (node.scrollTop !== state[i]) {
            node.scrollTop = state[i];
        }
        node = node.parentNode;
    }
}
class FocusTracker extends Disposable {
    static hasFocusWithin(element) {
        if (isHTMLElement(element)) {
            const shadowRoot = getShadowRoot(element);
            const activeElement = (shadowRoot ? shadowRoot.activeElement : element.ownerDocument.activeElement);
            return isAncestor(activeElement, element);
        }
        else {
            const window = element;
            return isAncestor(window.document.activeElement, window.document);
        }
    }
    constructor(element) {
        super();
        this._onDidFocus = this._register(new event.Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new event.Emitter());
        this.onDidBlur = this._onDidBlur.event;
        let hasFocus = FocusTracker.hasFocusWithin(element);
        let loosingFocus = false;
        const onFocus = () => {
            loosingFocus = false;
            if (!hasFocus) {
                hasFocus = true;
                this._onDidFocus.fire();
            }
        };
        const onBlur = () => {
            if (hasFocus) {
                loosingFocus = true;
                (isHTMLElement(element) ? getWindow(element) : element).setTimeout(() => {
                    if (loosingFocus) {
                        loosingFocus = false;
                        hasFocus = false;
                        this._onDidBlur.fire();
                    }
                }, 0);
            }
        };
        this._refreshStateHandler = () => {
            const currentNodeHasFocus = FocusTracker.hasFocusWithin(element);
            if (currentNodeHasFocus !== hasFocus) {
                if (hasFocus) {
                    onBlur();
                }
                else {
                    onFocus();
                }
            }
        };
        this._register(addDisposableListener(element, EventType.FOCUS, onFocus, true));
        this._register(addDisposableListener(element, EventType.BLUR, onBlur, true));
        if (isHTMLElement(element)) {
            this._register(addDisposableListener(element, EventType.FOCUS_IN, () => this._refreshStateHandler()));
            this._register(addDisposableListener(element, EventType.FOCUS_OUT, () => this._refreshStateHandler()));
        }
    }
    refreshState() {
        this._refreshStateHandler();
    }
}
/**
 * Creates a new `IFocusTracker` instance that tracks focus changes on the given `element` and its descendants.
 *
 * @param element The `HTMLElement` or `Window` to track focus changes on.
 * @returns An `IFocusTracker` instance.
 */
export function trackFocus(element) {
    return new FocusTracker(element);
}
export function after(sibling, child) {
    sibling.after(child);
    return child;
}
export function append(parent, ...children) {
    parent.append(...children);
    if (children.length === 1 && typeof children[0] !== 'string') {
        return children[0];
    }
}
export function prepend(parent, child) {
    parent.insertBefore(child, parent.firstChild);
    return child;
}
/**
 * Removes all children from `parent` and appends `children`
 */
export function reset(parent, ...children) {
    parent.innerText = '';
    append(parent, ...children);
}
const SELECTOR_REGEX = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/;
export var Namespace;
(function (Namespace) {
    Namespace["HTML"] = "http://www.w3.org/1999/xhtml";
    Namespace["SVG"] = "http://www.w3.org/2000/svg";
})(Namespace || (Namespace = {}));
function _$(namespace, description, attrs, ...children) {
    const match = SELECTOR_REGEX.exec(description);
    if (!match) {
        throw new Error('Bad use of emmet');
    }
    const tagName = match[1] || 'div';
    let result;
    if (namespace !== Namespace.HTML) {
        result = document.createElementNS(namespace, tagName);
    }
    else {
        result = document.createElement(tagName);
    }
    if (match[3]) {
        result.id = match[3];
    }
    if (match[4]) {
        result.className = match[4].replace(/\./g, ' ').trim();
    }
    if (attrs) {
        Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === 'undefined') {
                return;
            }
            if (/^on\w+$/.test(name)) {
                result[name] = value;
            }
            else if (name === 'selected') {
                if (value) {
                    result.setAttribute(name, 'true');
                }
            }
            else {
                result.setAttribute(name, value);
            }
        });
    }
    result.append(...children);
    return result;
}
export function $(description, attrs, ...children) {
    return _$(Namespace.HTML, description, attrs, ...children);
}
$.SVG = function (description, attrs, ...children) {
    return _$(Namespace.SVG, description, attrs, ...children);
};
export function join(nodes, separator) {
    const result = [];
    nodes.forEach((node, index) => {
        if (index > 0) {
            if (separator instanceof Node) {
                result.push(separator.cloneNode());
            }
            else {
                result.push(document.createTextNode(separator));
            }
        }
        result.push(node);
    });
    return result;
}
export function setVisibility(visible, ...elements) {
    if (visible) {
        show(...elements);
    }
    else {
        hide(...elements);
    }
}
export function show(...elements) {
    for (const element of elements) {
        element.style.display = '';
        element.removeAttribute('aria-hidden');
    }
}
export function hide(...elements) {
    for (const element of elements) {
        element.style.display = 'none';
        element.setAttribute('aria-hidden', 'true');
    }
}
function findParentWithAttribute(node, attribute) {
    while (node && node.nodeType === node.ELEMENT_NODE) {
        if (isHTMLElement(node) && node.hasAttribute(attribute)) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}
export function removeTabIndexAndUpdateFocus(node) {
    if (!node || !node.hasAttribute('tabIndex')) {
        return;
    }
    // If we are the currently focused element and tabIndex is removed,
    // standard DOM behavior is to move focus to the <body> element. We
    // typically never want that, rather put focus to the closest element
    // in the hierarchy of the parent DOM nodes.
    if (node.ownerDocument.activeElement === node) {
        const parentFocusable = findParentWithAttribute(node.parentElement, 'tabIndex');
        parentFocusable?.focus();
    }
    node.removeAttribute('tabindex');
}
export function finalHandler(fn) {
    return e => {
        e.preventDefault();
        e.stopPropagation();
        fn(e);
    };
}
export function domContentLoaded(targetWindow) {
    return new Promise(resolve => {
        const readyState = targetWindow.document.readyState;
        if (readyState === 'complete' || (targetWindow.document && targetWindow.document.body !== null)) {
            resolve(undefined);
        }
        else {
            const listener = () => {
                targetWindow.window.removeEventListener('DOMContentLoaded', listener, false);
                resolve();
            };
            targetWindow.window.addEventListener('DOMContentLoaded', listener, false);
        }
    });
}
/**
 * Find a value usable for a dom node size such that the likelihood that it would be
 * displayed with constant screen pixels size is as high as possible.
 *
 * e.g. We would desire for the cursors to be 2px (CSS px) wide. Under a devicePixelRatio
 * of 1.25, the cursor will be 2.5 screen pixels wide. Depending on how the dom node aligns/"snaps"
 * with the screen pixels, it will sometimes be rendered with 2 screen pixels, and sometimes with 3 screen pixels.
 */
export function computeScreenAwareSize(window, cssPx) {
    const screenPx = window.devicePixelRatio * cssPx;
    return Math.max(1, Math.floor(screenPx)) / window.devicePixelRatio;
}
/**
 * Open safely a new window. This is the best way to do so, but you cannot tell
 * if the window was opened or if it was blocked by the browser's popup blocker.
 * If you want to tell if the browser blocked the new window, use {@link windowOpenWithSuccess}.
 *
 * See https://github.com/microsoft/monaco-editor/issues/601
 * To protect against malicious code in the linked site, particularly phishing attempts,
 * the window.opener should be set to null to prevent the linked site from having access
 * to change the location of the current page.
 * See https://mathiasbynens.github.io/rel-noopener/
 */
export function windowOpenNoOpener(url) {
    // By using 'noopener' in the `windowFeatures` argument, the newly created window will
    // not be able to use `window.opener` to reach back to the current page.
    // See https://stackoverflow.com/a/46958731
    // See https://developer.mozilla.org/en-US/docs/Web/API/Window/open#noopener
    // However, this also doesn't allow us to realize if the browser blocked
    // the creation of the window.
    mainWindow.open(url, '_blank', 'noopener');
}
/**
 * Open a new window in a popup. This is the best way to do so, but you cannot tell
 * if the window was opened or if it was blocked by the browser's popup blocker.
 * If you want to tell if the browser blocked the new window, use {@link windowOpenWithSuccess}.
 *
 * Note: this does not set {@link window.opener} to null. This is to allow the opened popup to
 * be able to use {@link window.close} to close itself. Because of this, you should only use
 * this function on urls that you trust.
 *
 * In otherwords, you should almost always use {@link windowOpenNoOpener} instead of this function.
 */
const popupWidth = 780, popupHeight = 640;
export function windowOpenPopup(url) {
    const left = Math.floor(mainWindow.screenLeft + mainWindow.innerWidth / 2 - popupWidth / 2);
    const top = Math.floor(mainWindow.screenTop + mainWindow.innerHeight / 2 - popupHeight / 2);
    mainWindow.open(url, '_blank', `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`);
}
/**
 * Attempts to open a window and returns whether it succeeded. This technique is
 * not appropriate in certain contexts, like for example when the JS context is
 * executing inside a sandboxed iframe. If it is not necessary to know if the
 * browser blocked the new window, use {@link windowOpenNoOpener}.
 *
 * See https://github.com/microsoft/monaco-editor/issues/601
 * See https://github.com/microsoft/monaco-editor/issues/2474
 * See https://mathiasbynens.github.io/rel-noopener/
 *
 * @param url the url to open
 * @param noOpener whether or not to set the {@link window.opener} to null. You should leave the default
 * (true) unless you trust the url that is being opened.
 * @returns boolean indicating if the {@link window.open} call succeeded
 */
export function windowOpenWithSuccess(url, noOpener = true) {
    const newTab = mainWindow.open();
    if (newTab) {
        if (noOpener) {
            // see `windowOpenNoOpener` for details on why this is important
            newTab.opener = null;
        }
        newTab.location.href = url;
        return true;
    }
    return false;
}
export function animate(targetWindow, fn) {
    const step = () => {
        fn();
        stepDisposable = scheduleAtNextAnimationFrame(targetWindow, step);
    };
    let stepDisposable = scheduleAtNextAnimationFrame(targetWindow, step);
    return toDisposable(() => stepDisposable.dispose());
}
RemoteAuthorities.setPreferredWebSchema(/^https:/.test(mainWindow.location.href) ? 'https' : 'http');
export function triggerDownload(dataOrUri, name) {
    // If the data is provided as Buffer, we create a
    // blob URL out of it to produce a valid link
    let url;
    if (URI.isUri(dataOrUri)) {
        url = dataOrUri.toString(true);
    }
    else {
        const blob = new Blob([dataOrUri]);
        url = URL.createObjectURL(blob);
        // Ensure to free the data from DOM eventually
        setTimeout(() => URL.revokeObjectURL(url));
    }
    // In order to download from the browser, the only way seems
    // to be creating a <a> element with download attribute that
    // points to the file to download.
    // See also https://developers.google.com/web/updates/2011/08/Downloading-resources-in-HTML5-a-download
    const activeWindow = getActiveWindow();
    const anchor = document.createElement('a');
    activeWindow.document.body.appendChild(anchor);
    anchor.download = name;
    anchor.href = url;
    anchor.click();
    // Ensure to remove the element from DOM eventually
    setTimeout(() => anchor.remove());
}
export function triggerUpload() {
    return new Promise(resolve => {
        // In order to upload to the browser, create a
        // input element of type `file` and click it
        // to gather the selected files
        const activeWindow = getActiveWindow();
        const input = document.createElement('input');
        activeWindow.document.body.appendChild(input);
        input.type = 'file';
        input.multiple = true;
        // Resolve once the input event has fired once
        event.Event.once(event.Event.fromDOMEventEmitter(input, 'input'))(() => {
            resolve(input.files ?? undefined);
        });
        input.click();
        // Ensure to remove the element from DOM eventually
        setTimeout(() => input.remove());
    });
}
export var DetectedFullscreenMode;
(function (DetectedFullscreenMode) {
    /**
     * The document is fullscreen, e.g. because an element
     * in the document requested to be fullscreen.
     */
    DetectedFullscreenMode[DetectedFullscreenMode["DOCUMENT"] = 1] = "DOCUMENT";
    /**
     * The browser is fullscreen, e.g. because the user enabled
     * native window fullscreen for it.
     */
    DetectedFullscreenMode[DetectedFullscreenMode["BROWSER"] = 2] = "BROWSER";
})(DetectedFullscreenMode || (DetectedFullscreenMode = {}));
export function detectFullscreen(targetWindow) {
    // Browser fullscreen: use DOM APIs to detect
    if (targetWindow.document.fullscreenElement || targetWindow.document.webkitFullscreenElement || targetWindow.document.webkitIsFullScreen) {
        return { mode: DetectedFullscreenMode.DOCUMENT, guess: false };
    }
    // There is no standard way to figure out if the browser
    // is using native fullscreen. Via checking on screen
    // height and comparing that to window height, we can guess
    // it though.
    if (targetWindow.innerHeight === targetWindow.screen.height) {
        // if the height of the window matches the screen height, we can
        // safely assume that the browser is fullscreen because no browser
        // chrome is taking height away (e.g. like toolbars).
        return { mode: DetectedFullscreenMode.BROWSER, guess: false };
    }
    if (platform.isMacintosh || platform.isLinux) {
        // macOS and Linux do not properly report `innerHeight`, only Windows does
        if (targetWindow.outerHeight === targetWindow.screen.height && targetWindow.outerWidth === targetWindow.screen.width) {
            // if the height of the browser matches the screen height, we can
            // only guess that we are in fullscreen. It is also possible that
            // the user has turned off taskbars in the OS and the browser is
            // simply able to span the entire size of the screen.
            return { mode: DetectedFullscreenMode.BROWSER, guess: true };
        }
    }
    // Not in fullscreen
    return null;
}
// -- sanitize and trusted html
/**
 * Hooks dompurify using `afterSanitizeAttributes` to check that all `href` and `src`
 * attributes are valid.
 */
export function hookDomPurifyHrefAndSrcSanitizer(allowedProtocols, allowDataImages = false) {
    // https://github.com/cure53/DOMPurify/blob/main/demos/hooks-scheme-allowlist.html
    // build an anchor to map URLs to
    const anchor = document.createElement('a');
    dompurify.addHook('afterSanitizeAttributes', (node) => {
        // check all href/src attributes for validity
        for (const attr of ['href', 'src']) {
            if (node.hasAttribute(attr)) {
                const attrValue = node.getAttribute(attr);
                if (attr === 'href' && attrValue.startsWith('#')) {
                    // Allow fragment links
                    continue;
                }
                anchor.href = attrValue;
                if (!allowedProtocols.includes(anchor.protocol.replace(/:$/, ''))) {
                    if (allowDataImages && attr === 'src' && anchor.href.startsWith('data:')) {
                        continue;
                    }
                    node.removeAttribute(attr);
                }
            }
        }
    });
    return toDisposable(() => {
        dompurify.removeHook('afterSanitizeAttributes');
    });
}
const defaultSafeProtocols = [
    Schemas.http,
    Schemas.https,
    Schemas.command,
];
/**
 * List of safe, non-input html tags.
 */
export const basicMarkupHtmlTags = Object.freeze([
    'a',
    'abbr',
    'b',
    'bdo',
    'blockquote',
    'br',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    'q',
    'rp',
    'rt',
    'ruby',
    'samp',
    'small',
    'small',
    'source',
    'span',
    'strike',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
]);
const defaultDomPurifyConfig = Object.freeze({
    ALLOWED_TAGS: ['a', 'button', 'blockquote', 'code', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'input', 'label', 'li', 'p', 'pre', 'select', 'small', 'span', 'strong', 'textarea', 'ul', 'ol'],
    ALLOWED_ATTR: ['href', 'data-href', 'data-command', 'target', 'title', 'name', 'src', 'alt', 'class', 'id', 'role', 'tabindex', 'style', 'data-code', 'width', 'height', 'align', 'x-dispatch', 'required', 'checked', 'placeholder', 'type', 'start'],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: true
});
/**
 * Sanitizes the given `value` and reset the given `node` with it.
 */
export function safeInnerHtml(node, value, extraDomPurifyConfig) {
    const hook = hookDomPurifyHrefAndSrcSanitizer(defaultSafeProtocols);
    try {
        const html = dompurify.sanitize(value, { ...defaultDomPurifyConfig, ...extraDomPurifyConfig });
        node.innerHTML = html;
    }
    finally {
        hook.dispose();
    }
}
/**
 * Convert a Unicode string to a string in which each 16-bit unit occupies only one byte
 *
 * From https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
 */
function toBinary(str) {
    const codeUnits = new Uint16Array(str.length);
    for (let i = 0; i < codeUnits.length; i++) {
        codeUnits[i] = str.charCodeAt(i);
    }
    let binary = '';
    const uint8array = new Uint8Array(codeUnits.buffer);
    for (let i = 0; i < uint8array.length; i++) {
        binary += String.fromCharCode(uint8array[i]);
    }
    return binary;
}
/**
 * Version of the global `btoa` function that handles multi-byte characters instead
 * of throwing an exception.
 */
export function multibyteAwareBtoa(str) {
    return btoa(toBinary(str));
}
export class ModifierKeyEmitter extends event.Emitter {
    constructor() {
        super();
        this._subscriptions = new DisposableStore();
        this._keyStatus = {
            altKey: false,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        };
        this._subscriptions.add(event.Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => this.registerListeners(window, disposables), { window: mainWindow, disposables: this._subscriptions }));
    }
    registerListeners(window, disposables) {
        disposables.add(addDisposableListener(window, 'keydown', e => {
            if (e.defaultPrevented) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            // If Alt-key keydown event is repeated, ignore it #112347
            // Only known to be necessary for Alt-Key at the moment #115810
            if (event.keyCode === 6 /* KeyCode.Alt */ && e.repeat) {
                return;
            }
            if (e.altKey && !this._keyStatus.altKey) {
                this._keyStatus.lastKeyPressed = 'alt';
            }
            else if (e.ctrlKey && !this._keyStatus.ctrlKey) {
                this._keyStatus.lastKeyPressed = 'ctrl';
            }
            else if (e.metaKey && !this._keyStatus.metaKey) {
                this._keyStatus.lastKeyPressed = 'meta';
            }
            else if (e.shiftKey && !this._keyStatus.shiftKey) {
                this._keyStatus.lastKeyPressed = 'shift';
            }
            else if (event.keyCode !== 6 /* KeyCode.Alt */) {
                this._keyStatus.lastKeyPressed = undefined;
            }
            else {
                return;
            }
            this._keyStatus.altKey = e.altKey;
            this._keyStatus.ctrlKey = e.ctrlKey;
            this._keyStatus.metaKey = e.metaKey;
            this._keyStatus.shiftKey = e.shiftKey;
            if (this._keyStatus.lastKeyPressed) {
                this._keyStatus.event = e;
                this.fire(this._keyStatus);
            }
        }, true));
        disposables.add(addDisposableListener(window, 'keyup', e => {
            if (e.defaultPrevented) {
                return;
            }
            if (!e.altKey && this._keyStatus.altKey) {
                this._keyStatus.lastKeyReleased = 'alt';
            }
            else if (!e.ctrlKey && this._keyStatus.ctrlKey) {
                this._keyStatus.lastKeyReleased = 'ctrl';
            }
            else if (!e.metaKey && this._keyStatus.metaKey) {
                this._keyStatus.lastKeyReleased = 'meta';
            }
            else if (!e.shiftKey && this._keyStatus.shiftKey) {
                this._keyStatus.lastKeyReleased = 'shift';
            }
            else {
                this._keyStatus.lastKeyReleased = undefined;
            }
            if (this._keyStatus.lastKeyPressed !== this._keyStatus.lastKeyReleased) {
                this._keyStatus.lastKeyPressed = undefined;
            }
            this._keyStatus.altKey = e.altKey;
            this._keyStatus.ctrlKey = e.ctrlKey;
            this._keyStatus.metaKey = e.metaKey;
            this._keyStatus.shiftKey = e.shiftKey;
            if (this._keyStatus.lastKeyReleased) {
                this._keyStatus.event = e;
                this.fire(this._keyStatus);
            }
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mousedown', () => {
            this._keyStatus.lastKeyPressed = undefined;
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mouseup', () => {
            this._keyStatus.lastKeyPressed = undefined;
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mousemove', e => {
            if (e.buttons) {
                this._keyStatus.lastKeyPressed = undefined;
            }
        }, true));
        disposables.add(addDisposableListener(window, 'blur', () => {
            this.resetKeyStatus();
        }));
    }
    get keyStatus() {
        return this._keyStatus;
    }
    get isModifierPressed() {
        return this._keyStatus.altKey || this._keyStatus.ctrlKey || this._keyStatus.metaKey || this._keyStatus.shiftKey;
    }
    /**
     * Allows to explicitly reset the key status based on more knowledge (#109062)
     */
    resetKeyStatus() {
        this.doResetKeyStatus();
        this.fire(this._keyStatus);
    }
    doResetKeyStatus() {
        this._keyStatus = {
            altKey: false,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false
        };
    }
    static getInstance() {
        if (!ModifierKeyEmitter.instance) {
            ModifierKeyEmitter.instance = new ModifierKeyEmitter();
        }
        return ModifierKeyEmitter.instance;
    }
    dispose() {
        super.dispose();
        this._subscriptions.dispose();
    }
}
export function getCookieValue(name) {
    const match = document.cookie.match('(^|[^;]+)\\s*' + name + '\\s*=\\s*([^;]+)'); // See https://stackoverflow.com/a/25490531
    return match ? match.pop() : undefined;
}
export class DragAndDropObserver extends Disposable {
    constructor(element, callbacks) {
        super();
        this.element = element;
        this.callbacks = callbacks;
        // A helper to fix issues with repeated DRAG_ENTER / DRAG_LEAVE
        // calls see https://github.com/microsoft/vscode/issues/14470
        // when the element has child elements where the events are fired
        // repeadedly.
        this.counter = 0;
        // Allows to measure the duration of the drag operation.
        this.dragStartTime = 0;
        this.registerListeners();
    }
    registerListeners() {
        if (this.callbacks.onDragStart) {
            this._register(addDisposableListener(this.element, EventType.DRAG_START, (e) => {
                this.callbacks.onDragStart?.(e);
            }));
        }
        if (this.callbacks.onDrag) {
            this._register(addDisposableListener(this.element, EventType.DRAG, (e) => {
                this.callbacks.onDrag?.(e);
            }));
        }
        this._register(addDisposableListener(this.element, EventType.DRAG_ENTER, (e) => {
            this.counter++;
            this.dragStartTime = e.timeStamp;
            this.callbacks.onDragEnter?.(e);
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_OVER, (e) => {
            e.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
            this.callbacks.onDragOver?.(e, e.timeStamp - this.dragStartTime);
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_LEAVE, (e) => {
            this.counter--;
            if (this.counter === 0) {
                this.dragStartTime = 0;
                this.callbacks.onDragLeave?.(e);
            }
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_END, (e) => {
            this.counter = 0;
            this.dragStartTime = 0;
            this.callbacks.onDragEnd?.(e);
        }));
        this._register(addDisposableListener(this.element, EventType.DROP, (e) => {
            this.counter = 0;
            this.dragStartTime = 0;
            this.callbacks.onDrop?.(e);
        }));
    }
}
const H_REGEX = /(?<tag>[\w\-]+)?(?:#(?<id>[\w\-]+))?(?<class>(?:\.(?:[\w\-]+))*)(?:@(?<name>(?:[\w\_])+))?/;
export function h(tag, ...args) {
    let attributes;
    let children;
    if (Array.isArray(args[0])) {
        attributes = {};
        children = args[0];
    }
    else {
        attributes = args[0] || {};
        children = args[1];
    }
    const match = H_REGEX.exec(tag);
    if (!match || !match.groups) {
        throw new Error('Bad use of h');
    }
    const tagName = match.groups['tag'] || 'div';
    const el = document.createElement(tagName);
    if (match.groups['id']) {
        el.id = match.groups['id'];
    }
    const classNames = [];
    if (match.groups['class']) {
        for (const className of match.groups['class'].split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (attributes.className !== undefined) {
        for (const className of attributes.className.split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (classNames.length > 0) {
        el.className = classNames.join(' ');
    }
    const result = {};
    if (match.groups['name']) {
        result[match.groups['name']] = el;
    }
    if (children) {
        for (const c of children) {
            if (isHTMLElement(c)) {
                el.appendChild(c);
            }
            else if (typeof c === 'string') {
                el.append(c);
            }
            else if ('root' in c) {
                Object.assign(result, c);
                el.appendChild(c.root);
            }
        }
    }
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            continue;
        }
        else if (key === 'style') {
            for (const [cssKey, cssValue] of Object.entries(value)) {
                el.style.setProperty(camelCaseToHyphenCase(cssKey), typeof cssValue === 'number' ? cssValue + 'px' : '' + cssValue);
            }
        }
        else if (key === 'tabIndex') {
            el.tabIndex = value;
        }
        else {
            el.setAttribute(camelCaseToHyphenCase(key), value.toString());
        }
    }
    result['root'] = el;
    return result;
}
/** @deprecated This is a duplication of the h function. Needs cleanup. */
export function svgElem(tag, ...args) {
    let attributes;
    let children;
    if (Array.isArray(args[0])) {
        attributes = {};
        children = args[0];
    }
    else {
        attributes = args[0] || {};
        children = args[1];
    }
    const match = H_REGEX.exec(tag);
    if (!match || !match.groups) {
        throw new Error('Bad use of h');
    }
    const tagName = match.groups['tag'] || 'div';
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    if (match.groups['id']) {
        el.id = match.groups['id'];
    }
    const classNames = [];
    if (match.groups['class']) {
        for (const className of match.groups['class'].split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (attributes.className !== undefined) {
        for (const className of attributes.className.split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (classNames.length > 0) {
        el.className = classNames.join(' ');
    }
    const result = {};
    if (match.groups['name']) {
        result[match.groups['name']] = el;
    }
    if (children) {
        for (const c of children) {
            if (isHTMLElement(c)) {
                el.appendChild(c);
            }
            else if (typeof c === 'string') {
                el.append(c);
            }
            else if ('root' in c) {
                Object.assign(result, c);
                el.appendChild(c.root);
            }
        }
    }
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            continue;
        }
        else if (key === 'style') {
            for (const [cssKey, cssValue] of Object.entries(value)) {
                el.style.setProperty(camelCaseToHyphenCase(cssKey), typeof cssValue === 'number' ? cssValue + 'px' : '' + cssValue);
            }
        }
        else if (key === 'tabIndex') {
            el.tabIndex = value;
        }
        else {
            el.setAttribute(camelCaseToHyphenCase(key), value.toString());
        }
    }
    result['root'] = el;
    return result;
}
function camelCaseToHyphenCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
export function copyAttributes(from, to, filter) {
    for (const { name, value } of from.attributes) {
        if (!filter || filter.includes(name)) {
            to.setAttribute(name, value);
        }
    }
}
function copyAttribute(from, to, name) {
    const value = from.getAttribute(name);
    if (value) {
        to.setAttribute(name, value);
    }
    else {
        to.removeAttribute(name);
    }
}
export function trackAttributes(from, to, filter) {
    copyAttributes(from, to, filter);
    const disposables = new DisposableStore();
    disposables.add(sharedMutationObserver.observe(from, disposables, { attributes: true, attributeFilter: filter })(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName) {
                copyAttribute(from, to, mutation.attributeName);
            }
        }
    }));
    return disposables;
}
export function isEditableElement(element) {
    return element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea' || isHTMLElement(element) && !!element.editContext;
}
/**
 * Helper for calculating the "safe triangle" occluded by hovers to avoid early dismissal.
 * @see https://www.smashingmagazine.com/2023/08/better-context-menus-safe-triangles/ for example
 */
export class SafeTriangle {
    constructor(originX, originY, target) {
        this.originX = originX;
        this.originY = originY;
        // 4 points (x, y), 8 length
        this.points = new Int16Array(8);
        const { top, left, right, bottom } = target.getBoundingClientRect();
        const t = this.points;
        let i = 0;
        t[i++] = left;
        t[i++] = top;
        t[i++] = right;
        t[i++] = top;
        t[i++] = left;
        t[i++] = bottom;
        t[i++] = right;
        t[i++] = bottom;
    }
    contains(x, y) {
        const { points, originX, originY } = this;
        for (let i = 0; i < 4; i++) {
            const p1 = 2 * i;
            const p2 = 2 * ((i + 1) % 4);
            if (isPointWithinTriangle(x, y, originX, originY, points[p1], points[p1 + 1], points[p2], points[p2 + 1])) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kb20udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFDeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDM0UsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFnQixNQUFNLG9CQUFvQixDQUFDO0FBQ2hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sS0FBSyxLQUFLLE1BQU0sb0JBQW9CLENBQUM7QUFDNUMsT0FBTyxTQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFFakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2xFLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6QyxPQUFPLEVBQWMsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzdELGNBQWMsNEJBQTRC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