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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tFZGl0b3JTdGlja3lTY3JvbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQW1CLE1BQU0seUNBQXlDLENBQUM7QUFDdkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBS2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBRWhJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFN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