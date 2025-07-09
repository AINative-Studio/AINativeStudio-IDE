/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './decorations.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { HorizontalRange } from '../../view/renderingContext.js';
import { Range } from '../../../common/core/range.js';
export class DecorationsOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
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
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
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
        return e.scrollTopChanged || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        const _decorations = ctx.getDecorationsInViewport();
        // Keep only decorations with `className`
        let decorations = [];
        let decorationsLen = 0;
        for (let i = 0, len = _decorations.length; i < len; i++) {
            const d = _decorations[i];
            if (d.options.className) {
                decorations[decorationsLen++] = d;
            }
        }
        // Sort decorations for consistent render output
        decorations = decorations.sort((a, b) => {
            if (a.options.zIndex < b.options.zIndex) {
                return -1;
            }
            if (a.options.zIndex > b.options.zIndex) {
                return 1;
            }
            const aClassName = a.options.className;
            const bClassName = b.options.className;
            if (aClassName < bClassName) {
                return -1;
            }
            if (aClassName > bClassName) {
                return 1;
            }
            return Range.compareRangesUsingStarts(a.range, b.range);
        });
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = '';
        }
        // Render first whole line decorations and then regular decorations
        this._renderWholeLineDecorations(ctx, decorations, output);
        this._renderNormalDecorations(ctx, decorations, output);
        this._renderResult = output;
    }
    _renderWholeLineDecorations(ctx, decorations, output) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (let i = 0, lenI = decorations.length; i < lenI; i++) {
            const d = decorations[i];
            if (!d.options.isWholeLine) {
                continue;
            }
            const decorationOutput = ('<div class="cdr '
                + d.options.className
                + '" style="left:0;width:100%;"></div>');
            const startLineNumber = Math.max(d.range.startLineNumber, visibleStartLineNumber);
            const endLineNumber = Math.min(d.range.endLineNumber, visibleEndLineNumber);
            for (let j = startLineNumber; j <= endLineNumber; j++) {
                const lineIndex = j - visibleStartLineNumber;
                output[lineIndex] += decorationOutput;
            }
        }
    }
    _renderNormalDecorations(ctx, decorations, output) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        let prevClassName = null;
        let prevShowIfCollapsed = false;
        let prevRange = null;
        let prevShouldFillLineOnLineBreak = false;
        for (let i = 0, lenI = decorations.length; i < lenI; i++) {
            const d = decorations[i];
            if (d.options.isWholeLine) {
                continue;
            }
            const className = d.options.className;
            const showIfCollapsed = Boolean(d.options.showIfCollapsed);
            let range = d.range;
            if (showIfCollapsed && range.endColumn === 1 && range.endLineNumber !== range.startLineNumber) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber - 1, this._context.viewModel.getLineMaxColumn(range.endLineNumber - 1));
            }
            if (prevClassName === className && prevShowIfCollapsed === showIfCollapsed && Range.areIntersectingOrTouching(prevRange, range)) {
                // merge into previous decoration
                prevRange = Range.plusRange(prevRange, range);
                continue;
            }
            // flush previous decoration
            if (prevClassName !== null) {
                this._renderNormalDecoration(ctx, prevRange, prevClassName, prevShouldFillLineOnLineBreak, prevShowIfCollapsed, visibleStartLineNumber, output);
            }
            prevClassName = className;
            prevShowIfCollapsed = showIfCollapsed;
            prevRange = range;
            prevShouldFillLineOnLineBreak = d.options.shouldFillLineOnLineBreak ?? false;
        }
        if (prevClassName !== null) {
            this._renderNormalDecoration(ctx, prevRange, prevClassName, prevShouldFillLineOnLineBreak, prevShowIfCollapsed, visibleStartLineNumber, output);
        }
    }
    _renderNormalDecoration(ctx, range, className, shouldFillLineOnLineBreak, showIfCollapsed, visibleStartLineNumber, output) {
        const linesVisibleRanges = ctx.linesVisibleRangesForRange(range, /*TODO@Alex*/ className === 'findMatch');
        if (!linesVisibleRanges) {
            return;
        }
        for (let j = 0, lenJ = linesVisibleRanges.length; j < lenJ; j++) {
            const lineVisibleRanges = linesVisibleRanges[j];
            if (lineVisibleRanges.outsideRenderedLine) {
                continue;
            }
            const lineIndex = lineVisibleRanges.lineNumber - visibleStartLineNumber;
            if (showIfCollapsed && lineVisibleRanges.ranges.length === 1) {
                const singleVisibleRange = lineVisibleRanges.ranges[0];
                if (singleVisibleRange.width < this._typicalHalfwidthCharacterWidth) {
                    // collapsed/very small range case => make the decoration visible by expanding its width
                    // expand its size on both sides (both to the left and to the right, keeping it centered)
                    const center = Math.round(singleVisibleRange.left + singleVisibleRange.width / 2);
                    const left = Math.max(0, Math.round(center - this._typicalHalfwidthCharacterWidth / 2));
                    lineVisibleRanges.ranges[0] = new HorizontalRange(left, this._typicalHalfwidthCharacterWidth);
                }
            }
            for (let k = 0, lenK = lineVisibleRanges.ranges.length; k < lenK; k++) {
                const expandToLeft = shouldFillLineOnLineBreak && lineVisibleRanges.continuesOnNextLine && lenK === 1;
                const visibleRange = lineVisibleRanges.ranges[k];
                const decorationOutput = ('<div class="cdr '
                    + className
                    + '" style="left:'
                    + String(visibleRange.left)
                    + 'px;width:'
                    + (expandToLeft ?
                        '100%;' :
                        (String(visibleRange.width) + 'px;'))
                    + '"></div>');
                output[lineIndex] += decorationOutput;
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2RlY29yYXRpb25zL2RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFLdEQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGtCQUFrQjtJQU16RCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1FBQ3BELElBQUksQ0FBQywrQkFBK0IsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQyw4QkFBOEIsQ0FBQztRQUN6RyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUUxQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FBMkM7UUFDakYsTUFBTSxP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