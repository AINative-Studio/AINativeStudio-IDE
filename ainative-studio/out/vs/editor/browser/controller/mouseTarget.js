/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PageCoordinates } from '../editorDom.js';
import { PartFingerprints } from '../view/viewPart.js';
import { ViewLine } from '../viewParts/viewLines/viewLine.js';
import { Position } from '../../common/core/position.js';
import { Range as EditorRange } from '../../common/core/range.js';
import { CursorColumns } from '../../common/core/cursorColumns.js';
import * as dom from '../../../base/browser/dom.js';
import { AtomicTabMoveOperations } from '../../common/cursor/cursorAtomicMoveOperations.js';
import { Lazy } from '../../../base/common/lazy.js';
var HitTestResultType;
(function (HitTestResultType) {
    HitTestResultType[HitTestResultType["Unknown"] = 0] = "Unknown";
    HitTestResultType[HitTestResultType["Content"] = 1] = "Content";
})(HitTestResultType || (HitTestResultType = {}));
class UnknownHitTestResult {
    constructor(hitTarget = null) {
        this.hitTarget = hitTarget;
        this.type = 0 /* HitTestResultType.Unknown */;
    }
}
class ContentHitTestResult {
    get hitTarget() { return this.spanNode; }
    constructor(position, spanNode, injectedText) {
        this.position = position;
        this.spanNode = spanNode;
        this.injectedText = injectedText;
        this.type = 1 /* HitTestResultType.Content */;
    }
}
var HitTestResult;
(function (HitTestResult) {
    function createFromDOMInfo(ctx, spanNode, offset) {
        const position = ctx.getPositionFromDOMInfo(spanNode, offset);
        if (position) {
            return new ContentHitTestResult(position, spanNode, null);
        }
        return new UnknownHitTestResult(spanNode);
    }
    HitTestResult.createFromDOMInfo = createFromDOMInfo;
})(HitTestResult || (HitTestResult = {}));
export class PointerHandlerLastRenderData {
    constructor(lastViewCursorsRenderData, lastTextareaPosition) {
        this.lastViewCursorsRenderData = lastViewCursorsRenderData;
        this.lastTextareaPosition = lastTextareaPosition;
    }
}
export class MouseTarget {
    static _deduceRage(position, range = null) {
        if (!range && position) {
            return new EditorRange(position.lineNumber, position.column, position.lineNumber, position.column);
        }
        return range ?? null;
    }
    static createUnknown(element, mouseColumn, position) {
        return { type: 0 /* MouseTargetType.UNKNOWN */, element, mouseColumn, position, range: this._deduceRage(position) };
    }
    static createTextarea(element, mouseColumn) {
        return { type: 1 /* MouseTargetType.TEXTAREA */, element, mouseColumn, position: null, range: null };
    }
    static createMargin(type, element, mouseColumn, position, range, detail) {
        return { type, element, mouseColumn, position, range, detail };
    }
    static createViewZone(type, element, mouseColumn, position, detail) {
        return { type, element, mouseColumn, position, range: this._deduceRage(position), detail };
    }
    static createContentText(element, mouseColumn, position, range, detail) {
        return { type: 6 /* MouseTargetType.CONTENT_TEXT */, element, mouseColumn, position, range: this._deduceRage(position, range), detail };
    }
    static createContentEmpty(element, mouseColumn, position, detail) {
        return { type: 7 /* MouseTargetType.CONTENT_EMPTY */, element, mouseColumn, position, range: this._deduceRage(position), detail };
    }
    static createContentWidget(element, mouseColumn, detail) {
        return { type: 9 /* MouseTargetType.CONTENT_WIDGET */, element, mouseColumn, position: null, range: null, detail };
    }
    static createScrollbar(element, mouseColumn, position) {
        return { type: 11 /* MouseTargetType.SCROLLBAR */, element, mouseColumn, position, range: this._deduceRage(position) };
    }
    static createOverlayWidget(element, mouseColumn, detail) {
        return { type: 12 /* MouseTargetType.OVERLAY_WIDGET */, element, mouseColumn, position: null, range: null, detail };
    }
    static createOutsideEditor(mouseColumn, position, outsidePosition, outsideDistance) {
        return { type: 13 /* MouseTargetType.OUTSIDE_EDITOR */, element: null, mouseColumn, position, range: this._deduceRage(position), outsidePosition, outsideDistance };
    }
    static _typeToString(type) {
        if (type === 1 /* MouseTargetType.TEXTAREA */) {
            return 'TEXTAREA';
        }
        if (type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
            return 'GUTTER_GLYPH_MARGIN';
        }
        if (type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */) {
            return 'GUTTER_LINE_NUMBERS';
        }
        if (type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
            return 'GUTTER_LINE_DECORATIONS';
        }
        if (type === 5 /* MouseTargetType.GUTTER_VIEW_ZONE */) {
            return 'GUTTER_VIEW_ZONE';
        }
        if (type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            return 'CONTENT_TEXT';
        }
        if (type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            return 'CONTENT_EMPTY';
        }
        if (type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            return 'CONTENT_VIEW_ZONE';
        }
        if (type === 9 /* MouseTargetType.CONTENT_WIDGET */) {
            return 'CONTENT_WIDGET';
        }
        if (type === 10 /* MouseTargetType.OVERVIEW_RULER */) {
            return 'OVERVIEW_RULER';
        }
        if (type === 11 /* MouseTargetType.SCROLLBAR */) {
            return 'SCROLLBAR';
        }
        if (type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
            return 'OVERLAY_WIDGET';
        }
        return 'UNKNOWN';
    }
    static toString(target) {
        return this._typeToString(target.type) + ': ' + target.position + ' - ' + target.range + ' - ' + JSON.stringify(target.detail);
    }
}
class ElementPath {
    static isTextArea(path) {
        return (path.length === 2
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[1] === 7 /* PartFingerprint.TextArea */);
    }
    static isChildOfViewLines(path) {
        return (path.length >= 4
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[3] === 8 /* PartFingerprint.ViewLines */);
    }
    static isStrictChildOfViewLines(path) {
        return (path.length > 4
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[3] === 8 /* PartFingerprint.ViewLines */);
    }
    static isChildOfScrollableElement(path) {
        return (path.length >= 2
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[1] === 6 /* PartFingerprint.ScrollableElement */);
    }
    static isChildOfMinimap(path) {
        return (path.length >= 2
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[1] === 9 /* PartFingerprint.Minimap */);
    }
    static isChildOfContentWidgets(path) {
        return (path.length >= 4
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[3] === 1 /* PartFingerprint.ContentWidgets */);
    }
    static isChildOfOverflowGuard(path) {
        return (path.length >= 1
            && path[0] === 3 /* PartFingerprint.OverflowGuard */);
    }
    static isChildOfOverflowingContentWidgets(path) {
        return (path.length >= 1
            && path[0] === 2 /* PartFingerprint.OverflowingContentWidgets */);
    }
    static isChildOfOverlayWidgets(path) {
        return (path.length >= 2
            && path[0] === 3 /* PartFingerprint.OverflowGuard */
            && path[1] === 4 /* PartFingerprint.OverlayWidgets */);
    }
    static isChildOfOverflowingOverlayWidgets(path) {
        return (path.length >= 1
            && path[0] === 5 /* PartFingerprint.OverflowingOverlayWidgets */);
    }
}
export class HitTestContext {
    constructor(context, viewHelper, lastRenderData) {
        this.viewModel = context.viewModel;
        const options = context.configuration.options;
        this.layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.viewDomNode = viewHelper.viewDomNode;
        this.viewLinesGpu = viewHelper.viewLinesGpu;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.stickyTabStops = options.get(121 /* EditorOption.stickyTabStops */);
        this.typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        this.lastRenderData = lastRenderData;
        this._context = context;
        this._viewHelper = viewHelper;
    }
    getZoneAtCoord(mouseVerticalOffset) {
        return HitTestContext.getZoneAtCoord(this._context, mouseVerticalOffset);
    }
    static getZoneAtCoord(context, mouseVerticalOffset) {
        // The target is either a view zone or the empty space after the last view-line
        const viewZoneWhitespace = context.viewLayout.getWhitespaceAtVerticalOffset(mouseVerticalOffset);
        if (viewZoneWhitespace) {
            const viewZoneMiddle = viewZoneWhitespace.verticalOffset + viewZoneWhitespace.height / 2;
            const lineCount = context.viewModel.getLineCount();
            let positionBefore = null;
            let position;
            let positionAfter = null;
            if (viewZoneWhitespace.afterLineNumber !== lineCount) {
                // There are more lines after this view zone
                positionAfter = new Position(viewZoneWhitespace.afterLineNumber + 1, 1);
            }
            if (viewZoneWhitespace.afterLineNumber > 0) {
                // There are more lines above this view zone
                positionBefore = new Position(viewZoneWhitespace.afterLineNumber, context.viewModel.getLineMaxColumn(viewZoneWhitespace.afterLineNumber));
            }
            if (positionAfter === null) {
                position = positionBefore;
            }
            else if (positionBefore === null) {
                position = positionAfter;
            }
            else if (mouseVerticalOffset < viewZoneMiddle) {
                position = positionBefore;
            }
            else {
                position = positionAfter;
            }
            return {
                viewZoneId: viewZoneWhitespace.id,
                afterLineNumber: viewZoneWhitespace.afterLineNumber,
                positionBefore: positionBefore,
                positionAfter: positionAfter,
                position: position
            };
        }
        return null;
    }
    getFullLineRangeAtCoord(mouseVerticalOffset) {
        if (this._context.viewLayout.isAfterLines(mouseVerticalOffset)) {
            // Below the last line
            const lineNumber = this._context.viewModel.getLineCount();
            const maxLineColumn = this._context.viewModel.getLineMaxColumn(lineNumber);
            return {
                range: new EditorRange(lineNumber, maxLineColumn, lineNumber, maxLineColumn),
                isAfterLines: true
            };
        }
        const lineNumber = this._context.viewLayout.getLineNumberAtVerticalOffset(mouseVerticalOffset);
        const maxLineColumn = this._context.viewModel.getLineMaxColumn(lineNumber);
        return {
            range: new EditorRange(lineNumber, 1, lineNumber, maxLineColumn),
            isAfterLines: false
        };
    }
    getLineNumberAtVerticalOffset(mouseVerticalOffset) {
        return this._context.viewLayout.getLineNumberAtVerticalOffset(mouseVerticalOffset);
    }
    isAfterLines(mouseVerticalOffset) {
        return this._context.viewLayout.isAfterLines(mouseVerticalOffset);
    }
    isInTopPadding(mouseVerticalOffset) {
        return this._context.viewLayout.isInTopPadding(mouseVerticalOffset);
    }
    isInBottomPadding(mouseVerticalOffset) {
        return this._context.viewLayout.isInBottomPadding(mouseVerticalOffset);
    }
    getVerticalOffsetForLineNumber(lineNumber) {
        return this._context.viewLayout.getVerticalOffsetForLineNumber(lineNumber);
    }
    findAttribute(element, attr) {
        return HitTestContext._findAttribute(element, attr, this._viewHelper.viewDomNode);
    }
    static _findAttribute(element, attr, stopAt) {
        while (element && element !== element.ownerDocument.body) {
            if (element.hasAttribute && element.hasAttribute(attr)) {
                return element.getAttribute(attr);
            }
            if (element === stopAt) {
                return null;
            }
            element = element.parentNode;
        }
        return null;
    }
    getLineWidth(lineNumber) {
        return this._viewHelper.getLineWidth(lineNumber);
    }
    visibleRangeForPosition(lineNumber, column) {
        return this._viewHelper.visibleRangeForPosition(lineNumber, column);
    }
    getPositionFromDOMInfo(spanNode, offset) {
        return this._viewHelper.getPositionFromDOMInfo(spanNode, offset);
    }
    getCurrentScrollTop() {
        return this._context.viewLayout.getCurrentScrollTop();
    }
    getCurrentScrollLeft() {
        return this._context.viewLayout.getCurrentScrollLeft();
    }
}
class BareHitTestRequest {
    constructor(ctx, editorPos, pos, relativePos) {
        this.editorPos = editorPos;
        this.pos = pos;
        this.relativePos = relativePos;
        this.mouseVerticalOffset = Math.max(0, ctx.getCurrentScrollTop() + this.relativePos.y);
        this.mouseContentHorizontalOffset = ctx.getCurrentScrollLeft() + this.relativePos.x - ctx.layoutInfo.contentLeft;
        this.isInMarginArea = (this.relativePos.x < ctx.layoutInfo.contentLeft && this.relativePos.x >= ctx.layoutInfo.glyphMarginLeft);
        this.isInContentArea = !this.isInMarginArea;
        this.mouseColumn = Math.max(0, MouseTargetFactory._getMouseColumn(this.mouseContentHorizontalOffset, ctx.typicalHalfwidthCharacterWidth));
    }
}
class HitTestRequest extends BareHitTestRequest {
    get target() {
        if (this._useHitTestTarget) {
            return this.hitTestResult.value.hitTarget;
        }
        return this._eventTarget;
    }
    get targetPath() {
        if (this._targetPathCacheElement !== this.target) {
            this._targetPathCacheElement = this.target;
            this._targetPathCacheValue = PartFingerprints.collect(this.target, this._ctx.viewDomNode);
        }
        return this._targetPathCacheValue;
    }
    constructor(ctx, editorPos, pos, relativePos, eventTarget) {
        super(ctx, editorPos, pos, relativePos);
        this.hitTestResult = new Lazy(() => MouseTargetFactory.doHitTest(this._ctx, this));
        this._targetPathCacheElement = null;
        this._targetPathCacheValue = new Uint8Array(0);
        this._ctx = ctx;
        this._eventTarget = eventTarget;
        // If no event target is passed in, we will use the hit test target
        const hasEventTarget = Boolean(this._eventTarget);
        this._useHitTestTarget = !hasEventTarget;
    }
    toString() {
        return `pos(${this.pos.x},${this.pos.y}), editorPos(${this.editorPos.x},${this.editorPos.y}), relativePos(${this.relativePos.x},${this.relativePos.y}), mouseVerticalOffset: ${this.mouseVerticalOffset}, mouseContentHorizontalOffset: ${this.mouseContentHorizontalOffset}\n\ttarget: ${this.target ? this.target.outerHTML : null}`;
    }
    get wouldBenefitFromHitTestTargetSwitch() {
        return (!this._useHitTestTarget
            && this.hitTestResult.value.hitTarget !== null
            && this.target !== this.hitTestResult.value.hitTarget);
    }
    switchToHitTestTarget() {
        this._useHitTestTarget = true;
    }
    _getMouseColumn(position = null) {
        if (position && position.column < this._ctx.viewModel.getLineMaxColumn(position.lineNumber)) {
            // Most likely, the line contains foreign decorations...
            return CursorColumns.visibleColumnFromColumn(this._ctx.viewModel.getLineContent(position.lineNumber), position.column, this._ctx.viewModel.model.getOptions().tabSize) + 1;
        }
        return this.mouseColumn;
    }
    fulfillUnknown(position = null) {
        return MouseTarget.createUnknown(this.target, this._getMouseColumn(position), position);
    }
    fulfillTextarea() {
        return MouseTarget.createTextarea(this.target, this._getMouseColumn());
    }
    fulfillMargin(type, position, range, detail) {
        return MouseTarget.createMargin(type, this.target, this._getMouseColumn(position), position, range, detail);
    }
    fulfillViewZone(type, position, detail) {
        return MouseTarget.createViewZone(type, this.target, this._getMouseColumn(position), position, detail);
    }
    fulfillContentText(position, range, detail) {
        return MouseTarget.createContentText(this.target, this._getMouseColumn(position), position, range, detail);
    }
    fulfillContentEmpty(position, detail) {
        return MouseTarget.createContentEmpty(this.target, this._getMouseColumn(position), position, detail);
    }
    fulfillContentWidget(detail) {
        return MouseTarget.createContentWidget(this.target, this._getMouseColumn(), detail);
    }
    fulfillScrollbar(position) {
        return MouseTarget.createScrollbar(this.target, this._getMouseColumn(position), position);
    }
    fulfillOverlayWidget(detail) {
        return MouseTarget.createOverlayWidget(this.target, this._getMouseColumn(), detail);
    }
}
const EMPTY_CONTENT_AFTER_LINES = { isAfterLines: true };
function createEmptyContentDataInLines(horizontalDistanceToText) {
    return {
        isAfterLines: false,
        horizontalDistanceToText: horizontalDistanceToText
    };
}
export class MouseTargetFactory {
    constructor(context, viewHelper) {
        this._context = context;
        this._viewHelper = viewHelper;
    }
    mouseTargetIsWidget(e) {
        const t = e.target;
        const path = PartFingerprints.collect(t, this._viewHelper.viewDomNode);
        // Is it a content widget?
        if (ElementPath.isChildOfContentWidgets(path) || ElementPath.isChildOfOverflowingContentWidgets(path)) {
            return true;
        }
        // Is it an overlay widget?
        if (ElementPath.isChildOfOverlayWidgets(path) || ElementPath.isChildOfOverflowingOverlayWidgets(path)) {
            return true;
        }
        return false;
    }
    createMouseTarget(lastRenderData, editorPos, pos, relativePos, target) {
        const ctx = new HitTestContext(this._context, this._viewHelper, lastRenderData);
        const request = new HitTestRequest(ctx, editorPos, pos, relativePos, target);
        try {
            const r = MouseTargetFactory._createMouseTarget(ctx, request);
            if (r.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
                // Snap to the nearest soft tab boundary if atomic soft tabs are enabled.
                if (ctx.stickyTabStops && r.position !== null) {
                    const position = MouseTargetFactory._snapToSoftTabBoundary(r.position, ctx.viewModel);
                    const range = EditorRange.fromPositions(position, position).plusRange(r.range);
                    return request.fulfillContentText(position, range, r.detail);
                }
            }
            // console.log(MouseTarget.toString(r));
            return r;
        }
        catch (err) {
            // console.log(err);
            return request.fulfillUnknown();
        }
    }
    static _createMouseTarget(ctx, request) {
        // console.log(`${domHitTestExecuted ? '=>' : ''}CAME IN REQUEST: ${request}`);
        if (request.target === null) {
            // No target
            return request.fulfillUnknown();
        }
        // we know for a fact that request.target is not null
        const resolvedRequest = request;
        let result = null;
        if (!ElementPath.isChildOfOverflowGuard(request.targetPath) && !ElementPath.isChildOfOverflowingContentWidgets(request.targetPath) && !ElementPath.isChildOfOverflowingOverlayWidgets(request.targetPath)) {
            // We only render dom nodes inside the overflow guard or in the overflowing content widgets
            result = result || request.fulfillUnknown();
        }
        result = result || MouseTargetFactory._hitTestContentWidget(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestOverlayWidget(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestMinimap(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestScrollbarSlider(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewZone(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestMargin(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewCursor(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestTextArea(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestViewLines(ctx, resolvedRequest);
        result = result || MouseTargetFactory._hitTestScrollbar(ctx, resolvedRequest);
        return (result || request.fulfillUnknown());
    }
    static _hitTestContentWidget(ctx, request) {
        // Is it a content widget?
        if (ElementPath.isChildOfContentWidgets(request.targetPath) || ElementPath.isChildOfOverflowingContentWidgets(request.targetPath)) {
            const widgetId = ctx.findAttribute(request.target, 'widgetId');
            if (widgetId) {
                return request.fulfillContentWidget(widgetId);
            }
            else {
                return request.fulfillUnknown();
            }
        }
        return null;
    }
    static _hitTestOverlayWidget(ctx, request) {
        // Is it an overlay widget?
        if (ElementPath.isChildOfOverlayWidgets(request.targetPath) || ElementPath.isChildOfOverflowingOverlayWidgets(request.targetPath)) {
            const widgetId = ctx.findAttribute(request.target, 'widgetId');
            if (widgetId) {
                return request.fulfillOverlayWidget(widgetId);
            }
            else {
                return request.fulfillUnknown();
            }
        }
        return null;
    }
    static _hitTestViewCursor(ctx, request) {
        if (request.target) {
            // Check if we've hit a painted cursor
            const lastViewCursorsRenderData = ctx.lastRenderData.lastViewCursorsRenderData;
            for (const d of lastViewCursorsRenderData) {
                if (request.target === d.domNode) {
                    return request.fulfillContentText(d.position, null, { mightBeForeignElement: false, injectedText: null });
                }
            }
        }
        if (request.isInContentArea) {
            // Edge has a bug when hit-testing the exact position of a cursor,
            // instead of returning the correct dom node, it returns the
            // first or last rendered view line dom node, therefore help it out
            // and first check if we are on top of a cursor
            const lastViewCursorsRenderData = ctx.lastRenderData.lastViewCursorsRenderData;
            const mouseContentHorizontalOffset = request.mouseContentHorizontalOffset;
            const mouseVerticalOffset = request.mouseVerticalOffset;
            for (const d of lastViewCursorsRenderData) {
                if (mouseContentHorizontalOffset < d.contentLeft) {
                    // mouse position is to the left of the cursor
                    continue;
                }
                if (mouseContentHorizontalOffset > d.contentLeft + d.width) {
                    // mouse position is to the right of the cursor
                    continue;
                }
                const cursorVerticalOffset = ctx.getVerticalOffsetForLineNumber(d.position.lineNumber);
                if (cursorVerticalOffset <= mouseVerticalOffset
                    && mouseVerticalOffset <= cursorVerticalOffset + d.height) {
                    return request.fulfillContentText(d.position, null, { mightBeForeignElement: false, injectedText: null });
                }
            }
        }
        return null;
    }
    static _hitTestViewZone(ctx, request) {
        const viewZoneData = ctx.getZoneAtCoord(request.mouseVerticalOffset);
        if (viewZoneData) {
            const mouseTargetType = (request.isInContentArea ? 8 /* MouseTargetType.CONTENT_VIEW_ZONE */ : 5 /* MouseTargetType.GUTTER_VIEW_ZONE */);
            return request.fulfillViewZone(mouseTargetType, viewZoneData.position, viewZoneData);
        }
        return null;
    }
    static _hitTestTextArea(ctx, request) {
        // Is it the textarea?
        if (ElementPath.isTextArea(request.targetPath)) {
            if (ctx.lastRenderData.lastTextareaPosition) {
                return request.fulfillContentText(ctx.lastRenderData.lastTextareaPosition, null, { mightBeForeignElement: false, injectedText: null });
            }
            return request.fulfillTextarea();
        }
        return null;
    }
    static _hitTestMargin(ctx, request) {
        if (request.isInMarginArea) {
            const res = ctx.getFullLineRangeAtCoord(request.mouseVerticalOffset);
            const pos = res.range.getStartPosition();
            let offset = Math.abs(request.relativePos.x);
            const detail = {
                isAfterLines: res.isAfterLines,
                glyphMarginLeft: ctx.layoutInfo.glyphMarginLeft,
                glyphMarginWidth: ctx.layoutInfo.glyphMarginWidth,
                lineNumbersWidth: ctx.layoutInfo.lineNumbersWidth,
                offsetX: offset
            };
            offset -= ctx.layoutInfo.glyphMarginLeft;
            if (offset <= ctx.layoutInfo.glyphMarginWidth) {
                // On the glyph margin
                const modelCoordinate = ctx.viewModel.coordinatesConverter.convertViewPositionToModelPosition(res.range.getStartPosition());
                const lanes = ctx.viewModel.glyphLanes.getLanesAtLine(modelCoordinate.lineNumber);
                detail.glyphMarginLane = lanes[Math.floor(offset / ctx.lineHeight)];
                return request.fulfillMargin(2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */, pos, res.range, detail);
            }
            offset -= ctx.layoutInfo.glyphMarginWidth;
            if (offset <= ctx.layoutInfo.lineNumbersWidth) {
                // On the line numbers
                return request.fulfillMargin(3 /* MouseTargetType.GUTTER_LINE_NUMBERS */, pos, res.range, detail);
            }
            offset -= ctx.layoutInfo.lineNumbersWidth;
            // On the line decorations
            return request.fulfillMargin(4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */, pos, res.range, detail);
        }
        return null;
    }
    static _hitTestViewLines(ctx, request) {
        if (!ElementPath.isChildOfViewLines(request.targetPath)) {
            return null;
        }
        if (ctx.isInTopPadding(request.mouseVerticalOffset)) {
            return request.fulfillContentEmpty(new Position(1, 1), EMPTY_CONTENT_AFTER_LINES);
        }
        // Check if it is below any lines and any view zones
        if (ctx.isAfterLines(request.mouseVerticalOffset) || ctx.isInBottomPadding(request.mouseVerticalOffset)) {
            // This most likely indicates it happened after the last view-line
            const lineCount = ctx.viewModel.getLineCount();
            const maxLineColumn = ctx.viewModel.getLineMaxColumn(lineCount);
            return request.fulfillContentEmpty(new Position(lineCount, maxLineColumn), EMPTY_CONTENT_AFTER_LINES);
        }
        // Check if we are hitting a view-line (can happen in the case of inline decorations on empty lines)
        // See https://github.com/microsoft/vscode/issues/46942
        if (ElementPath.isStrictChildOfViewLines(request.targetPath)) {
            const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            if (ctx.viewModel.getLineLength(lineNumber) === 0) {
                const lineWidth = ctx.getLineWidth(lineNumber);
                const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                return request.fulfillContentEmpty(new Position(lineNumber, 1), detail);
            }
            const lineWidth = ctx.getLineWidth(lineNumber);
            if (request.mouseContentHorizontalOffset >= lineWidth) {
                // TODO: This is wrong for RTL
                const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                const pos = new Position(lineNumber, ctx.viewModel.getLineMaxColumn(lineNumber));
                return request.fulfillContentEmpty(pos, detail);
            }
        }
        else {
            if (ctx.viewLinesGpu) {
                const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
                if (ctx.viewModel.getLineLength(lineNumber) === 0) {
                    const lineWidth = ctx.getLineWidth(lineNumber);
                    const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                    return request.fulfillContentEmpty(new Position(lineNumber, 1), detail);
                }
                const lineWidth = ctx.getLineWidth(lineNumber);
                if (request.mouseContentHorizontalOffset >= lineWidth) {
                    // TODO: This is wrong for RTL
                    const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
                    const pos = new Position(lineNumber, ctx.viewModel.getLineMaxColumn(lineNumber));
                    return request.fulfillContentEmpty(pos, detail);
                }
                const position = ctx.viewLinesGpu.getPositionAtCoordinate(lineNumber, request.mouseContentHorizontalOffset);
                if (position) {
                    const detail = {
                        injectedText: null,
                        mightBeForeignElement: false
                    };
                    return request.fulfillContentText(position, EditorRange.fromPositions(position, position), detail);
                }
            }
        }
        // Do the hit test (if not already done)
        const hitTestResult = request.hitTestResult.value;
        if (hitTestResult.type === 1 /* HitTestResultType.Content */) {
            return MouseTargetFactory.createMouseTargetFromHitTestPosition(ctx, request, hitTestResult.spanNode, hitTestResult.position, hitTestResult.injectedText);
        }
        // We didn't hit content...
        if (request.wouldBenefitFromHitTestTargetSwitch) {
            // We actually hit something different... Give it one last change by trying again with this new target
            request.switchToHitTestTarget();
            return this._createMouseTarget(ctx, request);
        }
        // We have tried everything...
        return request.fulfillUnknown();
    }
    static _hitTestMinimap(ctx, request) {
        if (ElementPath.isChildOfMinimap(request.targetPath)) {
            const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
            return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
        }
        return null;
    }
    static _hitTestScrollbarSlider(ctx, request) {
        if (ElementPath.isChildOfScrollableElement(request.targetPath)) {
            if (request.target && request.target.nodeType === 1) {
                const className = request.target.className;
                if (className && /\b(slider|scrollbar)\b/.test(className)) {
                    const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
                    const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
                    return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
                }
            }
        }
        return null;
    }
    static _hitTestScrollbar(ctx, request) {
        // Is it the overview ruler?
        // Is it a child of the scrollable element?
        if (ElementPath.isChildOfScrollableElement(request.targetPath)) {
            const possibleLineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
            const maxColumn = ctx.viewModel.getLineMaxColumn(possibleLineNumber);
            return request.fulfillScrollbar(new Position(possibleLineNumber, maxColumn));
        }
        return null;
    }
    getMouseColumn(relativePos) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const mouseContentHorizontalOffset = this._context.viewLayout.getCurrentScrollLeft() + relativePos.x - layoutInfo.contentLeft;
        return MouseTargetFactory._getMouseColumn(mouseContentHorizontalOffset, options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth);
    }
    static _getMouseColumn(mouseContentHorizontalOffset, typicalHalfwidthCharacterWidth) {
        if (mouseContentHorizontalOffset < 0) {
            return 1;
        }
        const chars = Math.round(mouseContentHorizontalOffset / typicalHalfwidthCharacterWidth);
        return (chars + 1);
    }
    static createMouseTargetFromHitTestPosition(ctx, request, spanNode, pos, injectedText) {
        const lineNumber = pos.lineNumber;
        const column = pos.column;
        const lineWidth = ctx.getLineWidth(lineNumber);
        if (request.mouseContentHorizontalOffset > lineWidth) {
            const detail = createEmptyContentDataInLines(request.mouseContentHorizontalOffset - lineWidth);
            return request.fulfillContentEmpty(pos, detail);
        }
        const visibleRange = ctx.visibleRangeForPosition(lineNumber, column);
        if (!visibleRange) {
            return request.fulfillUnknown(pos);
        }
        const columnHorizontalOffset = visibleRange.left;
        if (Math.abs(request.mouseContentHorizontalOffset - columnHorizontalOffset) < 1) {
            return request.fulfillContentText(pos, null, { mightBeForeignElement: !!injectedText, injectedText });
        }
        const points = [];
        points.push({ offset: visibleRange.left, column: column });
        if (column > 1) {
            const visibleRange = ctx.visibleRangeForPosition(lineNumber, column - 1);
            if (visibleRange) {
                points.push({ offset: visibleRange.left, column: column - 1 });
            }
        }
        const lineMaxColumn = ctx.viewModel.getLineMaxColumn(lineNumber);
        if (column < lineMaxColumn) {
            const visibleRange = ctx.visibleRangeForPosition(lineNumber, column + 1);
            if (visibleRange) {
                points.push({ offset: visibleRange.left, column: column + 1 });
            }
        }
        points.sort((a, b) => a.offset - b.offset);
        const mouseCoordinates = request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode));
        const spanNodeClientRect = spanNode.getBoundingClientRect();
        const mouseIsOverSpanNode = (spanNodeClientRect.left <= mouseCoordinates.clientX && mouseCoordinates.clientX <= spanNodeClientRect.right);
        let rng = null;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            if (prev.offset <= request.mouseContentHorizontalOffset && request.mouseContentHorizontalOffset <= curr.offset) {
                rng = new EditorRange(lineNumber, prev.column, lineNumber, curr.column);
                // See https://github.com/microsoft/vscode/issues/152819
                // Due to the use of zwj, the browser's hit test result is skewed towards the left
                // Here we try to correct that if the mouse horizontal offset is closer to the right than the left
                const prevDelta = Math.abs(prev.offset - request.mouseContentHorizontalOffset);
                const nextDelta = Math.abs(curr.offset - request.mouseContentHorizontalOffset);
                pos = (prevDelta < nextDelta
                    ? new Position(lineNumber, prev.column)
                    : new Position(lineNumber, curr.column));
                break;
            }
        }
        return request.fulfillContentText(pos, rng, { mightBeForeignElement: !mouseIsOverSpanNode || !!injectedText, injectedText });
    }
    /**
     * Most probably WebKit browsers and Edge
     */
    static _doHitTestWithCaretRangeFromPoint(ctx, request) {
        // In Chrome, especially on Linux it is possible to click between lines,
        // so try to adjust the `hity` below so that it lands in the center of a line
        const lineNumber = ctx.getLineNumberAtVerticalOffset(request.mouseVerticalOffset);
        const lineStartVerticalOffset = ctx.getVerticalOffsetForLineNumber(lineNumber);
        const lineEndVerticalOffset = lineStartVerticalOffset + ctx.lineHeight;
        const isBelowLastLine = (lineNumber === ctx.viewModel.getLineCount()
            && request.mouseVerticalOffset > lineEndVerticalOffset);
        if (!isBelowLastLine) {
            const lineCenteredVerticalOffset = Math.floor((lineStartVerticalOffset + lineEndVerticalOffset) / 2);
            let adjustedPageY = request.pos.y + (lineCenteredVerticalOffset - request.mouseVerticalOffset);
            if (adjustedPageY <= request.editorPos.y) {
                adjustedPageY = request.editorPos.y + 1;
            }
            if (adjustedPageY >= request.editorPos.y + request.editorPos.height) {
                adjustedPageY = request.editorPos.y + request.editorPos.height - 1;
            }
            const adjustedPage = new PageCoordinates(request.pos.x, adjustedPageY);
            const r = this._actualDoHitTestWithCaretRangeFromPoint(ctx, adjustedPage.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
            if (r.type === 1 /* HitTestResultType.Content */) {
                return r;
            }
        }
        // Also try to hit test without the adjustment (for the edge cases that we are near the top or bottom)
        return this._actualDoHitTestWithCaretRangeFromPoint(ctx, request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
    }
    static _actualDoHitTestWithCaretRangeFromPoint(ctx, coords) {
        const shadowRoot = dom.getShadowRoot(ctx.viewDomNode);
        let range;
        if (shadowRoot) {
            if (typeof shadowRoot.caretRangeFromPoint === 'undefined') {
                range = shadowCaretRangeFromPoint(shadowRoot, coords.clientX, coords.clientY);
            }
            else {
                range = shadowRoot.caretRangeFromPoint(coords.clientX, coords.clientY);
            }
        }
        else {
            range = ctx.viewDomNode.ownerDocument.caretRangeFromPoint(coords.clientX, coords.clientY);
        }
        if (!range || !range.startContainer) {
            return new UnknownHitTestResult();
        }
        // Chrome always hits a TEXT_NODE, while Edge sometimes hits a token span
        const startContainer = range.startContainer;
        if (startContainer.nodeType === startContainer.TEXT_NODE) {
            // startContainer is expected to be the token text
            const parent1 = startContainer.parentNode; // expected to be the token span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line container span
            const parent3 = parent2 ? parent2.parentNode : null; // expected to be the view line div
            const parent3ClassName = parent3 && parent3.nodeType === parent3.ELEMENT_NODE ? parent3.className : null;
            if (parent3ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, parent1, range.startOffset);
            }
            else {
                return new UnknownHitTestResult(startContainer.parentNode);
            }
        }
        else if (startContainer.nodeType === startContainer.ELEMENT_NODE) {
            // startContainer is expected to be the token span
            const parent1 = startContainer.parentNode; // expected to be the view line container span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line div
            const parent2ClassName = parent2 && parent2.nodeType === parent2.ELEMENT_NODE ? parent2.className : null;
            if (parent2ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, startContainer, startContainer.textContent.length);
            }
            else {
                return new UnknownHitTestResult(startContainer);
            }
        }
        return new UnknownHitTestResult();
    }
    /**
     * Most probably Gecko
     */
    static _doHitTestWithCaretPositionFromPoint(ctx, coords) {
        const hitResult = ctx.viewDomNode.ownerDocument.caretPositionFromPoint(coords.clientX, coords.clientY);
        if (hitResult.offsetNode.nodeType === hitResult.offsetNode.TEXT_NODE) {
            // offsetNode is expected to be the token text
            const parent1 = hitResult.offsetNode.parentNode; // expected to be the token span
            const parent2 = parent1 ? parent1.parentNode : null; // expected to be the view line container span
            const parent3 = parent2 ? parent2.parentNode : null; // expected to be the view line div
            const parent3ClassName = parent3 && parent3.nodeType === parent3.ELEMENT_NODE ? parent3.className : null;
            if (parent3ClassName === ViewLine.CLASS_NAME) {
                return HitTestResult.createFromDOMInfo(ctx, hitResult.offsetNode.parentNode, hitResult.offset);
            }
            else {
                return new UnknownHitTestResult(hitResult.offsetNode.parentNode);
            }
        }
        // For inline decorations, Gecko sometimes returns the `<span>` of the line and the offset is the `<span>` with the inline decoration
        // Some other times, it returns the `<span>` with the inline decoration
        if (hitResult.offsetNode.nodeType === hitResult.offsetNode.ELEMENT_NODE) {
            const parent1 = hitResult.offsetNode.parentNode;
            const parent1ClassName = parent1 && parent1.nodeType === parent1.ELEMENT_NODE ? parent1.className : null;
            const parent2 = parent1 ? parent1.parentNode : null;
            const parent2ClassName = parent2 && parent2.nodeType === parent2.ELEMENT_NODE ? parent2.className : null;
            if (parent1ClassName === ViewLine.CLASS_NAME) {
                // it returned the `<span>` of the line and the offset is the `<span>` with the inline decoration
                const tokenSpan = hitResult.offsetNode.childNodes[Math.min(hitResult.offset, hitResult.offsetNode.childNodes.length - 1)];
                if (tokenSpan) {
                    return HitTestResult.createFromDOMInfo(ctx, tokenSpan, 0);
                }
            }
            else if (parent2ClassName === ViewLine.CLASS_NAME) {
                // it returned the `<span>` with the inline decoration
                return HitTestResult.createFromDOMInfo(ctx, hitResult.offsetNode, 0);
            }
        }
        return new UnknownHitTestResult(hitResult.offsetNode);
    }
    static _snapToSoftTabBoundary(position, viewModel) {
        const lineContent = viewModel.getLineContent(position.lineNumber);
        const { tabSize } = viewModel.model.getOptions();
        const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, position.column - 1, tabSize, 2 /* Direction.Nearest */);
        if (newPosition !== -1) {
            return new Position(position.lineNumber, newPosition + 1);
        }
        return position;
    }
    static doHitTest(ctx, request) {
        let result = new UnknownHitTestResult();
        if (typeof ctx.viewDomNode.ownerDocument.caretRangeFromPoint === 'function') {
            result = this._doHitTestWithCaretRangeFromPoint(ctx, request);
        }
        else if (ctx.viewDomNode.ownerDocument.caretPositionFromPoint) {
            result = this._doHitTestWithCaretPositionFromPoint(ctx, request.pos.toClientCoordinates(dom.getWindow(ctx.viewDomNode)));
        }
        if (result.type === 1 /* HitTestResultType.Content */) {
            const injectedText = ctx.viewModel.getInjectedTextAt(result.position);
            const normalizedPosition = ctx.viewModel.normalizePosition(result.position, 2 /* PositionAffinity.None */);
            if (injectedText || !normalizedPosition.equals(result.position)) {
                result = new ContentHitTestResult(normalizedPosition, result.spanNode, injectedText);
            }
        }
        return result;
    }
}
function shadowCaretRangeFromPoint(shadowRoot, x, y) {
    const range = document.createRange();
    // Get the element under the point
    let el = shadowRoot.elementFromPoint(x, y);
    if (el !== null) {
        // Get the last child of the element until its firstChild is a text node
        // This assumes that the pointer is on the right of the line, out of the tokens
        // and that we want to get the offset of the last token of the line
        while (el && el.firstChild && el.firstChild.nodeType !== el.firstChild.TEXT_NODE && el.lastChild && el.lastChild.firstChild) {
            el = el.lastChild;
        }
        // Grab its rect
        const rect = el.getBoundingClientRect();
        // And its font (the computed shorthand font property might be empty, see #3217)
        const elWindow = dom.getWindow(el);
        const fontStyle = elWindow.getComputedStyle(el, null).getPropertyValue('font-style');
        const fontVariant = elWindow.getComputedStyle(el, null).getPropertyValue('font-variant');
        const fontWeight = elWindow.getComputedStyle(el, null).getPropertyValue('font-weight');
        const fontSize = elWindow.getComputedStyle(el, null).getPropertyValue('font-size');
        const lineHeight = elWindow.getComputedStyle(el, null).getPropertyValue('line-height');
        const fontFamily = elWindow.getComputedStyle(el, null).getPropertyValue('font-family');
        const font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
        // And also its txt content
        const text = el.innerText;
        // Position the pixel cursor at the left of the element
        let pixelCursor = rect.left;
        let offset = 0;
        let step;
        // If the point is on the right of the box put the cursor after the last character
        if (x > rect.left + rect.width) {
            offset = text.length;
        }
        else {
            const charWidthReader = CharWidthReader.getInstance();
            // Goes through all the characters of the innerText, and checks if the x of the point
            // belongs to the character.
            for (let i = 0; i < text.length + 1; i++) {
                // The step is half the width of the character
                step = charWidthReader.getCharWidth(text.charAt(i), font) / 2;
                // Move to the center of the character
                pixelCursor += step;
                // If the x of the point is smaller that the position of the cursor, the point is over that character
                if (x < pixelCursor) {
                    offset = i;
                    break;
                }
                // Move between the current character and the next
                pixelCursor += step;
            }
        }
        // Creates a range with the text node of the element and set the offset found
        range.setStart(el.firstChild, offset);
        range.setEnd(el.firstChild, offset);
    }
    return range;
}
class CharWidthReader {
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!CharWidthReader._INSTANCE) {
            CharWidthReader._INSTANCE = new CharWidthReader();
        }
        return CharWidthReader._INSTANCE;
    }
    constructor() {
        this._cache = {};
        this._canvas = document.createElement('canvas');
    }
    getCharWidth(char, font) {
        const cacheKey = char + font;
        if (this._cache[cacheKey]) {
            return this._cache[cacheKey];
        }
        const context = this._canvas.getContext('2d');
        context.font = font;
        const metrics = context.measureText(char);
        const width = metrics.width;
        this._cache[cacheKey] = width;
        return width;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VUYXJnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9tb3VzZVRhcmdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQTJELGVBQWUsRUFBK0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4SSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsS0FBSyxJQUFJLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSx1QkFBdUIsRUFBYSxNQUFNLG1EQUFtRCxDQUFDO0FBSXZHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUdwRCxJQUFXLGlCQUdWO0FBSEQsV0FBVyxpQkFBaUI7SUFDM0IsK0RBQU8sQ0FBQTtJQUNQLCtEQUFPLENBQUE7QUFDUixDQUFDLEVBSFUsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUczQjtBQUVELE1BQU0sb0JBQW9CO0lBRXpCLFlBQ1UsWUFBZ0MsSUFBSTtRQUFwQyxjQUFTLEdBQVQsU0FBUyxDQUEyQjtRQUZyQyxTQUFJLHFDQUE2QjtJQUd0QyxDQUFDO0NBQ0w7QUFFRCxNQUFNLG9CQUFvQjtJQUd6QixJQUFJLFNBQVMsS0FBa0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUV0RCxZ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