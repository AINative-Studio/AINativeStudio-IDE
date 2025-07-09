/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderMarkdownAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { marked } from '../../../../../base/common/marked/marked.js';
import { FoldingRegions } from '../../../../../editor/contrib/folding/browser/foldingRanges.js';
import { sanitizeRanges } from '../../../../../editor/contrib/folding/browser/syntaxRangeProvider.js';
import { CellKind } from '../../common/notebookCommon.js';
import { cellRangesToIndexes } from '../../common/notebookRange.js';
const foldingRangeLimit = {
    limit: 5000,
    update: () => { }
};
export class FoldingModel {
    get regions() {
        return this._regions;
    }
    constructor() {
        this._viewModel = null;
        this._viewModelStore = new DisposableStore();
        this._onDidFoldingRegionChanges = new Emitter();
        this.onDidFoldingRegionChanged = this._onDidFoldingRegionChanges.event;
        this._foldingRangeDecorationIds = [];
        this._regions = new FoldingRegions(new Uint32Array(0), new Uint32Array(0));
    }
    dispose() {
        this._onDidFoldingRegionChanges.dispose();
        this._viewModelStore.dispose();
    }
    detachViewModel() {
        this._viewModelStore.clear();
        this._viewModel = null;
    }
    attachViewModel(model) {
        this._viewModel = model;
        this._viewModelStore.add(this._viewModel.onDidChangeViewCells(() => {
            this.recompute();
        }));
        this._viewModelStore.add(this._viewModel.onDidChangeSelection(() => {
            if (!this._viewModel) {
                return;
            }
            const indexes = cellRangesToIndexes(this._viewModel.getSelections());
            let changed = false;
            indexes.forEach(index => {
                let regionIndex = this.regions.findRange(index + 1);
                while (regionIndex !== -1) {
                    if (this._regions.isCollapsed(regionIndex) && index > this._regions.getStartLineNumber(regionIndex) - 1) {
                        this._regions.setCollapsed(regionIndex, false);
                        changed = true;
                    }
                    regionIndex = this._regions.getParentIndex(regionIndex);
                }
            });
            if (changed) {
                this._onDidFoldingRegionChanges.fire();
            }
        }));
        this.recompute();
    }
    getRegionAtLine(lineNumber) {
        if (this._regions) {
            const index = this._regions.findRange(lineNumber);
            if (index >= 0) {
                return this._regions.toRegion(index);
            }
        }
        return null;
    }
    getRegionsInside(region, filter) {
        const result = [];
        const index = region ? region.regionIndex + 1 : 0;
        const endLineNumber = region ? region.endLineNumber : Number.MAX_VALUE;
        if (filter && filter.length === 2) {
            const levelStack = [];
            for (let i = index, len = this._regions.length; i < len; i++) {
                const current = this._regions.toRegion(i);
                if (this._regions.getStartLineNumber(i) < endLineNumber) {
                    while (levelStack.length > 0 && !current.containedBy(levelStack[levelStack.length - 1])) {
                        levelStack.pop();
                    }
                    levelStack.push(current);
                    if (filter(current, levelStack.length)) {
                        result.push(current);
                    }
                }
                else {
                    break;
                }
            }
        }
        else {
            for (let i = index, len = this._regions.length; i < len; i++) {
                const current = this._regions.toRegion(i);
                if (this._regions.getStartLineNumber(i) < endLineNumber) {
                    if (!filter || filter(current)) {
                        result.push(current);
                    }
                }
                else {
                    break;
                }
            }
        }
        return result;
    }
    getAllRegionsAtLine(lineNumber, filter) {
        const result = [];
        if (this._regions) {
            let index = this._regions.findRange(lineNumber);
            let level = 1;
            while (index >= 0) {
                const current = this._regions.toRegion(index);
                if (!filter || filter(current, level)) {
                    result.push(current);
                }
                level++;
                index = current.parentIndex;
            }
        }
        return result;
    }
    setCollapsed(index, newState) {
        this._regions.setCollapsed(index, newState);
    }
    recompute() {
        if (!this._viewModel) {
            return;
        }
        const viewModel = this._viewModel;
        const cells = viewModel.viewCells;
        const stack = [];
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.cellKind !== CellKind.Markup || cell.language !== 'markdown') {
                continue;
            }
            const minDepth = Math.min(7, ...Array.from(getMarkdownHeadersInCell(cell.getText()), header => header.depth));
            if (minDepth < 7) {
                // header 1 to 6
                stack.push({ index: i, level: minDepth, endIndex: 0 });
            }
        }
        // calculate folding ranges
        const rawFoldingRanges = stack.map((entry, startIndex) => {
            let end = undefined;
            for (let i = startIndex + 1; i < stack.length; ++i) {
                if (stack[i].level <= entry.level) {
                    end = stack[i].index - 1;
                    break;
                }
            }
            const endIndex = end !== undefined ? end : cells.length - 1;
            // one based
            return {
                start: entry.index + 1,
                end: endIndex + 1,
                rank: 1
            };
        }).filter(range => range.start !== range.end);
        const newRegions = sanitizeRanges(rawFoldingRanges, foldingRangeLimit);
        // restore collased state
        let i = 0;
        const nextCollapsed = () => {
            while (i < this._regions.length) {
                const isCollapsed = this._regions.isCollapsed(i);
                i++;
                if (isCollapsed) {
                    return i - 1;
                }
            }
            return -1;
        };
        let k = 0;
        let collapsedIndex = nextCollapsed();
        while (collapsedIndex !== -1 && k < newRegions.length) {
            // get the latest range
            const decRange = viewModel.getTrackedRange(this._foldingRangeDecorationIds[collapsedIndex]);
            if (decRange) {
                const collasedStartIndex = decRange.start;
                while (k < newRegions.length) {
                    const startIndex = newRegions.getStartLineNumber(k) - 1;
                    if (collasedStartIndex >= startIndex) {
                        newRegions.setCollapsed(k, collasedStartIndex === startIndex);
                        k++;
                    }
                    else {
                        break;
                    }
                }
            }
            collapsedIndex = nextCollapsed();
        }
        while (k < newRegions.length) {
            newRegions.setCollapsed(k, false);
            k++;
        }
        const cellRanges = [];
        for (let i = 0; i < newRegions.length; i++) {
            const region = newRegions.toRegion(i);
            cellRanges.push({ start: region.startLineNumber - 1, end: region.endLineNumber - 1 });
        }
        // remove old tracked ranges and add new ones
        // TODO@rebornix, implement delta
        this._foldingRangeDecorationIds.forEach(id => viewModel.setTrackedRange(id, null, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */));
        this._foldingRangeDecorationIds = cellRanges.map(region => viewModel.setTrackedRange(null, region, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */)).filter(str => str !== null);
        this._regions = newRegions;
        this._onDidFoldingRegionChanges.fire();
    }
    getMemento() {
        const collapsedRanges = [];
        let i = 0;
        while (i < this._regions.length) {
            const isCollapsed = this._regions.isCollapsed(i);
            if (isCollapsed) {
                const region = this._regions.toRegion(i);
                collapsedRanges.push({ start: region.startLineNumber - 1, end: region.endLineNumber - 1 });
            }
            i++;
        }
        return collapsedRanges;
    }
    applyMemento(state) {
        if (!this._viewModel) {
            return false;
        }
        let i = 0;
        let k = 0;
        while (k < state.length && i < this._regions.length) {
            // get the latest range
            const decRange = this._viewModel.getTrackedRange(this._foldingRangeDecorationIds[i]);
            if (decRange) {
                const collasedStartIndex = state[k].start;
                while (i < this._regions.length) {
                    const startIndex = this._regions.getStartLineNumber(i) - 1;
                    if (collasedStartIndex >= startIndex) {
                        this._regions.setCollapsed(i, collasedStartIndex === startIndex);
                        i++;
                    }
                    else {
                        break;
                    }
                }
            }
            k++;
        }
        while (i < this._regions.length) {
            this._regions.setCollapsed(i, false);
            i++;
        }
        return true;
    }
}
export function updateFoldingStateAtIndex(foldingModel, index, collapsed) {
    const range = foldingModel.regions.findRange(index + 1);
    foldingModel.setCollapsed(range, collapsed);
}
export function* getMarkdownHeadersInCell(cellContent) {
    for (const token of marked.lexer(cellContent, { gfm: true })) {
        if (token.type === 'heading') {
            yield {
                depth: token.depth,
                text: renderMarkdownAsPlaintext({ value: token.raw }).trim()
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2ZvbGRpbmdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUdyRSxPQUFPLEVBQWlCLGNBQWMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQy9HLE9BQU8sRUFBcUIsY0FBYyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFFekgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBYyxNQUFNLCtCQUErQixDQUFDO0FBS2hGLE1BQU0saUJBQWlCLEdBQXlCO0lBQy9DLEtBQUssRUFBRSxJQUFJO0lBQ1gsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Q0FDakIsQ0FBQztBQUVGLE1BQU0sT0FBTyxZQUFZO0lBSXhCLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBT0Q7UUFaUSxlQUFVLEdBQThCLElBQUksQ0FBQztRQUNwQyxvQkFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFNeEMsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUN6RCw4QkFBeUIsR0FBZ0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtB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