/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './currentLineHighlight.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorLineHighlight, editorLineHighlightBorder } from '../../../common/core/editorColorRegistry.js';
import * as arrays from '../../../../base/common/arrays.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { Selection } from '../../../common/core/selection.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { Position } from '../../../common/core/position.js';
export class AbstractLineHighlightOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._renderLineHighlight = options.get(101 /* EditorOption.renderLineHighlight */);
        this._renderLineHighlightOnlyWhenFocus = options.get(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */);
        this._wordWrap = layoutInfo.isViewportWrapping;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._selectionIsEmpty = true;
        this._focused = false;
        this._cursorLineNumbers = [1];
        this._selections = [new Selection(1, 1, 1, 1)];
        this._renderData = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        super.dispose();
    }
    _readFromSelections() {
        let hasChanged = false;
        const lineNumbers = new Set();
        for (const selection of this._selections) {
            lineNumbers.add(selection.positionLineNumber);
        }
        const cursorsLineNumbers = Array.from(lineNumbers);
        cursorsLineNumbers.sort((a, b) => a - b);
        if (!arrays.equals(this._cursorLineNumbers, cursorsLineNumbers)) {
            this._cursorLineNumbers = cursorsLineNumbers;
            hasChanged = true;
        }
        const selectionIsEmpty = this._selections.every(s => s.isEmpty());
        if (this._selectionIsEmpty !== selectionIsEmpty) {
            this._selectionIsEmpty = selectionIsEmpty;
            hasChanged = true;
        }
        return hasChanged;
    }
    // --- begin event handlers
    onThemeChanged(e) {
        return this._readFromSelections();
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._renderLineHighlight = options.get(101 /* EditorOption.renderLineHighlight */);
        this._renderLineHighlightOnlyWhenFocus = options.get(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */);
        this._wordWrap = layoutInfo.isViewportWrapping;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        return true;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        return this._readFromSelections();
    }
    onFlushed(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollWidthChanged || e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    onFocusChanged(e) {
        if (!this._renderLineHighlightOnlyWhenFocus) {
            return false;
        }
        this._focused = e.isFocused;
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (!this._shouldRenderThis()) {
            this._renderData = null;
            return;
        }
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        // initialize renderData
        const renderData = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            renderData[lineIndex] = '';
        }
        if (this._wordWrap) {
            // do a first pass to render wrapped lines
            const renderedLineWrapped = this._renderOne(ctx, false);
            for (const cursorLineNumber of this._cursorLineNumbers) {
                const coordinatesConverter = this._context.viewModel.coordinatesConverter;
                const modelLineNumber = coordinatesConverter.convertViewPositionToModelPosition(new Position(cursorLineNumber, 1)).lineNumber;
                const firstViewLineNumber = coordinatesConverter.convertModelPositionToViewPosition(new Position(modelLineNumber, 1)).lineNumber;
                const lastViewLineNumber = coordinatesConverter.convertModelPositionToViewPosition(new Position(modelLineNumber, this._context.viewModel.model.getLineMaxColumn(modelLineNumber))).lineNumber;
                const firstLine = Math.max(firstViewLineNumber, visibleStartLineNumber);
                const lastLine = Math.min(lastViewLineNumber, visibleEndLineNumber);
                for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber++) {
                    const lineIndex = lineNumber - visibleStartLineNumber;
                    renderData[lineIndex] = renderedLineWrapped;
                }
            }
        }
        // do a second pass to render exact lines
        const renderedLineExact = this._renderOne(ctx, true);
        for (const cursorLineNumber of this._cursorLineNumbers) {
            if (cursorLineNumber < visibleStartLineNumber || cursorLineNumber > visibleEndLineNumber) {
                continue;
            }
            const lineIndex = cursorLineNumber - visibleStartLineNumber;
            renderData[lineIndex] = renderedLineExact;
        }
        this._renderData = renderData;
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderData) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex >= this._renderData.length) {
            return '';
        }
        return this._renderData[lineIndex];
    }
    _shouldRenderInMargin() {
        return ((this._renderLineHighlight === 'gutter' || this._renderLineHighlight === 'all')
            && (!this._renderLineHighlightOnlyWhenFocus || this._focused));
    }
    _shouldRenderInContent() {
        return ((this._renderLineHighlight === 'line' || this._renderLineHighlight === 'all')
            && this._selectionIsEmpty
            && (!this._renderLineHighlightOnlyWhenFocus || this._focused));
    }
}
/**
 * Emphasizes the current line by drawing a border around it.
 */
export class CurrentLineHighlightOverlay extends AbstractLineHighlightOverlay {
    _renderOne(ctx, exact) {
        const className = 'current-line' + (this._shouldRenderInMargin() ? ' current-line-both' : '') + (exact ? ' current-line-exact' : '');
        return `<div class="${className}" style="width:${Math.max(ctx.scrollWidth, this._contentWidth)}px;"></div>`;
    }
    _shouldRenderThis() {
        return this._shouldRenderInContent();
    }
    _shouldRenderOther() {
        return this._shouldRenderInMargin();
    }
}
/**
 * Emphasizes the current line margin/gutter by drawing a border around it.
 */
export class CurrentLineMarginHighlightOverlay extends AbstractLineHighlightOverlay {
    _renderOne(ctx, exact) {
        const className = 'current-line' + (this._shouldRenderInMargin() ? ' current-line-margin' : '') + (this._shouldRenderOther() ? ' current-line-margin-both' : '') + (this._shouldRenderInMargin() && exact ? ' current-line-exact-margin' : '');
        return `<div class="${className}" style="width:${this._contentLeft}px"></div>`;
    }
    _shouldRenderThis() {
        return true;
    }
    _shouldRenderOther() {
        return this._shouldRenderInContent();
    }
}
registerThemingParticipant((theme, collector) => {
    const lineHighlight = theme.getColor(editorLineHighlight);
    if (lineHighlight) {
        collector.addRule(`.monaco-editor .view-overlays .current-line { background-color: ${lineHighlight}; }`);
        collector.addRule(`.monaco-editor .margin-view-overlays .current-line-margin { background-color: ${lineHighlight}; border: none; }`);
    }
    if (!lineHighlight || lineHighlight.isTransparent() || theme.defines(editorLineHighlightBorder)) {
        const lineHighlightBorder = theme.getColor(editorLineHighlightBorder);
        if (lineHighlightBorder) {
            collector.addRule(`.monaco-editor .view-overlays .current-line-exact { border: 2px solid ${lineHighlightBorder}; }`);
            collector.addRule(`.monaco-editor .margin-view-overlays .current-line-exact-margin { border: 2px solid ${lineHighlightBorder}; }`);
            if (isHighContrast(theme.type)) {
                collector.addRule(`.monaco-editor .view-overlays .current-line-exact { border-width: 1px; }`);
                collector.addRule(`.monaco-editor .margin-view-overlays .current-line-exact-margin { border-width: 1px; }`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VycmVudExpbmVIaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL2N1cnJlbnRMaW5lSGlnaGxpZ2h0L2N1cnJlbnRMaW5lSGlnaGxpZ2h0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFJN0csT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU1RCxNQUFNLE9BQWdCLDRCQUE2QixTQUFRLGtCQUFrQjtJQWdCNUUsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBRXhCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztRQUN4RCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsNENBQWtDLENBQUM7UUFDMUUsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLE9BQU8sQ0FBQyxH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