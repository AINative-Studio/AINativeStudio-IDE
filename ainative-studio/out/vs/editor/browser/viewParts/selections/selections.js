/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './selections.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorSelectionForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
var CornerStyle;
(function (CornerStyle) {
    CornerStyle[CornerStyle["EXTERN"] = 0] = "EXTERN";
    CornerStyle[CornerStyle["INTERN"] = 1] = "INTERN";
    CornerStyle[CornerStyle["FLAT"] = 2] = "FLAT";
})(CornerStyle || (CornerStyle = {}));
class HorizontalRangeWithStyle {
    constructor(other) {
        this.left = other.left;
        this.width = other.width;
        this.startStyle = null;
        this.endStyle = null;
    }
}
class LineVisibleRangesWithStyle {
    constructor(lineNumber, ranges) {
        this.lineNumber = lineNumber;
        this.ranges = ranges;
    }
}
function toStyledRange(item) {
    return new HorizontalRangeWithStyle(item);
}
function toStyled(item) {
    return new LineVisibleRangesWithStyle(item.lineNumber, item.ranges.map(toStyledRange));
}
/**
 * This view part displays selected text to the user. Every line has its own selection overlay.
 */
export class SelectionsOverlay extends DynamicViewOverlay {
    static { this.SELECTION_CLASS_NAME = 'selected-text'; }
    static { this.SELECTION_TOP_LEFT = 'top-left-radius'; }
    static { this.SELECTION_BOTTOM_LEFT = 'bottom-left-radius'; }
    static { this.SELECTION_TOP_RIGHT = 'top-right-radius'; }
    static { this.SELECTION_BOTTOM_RIGHT = 'bottom-right-radius'; }
    static { this.EDITOR_BACKGROUND_CLASS_NAME = 'monaco-editor-background'; }
    static { this.ROUNDED_PIECE_WIDTH = 10; }
    constructor(context) {
        super();
        this._previousFrameVisibleRangesWithStyle = [];
        this._context = context;
        const options = this._context.configuration.options;
        this._roundedSelection = options.get(106 /* EditorOption.roundedSelection */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        this._selections = [];
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._roundedSelection = options.get(106 /* EditorOption.roundedSelection */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        return true;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections.slice(0);
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true; //e.inlineDecorationsChanged;
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
    _visibleRangesHaveGaps(linesVisibleRanges) {
        for (let i = 0, len = linesVisibleRanges.length; i < len; i++) {
            const lineVisibleRanges = linesVisibleRanges[i];
            if (lineVisibleRanges.ranges.length > 1) {
                // There are two ranges on the same line
                return true;
            }
        }
        return false;
    }
    _enrichVisibleRangesWithStyle(viewport, linesVisibleRanges, previousFrame) {
        const epsilon = this._typicalHalfwidthCharacterWidth / 4;
        let previousFrameTop = null;
        let previousFrameBottom = null;
        if (previousFrame && previousFrame.length > 0 && linesVisibleRanges.length > 0) {
            const topLineNumber = linesVisibleRanges[0].lineNumber;
            if (topLineNumber === viewport.startLineNumber) {
                for (let i = 0; !previousFrameTop && i < previousFrame.length; i++) {
                    if (previousFrame[i].lineNumber === topLineNumber) {
                        previousFrameTop = previousFrame[i].ranges[0];
                    }
                }
            }
            const bottomLineNumber = linesVisibleRanges[linesVisibleRanges.length - 1].lineNumber;
            if (bottomLineNumber === viewport.endLineNumber) {
                for (let i = previousFrame.length - 1; !previousFrameBottom && i >= 0; i--) {
                    if (previousFrame[i].lineNumber === bottomLineNumber) {
                        previousFrameBottom = previousFrame[i].ranges[0];
                    }
                }
            }
            if (previousFrameTop && !previousFrameTop.startStyle) {
                previousFrameTop = null;
            }
            if (previousFrameBottom && !previousFrameBottom.startStyle) {
                previousFrameBottom = null;
            }
        }
        for (let i = 0, len = linesVisibleRanges.length; i < len; i++) {
            // We know for a fact that there is precisely one range on each line
            const curLineRange = linesVisibleRanges[i].ranges[0];
            const curLeft = curLineRange.left;
            const curRight = curLineRange.left + curLineRange.width;
            const startStyle = {
                top: 0 /* CornerStyle.EXTERN */,
                bottom: 0 /* CornerStyle.EXTERN */
            };
            const endStyle = {
                top: 0 /* CornerStyle.EXTERN */,
                bottom: 0 /* CornerStyle.EXTERN */
            };
            if (i > 0) {
                // Look above
                const prevLeft = linesVisibleRanges[i - 1].ranges[0].left;
                const prevRight = linesVisibleRanges[i - 1].ranges[0].left + linesVisibleRanges[i - 1].ranges[0].width;
                if (abs(curLeft - prevLeft) < epsilon) {
                    startStyle.top = 2 /* CornerStyle.FLAT */;
                }
                else if (curLeft > prevLeft) {
                    startStyle.top = 1 /* CornerStyle.INTERN */;
                }
                if (abs(curRight - prevRight) < epsilon) {
                    endStyle.top = 2 /* CornerStyle.FLAT */;
                }
                else if (prevLeft < curRight && curRight < prevRight) {
                    endStyle.top = 1 /* CornerStyle.INTERN */;
                }
            }
            else if (previousFrameTop) {
                // Accept some hiccups near the viewport edges to save on repaints
                startStyle.top = previousFrameTop.startStyle.top;
                endStyle.top = previousFrameTop.endStyle.top;
            }
            if (i + 1 < len) {
                // Look below
                const nextLeft = linesVisibleRanges[i + 1].ranges[0].left;
                const nextRight = linesVisibleRanges[i + 1].ranges[0].left + linesVisibleRanges[i + 1].ranges[0].width;
                if (abs(curLeft - nextLeft) < epsilon) {
                    startStyle.bottom = 2 /* CornerStyle.FLAT */;
                }
                else if (nextLeft < curLeft && curLeft < nextRight) {
                    startStyle.bottom = 1 /* CornerStyle.INTERN */;
                }
                if (abs(curRight - nextRight) < epsilon) {
                    endStyle.bottom = 2 /* CornerStyle.FLAT */;
                }
                else if (curRight < nextRight) {
                    endStyle.bottom = 1 /* CornerStyle.INTERN */;
                }
            }
            else if (previousFrameBottom) {
                // Accept some hiccups near the viewport edges to save on repaints
                startStyle.bottom = previousFrameBottom.startStyle.bottom;
                endStyle.bottom = previousFrameBottom.endStyle.bottom;
            }
            curLineRange.startStyle = startStyle;
            curLineRange.endStyle = endStyle;
        }
    }
    _getVisibleRangesWithStyle(selection, ctx, previousFrame) {
        const _linesVisibleRanges = ctx.linesVisibleRangesForRange(selection, true) || [];
        const linesVisibleRanges = _linesVisibleRanges.map(toStyled);
        const visibleRangesHaveGaps = this._visibleRangesHaveGaps(linesVisibleRanges);
        if (!visibleRangesHaveGaps && this._roundedSelection) {
            this._enrichVisibleRangesWithStyle(ctx.visibleRange, linesVisibleRanges, previousFrame);
        }
        // The visible ranges are sorted TOP-BOTTOM and LEFT-RIGHT
        return linesVisibleRanges;
    }
    _createSelectionPiece(top, bottom, className, left, width) {
        return ('<div class="cslr '
            + className
            + '" style="'
            + 'top:' + top.toString() + 'px;'
            + 'bottom:' + bottom.toString() + 'px;'
            + 'left:' + left.toString() + 'px;'
            + 'width:' + width.toString() + 'px;'
            + '"></div>');
    }
    _actualRenderOneSelection(output2, visibleStartLineNumber, hasMultipleSelections, visibleRanges) {
        if (visibleRanges.length === 0) {
            return;
        }
        const visibleRangesHaveStyle = !!visibleRanges[0].ranges[0].startStyle;
        const firstLineNumber = visibleRanges[0].lineNumber;
        const lastLineNumber = visibleRanges[visibleRanges.length - 1].lineNumber;
        for (let i = 0, len = visibleRanges.length; i < len; i++) {
            const lineVisibleRanges = visibleRanges[i];
            const lineNumber = lineVisibleRanges.lineNumber;
            const lineIndex = lineNumber - visibleStartLineNumber;
            const top = hasMultipleSelections ? (lineNumber === firstLineNumber ? 1 : 0) : 0;
            const bottom = hasMultipleSelections ? (lineNumber !== firstLineNumber && lineNumber === lastLineNumber ? 1 : 0) : 0;
            let innerCornerOutput = '';
            let restOfSelectionOutput = '';
            for (let j = 0, lenJ = lineVisibleRanges.ranges.length; j < lenJ; j++) {
                const visibleRange = lineVisibleRanges.ranges[j];
                if (visibleRangesHaveStyle) {
                    const startStyle = visibleRange.startStyle;
                    const endStyle = visibleRange.endStyle;
                    if (startStyle.top === 1 /* CornerStyle.INTERN */ || startStyle.bottom === 1 /* CornerStyle.INTERN */) {
                        // Reverse rounded corner to the left
                        // First comes the selection (blue layer)
                        innerCornerOutput += this._createSelectionPiece(top, bottom, SelectionsOverlay.SELECTION_CLASS_NAME, visibleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                        // Second comes the background (white layer) with inverse border radius
                        let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
                        if (startStyle.top === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
                        }
                        if (startStyle.bottom === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
                        }
                        innerCornerOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                    }
                    if (endStyle.top === 1 /* CornerStyle.INTERN */ || endStyle.bottom === 1 /* CornerStyle.INTERN */) {
                        // Reverse rounded corner to the right
                        // First comes the selection (blue layer)
                        innerCornerOutput += this._createSelectionPiece(top, bottom, SelectionsOverlay.SELECTION_CLASS_NAME, visibleRange.left + visibleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                        // Second comes the background (white layer) with inverse border radius
                        let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
                        if (endStyle.top === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
                        }
                        if (endStyle.bottom === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
                        }
                        innerCornerOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left + visibleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                    }
                }
                let className = SelectionsOverlay.SELECTION_CLASS_NAME;
                if (visibleRangesHaveStyle) {
                    const startStyle = visibleRange.startStyle;
                    const endStyle = visibleRange.endStyle;
                    if (startStyle.top === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
                    }
                    if (startStyle.bottom === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
                    }
                    if (endStyle.top === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
                    }
                    if (endStyle.bottom === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
                    }
                }
                restOfSelectionOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left, visibleRange.width);
            }
            output2[lineIndex][0] += innerCornerOutput;
            output2[lineIndex][1] += restOfSelectionOutput;
        }
    }
    prepareRender(ctx) {
        // Build HTML for inner corners separate from HTML for the rest of selections,
        // as the inner corner HTML can interfere with that of other selections.
        // In final render, make sure to place the inner corner HTML before the rest of selection HTML. See issue #77777.
        const output = [];
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = ['', ''];
        }
        const thisFrameVisibleRangesWithStyle = [];
        for (let i = 0, len = this._selections.length; i < len; i++) {
            const selection = this._selections[i];
            if (selection.isEmpty()) {
                thisFrameVisibleRangesWithStyle[i] = null;
                continue;
            }
            const visibleRangesWithStyle = this._getVisibleRangesWithStyle(selection, ctx, this._previousFrameVisibleRangesWithStyle[i]);
            thisFrameVisibleRangesWithStyle[i] = visibleRangesWithStyle;
            this._actualRenderOneSelection(output, visibleStartLineNumber, this._selections.length > 1, visibleRangesWithStyle);
        }
        this._previousFrameVisibleRangesWithStyle = thisFrameVisibleRangesWithStyle;
        this._renderResult = output.map(([internalCorners, restOfSelection]) => internalCorners + restOfSelection);
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
registerThemingParticipant((theme, collector) => {
    const editorSelectionForegroundColor = theme.getColor(editorSelectionForeground);
    if (editorSelectionForegroundColor && !editorSelectionForegroundColor.isTransparent()) {
        collector.addRule(`.monaco-editor .view-line span.inline-selected-text { color: ${editorSelectionForegroundColor}; }`);
    }
});
function abs(n) {
    return n < 0 ? -n : n;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvc2VsZWN0aW9ucy9zZWxlY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFLdEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHL0YsSUFBVyxXQUlWO0FBSkQsV0FBVyxXQUFXO0lBQ3JCLGlEQUFNLENBQUE7SUFDTixpREFBTSxDQUFBO0lBQ04sNkNBQUksQ0FBQTtBQUNMLENBQUMsRUFKVSxXQUFXLEtBQVgsV0FBVyxRQUlyQjtBQU9ELE1BQU0sd0JBQXdCO0lBTTdCLFlBQVksS0FBc0I7UUFDakMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN0QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLDBCQUEwQjtJQUkvQixZQUFZLFVBQWtCLEVBQUUsTUFBa0M7UUFDakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBcUI7SUFDM0MsT0FBTyxJQUFJLHdCQUF3QixDQUFDLElBQUks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