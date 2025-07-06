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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9tb3VzZUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQW9CLE1BQU0scUNBQXFDLENBQUM7QUFDM0YsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQWdDLE1BQU0sa0JBQWtCLENBQUM7QUFFakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixFQUFFLDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLGlDQUFpQyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTdNLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSTNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBa0MvRixNQUFNLE9BQU8sWUFBYSxTQUFRLGdCQUFnQjtJQVdqRCxZQUFZLE9BQW9CLEVBQUUsY0FBOEIsRUFBRSxVQUFpQztRQUNsRyxLQUFLLEVBQUUsQ0FBQztRQUhELHVCQUFrQixHQUF1QixJQUFJLENBQUM7UUFLckQsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUU1RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGtCQUFrQixDQUMvRCxJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLEVBQ25FLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUM5QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQyxNQUFNLENBQUM7UUFFdkYsTUFBTSxXQUFXLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTdFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFckIsd0RBQXdEO1lBQ3hELHlFQUF5RTtZQUN6RSx3RUFBd0U7WUFDeEUsOEVBQThFO1lBQzlFLG9FQUFvRTtZQUNwRSx1QkFBdUI7WUFFdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDakgsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBcUIsQ0FBQyxFQUFFLENBQUM7d0JBQ3BFLDJCQUEyQjt3QkFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUNqRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEcsNkZBQTZGO1FBQzdGLHdDQUF3QztRQUN4QyxpR0FBaUc7UUFDakcsbUNBQW1DO1FBQ25DLElBQUksZ0JBQWdCLEdBQVcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUN0RixnQkFBZ0IsR0FBRyxTQUFTLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLGtIQUFrSDtRQUNsSCx5SEFBeUg7UUFDekgsbUhBQW1IO1FBQ25ILHlFQUF5RTtRQUN6RSxrR0FBa0c7UUFDbEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUNuSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFFcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVPLDRCQUE0QjtRQUVuQyxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7UUFFakQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxxQkFBcUIsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdEQsSUFBSSx1QkFBdUIsR0FBRyxLQUFLLENBQUM7UUFDcEMsSUFBSSx1QkFBdUIsR0FBRyxDQUFDLENBQUM7UUFFaEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxZQUE4QixFQUFFLEVBQUU7WUFDdkQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFakQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLHNDQUE2QixFQUFFLENBQUM7Z0JBQzNFLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkMsSUFBSSxVQUFVLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQzlDLE1BQU0sU0FBUyxHQUFXLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLFVBQVUsQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDO29CQUMzQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ25CLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxvR0FBb0c7Z0JBQ3BHLGtHQUFrRztnQkFDbEcsb0dBQW9HO2dCQUNwRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxrQkFBa0IsR0FBRyxFQUFFLEVBQUUsQ0FBQztvQkFDMUMsc0NBQXNDO29CQUN0QyxxQkFBcUIsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ2xELHVCQUF1QixHQUFHLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNuRSx1QkFBdUIsR0FBRyxDQUFDLENBQUM7Z0JBQzdCLENBQUM7Z0JBRUQsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNoQyx1QkFBdUIsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUVwQyxJQUFJLHVCQUF1QixFQUFFLENBQUM7b0JBQzdCLFVBQVUsQ0FBQyxZQUFZLENBQUMscUJBQXFCLEdBQUcsdUJBQXVCLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzdFLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuSixTQUFTLDBCQUEwQixDQUFDLFlBQThCO1lBQ2pFLE9BQU8sQ0FDTixRQUFRLENBQUMsV0FBVztnQkFDbkIsK0RBQStEO2dCQUMvRCx3REFBd0Q7Z0JBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFDcEcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUNwRyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO1FBQ0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCwyQkFBMkI7SUFDWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixJQUFJLENBQUMsQ0FBQyxVQUFVLG1DQUF5QixFQUFFLENBQUM7WUFDM0MsZ0JBQWdCO1lBQ2hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFDLE1BQU0sQ0FBQztZQUN2RixJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO2dCQUN0QixJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDZSxvQkFBb0IsQ0FBQyxDQUF5QztRQUM3RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ2UsY0FBYyxDQUFDLENBQW1DO1FBQ2pFLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELHlCQUF5QjtJQUVsQixzQkFBc0IsQ0FBQyxPQUFlLEVBQUUsT0FBZTtRQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxTQUFTLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV4RSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuSSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkcsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFILENBQUM7SUFFUyxrQkFBa0IsQ0FBQyxDQUFtQixFQUFFLGVBQXdCO1FBQ3pFLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ25ELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNsRSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixNQUFNLEdBQVMsVUFBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDaEUsQ0FBQyxFQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FDekQsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzSixDQUFDO0lBRU8sZUFBZSxDQUFDLENBQW1CO1FBQzFDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVTLGNBQWMsQ0FBQyxDQUFtQixFQUFFLGVBQXdCO1FBQ3JFLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDO1lBQ25DLEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDO1NBQ25ELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUyxZQUFZLENBQUMsQ0FBbUI7UUFDekMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDekMsOEJBQThCO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3hDLElBQUksbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDbkQsZ0dBQWdHO1lBQ2hHLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUM7WUFDakMsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLGFBQWEsQ0FBQyxDQUFtQjtRQUMxQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7WUFDbEMsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUyxVQUFVLENBQUMsQ0FBbUI7UUFDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUM7WUFDL0IsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLFlBQVksQ0FBQyxDQUFtQixFQUFFLFNBQWlCO1FBQzVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0MsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSx5Q0FBaUMsSUFBSSxDQUFDLENBQUMsSUFBSSwwQ0FBa0MsQ0FBQyxDQUFDO1FBQzlHLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksZ0RBQXdDLElBQUksQ0FBQyxDQUFDLElBQUksZ0RBQXdDLElBQUksQ0FBQyxDQUFDLElBQUksb0RBQTRDLENBQUMsQ0FBQztRQUNoTCxNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksZ0RBQXdDLENBQUMsQ0FBQztRQUM3RSxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLDRDQUFrQyxDQUFDO1FBQ3RHLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSw4Q0FBc0MsSUFBSSxDQUFDLENBQUMsSUFBSSw2Q0FBcUMsQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksMkNBQW1DLENBQUMsQ0FBQztRQUVuRSxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDbEQsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZELFlBQVksR0FBRyxLQUFLLENBQUM7UUFDdEIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRTtZQUNsQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUM7UUFFRixJQUFJLFlBQVksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZGLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV0RCxDQUFDO2FBQU0sSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUMzQixxQkFBcUI7WUFDckIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7YUFBTSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDN0IsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUM5QixJQUFJLFlBQVksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGlDQUFpQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNoRyxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDcEIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLGNBQWMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLCtCQUErQixDQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2hHLEtBQUssRUFBRSxDQUFDO1lBQ1IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQztZQUNqQyxLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sRUFBRSxDQUFDO1NBQ1QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLGFBQWEsQ0FBQyxDQUFtQjtRQUMxQyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFhMUMsWUFDa0IsUUFBcUIsRUFDckIsZUFBK0IsRUFDL0IsV0FBa0MsRUFDbEMsbUJBQXVDLEVBQ3hELGlCQUFrRixFQUNsRixjQUErQztRQUUvQyxLQUFLLEVBQUUsQ0FBQztRQVBTLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQUNsQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQW9CO1FBS3hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQztRQUM1QyxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV0QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHNCQUFzQixDQUN2RSxJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUNyRyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFFeEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRU8sb0JBQW9CLENBQUMsQ0FBbUI7UUFDL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZix1Q0FBdUM7WUFDdkMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUM7Z0JBQ2xDLEtBQUssRUFBRSxDQUFDO2dCQUNSLE1BQU0sRUFBRSxRQUFRO2FBQ2hCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxRQUFRLENBQUMsSUFBSSw0Q0FBbUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEtBQUssT0FBTyxJQUFJLFFBQVEsQ0FBQyxlQUFlLEtBQUssT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDeEksSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDakQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSw4Q0FBc0MsQ0FBQztZQUMxRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBMkIsRUFBRSxDQUFtQixFQUFFLFNBQWlCO1FBQy9FLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLElBQUksQ0FBQyxXQUFXLENBQUMsdUJBQXVCLENBQUMsVUFBVSxnREFBd0MsQ0FBQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyx1Q0FBdUM7WUFDdkMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxRCxpSEFBaUg7UUFDakgsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUVsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QjtlQUNuQyxPQUFPLENBQUMsR0FBRyxtQ0FBMEI7ZUFDckMsQ0FBQyxPQUFPLENBQUMsR0FBRyx1Q0FBOEI7ZUFDMUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxrQ0FBa0M7ZUFDM0QsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsNENBQTRDO2VBQ3pELENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEI7ZUFDNUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsOEJBQThCO2VBQ2hFLENBQUMsUUFBUSxDQUFDLElBQUkseUNBQWlDLENBQUMsQ0FBQyx1QkFBdUI7ZUFDeEUsUUFBUSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLDhCQUE4QjtVQUNoSCxDQUFDO1lBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBRXRCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQ3JDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQ2pDLFNBQVMsRUFDVCxDQUFDLENBQUMsT0FBTyxFQUNULENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQ25DLENBQUMsWUFBeUMsRUFBRSxFQUFFO2dCQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGVBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRXZFLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO29CQUN2QyxTQUFTO29CQUNULElBQUksQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDOUMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO3dCQUNsQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWdCO3dCQUM1QixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsZUFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZ0VBQWdFO3FCQUNqSixDQUFDLENBQUM7Z0JBQ0osQ0FBQztnQkFFRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDZCxDQUFDLENBQ0QsQ0FBQztZQUVGLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLDhDQUFzQyxDQUFDO1FBRS9FLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFDakMsU0FBUyxFQUNULENBQUMsQ0FBQyxPQUFPLEVBQ1QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFDbkMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUNsQixDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLO1FBQ1osSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFTSxlQUFlO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVNLG9CQUFvQixDQUFDLENBQXlDO1FBQ3BFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxDQUFtQjtRQUNwRCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBRTVDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkYsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2xGLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDckUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsT0FBTyxXQUFXLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQzVGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pGLE9BQU8sV0FBVyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2pILENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUM7WUFDeEUsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2xGLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDckUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsT0FBTyxXQUFXLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQzVGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pGLE9BQU8sV0FBVyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZKLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhILElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDOUIsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2pELE9BQU8sV0FBVyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbkgsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwRCxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQztZQUN2RSxPQUFPLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLGtCQUFrQixDQUFDLENBQW1CLEVBQUUsZUFBd0I7UUFDdkUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLE9BQU8scUJBQXFCLENBQUM7UUFDOUIsQ0FBQztRQUVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDdEQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUNsQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSw4Q0FBc0MsSUFBSSxDQUFDLENBQUMsSUFBSSw2Q0FBcUMsRUFBRSxDQUFDO1lBQ2pHLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUYsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxZQUFzQztRQUMzRSw4RkFBOEY7UUFDOUYsTUFBTSxjQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ2xJLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUM7UUFDbkQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQztRQUVqRCxJQUFJLGNBQWMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNyQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxjQUFjLENBQUM7WUFDdkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sYUFBYSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sY0FBYyxDQUFDLFFBQXNCLEVBQUUsZUFBd0IsRUFBRSxVQUF1QztRQUMvRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUM7WUFDbEMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQzNCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztZQUNqQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQjtZQUMzRCxVQUFVO1lBRVYsZUFBZSxFQUFFLGVBQWU7WUFDaEMsY0FBYyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSztZQUN0QyxNQUFNLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNO1lBQy9CLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU87WUFDakMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTztZQUNqQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRO1lBRW5DLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7WUFDdkMsWUFBWSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWTtZQUUzQyxjQUFjLEVBQUUsUUFBUSxDQUFDLElBQUkseUNBQWlDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEtBQUssSUFBSTtTQUN2RyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFJOUMsWUFDa0IsUUFBcUIsRUFDckIsV0FBa0MsRUFDbEMsbUJBQXVDLEVBQ3ZDLGNBQW1IO1FBRXBJLEtBQUssRUFBRSxDQUFDO1FBTFMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDbEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFvQjtRQUN2QyxtQkFBYyxHQUFkLGNBQWMsQ0FBcUc7UUFHcEksSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFFTSxLQUFLLENBQUMsUUFBbUMsRUFBRSxVQUE0QjtRQUM3RSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbkQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksK0JBQStCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3SixDQUFDO0lBQ0YsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7SUFPdkQsWUFDa0IsUUFBcUIsRUFDckIsV0FBa0MsRUFDbEMsbUJBQXVDLEVBQ3ZDLGNBQW1ILEVBQ3BJLFFBQW1DLEVBQ25DLFVBQTRCO1FBRTVCLEtBQUssRUFBRSxDQUFDO1FBUFMsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDbEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFvQjtRQUN2QyxtQkFBYyxHQUFkLGNBQWMsQ0FBcUc7UUFLcEksSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLHlCQUF5QixHQUFHLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsSSxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTSxXQUFXLENBQUMsUUFBbUMsRUFBRSxVQUE0QjtRQUNuRixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWU7UUFDdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFDcEYsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztRQUM3RyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQztRQUUzRSxJQUFJLHNCQUFzQixJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsZUFBZSxHQUFHLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0QsSUFBSSxzQkFBc0IsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGVBQWUsR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsZUFBZSxHQUFHLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU8sUUFBUTtRQUNmLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFDO1FBQ3BGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM3QixNQUFNLGNBQWMsR0FBRyxrQkFBa0IsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUM7UUFDMUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVwRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRTdCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVoSSxrRkFBa0Y7UUFDbEYsSUFBSSxXQUF5QixDQUFDO1FBQzlCLENBQUM7WUFDQSxNQUFNLFNBQVMsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUMseUJBQXlCLENBQUM7WUFDN0gsTUFBTSxHQUFHLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyx5QkFBeUIsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUMxSCxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEcsV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkksQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxLQUFLLGNBQWMsRUFBRSxDQUFDO1lBQ2pGLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ2hELFdBQVcsR0FBRyxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3JKLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzVNLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsSUFBSSwyQ0FBbUMsQ0FBQztRQUN6RSxJQUFJLENBQUMseUJBQXlCLEdBQUcsR0FBRyxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzlILENBQUM7Q0FDRDtBQUVELE1BQU0sY0FBYzthQUVLLGdDQUEyQixHQUFHLEdBQUcsQ0FBQyxHQUFDLEtBQUs7SUFHaEUsSUFBVyxNQUFNLEtBQWMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUdyRCxJQUFXLE9BQU8sS0FBYyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBR3ZELElBQVcsT0FBTyxLQUFjLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFHdkQsSUFBVyxRQUFRLEtBQWMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUd6RCxJQUFXLFVBQVUsS0FBYyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBRzdELElBQVcsWUFBWSxLQUFjLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFHakUsSUFBVyxvQkFBb0IsS0FBYyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFRakY7UUFDQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMzQixJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBQ25DLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQywwQkFBMEIsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLENBQUM7SUFFTSxZQUFZLENBQUMsTUFBd0I7UUFDM0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xDLENBQUM7SUFFTSxlQUFlLENBQUMsTUFBd0I7UUFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUMxQyxDQUFDO0lBRU0sdUJBQXVCLENBQUMsb0JBQTZCO1FBQzNELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQztJQUNuRCxDQUFDO0lBRU0sV0FBVyxDQUFDLGlCQUF5QixFQUFFLG9CQUE4QjtRQUMzRSxvSkFBb0o7UUFDcEosTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0MsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixHQUFHLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1lBQ2hHLGlCQUFpQixHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBQ0QsSUFBSSxDQUFDLDBCQUEwQixHQUFHLFdBQVcsQ0FBQztRQUU5QyxpS0FBaUs7UUFDakssSUFBSSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEQsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsdUVBQXVFO1FBQ3ZFLElBQUksSUFBSSxDQUFDLHNCQUFzQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQzdGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBQ3pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLG9CQUFvQixDQUFDO1FBRW5ELHFDQUFxQztRQUNyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztJQUMvRixDQUFDIn0=