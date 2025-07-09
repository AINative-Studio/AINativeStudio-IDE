/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ArrayQueue } from '../../../../base/common/arrays.js';
import './glyphMargin.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { ViewPart } from '../../view/viewPart.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { GlyphMarginLane } from '../../../common/model.js';
/**
 * Represents a decoration that should be shown along the lines from `startLineNumber` to `endLineNumber`.
 * This can end up producing multiple `LineDecorationToRender`.
 */
export class DecorationToRender {
    constructor(startLineNumber, endLineNumber, className, tooltip, zIndex) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.className = className;
        this.tooltip = tooltip;
        this._decorationToRenderBrand = undefined;
        this.zIndex = zIndex ?? 0;
    }
}
/**
 * A decoration that should be shown along a line.
 */
export class LineDecorationToRender {
    constructor(className, zIndex, tooltip) {
        this.className = className;
        this.zIndex = zIndex;
        this.tooltip = tooltip;
    }
}
/**
 * Decorations to render on a visible line.
 */
export class VisibleLineDecorationsToRender {
    constructor() {
        this.decorations = [];
    }
    add(decoration) {
        this.decorations.push(decoration);
    }
    getDecorations() {
        return this.decorations;
    }
}
export class DedupOverlay extends DynamicViewOverlay {
    /**
     * Returns an array with an element for each visible line number.
     */
    _render(visibleStartLineNumber, visibleEndLineNumber, decorations) {
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = new VisibleLineDecorationsToRender();
        }
        if (decorations.length === 0) {
            return output;
        }
        // Sort decorations by className, then by startLineNumber and then by endLineNumber
        decorations.sort((a, b) => {
            if (a.className === b.className) {
                if (a.startLineNumber === b.startLineNumber) {
                    return a.endLineNumber - b.endLineNumber;
                }
                return a.startLineNumber - b.startLineNumber;
            }
            return (a.className < b.className ? -1 : 1);
        });
        let prevClassName = null;
        let prevEndLineIndex = 0;
        for (let i = 0, len = decorations.length; i < len; i++) {
            const d = decorations[i];
            const className = d.className;
            const zIndex = d.zIndex;
            let startLineIndex = Math.max(d.startLineNumber, visibleStartLineNumber) - visibleStartLineNumber;
            const endLineIndex = Math.min(d.endLineNumber, visibleEndLineNumber) - visibleStartLineNumber;
            if (prevClassName === className) {
                // Here we avoid rendering the same className multiple times on the same line
                startLineIndex = Math.max(prevEndLineIndex + 1, startLineIndex);
                prevEndLineIndex = Math.max(prevEndLineIndex, endLineIndex);
            }
            else {
                prevClassName = className;
                prevEndLineIndex = endLineIndex;
            }
            for (let i = startLineIndex; i <= prevEndLineIndex; i++) {
                output[i].add(new LineDecorationToRender(className, zIndex, d.tooltip));
            }
        }
        return output;
    }
}
export class GlyphMarginWidgets extends ViewPart {
    constructor(context) {
        super(context);
        this._widgets = {};
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('glyph-margin-widgets');
        this.domNode.setPosition('absolute');
        this.domNode.setTop(0);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._glyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        this._glyphMarginDecorationLaneCount = layoutInfo.glyphMarginDecorationLaneCount;
        this._managedDomNodes = [];
        this._decorationGlyphsToRender = [];
    }
    dispose() {
        this._managedDomNodes = [];
        this._decorationGlyphsToRender = [];
        this._widgets = {};
        super.dispose();
    }
    getWidgets() {
        return Object.values(this._widgets);
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._glyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        this._glyphMarginDecorationLaneCount = layoutInfo.glyphMarginDecorationLaneCount;
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    // --- begin widget management
    addWidget(widget) {
        const domNode = createFastDomNode(widget.getDomNode());
        this._widgets[widget.getId()] = {
            widget: widget,
            preference: widget.getPosition(),
            domNode: domNode,
            renderInfo: null
        };
        domNode.setPosition('absolute');
        domNode.setDisplay('none');
        domNode.setAttribute('widgetId', widget.getId());
        this.domNode.appendChild(domNode);
        this.setShouldRender();
    }
    setWidgetPosition(widget, preference) {
        const myWidget = this._widgets[widget.getId()];
        if (myWidget.preference.lane === preference.lane
            && myWidget.preference.zIndex === preference.zIndex
            && Range.equalsRange(myWidget.preference.range, preference.range)) {
            return false;
        }
        myWidget.preference = preference;
        this.setShouldRender();
        return true;
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets[widgetId]) {
            const widgetData = this._widgets[widgetId];
            const domNode = widgetData.domNode.domNode;
            delete this._widgets[widgetId];
            domNode.remove();
            this.setShouldRender();
        }
    }
    // --- end widget management
    _collectDecorationBasedGlyphRenderRequest(ctx, requests) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const decorations = ctx.getDecorationsInViewport();
        for (const d of decorations) {
            const glyphMarginClassName = d.options.glyphMarginClassName;
            if (!glyphMarginClassName) {
                continue;
            }
            const startLineNumber = Math.max(d.range.startLineNumber, visibleStartLineNumber);
            const endLineNumber = Math.min(d.range.endLineNumber, visibleEndLineNumber);
            const lane = d.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            const zIndex = d.options.zIndex ?? 0;
            for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
                const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber, 0));
                const laneIndex = this._context.viewModel.glyphLanes.getLanesAtLine(modelPosition.lineNumber).indexOf(lane);
                requests.push(new DecorationBasedGlyphRenderRequest(lineNumber, laneIndex, zIndex, glyphMarginClassName));
            }
        }
    }
    _collectWidgetBasedGlyphRenderRequest(ctx, requests) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (const widget of Object.values(this._widgets)) {
            const range = widget.preference.range;
            const { startLineNumber, endLineNumber } = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(Range.lift(range));
            if (!startLineNumber || !endLineNumber || endLineNumber < visibleStartLineNumber || startLineNumber > visibleEndLineNumber) {
                // The widget is not in the viewport
                continue;
            }
            // The widget is in the viewport, find a good line for it
            const widgetLineNumber = Math.max(startLineNumber, visibleStartLineNumber);
            const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(widgetLineNumber, 0));
            const laneIndex = this._context.viewModel.glyphLanes.getLanesAtLine(modelPosition.lineNumber).indexOf(widget.preference.lane);
            requests.push(new WidgetBasedGlyphRenderRequest(widgetLineNumber, laneIndex, widget.preference.zIndex, widget));
        }
    }
    _collectSortedGlyphRenderRequests(ctx) {
        const requests = [];
        this._collectDecorationBasedGlyphRenderRequest(ctx, requests);
        this._collectWidgetBasedGlyphRenderRequest(ctx, requests);
        // sort requests by lineNumber ASC, lane  ASC, zIndex DESC, type DESC (widgets first), className ASC
        // don't change this sort unless you understand `prepareRender` below.
        requests.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.laneIndex === b.laneIndex) {
                    if (a.zIndex === b.zIndex) {
                        if (b.type === a.type) {
                            if (a.type === 0 /* GlyphRenderRequestType.Decoration */ && b.type === 0 /* GlyphRenderRequestType.Decoration */) {
                                return (a.className < b.className ? -1 : 1);
                            }
                            return 0;
                        }
                        return b.type - a.type;
                    }
                    return b.zIndex - a.zIndex;
                }
                return a.laneIndex - b.laneIndex;
            }
            return a.lineNumber - b.lineNumber;
        });
        return requests;
    }
    /**
     * Will store render information in each widget's renderInfo and in `_decorationGlyphsToRender`.
     */
    prepareRender(ctx) {
        if (!this._glyphMargin) {
            this._decorationGlyphsToRender = [];
            return;
        }
        for (const widget of Object.values(this._widgets)) {
            widget.renderInfo = null;
        }
        const requests = new ArrayQueue(this._collectSortedGlyphRenderRequests(ctx));
        const decorationGlyphsToRender = [];
        while (requests.length > 0) {
            const first = requests.peek();
            if (!first) {
                // not possible
                break;
            }
            // Requests are sorted by lineNumber and lane, so we read all requests for this particular location
            const requestsAtLocation = requests.takeWhile((el) => el.lineNumber === first.lineNumber && el.laneIndex === first.laneIndex);
            if (!requestsAtLocation || requestsAtLocation.length === 0) {
                // not possible
                break;
            }
            const winner = requestsAtLocation[0];
            if (winner.type === 0 /* GlyphRenderRequestType.Decoration */) {
                // combine all decorations with the same z-index
                const classNames = [];
                // requests are sorted by zIndex, type, and className so we can dedup className by looking at the previous one
                for (const request of requestsAtLocation) {
                    if (request.zIndex !== winner.zIndex || request.type !== winner.type) {
                        break;
                    }
                    if (classNames.length === 0 || classNames[classNames.length - 1] !== request.className) {
                        classNames.push(request.className);
                    }
                }
                decorationGlyphsToRender.push(winner.accept(classNames.join(' '))); // TODO@joyceerhl Implement overflow for remaining decorations
            }
            else {
                // widgets cannot be combined
                winner.widget.renderInfo = {
                    lineNumber: winner.lineNumber,
                    laneIndex: winner.laneIndex,
                };
            }
        }
        this._decorationGlyphsToRender = decorationGlyphsToRender;
    }
    render(ctx) {
        if (!this._glyphMargin) {
            for (const widget of Object.values(this._widgets)) {
                widget.domNode.setDisplay('none');
            }
            while (this._managedDomNodes.length > 0) {
                const domNode = this._managedDomNodes.pop();
                domNode?.domNode.remove();
            }
            return;
        }
        const width = (Math.round(this._glyphMarginWidth / this._glyphMarginDecorationLaneCount));
        // Render widgets
        for (const widget of Object.values(this._widgets)) {
            if (!widget.renderInfo) {
                // this widget is not visible
                widget.domNode.setDisplay('none');
            }
            else {
                const top = ctx.viewportData.relativeVerticalOffset[widget.renderInfo.lineNumber - ctx.viewportData.startLineNumber];
                const left = this._glyphMarginLeft + widget.renderInfo.laneIndex * this._lineHeight;
                widget.domNode.setDisplay('block');
                widget.domNode.setTop(top);
                widget.domNode.setLeft(left);
                widget.domNode.setWidth(width);
                widget.domNode.setHeight(this._lineHeight);
            }
        }
        // Render decorations, reusing previous dom nodes as possible
        for (let i = 0; i < this._decorationGlyphsToRender.length; i++) {
            const dec = this._decorationGlyphsToRender[i];
            const top = ctx.viewportData.relativeVerticalOffset[dec.lineNumber - ctx.viewportData.startLineNumber];
            const left = this._glyphMarginLeft + dec.laneIndex * this._lineHeight;
            let domNode;
            if (i < this._managedDomNodes.length) {
                domNode = this._managedDomNodes[i];
            }
            else {
                domNode = createFastDomNode(document.createElement('div'));
                this._managedDomNodes.push(domNode);
                this.domNode.appendChild(domNode);
            }
            domNode.setClassName(`cgmr codicon ` + dec.combinedClassName);
            domNode.setPosition(`absolute`);
            domNode.setTop(top);
            domNode.setLeft(left);
            domNode.setWidth(width);
            domNode.setHeight(this._lineHeight);
        }
        // remove extra dom nodes
        while (this._managedDomNodes.length > this._decorationGlyphsToRender.length) {
            const domNode = this._managedDomNodes.pop();
            domNode?.domNode.remove();
        }
    }
}
var GlyphRenderRequestType;
(function (GlyphRenderRequestType) {
    GlyphRenderRequestType[GlyphRenderRequestType["Decoration"] = 0] = "Decoration";
    GlyphRenderRequestType[GlyphRenderRequestType["Widget"] = 1] = "Widget";
})(GlyphRenderRequestType || (GlyphRenderRequestType = {}));
/**
 * A request to render a decoration in the glyph margin at a certain location.
 */
class DecorationBasedGlyphRenderRequest {
    constructor(lineNumber, laneIndex, zIndex, className) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.zIndex = zIndex;
        this.className = className;
        this.type = 0 /* GlyphRenderRequestType.Decoration */;
    }
    accept(combinedClassName) {
        return new DecorationBasedGlyph(this.lineNumber, this.laneIndex, combinedClassName);
    }
}
/**
 * A request to render a widget in the glyph margin at a certain location.
 */
class WidgetBasedGlyphRenderRequest {
    constructor(lineNumber, laneIndex, zIndex, widget) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.zIndex = zIndex;
        this.widget = widget;
        this.type = 1 /* GlyphRenderRequestType.Widget */;
    }
}
class DecorationBasedGlyph {
    constructor(lineNumber, laneIndex, combinedClassName) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.combinedClassName = combinedClassName;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhNYXJnaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2dseXBoTWFyZ2luL2dseXBoTWFyZ2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLG1CQUFtQixDQUFDO0FBRTNCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUkzRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBSzlCLFlBQ2lCLGVBQXVCLEVBQ3ZCLGFBQXFCLEVBQ3JCLFNBQWlCLEVBQ2pCLE9BQXNCLEVBQ3RDLE1BQTBCO1FBSlYsb0JBQWUsR0FBZixlQUFlLENBQVE7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFDckIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixZQUFPLEdBQVAsT0FBTyxDQUFlO1FBUnZCLDZCQUF3QixHQUFTLFNBQVMsQ0FBQztRQVcxRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBQ2xDLFlBQ2lCLFNBQWlCLEVB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