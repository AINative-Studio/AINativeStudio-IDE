/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './linesDecorations.css';
import { DecorationToRender, DedupOverlay } from '../glyphMargin/glyphMargin.js';
export class LinesDecorationsOverlay extends DedupOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._decorationsLeft = layoutInfo.decorationsLeft;
        this._decorationsWidth = layoutInfo.decorationsWidth;
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
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._decorationsLeft = layoutInfo.decorationsLeft;
        this._decorationsWidth = layoutInfo.decorationsWidth;
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
    _getDecorations(ctx) {
        const decorations = ctx.getDecorationsInViewport();
        const r = [];
        let rLen = 0;
        for (let i = 0, len = decorations.length; i < len; i++) {
            const d = decorations[i];
            const linesDecorationsClassName = d.options.linesDecorationsClassName;
            const zIndex = d.options.zIndex;
            if (linesDecorationsClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.endLineNumber, linesDecorationsClassName, d.options.linesDecorationsTooltip ?? null, zIndex);
            }
            const firstLineDecorationClassName = d.options.firstLineDecorationClassName;
            if (firstLineDecorationClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.startLineNumber, firstLineDecorationClassName, d.options.linesDecorationsTooltip ?? null, zIndex);
            }
        }
        return r;
    }
    prepareRender(ctx) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const toRender = this._render(visibleStartLineNumber, visibleEndLineNumber, this._getDecorations(ctx));
        const left = this._decorationsLeft.toString();
        const width = this._decorationsWidth.toString();
        const common = '" style="left:' + left + 'px;width:' + width + 'px;"></div>';
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const decorations = toRender[lineIndex].getDecorations();
            let lineOutput = '';
            for (const decoration of decorations) {
                let addition = '<div class="cldr ' + decoration.className;
                if (decoration.tooltip !== null) {
                    addition += '" title="' + decoration.tooltip; // The tooltip is already escaped.
                }
                addition += common;
                lineOutput += addition;
            }
            output[lineIndex] = lineOutput;
        }
        this._renderResult = output;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        return this._renderResult[lineNumber - startLineNumber];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbGluZXNEZWNvcmF0aW9ucy9saW5lc0RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBT2pGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxZQUFZO0lBUXhELFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUM7UUFDeEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUM7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNyRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FB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