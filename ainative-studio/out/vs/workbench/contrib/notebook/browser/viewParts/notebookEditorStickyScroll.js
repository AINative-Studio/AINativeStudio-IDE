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
var NotebookStickyScroll_1;
import * as DOM from '../../../../../base/browser/dom.js';
import { EventType as TouchEventType } from '../../../../../base/browser/touch.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { CellKind } from '../../common/notebookCommon.js';
import { Delayer } from '../../../../../base/common/async.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { foldingCollapsedIcon, foldingExpandedIcon } from '../../../../../editor/contrib/folding/browser/foldingDecorations.js';
import { FoldingController } from '../controller/foldingController.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotebookCellOutlineDataSourceFactory } from '../viewModel/notebookOutlineDataSourceFactory.js';
export class NotebookStickyLine extends Disposable {
    constructor(element, foldingIcon, header, entry, notebookEditor) {
        super();
        this.element = element;
        this.foldingIcon = foldingIcon;
        this.header = header;
        this.entry = entry;
        this.notebookEditor = notebookEditor;
        // click the header to focus the cell
        this._register(DOM.addDisposableListener(this.header, DOM.EventType.CLICK || TouchEventType.Tap, () => {
            this.focusCell();
        }));
        // click the folding icon to fold the range covered by the header
        this._register(DOM.addDisposableListener(this.foldingIcon.domNode, DOM.EventType.CLICK || TouchEventType.Tap, () => {
            if (this.entry.cell.cellKind === CellKind.Markup) {
                const currentFoldingState = this.entry.cell.foldingState;
                this.toggleFoldRange(currentFoldingState);
            }
        }));
    }
    toggleFoldRange(currentState) {
        const foldingController = this.notebookEditor.getContribution(FoldingController.id);
        const index = this.entry.index;
        const headerLevel = this.entry.level;
        const newFoldingState = (currentState === 2 /* CellFoldingState.Collapsed */) ? 1 /* CellFoldingState.Expanded */ : 2 /* CellFoldingState.Collapsed */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
        this.focusCell();
    }
    focusCell() {
        this.notebookEditor.focusNotebookCell(this.entry.cell, 'container');
        const cellScrollTop = this.notebookEditor.getAbsoluteTopOfElement(this.entry.cell);
        const parentCount = NotebookStickyLine.getParentCount(this.entry);
        // 1.1 addresses visible cell padding, to make sure we don't focus md cell and also render its sticky line
        this.notebookEditor.setScrollTop(cellScrollTop - (parentCount + 1.1) * 22);
    }
    static getParentCount(entry) {
        let count = 0;
        while (entry.parent) {
            count++;
            entry = entry.parent;
        }
        return count;
    }
}
class StickyFoldingIcon {
    constructor(isCollapsed, dimension) {
        this.isCollapsed = isCollapsed;
        this.dimension = dimension;
        this.domNode = document.createElement('div');
        this.domNode.style.width = `${dimension}px`;
        this.domNode.style.height = `${dimension}px`;
        this.domNode.className = ThemeIcon.asClassName(isCollapsed ? foldingCollapsedIcon : foldingExpandedIcon);
    }
    setVisible(visible) {
        this.domNode.style.cursor = visible ? 'pointer' : 'default';
        this.domNode.style.opacity = visible ? '1' : '0';
    }
}
let NotebookStickyScroll = NotebookStickyScroll_1 = class NotebookStickyScroll extends Disposable {
    getDomNode() {
        return this.domNode;
    }
    getCurrentStickyHeight() {
        let height = 0;
        this.currentStickyLines.forEach((value) => {
            if (value.rendered) {
                height += 22;
            }
        });
        return height;
    }
    setCurrentStickyLines(newStickyLines) {
        this.currentStickyLines = newStickyLines;
    }
    compareStickyLineMaps(mapA, mapB) {
        if (mapA.size !== mapB.size) {
            return false;
        }
        for (const [key, value] of mapA) {
            const otherValue = mapB.get(key);
            if (!otherValue || value.rendered !== otherValue.rendered) {
                return false;
            }
        }
        return true;
    }
    constructor(domNode, notebookEditor, notebookCellList, layoutFn, _contextMenuService, instantiationService) {
        super();
        this.domNode = domNode;
        this.notebookEditor = notebookEditor;
        this.notebookCellList = notebookCellList;
        this.layoutFn = layoutFn;
        this._contextMenuService = _contextMenuService;
        this.instantiationService = instantiationService;
        this._disposables = new DisposableStore();
        this.currentStickyLines = new Map();
        this._onDidChangeNotebookStickyScroll = this._register(new Emitter());
        this.onDidChangeNotebookStickyScroll = this._onDidChangeNotebookStickyScroll.event;
        this._layoutDisposableStore = this._register(new DisposableStore());
        if (this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled) {
            this.init().catch(console.error);
        }
        this._register(this.notebookEditor.notebookOptions.onDidChangeOptions((e) => {
            if (e.stickyScrollEnabled || e.stickyScrollMode) {
                this.updateConfig(e);
            }
        }));
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.CONTEXT_MENU, async (event) => {
            this.onContextMenu(event);
        }));
    }
    onContextMenu(e) {
        const event = new StandardMouseEvent(DOM.getWindow(this.domNode), e);
        const selectedElement = event.target.parentElement;
        const selectedOutlineEntry = Array.from(this.currentStickyLines.values()).find(entry => entry.line.element.contains(selectedElement))?.line.entry;
        if (!selectedOutlineEntry) {
            return;
        }
        const args = {
            outlineEntry: selectedOutlineEntry,
            notebookEditor: this.notebookEditor,
        };
        this._contextMenuService.showContextMenu({
            menuId: MenuId.NotebookStickyScrollContext,
            getAnchor: () => event,
            menuActionOptions: { shouldForwardArgs: true, arg: args },
        });
    }
    updateConfig(e) {
        if (e.stickyScrollEnabled) {
            if (this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled) {
                this.init().catch(console.error);
            }
            else {
                this._disposables.clear();
                this.notebookCellOutlineReference?.dispose();
                this.disposeCurrentStickyLines();
                DOM.clearNode(this.domNode);
                this.updateDisplay();
            }
        }
        else if (e.stickyScrollMode && this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled && this.notebookCellOutlineReference?.object) {
            this.updateContent(computeContent(this.notebookEditor, this.notebookCellList, this.notebookCellOutlineReference?.object?.entries, this.getCurrentStickyHeight()));
        }
    }
    async init() {
        const { object: notebookCellOutline } = this.notebookCellOutlineReference = this.instantiationService.invokeFunction((accessor) => accessor.get(INotebookCellOutlineDataSourceFactory).getOrCreate(this.notebookEditor));
        this._register(this.notebookCellOutlineReference);
        // Ensure symbols are computed first
        await notebookCellOutline.computeFullSymbols(CancellationToken.None);
        // Initial content update
        const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
        this.updateContent(computed);
        // Set up outline change listener
        this._disposables.add(notebookCellOutline.onDidChange(() => {
            const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
            if (!this.compareStickyLineMaps(computed, this.currentStickyLines)) {
                this.updateContent(computed);
            }
            else {
                // if we don't end up updating the content, we need to avoid leaking the map
                this.disposeStickyLineMap(computed);
            }
        }));
        // Handle view model changes
        this._disposables.add(this.notebookEditor.onDidAttachViewModel(async () => {
            // ensure recompute symbols when view model changes -- could be missed if outline is closed
            await notebookCellOutline.computeFullSymbols(CancellationToken.None);
            const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
            this.updateContent(computed);
        }));
        this._disposables.add(this.notebookEditor.onDidScroll(() => {
            const d = new Delayer(100);
            d.trigger(() => {
                d.dispose();
                const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
                if (!this.compareStickyLineMaps(computed, this.currentStickyLines)) {
                    this.updateContent(computed);
                }
                else {
                    // if we don't end up updating the content, we need to avoid leaking the map
                    this.disposeStickyLineMap(computed);
                }
            });
        }));
    }
    // Add helper method to dispose a map of sticky lines
    disposeStickyLineMap(map) {
        map.forEach(value => {
            if (value.line) {
                value.line.dispose();
            }
        });
    }
    // take in an cell index, and get the corresponding outline entry
    static getVisibleOutlineEntry(visibleIndex, notebookOutlineEntries) {
        let left = 0;
        let right = notebookOutlineEntries.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (notebookOutlineEntries[mid].index === visibleIndex) {
                // Exact match found
                const rootEntry = notebookOutlineEntries[mid];
                const flatList = [];
                rootEntry.asFlatList(flatList);
                return flatList.find(entry => entry.index === visibleIndex);
            }
            else if (notebookOutlineEntries[mid].index < visibleIndex) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        // No exact match found - get the closest smaller entry
        if (right >= 0) {
            const rootEntry = notebookOutlineEntries[right];
            const flatList = [];
            rootEntry.asFlatList(flatList);
            return flatList.find(entry => entry.index === visibleIndex);
        }
        return undefined;
    }
    updateContent(newMap) {
        DOM.clearNode(this.domNode);
        this.disposeCurrentStickyLines();
        this.renderStickyLines(newMap, this.domNode);
        const oldStickyHeight = this.getCurrentStickyHeight();
        this.setCurrentStickyLines(newMap);
        // (+) = sticky height increased
        // (-) = sticky height decreased
        const sizeDelta = this.getCurrentStickyHeight() - oldStickyHeight;
        if (sizeDelta !== 0) {
            this._onDidChangeNotebookStickyScroll.fire(sizeDelta);
            const d = this._layoutDisposableStore.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                this.layoutFn(sizeDelta);
                this.updateDisplay();
                this._layoutDisposableStore.delete(d);
            }));
        }
        else {
            this.updateDisplay();
        }
    }
    updateDisplay() {
        const hasSticky = this.getCurrentStickyHeight() > 0;
        if (!hasSticky) {
            this.domNode.style.display = 'none';
        }
        else {
            this.domNode.style.display = 'block';
        }
    }
    static computeStickyHeight(entry) {
        let height = 0;
        if (entry.cell.cellKind === CellKind.Markup && entry.level < 7) {
            height += 22;
        }
        while (entry.parent) {
            height += 22;
            entry = entry.parent;
        }
        return height;
    }
    static checkCollapsedStickyLines(entry, numLinesToRender, notebookEditor) {
        let currentEntry = entry;
        const newMap = new Map();
        const elementsToRender = [];
        while (currentEntry) {
            if (currentEntry.level >= 7) {
                // level 7+ represents a non-header entry, which we don't want to render
                currentEntry = currentEntry.parent;
                continue;
            }
            const lineToRender = NotebookStickyScroll_1.createStickyElement(currentEntry, notebookEditor);
            newMap.set(currentEntry, { line: lineToRender, rendered: false });
            elementsToRender.unshift(lineToRender);
            currentEntry = currentEntry.parent;
        }
        // iterate over elements to render, and append to container
        // break when we reach numLinesToRender
        for (let i = 0; i < elementsToRender.length; i++) {
            if (i >= numLinesToRender) {
                break;
            }
            newMap.set(elementsToRender[i].entry, { line: elementsToRender[i], rendered: true });
        }
        return newMap;
    }
    renderStickyLines(stickyMap, containerElement) {
        const reversedEntries = Array.from(stickyMap.entries()).reverse();
        for (const [, value] of reversedEntries) {
            if (!value.rendered) {
                continue;
            }
            containerElement.append(value.line.element);
        }
    }
    static createStickyElement(entry, notebookEditor) {
        const stickyElement = document.createElement('div');
        stickyElement.classList.add('notebook-sticky-scroll-element');
        const indentMode = notebookEditor.notebookOptions.getLayoutConfiguration().stickyScrollMode;
        if (indentMode === 'indented') {
            stickyElement.style.paddingLeft = NotebookStickyLine.getParentCount(entry) * 10 + 'px';
        }
        let isCollapsed = false;
        if (entry.cell.cellKind === CellKind.Markup) {
            isCollapsed = entry.cell.foldingState === 2 /* CellFoldingState.Collapsed */;
        }
        const stickyFoldingIcon = new StickyFoldingIcon(isCollapsed, 16);
        stickyFoldingIcon.domNode.classList.add('notebook-sticky-scroll-folding-icon');
        stickyFoldingIcon.setVisible(true);
        const stickyHeader = document.createElement('div');
        stickyHeader.classList.add('notebook-sticky-scroll-header');
        stickyHeader.innerText = entry.label;
        stickyElement.append(stickyFoldingIcon.domNode, stickyHeader);
        return new NotebookStickyLine(stickyElement, stickyFoldingIcon, stickyHeader, entry, notebookEditor);
    }
    disposeCurrentStickyLines() {
        this.currentStickyLines.forEach((value) => {
            value.line.dispose();
        });
    }
    dispose() {
        this._disposables.dispose();
        this.disposeCurrentStickyLines();
        this.notebookCellOutlineReference?.dispose();
        super.dispose();
    }
};
NotebookStickyScroll = NotebookStickyScroll_1 = __decorate([
    __param(4, IContextMenuService),
    __param(5, IInstantiationService)
], NotebookStickyScroll);
export { NotebookStickyScroll };
export function computeContent(notebookEditor, notebookCellList, notebookOutlineEntries, renderedStickyHeight) {
    // get data about the cell list within viewport ----------------------------------------------------------------------------------------
    const editorScrollTop = notebookEditor.scrollTop - renderedStickyHeight;
    const visibleRange = notebookEditor.visibleRanges[0];
    if (!visibleRange) {
        return new Map();
    }
    // edge case for cell 0 in the notebook is a header ------------------------------------------------------------------------------------
    if (visibleRange.start === 0) {
        const firstCell = notebookEditor.cellAt(0);
        const firstCellEntry = NotebookStickyScroll.getVisibleOutlineEntry(0, notebookOutlineEntries);
        if (firstCell && firstCellEntry && firstCell.cellKind === CellKind.Markup && firstCellEntry.level < 7) {
            if (notebookEditor.scrollTop > 22) {
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(firstCellEntry, 100, notebookEditor);
                return newMap;
            }
        }
    }
    // iterate over cells in viewport ------------------------------------------------------------------------------------------------------
    let cell;
    let cellEntry;
    const startIndex = visibleRange.start - 1; // -1 to account for cells hidden "under" sticky lines.
    for (let currentIndex = startIndex; currentIndex < visibleRange.end; currentIndex++) {
        // store data for current cell, and next cell
        cell = notebookEditor.cellAt(currentIndex);
        if (!cell) {
            return new Map();
        }
        cellEntry = NotebookStickyScroll.getVisibleOutlineEntry(currentIndex, notebookOutlineEntries);
        if (!cellEntry) {
            continue;
        }
        const nextCell = notebookEditor.cellAt(currentIndex + 1);
        if (!nextCell) {
            const sectionBottom = notebookEditor.getLayoutInfo().scrollHeight;
            const linesToRender = Math.floor((sectionBottom) / 22);
            const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
            return newMap;
        }
        const nextCellEntry = NotebookStickyScroll.getVisibleOutlineEntry(currentIndex + 1, notebookOutlineEntries);
        if (!nextCellEntry) {
            continue;
        }
        // check next cell, if markdown with non level 7 entry, that means this is the end of the section (new header) ---------------------
        if (nextCell.cellKind === CellKind.Markup && nextCellEntry.level < 7) {
            const sectionBottom = notebookCellList.getCellViewScrollTop(nextCell);
            const currentSectionStickyHeight = NotebookStickyScroll.computeStickyHeight(cellEntry);
            const nextSectionStickyHeight = NotebookStickyScroll.computeStickyHeight(nextCellEntry);
            // case: we can render the all sticky lines for the current section ------------------------------------------------------------
            if (editorScrollTop + currentSectionStickyHeight < sectionBottom) {
                const linesToRender = Math.floor((sectionBottom - editorScrollTop) / 22);
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
                return newMap;
            }
            // case: next section is the same size or bigger, render next entry -----------------------------------------------------------
            else if (nextSectionStickyHeight >= currentSectionStickyHeight) {
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(nextCellEntry, 100, notebookEditor);
                return newMap;
            }
            // case: next section is the smaller, shrink until next section height is greater than the available space ---------------------
            else if (nextSectionStickyHeight < currentSectionStickyHeight) {
                const availableSpace = sectionBottom - editorScrollTop;
                if (availableSpace >= nextSectionStickyHeight) {
                    const linesToRender = Math.floor((availableSpace) / 22);
                    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
                    return newMap;
                }
                else {
                    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(nextCellEntry, 100, notebookEditor);
                    return newMap;
                }
            }
        }
    } // visible range loop close
    // case: all visible cells were non-header cells, so render any headers relevant to their section --------------------------------------
    const sectionBottom = notebookEditor.getLayoutInfo().scrollHeight;
    const linesToRender = Math.floor((sectionBottom - editorScrollTop) / 22);
    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
    return newMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0VkaXRvclN0aWNreVNjcm9sbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBbUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFLakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFFaEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0s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