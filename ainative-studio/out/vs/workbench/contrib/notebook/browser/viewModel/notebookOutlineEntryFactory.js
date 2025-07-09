/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { renderMarkdownAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize } from '../../../../../nls.js';
import { getMarkdownHeadersInCell } from './foldingModel.js';
import { OutlineEntry } from './OutlineEntry.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
export var NotebookOutlineConstants;
(function (NotebookOutlineConstants) {
    NotebookOutlineConstants[NotebookOutlineConstants["NonHeaderOutlineLevel"] = 7] = "NonHeaderOutlineLevel";
})(NotebookOutlineConstants || (NotebookOutlineConstants = {}));
function getMarkdownHeadersInCellFallbackToHtmlTags(fullContent) {
    const headers = Array.from(getMarkdownHeadersInCell(fullContent));
    if (headers.length) {
        return headers;
    }
    // no markdown syntax headers, try to find html tags
    const match = fullContent.match(/<h([1-6]).*>(.*)<\/h\1>/i);
    if (match) {
        const level = parseInt(match[1]);
        const text = match[2].trim();
        headers.push({ depth: level, text });
    }
    return headers;
}
export const INotebookOutlineEntryFactory = createDecorator('INotebookOutlineEntryFactory');
let NotebookOutlineEntryFactory = class NotebookOutlineEntryFactory {
    constructor(executionStateService, outlineModelService, textModelService) {
        this.executionStateService = executionStateService;
        this.outlineModelService = outlineModelService;
        this.textModelService = textModelService;
        this.cellOutlineEntryCache = {};
        this.cachedMarkdownOutlineEntries = new WeakMap();
    }
    getOutlineEntries(cell, index) {
        const entries = [];
        const isMarkdown = cell.cellKind === CellKind.Markup;
        // cap the amount of characters that we look at and use the following logic
        // - for MD prefer headings (each header is an entry)
        // - otherwise use the first none-empty line of the cell (MD or code)
        let content = getCellFirstNonEmptyLine(cell);
        let hasHeader = false;
        if (isMarkdown) {
            const fullContent = cell.getText().substring(0, 10000);
            const cache = this.cachedMarkdownOutlineEntries.get(cell);
            const headers = cache?.alternativeId === cell.getAlternativeId() ? cache.headers : Array.from(getMarkdownHeadersInCellFallbackToHtmlTags(fullContent));
            this.cachedMarkdownOutlineEntries.set(cell, { alternativeId: cell.getAlternativeId(), headers });
            for (const { depth, text } of headers) {
                hasHeader = true;
                entries.push(new OutlineEntry(index++, depth, cell, text, false, false));
            }
            if (!hasHeader) {
                content = renderMarkdownAsPlaintext({ value: content });
            }
        }
        if (!hasHeader) {
            const exeState = !isMarkdown && this.executionStateService.getCellExecution(cell.uri);
            let preview = content.trim();
            if (!isMarkdown) {
                const cached = this.cellOutlineEntryCache[cell.id];
                // Gathering symbols from the model is an async operation, but this provider is syncronous.
                // So symbols need to be precached before this function is called to get the full list.
                if (cached) {
                    // push code cell entry that is a parent of cached symbols, always necessary. filtering for quickpick done in that provider.
                    entries.push(new OutlineEntry(index++, 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */, cell, preview, !!exeState, exeState ? exeState.isPaused : false));
                    cached.forEach((entry) => {
                        entries.push(new OutlineEntry(index++, entry.level, cell, entry.name, false, false, entry.range, entry.kind));
                    });
                }
            }
            if (entries.length === 0) { // if there are no cached entries, use the first line of the cell as a code cell
                if (preview.length === 0) {
                    // empty or just whitespace
                    preview = localize('empty', "empty cell");
                }
                entries.push(new OutlineEntry(index++, 7 /* NotebookOutlineConstants.NonHeaderOutlineLevel */, cell, preview, !!exeState, exeState ? exeState.isPaused : false));
            }
        }
        return entries;
    }
    async cacheSymbols(cell, cancelToken) {
        if (cell.cellKind === CellKind.Markup) {
            return;
        }
        const ref = await this.textModelService.createModelReference(cell.uri);
        try {
            const textModel = ref.object.textEditorModel;
            const outlineModel = await this.outlineModelService.getOrCreate(textModel, cancelToken);
            const entries = createOutlineEntries(outlineModel.getTopLevelSymbols(), 8);
            this.cellOutlineEntryCache[cell.id] = entries;
        }
        finally {
            ref.dispose();
        }
    }
};
NotebookOutlineEntryFactory = __decorate([
    __param(0, INotebookExecutionStateService),
    __param(1, IOutlineModelService),
    __param(2, ITextModelService)
], NotebookOutlineEntryFactory);
export { NotebookOutlineEntryFactory };
function createOutlineEntries(symbols, level) {
    const entries = [];
    symbols.forEach(symbol => {
        entries.push({ name: symbol.name, range: symbol.range, level, kind: symbol.kind });
        if (symbol.children) {
            entries.push(...createOutlineEntries(symbol.children, level + 1));
        }
    });
    return entries;
}
function getCellFirstNonEmptyLine(cell) {
    const textBuffer = cell.textBuffer;
    for (let i = 0; i < textBuffer.getLineCount(); i++) {
        const firstNonWhitespace = textBuffer.getLineFirstNonWhitespaceColumn(i + 1);
        const lineLength = textBuffer.getLineLength(i + 1);
        if (firstNonWhitespace < lineLength) {
            return textBuffer.getLineContent(i + 1);
        }
    }
    return cell.getText().substring(0, 100);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRW50cnlGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL25vdGVib29rT3V0bGluZUVudHJ5RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUU1RixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sdUVBQXVFLENBQUM7QUFDbEksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTdGLE1BQU0sQ0FBTixJQUFrQix3QkFFakI7QUFGRCxXQUFrQix3QkFBd0I7SUFDekMseUdBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQUZpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBRXpDO0FBU0QsU0FBUywwQ0FBMEMsQ0FBQyxXQUFtQjtJQUN0RSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDbEUsSUFBSSxPQUFPLENBQUMs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