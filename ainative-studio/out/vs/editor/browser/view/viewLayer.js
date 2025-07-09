/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../base/browser/fastDomNode.js';
import { createTrustedTypesPolicy } from '../../../base/browser/trustedTypes.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { StringBuilder } from '../../common/core/stringBuilder.js';
export class RenderedLinesCollection {
    constructor(_lineFactory) {
        this._lineFactory = _lineFactory;
        this._set(1, []);
    }
    flush() {
        this._set(1, []);
    }
    _set(rendLineNumberStart, lines) {
        this._lines = lines;
        this._rendLineNumberStart = rendLineNumberStart;
    }
    _get() {
        return {
            rendLineNumberStart: this._rendLineNumberStart,
            lines: this._lines
        };
    }
    /**
     * @returns Inclusive line number that is inside this collection
     */
    getStartLineNumber() {
        return this._rendLineNumberStart;
    }
    /**
     * @returns Inclusive line number that is inside this collection
     */
    getEndLineNumber() {
        return this._rendLineNumberStart + this._lines.length - 1;
    }
    getCount() {
        return this._lines.length;
    }
    getLine(lineNumber) {
        const lineIndex = lineNumber - this._rendLineNumberStart;
        if (lineIndex < 0 || lineIndex >= this._lines.length) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
        return this._lines[lineIndex];
    }
    /**
     * @returns Lines that were removed from this collection
     */
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        if (this.getCount() === 0) {
            // no lines
            return null;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        if (deleteToLineNumber < startLineNumber) {
            // deleting above the viewport
            const deleteCnt = deleteToLineNumber - deleteFromLineNumber + 1;
            this._rendLineNumberStart -= deleteCnt;
            return null;
        }
        if (deleteFromLineNumber > endLineNumber) {
            // deleted below the viewport
            return null;
        }
        // Record what needs to be deleted
        let deleteStartIndex = 0;
        let deleteCount = 0;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - this._rendLineNumberStart;
            if (deleteFromLineNumber <= lineNumber && lineNumber <= deleteToLineNumber) {
                // this is a line to be deleted
                if (deleteCount === 0) {
                    // this is the first line to be deleted
                    deleteStartIndex = lineIndex;
                    deleteCount = 1;
                }
                else {
                    deleteCount++;
                }
            }
        }
        // Adjust this._rendLineNumberStart for lines deleted above
        if (deleteFromLineNumber < startLineNumber) {
            // Something was deleted above
            let deleteAboveCount = 0;
            if (deleteToLineNumber < startLineNumber) {
                // the entire deleted lines are above
                deleteAboveCount = deleteToLineNumber - deleteFromLineNumber + 1;
            }
            else {
                deleteAboveCount = startLineNumber - deleteFromLineNumber;
            }
            this._rendLineNumberStart -= deleteAboveCount;
        }
        const deleted = this._lines.splice(deleteStartIndex, deleteCount);
        return deleted;
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        const changeToLineNumber = changeFromLineNumber + changeCount - 1;
        if (this.getCount() === 0) {
            // no lines
            return false;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        let someoneNotified = false;
        for (let changedLineNumber = changeFromLineNumber; changedLineNumber <= changeToLineNumber; changedLineNumber++) {
            if (changedLineNumber >= startLineNumber && changedLineNumber <= endLineNumber) {
                // Notify the line
                this._lines[changedLineNumber - this._rendLineNumberStart].onContentChanged();
                someoneNotified = true;
            }
        }
        return someoneNotified;
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        if (this.getCount() === 0) {
            // no lines
            return null;
        }
        const insertCnt = insertToLineNumber - insertFromLineNumber + 1;
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        if (insertFromLineNumber <= startLineNumber) {
            // inserting above the viewport
            this._rendLineNumberStart += insertCnt;
            return null;
        }
        if (insertFromLineNumber > endLineNumber) {
            // inserting below the viewport
            return null;
        }
        if (insertCnt + insertFromLineNumber > endLineNumber) {
            // insert inside the viewport in such a way that all remaining lines are pushed outside
            const deleted = this._lines.splice(insertFromLineNumber - this._rendLineNumberStart, endLineNumber - insertFromLineNumber + 1);
            return deleted;
        }
        // insert inside the viewport, push out some lines, but not all remaining lines
        const newLines = [];
        for (let i = 0; i < insertCnt; i++) {
            newLines[i] = this._lineFactory.createLine();
        }
        const insertIndex = insertFromLineNumber - this._rendLineNumberStart;
        const beforeLines = this._lines.slice(0, insertIndex);
        const afterLines = this._lines.slice(insertIndex, this._lines.length - insertCnt);
        const deletedLines = this._lines.slice(this._lines.length - insertCnt, this._lines.length);
        this._lines = beforeLines.concat(newLines).concat(afterLines);
        return deletedLines;
    }
    onTokensChanged(ranges) {
        if (this.getCount() === 0) {
            // no lines
            return false;
        }
        const startLineNumber = this.getStartLineNumber();
        const endLineNumber = this.getEndLineNumber();
        let notifiedSomeone = false;
        for (let i = 0, len = ranges.length; i < len; i++) {
            const rng = ranges[i];
            if (rng.toLineNumber < startLineNumber || rng.fromLineNumber > endLineNumber) {
                // range outside viewport
                continue;
            }
            const from = Math.max(startLineNumber, rng.fromLineNumber);
            const to = Math.min(endLineNumber, rng.toLineNumber);
            for (let lineNumber = from; lineNumber <= to; lineNumber++) {
                const lineIndex = lineNumber - this._rendLineNumberStart;
                this._lines[lineIndex].onTokensChanged();
                notifiedSomeone = true;
            }
        }
        return notifiedSomeone;
    }
}
export class VisibleLinesCollection {
    constructor(_lineFactory) {
        this._lineFactory = _lineFactory;
        this.domNode = this._createDomNode();
        this._linesCollection = new RenderedLinesCollection(this._lineFactory);
    }
    _createDomNode() {
        const domNode = createFastDomNode(document.createElement('div'));
        domNode.setClassName('view-layer');
        domNode.setPosition('absolute');
        domNode.domNode.setAttribute('role', 'presentation');
        domNode.domNode.setAttribute('aria-hidden', 'true');
        return domNode;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            return true;
        }
        return false;
    }
    onFlushed(e, flushDom) {
        // No need to clear the dom node because a full .innerHTML will occur in
        // ViewLayerRenderer._render, however the fallback mechanism in the
        // GPU renderer may cause this to be necessary as the .innerHTML call
        // may not happen depending on the new state, leaving stale DOM nodes
        // around.
        if (flushDom) {
            const start = this._linesCollection.getStartLineNumber();
            const end = this._linesCollection.getEndLineNumber();
            for (let i = start; i <= end; i++) {
                this._linesCollection.getLine(i).getDomNode()?.remove();
            }
        }
        this._linesCollection.flush();
        return true;
    }
    onLinesChanged(e) {
        return this._linesCollection.onLinesChanged(e.fromLineNumber, e.count);
    }
    onLinesDeleted(e) {
        const deleted = this._linesCollection.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
        if (deleted) {
            // Remove from DOM
            for (let i = 0, len = deleted.length; i < len; i++) {
                const lineDomNode = deleted[i].getDomNode();
                lineDomNode?.remove();
            }
        }
        return true;
    }
    onLinesInserted(e) {
        const deleted = this._linesCollection.onLinesInserted(e.fromLineNumber, e.toLineNumber);
        if (deleted) {
            // Remove from DOM
            for (let i = 0, len = deleted.length; i < len; i++) {
                const lineDomNode = deleted[i].getDomNode();
                lineDomNode?.remove();
            }
        }
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onTokensChanged(e) {
        return this._linesCollection.onTokensChanged(e.ranges);
    }
    onZonesChanged(e) {
        return true;
    }
    // ---- end view event handlers
    getStartLineNumber() {
        return this._linesCollection.getStartLineNumber();
    }
    getEndLineNumber() {
        return this._linesCollection.getEndLineNumber();
    }
    getVisibleLine(lineNumber) {
        return this._linesCollection.getLine(lineNumber);
    }
    renderLines(viewportData) {
        const inp = this._linesCollection._get();
        const renderer = new ViewLayerRenderer(this.domNode.domNode, this._lineFactory, viewportData);
        const ctx = {
            rendLineNumberStart: inp.rendLineNumberStart,
            lines: inp.lines,
            linesLength: inp.lines.length
        };
        // Decide if this render will do a single update (single large .innerHTML) or many updates (inserting/removing dom nodes)
        const resCtx = renderer.render(ctx, viewportData.startLineNumber, viewportData.endLineNumber, viewportData.relativeVerticalOffset);
        this._linesCollection._set(resCtx.rendLineNumberStart, resCtx.lines);
    }
}
class ViewLayerRenderer {
    static { this._ttPolicy = createTrustedTypesPolicy('editorViewLayer', { createHTML: value => value }); }
    constructor(_domNode, _lineFactory, _viewportData) {
        this._domNode = _domNode;
        this._lineFactory = _lineFactory;
        this._viewportData = _viewportData;
    }
    render(inContext, startLineNumber, stopLineNumber, deltaTop) {
        const ctx = {
            rendLineNumberStart: inContext.rendLineNumberStart,
            lines: inContext.lines.slice(0),
            linesLength: inContext.linesLength
        };
        if ((ctx.rendLineNumberStart + ctx.linesLength - 1 < startLineNumber) || (stopLineNumber < ctx.rendLineNumberStart)) {
            // There is no overlap whatsoever
            ctx.rendLineNumberStart = startLineNumber;
            ctx.linesLength = stopLineNumber - startLineNumber + 1;
            ctx.lines = [];
            for (let x = startLineNumber; x <= stopLineNumber; x++) {
                ctx.lines[x - startLineNumber] = this._lineFactory.createLine();
            }
            this._finishRendering(ctx, true, deltaTop);
            return ctx;
        }
        // Update lines which will remain untouched
        this._renderUntouchedLines(ctx, Math.max(startLineNumber - ctx.rendLineNumberStart, 0), Math.min(stopLineNumber - ctx.rendLineNumberStart, ctx.linesLength - 1), deltaTop, startLineNumber);
        if (ctx.rendLineNumberStart > startLineNumber) {
            // Insert lines before
            const fromLineNumber = startLineNumber;
            const toLineNumber = Math.min(stopLineNumber, ctx.rendLineNumberStart - 1);
            if (fromLineNumber <= toLineNumber) {
                this._insertLinesBefore(ctx, fromLineNumber, toLineNumber, deltaTop, startLineNumber);
                ctx.linesLength += toLineNumber - fromLineNumber + 1;
            }
        }
        else if (ctx.rendLineNumberStart < startLineNumber) {
            // Remove lines before
            const removeCnt = Math.min(ctx.linesLength, startLineNumber - ctx.rendLineNumberStart);
            if (removeCnt > 0) {
                this._removeLinesBefore(ctx, removeCnt);
                ctx.linesLength -= removeCnt;
            }
        }
        ctx.rendLineNumberStart = startLineNumber;
        if (ctx.rendLineNumberStart + ctx.linesLength - 1 < stopLineNumber) {
            // Insert lines after
            const fromLineNumber = ctx.rendLineNumberStart + ctx.linesLength;
            const toLineNumber = stopLineNumber;
            if (fromLineNumber <= toLineNumber) {
                this._insertLinesAfter(ctx, fromLineNumber, toLineNumber, deltaTop, startLineNumber);
                ctx.linesLength += toLineNumber - fromLineNumber + 1;
            }
        }
        else if (ctx.rendLineNumberStart + ctx.linesLength - 1 > stopLineNumber) {
            // Remove lines after
            const fromLineNumber = Math.max(0, stopLineNumber - ctx.rendLineNumberStart + 1);
            const toLineNumber = ctx.linesLength - 1;
            const removeCnt = toLineNumber - fromLineNumber + 1;
            if (removeCnt > 0) {
                this._removeLinesAfter(ctx, removeCnt);
                ctx.linesLength -= removeCnt;
            }
        }
        this._finishRendering(ctx, false, deltaTop);
        return ctx;
    }
    _renderUntouchedLines(ctx, startIndex, endIndex, deltaTop, deltaLN) {
        const rendLineNumberStart = ctx.rendLineNumberStart;
        const lines = ctx.lines;
        for (let i = startIndex; i <= endIndex; i++) {
            const lineNumber = rendLineNumberStart + i;
            lines[i].layoutLine(lineNumber, deltaTop[lineNumber - deltaLN], this._viewportData.lineHeight);
        }
    }
    _insertLinesBefore(ctx, fromLineNumber, toLineNumber, deltaTop, deltaLN) {
        const newLines = [];
        let newLinesLen = 0;
        for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
            newLines[newLinesLen++] = this._lineFactory.createLine();
        }
        ctx.lines = newLines.concat(ctx.lines);
    }
    _removeLinesBefore(ctx, removeCount) {
        for (let i = 0; i < removeCount; i++) {
            const lineDomNode = ctx.lines[i].getDomNode();
            lineDomNode?.remove();
        }
        ctx.lines.splice(0, removeCount);
    }
    _insertLinesAfter(ctx, fromLineNumber, toLineNumber, deltaTop, deltaLN) {
        const newLines = [];
        let newLinesLen = 0;
        for (let lineNumber = fromLineNumber; lineNumber <= toLineNumber; lineNumber++) {
            newLines[newLinesLen++] = this._lineFactory.createLine();
        }
        ctx.lines = ctx.lines.concat(newLines);
    }
    _removeLinesAfter(ctx, removeCount) {
        const removeIndex = ctx.linesLength - removeCount;
        for (let i = 0; i < removeCount; i++) {
            const lineDomNode = ctx.lines[removeIndex + i].getDomNode();
            lineDomNode?.remove();
        }
        ctx.lines.splice(removeIndex, removeCount);
    }
    _finishRenderingNewLines(ctx, domNodeIsEmpty, newLinesHTML, wasNew) {
        if (ViewLayerRenderer._ttPolicy) {
            newLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(newLinesHTML);
        }
        const lastChild = this._domNode.lastChild;
        if (domNodeIsEmpty || !lastChild) {
            this._domNode.innerHTML = newLinesHTML; // explains the ugly casts -> https://github.com/microsoft/vscode/issues/106396#issuecomment-692625393;
        }
        else {
            lastChild.insertAdjacentHTML('afterend', newLinesHTML);
        }
        let currChild = this._domNode.lastChild;
        for (let i = ctx.linesLength - 1; i >= 0; i--) {
            const line = ctx.lines[i];
            if (wasNew[i]) {
                line.setDomNode(currChild);
                currChild = currChild.previousSibling;
            }
        }
    }
    _finishRenderingInvalidLines(ctx, invalidLinesHTML, wasInvalid) {
        const hugeDomNode = document.createElement('div');
        if (ViewLayerRenderer._ttPolicy) {
            invalidLinesHTML = ViewLayerRenderer._ttPolicy.createHTML(invalidLinesHTML);
        }
        hugeDomNode.innerHTML = invalidLinesHTML;
        for (let i = 0; i < ctx.linesLength; i++) {
            const line = ctx.lines[i];
            if (wasInvalid[i]) {
                const source = hugeDomNode.firstChild;
                const lineDomNode = line.getDomNode();
                lineDomNode.parentNode.replaceChild(source, lineDomNode);
                line.setDomNode(source);
            }
        }
    }
    static { this._sb = new StringBuilder(100000); }
    _finishRendering(ctx, domNodeIsEmpty, deltaTop) {
        const sb = ViewLayerRenderer._sb;
        const linesLength = ctx.linesLength;
        const lines = ctx.lines;
        const rendLineNumberStart = ctx.rendLineNumberStart;
        const wasNew = [];
        {
            sb.reset();
            let hadNewLine = false;
            for (let i = 0; i < linesLength; i++) {
                const line = lines[i];
                wasNew[i] = false;
                const lineDomNode = line.getDomNode();
                if (lineDomNode) {
                    // line is not new
                    continue;
                }
                const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this._viewportData.lineHeight, this._viewportData, sb);
                if (!renderResult) {
                    // line does not need rendering
                    continue;
                }
                wasNew[i] = true;
                hadNewLine = true;
            }
            if (hadNewLine) {
                this._finishRenderingNewLines(ctx, domNodeIsEmpty, sb.build(), wasNew);
            }
        }
        {
            sb.reset();
            let hadInvalidLine = false;
            const wasInvalid = [];
            for (let i = 0; i < linesLength; i++) {
                const line = lines[i];
                wasInvalid[i] = false;
                if (wasNew[i]) {
                    // line was new
                    continue;
                }
                const renderResult = line.renderLine(i + rendLineNumberStart, deltaTop[i], this._viewportData.lineHeight, this._viewportData, sb);
                if (!renderResult) {
                    // line does not need rendering
                    continue;
                }
                wasInvalid[i] = true;
                hadInvalidLine = true;
            }
            if (hadInvalidLine) {
                this._finishRenderingInvalidLines(ctx, sb.build(), wasInvalid);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheWVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcvdmlld0xheWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQWdDbkUsTUFBTSxPQUFPLHVCQUF1QjtJQUluQyxZQUNrQixZQUE2QjtRQUE3QixpQkFBWSxHQUFaLFlBQVksQ0FBaUI7UUFFOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxDQUFDLG1CQUEyQixFQUFFLEtBQVU7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDO0lBQ2pELENBQUM7SUFFRCxJQUFJO1FBQ0gsT0FBTztZQUNOLG1CQUFtQixFQUFFLElBQUksQ0FBQyxvQkFBb0I7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ2xCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxrQkFBa0I7UUFDeEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0JBQWdCO1FB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