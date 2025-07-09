/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './marginDecorations.css';
import { DecorationToRender, DedupOverlay } from '../glyphMargin/glyphMargin.js';
export class MarginViewLineDecorationsOverlay extends DedupOverlay {
    constructor(context) {
        super();
        this._context = context;
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
            const marginClassName = d.options.marginClassName;
            const zIndex = d.options.zIndex;
            if (marginClassName) {
                r[rLen++] = new DecorationToRender(d.range.startLineNumber, d.range.endLineNumber, marginClassName, null, zIndex);
            }
        }
        return r;
    }
    prepareRender(ctx) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const toRender = this._render(visibleStartLineNumber, visibleEndLineNumber, this._getDecorations(ctx));
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            const decorations = toRender[lineIndex].getDecorations();
            let lineOutput = '';
            for (const decoration of decorations) {
                lineOutput += '<div class="cmdr ' + decoration.className + '" style=""></div>';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyZ2luRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL21hcmdpbkRlY29yYXRpb25zL21hcmdpbkRlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBS2pGLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxZQUFZO0lBSWpFLFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsMkJBQTJCO0lBRVgsc0JBQXNCLENBQUMsQ0FBMkM7UUFDakYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ2Usb0JBQW9CLENBQUMsQ0FBeUM7UUFDN0UsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ2UsU0FBUyxDQUFDLENBQThCO1FBQ3ZELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDZSxjQUFjLENB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