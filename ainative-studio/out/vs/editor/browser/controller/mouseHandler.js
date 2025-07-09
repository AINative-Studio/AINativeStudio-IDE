/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { StandardWheelEvent } from '../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { HitTestContext, MouseTarget, MouseTargetFactory } from './mouseTarget.js';
import { ClientCoordinates, EditorMouseEvent, EditorMouseEventFactory, GlobalEditorPointerMoveMonitor, createEditorPagePosition, createCoordinatesRelativeToEditor, PageCoordinates } from '../editorDom.js';
import { EditorZoom } from '../../common/config/editorZoom.js';
import { Position } from '../../common/core/position.js';
import { Selection } from '../../common/core/selection.js';
import { ViewEventHandler } from '../../common/viewEventHandler.js';
import { MouseWheelClassifier } from '../../../base/browser/ui/scrollbar/scrollableElement.js';
export class MouseHandler extends ViewEventHandler {
    constructor(context, viewController, viewHelper) {
        super();
        this._mouseLeaveMonitor = null;
        this._context = context;
        this.viewController = viewController;
        this.viewHelper = viewHelper;
        this.mouseTargetFactory = new MouseTargetFactory(this._context, viewHelper);
        this._mouseDownOperation = this._register(new MouseDownOperation(this._context, this.viewController, this.viewHelper, this.mouseTargetFactory, (e, testEventTarget) => this._createMouseTarget(e, testEventTarget), (e) => this._getMouseColumn(e)));
        this.lastMouseLeaveTime = -1;
        this._height = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height;
        const mouseEvents = new EditorMouseEventFactory(this.viewHelper.viewDomNode);
        this._register(mouseEvents.onContextMenu(this.viewHelper.viewDomNode, (e) => this._onContextMenu(e, true)));
        this._register(mouseEvents.onMouseMove(this.viewHelper.viewDomNode, (e) => {
            this._onMouseMove(e);
            // See https://github.com/microsoft/vscode/issues/138789
            // When moving the mouse really quickly, the browser sometimes forgets to
            // send us a `mouseleave` or `mouseout` event. We therefore install here
            // a global `mousemove` listener to manually recover if the mouse goes outside
            // the editor. As soon as the mouse leaves outside of the editor, we
            // remove this listener
            if (!this._mouseLeaveMonitor) {
                this._mouseLeaveMonitor = dom.addDisposableListener(this.viewHelper.viewDomNode.ownerDocument, 'mousemove', (e) => {
                    if (!this.viewHelper.viewDomNode.contains(e.target)) {
                        // went outside the editor!
                        this._onMouseLeave(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode));
                    }
                });
            }
        }));
        this._register(mouseEvents.onMouseUp(this.viewHelper.viewDomNode, (e) => this._onMouseUp(e)));
        this._register(mouseEvents.onMouseLeave(this.viewHelper.viewDomNode, (e) => this._onMouseLeave(e)));
        // `pointerdown` events can't be used to determine if there's a double click, or triple click
        // because their `e.detail` is always 0.
        // We will therefore save the pointer id for the mouse and then reuse it in the `mousedown` event
        // for `element.setPointerCapture`.
        let capturePointerId = 0;
        this._register(mouseEvents.onPointerDown(this.viewHelper.viewDomNode, (e, pointerId) => {
            capturePointerId = pointerId;
        }));
        // The `pointerup` listener registered by `GlobalEditorPointerMoveMonitor` does not get invoked 100% of the times.
        // I speculate that this is because the `pointerup` listener is only registered during the `mousedown` event, and perhaps
        // the `pointerup` event is already queued for dispatching, which makes it that the new listener doesn't get fired.
        // See https://github.com/microsoft/vscode/issues/146486 for repro steps.
        // To compensate for that, we simply register here a `pointerup` listener and just communicate it.
        this._register(dom.addDisposableListener(this.viewHelper.viewDomNode, dom.EventType.POINTER_UP, (e) => {
            this._mouseDownOperation.onPointerUp();
        }));
        this._register(mouseEvents.onMouseDown(this.viewHelper.viewDomNode, (e) => this._onMouseDown(e, capturePointerId)));
        this._setupMouseWheelZoomListener();
        this._context.addEventHandler(this);
    }
    _setupMouseWheelZoomListener() {
        const classifier = MouseWheelClassifier.INSTANCE;
        let prevMouseWheelTime = 0;
        let gestureStartZoomLevel = EditorZoom.getZoomLevel();
        let gestureHasZoomModifiers = false;
        let gestureAccumulatedDelta = 0;
        const onMouseWheel = (browserEvent) => {
            this.viewController.emitMouseWheel(browserEvent);
            if (!this._context.configuration.options.get(77 /* EditorOption.mouseWheelZoom */)) {
                return;
            }
            const e = new StandardWheelEvent(browserEvent);
            classifier.acceptStandardWheelEvent(e);
            if (classifier.isPhysicalMouseWheel()) {
                if (hasMouseWheelZoomModifiers(browserEvent)) {
                    const zoomLevel = EditorZoom.getZoomLevel();
                    const delta = e.deltaY > 0 ? 1 : -1;
                    EditorZoom.setZoomLevel(zoomLevel + delta);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            else {
                // we consider mousewheel events that occur within 50ms of each other to be part of the same gesture
                // we don't want to consider mouse wheel events where ctrl/cmd is pressed during the inertia phase
                // we also want to accumulate deltaY values from the same gesture and use that to set the zoom level
                if (Date.now() - prevMouseWheelTime > 50) {
                    // reset if more than 50ms have passed
                    gestureStartZoomLevel = EditorZoom.getZoomLevel();
                    gestureHasZoomModifiers = hasMouseWheelZoomModifiers(browserEvent);
                    gestureAccumulatedDelta = 0;
                }
                prevMouseWheelTime = Date.now();
                gestureAccumulatedDelta += e.deltaY;
                if (gestureHasZoomModifiers) {
                    EditorZoom.setZoomLevel(gestureStartZoomLevel + gestureAccumulatedDelta / 5);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        this._register(dom.addDisposableListener(this.viewHelper.viewDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { capture: true, passive: false }));
        function hasMouseWheelZoomModifiers(browserEvent) {
            return (platform.isMacintosh
                // on macOS we support cmd + two fingers scroll (`metaKey` set)
                // and also the two fingers pinch gesture (`ctrKey` set)
                ? ((browserEvent.metaKey || browserEvent.ctrlKey) && !browserEvent.shiftKey && !browserEvent.altKey)
                : (browserEvent.ctrlKey && !browserEvent.metaKey && !browserEvent.shiftKey && !browserEvent.altKey));
        }
    }
    dispose() {
        this._context.removeEventHandler(this);
        if (this._mouseLeaveMonitor) {
            this._mouseLeaveMonitor.dispose();
            this._mouseLeaveMonitor = null;
        }
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            // layout change
            const height = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height;
            if (this._height !== height) {
                this._height = height;
                this._mouseDownOperation.onHeightChanged();
            }
        }
        return false;
    }
    onCursorStateChanged(e) {
        this._mouseDownOperation.onCursorStateChanged(e);
        return false;
    }
    onFocusChanged(e) {
        return false;
    }
    // --- end event handlers
    getTargetAtClientPoint(clientX, clientY) {
        const clientPos = new ClientCoordinates(clientX, clientY);
        const pos = clientPos.toPageCoordinates(dom.getWindow(this.viewHelper.viewDomNode));
        const editorPos = createEditorPagePosition(this.viewHelper.viewDomNode);
        if (pos.y < editorPos.y || pos.y > editorPos.y + editorPos.height || pos.x < editorPos.x || pos.x > editorPos.x + editorPos.width) {
            return null;
        }
        const relativePos = createCoordinatesRelativeToEditor(this.viewHelper.viewDomNode, editorPos, pos);
        return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), editorPos, pos, relativePos, null);
    }
    _createMouseTarget(e, testEventTarget) {
        let target = e.target;
        if (!this.viewHelper.viewDomNode.contains(target)) {
            const shadowRoot = dom.getShadowRoot(this.viewHelper.viewDomNode);
            if (shadowRoot) {
                target = shadowRoot.elementsFromPoint(e.posx, e.posy).find((el) => this.viewHelper.viewDomNode.contains(el));
            }
        }
        return this.mouseTargetFactory.createMouseTarget(this.viewHelper.getLastRenderData(), e.editorPos, e.pos, e.relativePos, testEventTarget ? target : null);
    }
    _getMouseColumn(e) {
        return this.mouseTargetFactory.getMouseColumn(e.relativePos);
    }
    _onContextMenu(e, testEventTarget) {
        this.viewController.emitContextMenu({
            event: e,
            target: this._createMouseTarget(e, testEventTarget)
        });
    }
    _onMouseMove(e) {
        const targetIsWidget = this.mouseTargetFactory.mouseTargetIsWidget(e);
        if (!targetIsWidget) {
            e.preventDefault();
        }
        if (this._mouseDownOperation.isActive()) {
            // In selection/drag operation
            return;
        }
        const actualMouseMoveTime = e.timestamp;
        if (actualMouseMoveTime < this.lastMouseLeaveTime) {
            // Due to throttling, this event occurred before the mouse left the editor, therefore ignore it.
            return;
        }
        this.viewController.emitMouseMove({
            event: e,
            target: this._createMouseTarget(e, true)
        });
    }
    _onMouseLeave(e) {
        if (this._mouseLeaveMonitor) {
            this._mouseLeaveMonitor.dispose();
            this._mouseLeaveMonitor = null;
        }
        this.lastMouseLeaveTime = (new Date()).getTime();
        this.viewController.emitMouseLeave({
            event: e,
            target: null
        });
    }
    _onMouseUp(e) {
        this.viewController.emitMouseUp({
            event: e,
            target: this._createMouseTarget(e, true)
        });
    }
    _onMouseDown(e, pointerId) {
        const t = this._createMouseTarget(e, true);
        const targetIsContent = (t.type === 6 /* MouseTargetType.CONTENT_TEXT */ || t.type === 7 /* MouseTargetType.CONTENT_EMPTY */);
        const targetIsGutter = (t.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ || t.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ || t.type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */);
        const targetIsLineNumbers = (t.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */);
        const selectOnLineNumbers = this._context.configuration.options.get(114 /* EditorOption.selectOnLineNumbers */);
        const targetIsViewZone = (t.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ || t.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */);
        const targetIsWidget = (t.type === 9 /* MouseTargetType.CONTENT_WIDGET */);
        let shouldHandle = e.leftButton || e.middleButton;
        if (platform.isMacintosh && e.leftButton && e.ctrlKey) {
            shouldHandle = false;
        }
        const focus = () => {
            e.preventDefault();
            this.viewHelper.focusTextArea();
        };
        if (shouldHandle && (targetIsContent || (targetIsLineNumbers && selectOnLineNumbers))) {
            focus();
            this._mouseDownOperation.start(t.type, e, pointerId);
        }
        else if (targetIsGutter) {
            // Do not steal focus
            e.preventDefault();
        }
        else if (targetIsViewZone) {
            const viewZoneData = t.detail;
            if (shouldHandle && this.viewHelper.shouldSuppressMouseDownOnViewZone(viewZoneData.viewZoneId)) {
                focus();
                this._mouseDownOperation.start(t.type, e, pointerId);
                e.preventDefault();
            }
        }
        else if (targetIsWidget && this.viewHelper.shouldSuppressMouseDownOnWidget(t.detail)) {
            focus();
            e.preventDefault();
        }
        this.viewController.emitMouseDown({
            event: e,
            target: t
        });
    }
    _onMouseWheel(e) {
        this.viewController.emitMouseWheel(e);
    }
}
class MouseDownOperation extends Disposable {
    constructor(_context, _viewController, _viewHelper, _mouseTargetFactory, createMouseTarget, getMouseColumn) {
        super();
        this._context = _context;
        this._viewController = _viewController;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._createMouseTarget = createMouseTarget;
        this._getMouseColumn = getMouseColumn;
        this._mouseMoveMonitor = this._register(new GlobalEditorPointerMoveMonitor(this._viewHelper.viewDomNode));
        this._topBottomDragScrolling = this._register(new TopBottomDragScrolling(this._context, this._viewHelper, this._mouseTargetFactory, (position, inSelectionMode, revealType) => this._dispatchMouse(position, inSelectionMode, revealType)));
        this._mouseState = new MouseDownState();
        this._currentSelection = new Selection(1, 1, 1, 1);
        this._isActive = false;
        this._lastMouseEvent = null;
    }
    dispose() {
        super.dispose();
    }
    isActive() {
        return this._isActive;
    }
    _onMouseDownThenMove(e) {
        this._lastMouseEvent = e;
        this._mouseState.setModifiers(e);
        const position = this._findMousePosition(e, false);
        if (!position) {
            // Ignoring because position is unknown
            return;
        }
        if (this._mouseState.isDragAndDrop) {
            this._viewController.emitMouseDrag({
                event: e,
                target: position
            });
        }
        else {
            if (position.type === 13 /* MouseTargetType.OUTSIDE_EDITOR */ && (position.outsidePosition === 'above' || position.outsidePosition === 'below')) {
                this._topBottomDragScrolling.start(position, e);
            }
            else {
                this._topBottomDragScrolling.stop();
                this._dispatchMouse(position, true, 1 /* NavigationCommandRevealType.Minimal */);
            }
        }
    }
    start(targetType, e, pointerId) {
        this._lastMouseEvent = e;
        this._mouseState.setStartedOnLineNumbers(targetType === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */);
        this._mouseState.setStartButtons(e);
        this._mouseState.setModifiers(e);
        const position = this._findMousePosition(e, true);
        if (!position || !position.position) {
            // Ignoring because position is unknown
            return;
        }
        this._mouseState.trySetCount(e.detail, position.position);
        // Overwrite the detail of the MouseEvent, as it will be sent out in an event and contributions might rely on it.
        e.detail = this._mouseState.count;
        const options = this._context.configuration.options;
        if (!options.get(96 /* EditorOption.readOnly */)
            && options.get(35 /* EditorOption.dragAndDrop */)
            && !options.get(22 /* EditorOption.columnSelection */)
            && !this._mouseState.altKey // we don't support multiple mouse
            && e.detail < 2 // only single click on a selection can work
            && !this._isActive // the mouse is not down yet
            && !this._currentSelection.isEmpty() // we don't drag single cursor
            && (position.type === 6 /* MouseTargetType.CONTENT_TEXT */) // single click on text
            && position.position && this._currentSelection.containsPosition(position.position) // single click on a selection
        ) {
            this._mouseState.isDragAndDrop = true;
            this._isActive = true;
            this._mouseMoveMonitor.startMonitoring(this._viewHelper.viewLinesDomNode, pointerId, e.buttons, (e) => this._onMouseDownThenMove(e), (browserEvent) => {
                const position = this._findMousePosition(this._lastMouseEvent, false);
                if (dom.isKeyboardEvent(browserEvent)) {
                    // cancel
                    this._viewController.emitMouseDropCanceled();
                }
                else {
                    this._viewController.emitMouseDrop({
                        event: this._lastMouseEvent,
                        target: (position ? this._createMouseTarget(this._lastMouseEvent, true) : null) // Ignoring because position is unknown, e.g., Content View Zone
                    });
                }
                this._stop();
            });
            return;
        }
        this._mouseState.isDragAndDrop = false;
        this._dispatchMouse(position, e.shiftKey, 1 /* NavigationCommandRevealType.Minimal */);
        if (!this._isActive) {
            this._isActive = true;
            this._mouseMoveMonitor.startMonitoring(this._viewHelper.viewLinesDomNode, pointerId, e.buttons, (e) => this._onMouseDownThenMove(e), () => this._stop());
        }
    }
    _stop() {
        this._isActive = false;
        this._topBottomDragScrolling.stop();
    }
    onHeightChanged() {
        this._mouseMoveMonitor.stopMonitoring();
    }
    onPointerUp() {
        this._mouseMoveMonitor.stopMonitoring();
    }
    onCursorStateChanged(e) {
        this._currentSelection = e.selections[0];
    }
    _getPositionOutsideEditor(e) {
        const editorContent = e.editorPos;
        const model = this._context.viewModel;
        const viewLayout = this._context.viewLayout;
        const mouseColumn = this._getMouseColumn(e);
        if (e.posy < editorContent.y) {
            const outsideDistance = editorContent.y - e.posy;
            const verticalOffset = Math.max(viewLayout.getCurrentScrollTop() - outsideDistance, 0);
            const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
            if (viewZoneData) {
                const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
                if (newPosition) {
                    return MouseTarget.createOutsideEditor(mouseColumn, newPosition, 'above', outsideDistance);
                }
            }
            const aboveLineNumber = viewLayout.getLineNumberAtVerticalOffset(verticalOffset);
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(aboveLineNumber, 1), 'above', outsideDistance);
        }
        if (e.posy > editorContent.y + editorContent.height) {
            const outsideDistance = e.posy - editorContent.y - editorContent.height;
            const verticalOffset = viewLayout.getCurrentScrollTop() + e.relativePos.y;
            const viewZoneData = HitTestContext.getZoneAtCoord(this._context, verticalOffset);
            if (viewZoneData) {
                const newPosition = this._helpPositionJumpOverViewZone(viewZoneData);
                if (newPosition) {
                    return MouseTarget.createOutsideEditor(mouseColumn, newPosition, 'below', outsideDistance);
                }
            }
            const belowLineNumber = viewLayout.getLineNumberAtVerticalOffset(verticalOffset);
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(belowLineNumber, model.getLineMaxColumn(belowLineNumber)), 'below', outsideDistance);
        }
        const possibleLineNumber = viewLayout.getLineNumberAtVerticalOffset(viewLayout.getCurrentScrollTop() + e.relativePos.y);
        if (e.posx < editorContent.x) {
            const outsideDistance = editorContent.x - e.posx;
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(possibleLineNumber, 1), 'left', outsideDistance);
        }
        if (e.posx > editorContent.x + editorContent.width) {
            const outsideDistance = e.posx - editorContent.x - editorContent.width;
            return MouseTarget.createOutsideEditor(mouseColumn, new Position(possibleLineNumber, model.getLineMaxColumn(possibleLineNumber)), 'right', outsideDistance);
        }
        return null;
    }
    _findMousePosition(e, testEventTarget) {
        const positionOutsideEditor = this._getPositionOutsideEditor(e);
        if (positionOutsideEditor) {
            return positionOutsideEditor;
        }
        const t = this._createMouseTarget(e, testEventTarget);
        const hintedPosition = t.position;
        if (!hintedPosition) {
            return null;
        }
        if (t.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ || t.type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
            const newPosition = this._helpPositionJumpOverViewZone(t.detail);
            if (newPosition) {
                return MouseTarget.createViewZone(t.type, t.element, t.mouseColumn, newPosition, t.detail);
            }
        }
        return t;
    }
    _helpPositionJumpOverViewZone(viewZoneData) {
        // Force position on view zones to go above or below depending on where selection started from
        const selectionStart = new Position(this._currentSelection.selectionStartLineNumber, this._currentSelection.selectionStartColumn);
        const positionBefore = viewZoneData.positionBefore;
        const positionAfter = viewZoneData.positionAfter;
        if (positionBefore && positionAfter) {
            if (positionBefore.isBefore(selectionStart)) {
                return positionBefore;
            }
            else {
                return positionAfter;
            }
        }
        return null;
    }
    _dispatchMouse(position, inSelectionMode, revealType) {
        if (!position.position) {
            return;
        }
        this._viewController.dispatchMouse({
            position: position.position,
            mouseColumn: position.mouseColumn,
            startedOnLineNumbers: this._mouseState.startedOnLineNumbers,
            revealType,
            inSelectionMode: inSelectionMode,
            mouseDownCount: this._mouseState.count,
            altKey: this._mouseState.altKey,
            ctrlKey: this._mouseState.ctrlKey,
            metaKey: this._mouseState.metaKey,
            shiftKey: this._mouseState.shiftKey,
            leftButton: this._mouseState.leftButton,
            middleButton: this._mouseState.middleButton,
            onInjectedText: position.type === 6 /* MouseTargetType.CONTENT_TEXT */ && position.detail.injectedText !== null
        });
    }
}
class TopBottomDragScrolling extends Disposable {
    constructor(_context, _viewHelper, _mouseTargetFactory, _dispatchMouse) {
        super();
        this._context = _context;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._dispatchMouse = _dispatchMouse;
        this._operation = null;
    }
    dispose() {
        super.dispose();
        this.stop();
    }
    start(position, mouseEvent) {
        if (this._operation) {
            this._operation.setPosition(position, mouseEvent);
        }
        else {
            this._operation = new TopBottomDragScrollingOperation(this._context, this._viewHelper, this._mouseTargetFactory, this._dispatchMouse, position, mouseEvent);
        }
    }
    stop() {
        if (this._operation) {
            this._operation.dispose();
            this._operation = null;
        }
    }
}
class TopBottomDragScrollingOperation extends Disposable {
    constructor(_context, _viewHelper, _mouseTargetFactory, _dispatchMouse, position, mouseEvent) {
        super();
        this._context = _context;
        this._viewHelper = _viewHelper;
        this._mouseTargetFactory = _mouseTargetFactory;
        this._dispatchMouse = _dispatchMouse;
        this._position = position;
        this._mouseEvent = mouseEvent;
        this._lastTime = Date.now();
        this._animationFrameDisposable = dom.scheduleAtNextAnimationFrame(dom.getWindow(mouseEvent.browserEvent), () => this._execute());
    }
    dispose() {
        this._animationFrameDisposable.dispose();
        super.dispose();
    }
    setPosition(position, mouseEvent) {
        this._position = position;
        this._mouseEvent = mouseEvent;
    }
    /**
     * update internal state and return elapsed ms since last time
     */
    _tick() {
        const now = Date.now();
        const elapsed = now - this._lastTime;
        this._lastTime = now;
        return elapsed;
    }
    /**
     * get the number of lines per second to auto-scroll
     */
    _getScrollSpeed() {
        const lineHeight = this._context.configuration.options.get(68 /* EditorOption.lineHeight */);
        const viewportInLines = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).height / lineHeight;
        const outsideDistanceInLines = this._position.outsideDistance / lineHeight;
        if (outsideDistanceInLines <= 1.5) {
            return Math.max(30, viewportInLines * (1 + outsideDistanceInLines));
        }
        if (outsideDistanceInLines <= 3) {
            return Math.max(60, viewportInLines * (2 + outsideDistanceInLines));
        }
        return Math.max(200, viewportInLines * (7 + outsideDistanceInLines));
    }
    _execute() {
        const lineHeight = this._context.configuration.options.get(68 /* EditorOption.lineHeight */);
        const scrollSpeedInLines = this._getScrollSpeed();
        const elapsed = this._tick();
        const scrollInPixels = scrollSpeedInLines * (elapsed / 1000) * lineHeight;
        const scrollValue = (this._position.outsidePosition === 'above' ? -scrollInPixels : scrollInPixels);
        this._context.viewModel.viewLayout.deltaScrollNow(0, scrollValue);
        this._viewHelper.renderNow();
        const viewportData = this._context.viewLayout.getLinesViewportData();
        const edgeLineNumber = (this._position.outsidePosition === 'above' ? viewportData.startLineNumber : viewportData.endLineNumber);
        // First, try to find a position that matches the horizontal position of the mouse
        let mouseTarget;
        {
            const editorPos = createEditorPagePosition(this._viewHelper.viewDomNode);
            const horizontalScrollbarHeight = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).horizontalScrollbarHeight;
            const pos = new PageCoordinates(this._mouseEvent.pos.x, editorPos.y + editorPos.height - horizontalScrollbarHeight - 0.1);
            const relativePos = createCoordinatesRelativeToEditor(this._viewHelper.viewDomNode, editorPos, pos);
            mouseTarget = this._mouseTargetFactory.createMouseTarget(this._viewHelper.getLastRenderData(), editorPos, pos, relativePos, null);
        }
        if (!mouseTarget.position || mouseTarget.position.lineNumber !== edgeLineNumber) {
            if (this._position.outsidePosition === 'above') {
                mouseTarget = MouseTarget.createOutsideEditor(this._position.mouseColumn, new Position(edgeLineNumber, 1), 'above', this._position.outsideDistance);
            }
            else {
                mouseTarget = MouseTarget.createOutsideEditor(this._position.mouseColumn, new Position(edgeLineNumber, this._context.viewModel.getLineMaxColumn(edgeLineNumber)), 'below', this._position.outsideDistance);
            }
        }
        this._dispatchMouse(mouseTarget, true, 2 /* NavigationCommandRevealType.None */);
        this._animationFrameDisposable = dom.scheduleAtNextAnimationFrame(dom.getWindow(mouseTarget.element), () => this._execute());
    }
}
class MouseDownState {
    static { this.CLEAR_MOUSE_DOWN_COUNT_TIME = 400; } // ms
    get altKey() { return this._altKey; }
    get ctrlKey() { return this._ctrlKey; }
    get metaKey() { return this._metaKey; }
    get shiftKey() { return this._shiftKey; }
    get leftButton() { return this._leftButton; }
    get middleButton() { return this._middleButton; }
    get startedOnLineNumbers() { return this._startedOnLineNumbers; }
    constructor() {
        this._altKey = false;
        this._ctrlKey = false;
        this._metaKey = false;
        this._shiftKey = false;
        this._leftButton = false;
        this._middleButton = false;
        this._startedOnLineNumbers = false;
        this._lastMouseDownPosition = null;
        this._lastMouseDownPositionEqualCount = 0;
        this._lastMouseDownCount = 0;
        this._lastSetMouseDownCountTime = 0;
        this.isDragAndDrop = false;
    }
    get count() {
        return this._lastMouseDownCount;
    }
    setModifiers(source) {
        this._altKey = source.altKey;
        this._ctrlKey = source.ctrlKey;
        this._metaKey = source.metaKey;
        this._shiftKey = source.shiftKey;
    }
    setStartButtons(source) {
        this._leftButton = source.leftButton;
        this._middleButton = source.middleButton;
    }
    setStartedOnLineNumbers(startedOnLineNumbers) {
        this._startedOnLineNumbers = startedOnLineNumbers;
    }
    trySetCount(setMouseDownCount, newMouseDownPosition) {
        // a. Invalidate multiple clicking if too much time has passed (will be hit by IE because the detail field of mouse events contains garbage in IE10)
        const currentTime = (new Date()).getTime();
        if (currentTime - this._lastSetMouseDownCountTime > MouseDownState.CLEAR_MOUSE_DOWN_COUNT_TIME) {
            setMouseDownCount = 1;
        }
        this._lastSetMouseDownCountTime = currentTime;
        // b. Ensure that we don't jump from single click to triple click in one go (will be hit by IE because the detail field of mouse events contains garbage in IE10)
        if (setMouseDownCount > this._lastMouseDownCount + 1) {
            setMouseDownCount = this._lastMouseDownCount + 1;
        }
        // c. Invalidate multiple clicking if the logical position is different
        if (this._lastMouseDownPosition && this._lastMouseDownPosition.equals(newMouseDownPosition)) {
            this._lastMouseDownPositionEqualCount++;
        }
        else {
            this._lastMouseDownPositionEqualCount = 1;
        }
        this._lastMouseDownPosition = newMouseDownPosition;
        // Finally set the lastMouseDownCount
        this._lastMouseDownCount = Math.min(setMouseDownCount, this._lastMouseDownPositionEqualCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvbW91c2VIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFvQixNQUFNLHFDQUFxQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFnQyxNQUFNLGtCQUFrQixDQUFDO0FBRWpILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRSw4QkFBOEIsRUFBRSx3QkFBd0IsRUFBRSxpQ0FBaUMsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3TSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUkzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUdwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQWtDL0YsTUFBTSxPQUFPLFlBQWEsU0FBUSxnQkFBZ0I7SUFXakQsWUFBWSxPQUFvQixFQUFFLGNBQThCLEVBQUUsVUFBaUM7UUFDbEcsS0FBSyxFQUFFLENBQUM7UUFIRCx1QkFBa0IsR0FBdUIsSUFBSSxDQUFD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