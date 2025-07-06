/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './lineNumbers.css';
import * as platform from '../../../../base/common/platform.js';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { editorDimmedLineNumber, editorLineNumbers } from '../../../common/core/editorColorRegistry.js';
/**
 * Renders line numbers to the left of the main view lines content.
 */
export class LineNumbersOverlay extends DynamicViewOverlay {
    static { this.CLASS_NAME = 'line-numbers'; }
    constructor(context) {
        super();
        this._context = context;
        this._readConfig();
        this._lastCursorModelPosition = new Position(1, 1);
        this._renderResult = null;
        this._activeLineNumber = 1;
        this._context.addEventHandler(this);
    }
    _readConfig() {
        const options = this._context.configuration.options;
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const lineNumbers = options.get(69 /* EditorOption.lineNumbers */);
        this._renderLineNumbers = lineNumbers.renderType;
        this._renderCustomLineNumbers = lineNumbers.renderFn;
        this._renderFinalNewline = options.get(100 /* EditorOption.renderFinalNewline */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineNumbersLeft = layoutInfo.lineNumbersLeft;
        this._lineNumbersWidth = layoutInfo.lineNumbersWidth;
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        this._readConfig();
        return true;
    }
    onCursorStateChanged(e) {
        const primaryViewPosition = e.selections[0].getPosition();
        this._lastCursorModelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(primaryViewPosition);
        let shouldRender = false;
        if (this._activeLineNumber !== primaryViewPosition.lineNumber) {
            this._activeLineNumber = primaryViewPosition.lineNumber;
            shouldRender = true;
        }
        if (this._renderLineNumbers === 2 /* RenderLineNumbersType.Relative */ || this._renderLineNumbers === 3 /* RenderLineNumbersType.Interval */) {
            shouldRender = true;
        }
        return shouldRender;
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
    onDecorationsChanged(e) {
        return e.affectsLineNumber;
    }
    // --- end event handlers
    _getLineRenderLineNumber(viewLineNumber) {
        const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(viewLineNumber, 1));
        if (modelPosition.column !== 1) {
            return '';
        }
        const modelLineNumber = modelPosition.lineNumber;
        if (this._renderCustomLineNumbers) {
            return this._renderCustomLineNumbers(modelLineNumber);
        }
        if (this._renderLineNumbers === 2 /* RenderLineNumbersType.Relative */) {
            const diff = Math.abs(this._lastCursorModelPosition.lineNumber - modelLineNumber);
            if (diff === 0) {
                return '<span class="relative-current-line-number">' + modelLineNumber + '</span>';
            }
            return String(diff);
        }
        if (this._renderLineNumbers === 3 /* RenderLineNumbersType.Interval */) {
            if (this._lastCursorModelPosition.lineNumber === modelLineNumber) {
                return String(modelLineNumber);
            }
            if (modelLineNumber % 10 === 0) {
                return String(modelLineNumber);
            }
            const finalLineNumber = this._context.viewModel.getLineCount();
            if (modelLineNumber === finalLineNumber) {
                return String(modelLineNumber);
            }
            return '';
        }
        return String(modelLineNumber);
    }
    prepareRender(ctx) {
        if (this._renderLineNumbers === 0 /* RenderLineNumbersType.Off */) {
            this._renderResult = null;
            return;
        }
        const lineHeightClassName = (platform.isLinux ? (this._lineHeight % 2 === 0 ? ' lh-even' : ' lh-odd') : '');
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const lineNoDecorations = this._context.viewModel.getDecorationsInViewport(ctx.visibleRange).filter(d => !!d.options.lineNumberClassName);
        lineNoDecorations.sort((a, b) => Range.compareRangesUsingEnds(a.range, b.range));
        let decorationStartIndex = 0;
        const lineCount = this._context.viewModel.getLineCount();
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            let renderLineNumber = this._getLineRenderLineNumber(lineNumber);
            let extraClassNames = '';
            // skip decorations whose end positions we've already passed
            while (decorationStartIndex < lineNoDecorations.length && lineNoDecorations[decorationStartIndex].range.endLineNumber < lineNumber) {
                decorationStartIndex++;
            }
            for (let i = decorationStartIndex; i < lineNoDecorations.length; i++) {
                const { range, options } = lineNoDecorations[i];
                if (range.startLineNumber <= lineNumber) {
                    extraClassNames += ' ' + options.lineNumberClassName;
                }
            }
            if (!renderLineNumber && !extraClassNames) {
                output[lineIndex] = '';
                continue;
            }
            if (lineNumber === lineCount && this._context.viewModel.getLineLength(lineNumber) === 0) {
                // this is the last line
                if (this._renderFinalNewline === 'off') {
                    renderLineNumber = '';
                }
                if (this._renderFinalNewline === 'dimmed') {
                    extraClassNames += ' dimmed-line-number';
                }
            }
            if (lineNumber === this._activeLineNumber) {
                extraClassNames += ' active-line-number';
            }
            output[lineIndex] = (`<div class="${LineNumbersOverlay.CLASS_NAME}${lineHeightClassName}${extraClassNames}" style="left:${this._lineNumbersLeft}px;width:${this._lineNumbersWidth}px;">${renderLineNumber}</div>`);
        }
        this._renderResult = output;
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
    const editorLineNumbersColor = theme.getColor(editorLineNumbers);
    const editorDimmedLineNumberColor = theme.getColor(editorDimmedLineNumber);
    if (editorDimmedLineNumberColor) {
        collector.addRule(`.monaco-editor .line-numbers.dimmed-line-number { color: ${editorDimmedLineNumberColor}; }`);
    }
    else if (editorLineNumbersColor) {
        collector.addRule(`.monaco-editor .line-numbers.dimmed-line-number { color: ${editorLineNumbersColor.transparent(0.4)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZU51bWJlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbGluZU51bWJlcnMvbGluZU51bWJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQztBQUMzQixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFJdEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFeEc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsa0JBQWtCO2FBRWxDLGVBQVUsR0FBRyxjQUFjLENBQUM7SUFjbkQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBRXhCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUVuQixJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVP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