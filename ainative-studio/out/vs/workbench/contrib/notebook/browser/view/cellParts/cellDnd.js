/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import * as platform from '../../../../../../base/common/platform.js';
import { expandCellRangesWithHiddenCells } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { cloneNotebookCellTextModel } from '../../../common/model/notebookCellTextModel.js';
import { SelectionStateType } from '../../../common/notebookCommon.js';
import { cellRangesToIndexes } from '../../../common/notebookRange.js';
const $ = DOM.$;
const DRAGGING_CLASS = 'cell-dragging';
const GLOBAL_DRAG_CLASS = 'global-drag-active';
export class CellDragAndDropPart extends CellContentPart {
    constructor(container) {
        super();
        this.container = container;
    }
    didRenderCell(element) {
        this.update(element);
    }
    updateState(element, e) {
        if (e.dragStateChanged) {
            this.update(element);
        }
    }
    update(element) {
        this.container.classList.toggle(DRAGGING_CLASS, element.dragging);
    }
}
export class CellDragAndDropController extends Disposable {
    constructor(notebookEditor, notebookListContainer) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookListContainer = notebookListContainer;
        this.draggedCells = [];
        this.isScrolling = false;
        this.listOnWillScrollListener = this._register(new MutableDisposable());
        this.listInsertionIndicator = DOM.append(notebookListContainer, $('.cell-list-insertion-indicator'));
        this._register(DOM.addDisposableListener(notebookListContainer.ownerDocument.body, DOM.EventType.DRAG_START, this.onGlobalDragStart.bind(this), true));
        this._register(DOM.addDisposableListener(notebookListContainer.ownerDocument.body, DOM.EventType.DRAG_END, this.onGlobalDragEnd.bind(this), true));
        const addCellDragListener = (eventType, handler, useCapture = false) => {
            this._register(DOM.addDisposableListener(notebookEditor.getDomNode(), eventType, e => {
                const cellDragEvent = this.toCellDragEvent(e);
                if (cellDragEvent) {
                    handler(cellDragEvent);
                }
            }, useCapture));
        };
        addCellDragListener(DOM.EventType.DRAG_OVER, event => {
            if (!this.currentDraggedCell) {
                return;
            }
            event.browserEvent.preventDefault();
            this.onCellDragover(event);
        }, true);
        addCellDragListener(DOM.EventType.DROP, event => {
            if (!this.currentDraggedCell) {
                return;
            }
            event.browserEvent.preventDefault();
            this.onCellDrop(event);
        });
        addCellDragListener(DOM.EventType.DRAG_LEAVE, event => {
            event.browserEvent.preventDefault();
            this.onCellDragLeave(event);
        });
        this.scrollingDelayer = this._register(new Delayer(200));
    }
    setList(value) {
        this.list = value;
        this.listOnWillScrollListener.value = this.list.onWillScroll(e => {
            if (!e.scrollTopChanged) {
                return;
            }
            this.setInsertIndicatorVisibility(false);
            this.isScrolling = true;
            this.scrollingDelayer.trigger(() => {
                this.isScrolling = false;
            });
        });
    }
    setInsertIndicatorVisibility(visible) {
        this.listInsertionIndicator.style.opacity = visible ? '1' : '0';
    }
    toCellDragEvent(event) {
        const targetTop = this.notebookListContainer.getBoundingClientRect().top;
        const dragOffset = this.list.scrollTop + event.clientY - targetTop;
        const draggedOverCell = this.list.elementAt(dragOffset);
        if (!draggedOverCell) {
            return undefined;
        }
        const cellTop = this.list.getCellViewScrollTop(draggedOverCell);
        const cellHeight = this.list.elementHeight(draggedOverCell);
        const dragPosInElement = dragOffset - cellTop;
        const dragPosRatio = dragPosInElement / cellHeight;
        return {
            browserEvent: event,
            draggedOverCell,
            cellTop,
            cellHeight,
            dragPosRatio
        };
    }
    clearGlobalDragState() {
        this.notebookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
    }
    onGlobalDragStart() {
        this.notebookEditor.getDomNode().classList.add(GLOBAL_DRAG_CLASS);
    }
    onGlobalDragEnd() {
        this.notebookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
    }
    onCellDragover(event) {
        if (!event.browserEvent.dataTransfer) {
            return;
        }
        if (!this.currentDraggedCell) {
            event.browserEvent.dataTransfer.dropEffect = 'none';
            return;
        }
        if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
            this.setInsertIndicatorVisibility(false);
            return;
        }
        const dropDirection = this.getDropInsertDirection(event.dragPosRatio);
        const insertionIndicatorAbsolutePos = dropDirection === 'above' ? event.cellTop : event.cellTop + event.cellHeight;
        this.updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos);
    }
    updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos) {
        const { bottomToolbarGap } = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
        const insertionIndicatorTop = insertionIndicatorAbsolutePos - this.list.scrollTop + bottomToolbarGap / 2;
        if (insertionIndicatorTop >= 0) {
            this.listInsertionIndicator.style.top = `${insertionIndicatorTop}px`;
            this.setInsertIndicatorVisibility(true);
        }
        else {
            this.setInsertIndicatorVisibility(false);
        }
    }
    getDropInsertDirection(dragPosRatio) {
        return dragPosRatio < 0.5 ? 'above' : 'below';
    }
    onCellDrop(event) {
        const draggedCell = this.currentDraggedCell;
        if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
            return;
        }
        this.dragCleanup();
        const dropDirection = this.getDropInsertDirection(event.dragPosRatio);
        this._dropImpl(draggedCell, dropDirection, event.browserEvent, event.draggedOverCell);
    }
    getCellRangeAroundDragTarget(draggedCellIndex) {
        const selections = this.notebookEditor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(this.notebookEditor, selections);
        const nearestRange = modelRanges.find(range => range.start <= draggedCellIndex && draggedCellIndex < range.end);
        if (nearestRange) {
            return nearestRange;
        }
        else {
            return { start: draggedCellIndex, end: draggedCellIndex + 1 };
        }
    }
    _dropImpl(draggedCell, dropDirection, ctx, draggedOverCell) {
        const cellTop = this.list.getCellViewScrollTop(draggedOverCell);
        const cellHeight = this.list.elementHeight(draggedOverCell);
        const insertionIndicatorAbsolutePos = dropDirection === 'above' ? cellTop : cellTop + cellHeight;
        const { bottomToolbarGap } = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
        const insertionIndicatorTop = insertionIndicatorAbsolutePos - this.list.scrollTop + bottomToolbarGap / 2;
        const editorHeight = this.notebookEditor.getDomNode().getBoundingClientRect().height;
        if (insertionIndicatorTop < 0 || insertionIndicatorTop > editorHeight) {
            // Ignore drop, insertion point is off-screen
            return;
        }
        const isCopy = (ctx.ctrlKey && !platform.isMacintosh) || (ctx.altKey && platform.isMacintosh);
        if (!this.notebookEditor.hasModel()) {
            return;
        }
        const textModel = this.notebookEditor.textModel;
        if (isCopy) {
            const draggedCellIndex = this.notebookEditor.getCellIndex(draggedCell);
            const range = this.getCellRangeAroundDragTarget(draggedCellIndex);
            let originalToIdx = this.notebookEditor.getCellIndex(draggedOverCell);
            if (dropDirection === 'below') {
                const relativeToIndex = this.notebookEditor.getCellIndex(draggedOverCell);
                const newIdx = this.notebookEditor.getNextVisibleCellIndex(relativeToIndex);
                originalToIdx = newIdx;
            }
            let finalSelection;
            let finalFocus;
            if (originalToIdx <= range.start) {
                finalSelection = { start: originalToIdx, end: originalToIdx + range.end - range.start };
                finalFocus = { start: originalToIdx + draggedCellIndex - range.start, end: originalToIdx + draggedCellIndex - range.start + 1 };
            }
            else {
                const delta = (originalToIdx - range.start);
                finalSelection = { start: range.start + delta, end: range.end + delta };
                finalFocus = { start: draggedCellIndex + delta, end: draggedCellIndex + delta + 1 };
            }
            textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: originalToIdx,
                    count: 0,
                    cells: cellRangesToIndexes([range]).map(index => cloneNotebookCellTextModel(this.notebookEditor.cellAt(index).model))
                }
            ], true, { kind: SelectionStateType.Index, focus: this.notebookEditor.getFocus(), selections: this.notebookEditor.getSelections() }, () => ({ kind: SelectionStateType.Index, focus: finalFocus, selections: [finalSelection] }), undefined, true);
            this.notebookEditor.revealCellRangeInView(finalSelection);
        }
        else {
            performCellDropEdits(this.notebookEditor, draggedCell, dropDirection, draggedOverCell);
        }
    }
    onCellDragLeave(event) {
        if (!event.browserEvent.relatedTarget || !DOM.isAncestor(event.browserEvent.relatedTarget, this.notebookEditor.getDomNode())) {
            this.setInsertIndicatorVisibility(false);
        }
    }
    dragCleanup() {
        if (this.currentDraggedCell) {
            this.draggedCells.forEach(cell => cell.dragging = false);
            this.currentDraggedCell = undefined;
            this.draggedCells = [];
        }
        this.setInsertIndicatorVisibility(false);
    }
    registerDragHandle(templateData, cellRoot, dragHandles, dragImageProvider) {
        const container = templateData.container;
        for (const dragHandle of dragHandles) {
            dragHandle.setAttribute('draggable', 'true');
        }
        const onDragEnd = () => {
            if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled || !!this.notebookEditor.isReadOnly) {
                return;
            }
            // Note, templateData may have a different element rendered into it by now
            container.classList.remove(DRAGGING_CLASS);
            this.dragCleanup();
        };
        for (const dragHandle of dragHandles) {
            templateData.templateDisposables.add(DOM.addDisposableListener(dragHandle, DOM.EventType.DRAG_END, onDragEnd));
        }
        const onDragStart = (event) => {
            if (!event.dataTransfer) {
                return;
            }
            if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled || !!this.notebookEditor.isReadOnly) {
                return;
            }
            this.currentDraggedCell = templateData.currentRenderedCell;
            this.draggedCells = this.notebookEditor.getSelections().map(range => this.notebookEditor.getCellsInRange(range)).flat();
            this.draggedCells.forEach(cell => cell.dragging = true);
            const dragImage = dragImageProvider();
            cellRoot.parentElement.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => dragImage.remove(), 0); // Comment this out to debug drag image layout
        };
        for (const dragHandle of dragHandles) {
            templateData.templateDisposables.add(DOM.addDisposableListener(dragHandle, DOM.EventType.DRAG_START, onDragStart));
        }
    }
    startExplicitDrag(cell, _dragOffsetY) {
        if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled || !!this.notebookEditor.isReadOnly) {
            return;
        }
        this.currentDraggedCell = cell;
        this.setInsertIndicatorVisibility(true);
    }
    explicitDrag(cell, dragOffsetY) {
        if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled || !!this.notebookEditor.isReadOnly) {
            return;
        }
        const target = this.list.elementAt(dragOffsetY);
        if (target && target !== cell) {
            const cellTop = this.list.getCellViewScrollTop(target);
            const cellHeight = this.list.elementHeight(target);
            const dropDirection = this.getExplicitDragDropDirection(dragOffsetY, cellTop, cellHeight);
            const insertionIndicatorAbsolutePos = dropDirection === 'above' ? cellTop : cellTop + cellHeight;
            this.updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos);
        }
        // Try scrolling list if needed
        if (this.currentDraggedCell !== cell) {
            return;
        }
        const notebookViewRect = this.notebookEditor.getDomNode().getBoundingClientRect();
        const eventPositionInView = dragOffsetY - this.list.scrollTop;
        // Percentage from the top/bottom of the screen where we start scrolling while dragging
        const notebookViewScrollMargins = 0.2;
        const maxScrollDeltaPerFrame = 20;
        const eventPositionRatio = eventPositionInView / notebookViewRect.height;
        if (eventPositionRatio < notebookViewScrollMargins) {
            this.list.scrollTop -= maxScrollDeltaPerFrame * (1 - eventPositionRatio / notebookViewScrollMargins);
        }
        else if (eventPositionRatio > 1 - notebookViewScrollMargins) {
            this.list.scrollTop += maxScrollDeltaPerFrame * (1 - ((1 - eventPositionRatio) / notebookViewScrollMargins));
        }
    }
    endExplicitDrag(_cell) {
        this.setInsertIndicatorVisibility(false);
    }
    explicitDrop(cell, ctx) {
        this.currentDraggedCell = undefined;
        this.setInsertIndicatorVisibility(false);
        const target = this.list.elementAt(ctx.dragOffsetY);
        if (!target || target === cell) {
            return;
        }
        const cellTop = this.list.getCellViewScrollTop(target);
        const cellHeight = this.list.elementHeight(target);
        const dropDirection = this.getExplicitDragDropDirection(ctx.dragOffsetY, cellTop, cellHeight);
        this._dropImpl(cell, dropDirection, ctx, target);
    }
    getExplicitDragDropDirection(clientY, cellTop, cellHeight) {
        const dragPosInElement = clientY - cellTop;
        const dragPosRatio = dragPosInElement / cellHeight;
        return this.getDropInsertDirection(dragPosRatio);
    }
    dispose() {
        this.notebookEditor = null;
        super.dispose();
    }
}
export function performCellDropEdits(editor, draggedCell, dropDirection, draggedOverCell) {
    const draggedCellIndex = editor.getCellIndex(draggedCell);
    let originalToIdx = editor.getCellIndex(draggedOverCell);
    if (typeof draggedCellIndex !== 'number' || typeof originalToIdx !== 'number') {
        return;
    }
    // If dropped on a folded markdown range, insert after the folding range
    if (dropDirection === 'below') {
        const newIdx = editor.getNextVisibleCellIndex(originalToIdx) ?? originalToIdx;
        originalToIdx = newIdx;
    }
    let selections = editor.getSelections();
    if (!selections.length) {
        selections = [editor.getFocus()];
    }
    let originalFocusIdx = editor.getFocus().start;
    // If the dragged cell is not focused/selected, ignore the current focus/selection and use the dragged idx
    if (!selections.some(s => s.start <= draggedCellIndex && s.end > draggedCellIndex)) {
        selections = [{ start: draggedCellIndex, end: draggedCellIndex + 1 }];
        originalFocusIdx = draggedCellIndex;
    }
    const droppedInSelection = selections.find(range => range.start <= originalToIdx && range.end > originalToIdx);
    if (droppedInSelection) {
        originalToIdx = droppedInSelection.start;
    }
    let numCells = 0;
    let focusNewIdx = originalToIdx;
    let newInsertionIdx = originalToIdx;
    // Compute a set of edits which will be applied in reverse order by the notebook text model.
    // `index`: the starting index of the range, after previous edits have been applied
    // `newIdx`: the destination index, after this edit's range has been removed
    selections.sort((a, b) => b.start - a.start);
    const edits = selections.map(range => {
        const length = range.end - range.start;
        // If this range is before the insertion point, subtract the cells in this range from the "to" index
        let toIndexDelta = 0;
        if (range.end <= newInsertionIdx) {
            toIndexDelta = -length;
        }
        const newIdx = newInsertionIdx + toIndexDelta;
        // If this range contains the focused cell, set the new focus index to the new index of the cell
        if (originalFocusIdx >= range.start && originalFocusIdx <= range.end) {
            const offset = originalFocusIdx - range.start;
            focusNewIdx = newIdx + offset;
        }
        // If below the insertion point, the original index will have been shifted down
        const fromIndexDelta = range.start >= originalToIdx ? numCells : 0;
        const edit = {
            editType: 6 /* CellEditType.Move */,
            index: range.start + fromIndexDelta,
            length,
            newIdx
        };
        numCells += length;
        // If a range was moved down, the insertion index needs to be adjusted
        if (range.end < newInsertionIdx) {
            newInsertionIdx -= length;
        }
        return edit;
    });
    const lastEdit = edits[edits.length - 1];
    const finalSelection = { start: lastEdit.newIdx, end: lastEdit.newIdx + numCells };
    const finalFocus = { start: focusNewIdx, end: focusNewIdx + 1 };
    editor.textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: editor.getSelections() }, () => ({ kind: SelectionStateType.Index, focus: finalFocus, selections: [finalSelection] }), undefined, true);
    editor.revealCellRangeInView(finalSelection);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxEbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNGLE9BQU8sS0FBSyxRQUFRLE1BQU0sMkNBQTJDLENBQUM7QUFDdEUsT0FBTyxFQUFFLCtCQUErQixFQUEyQyxNQUFNLDBCQUEwQixDQUFDO0FBRXBILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM1RixPQUFPLEVBQStCLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEcsT0FBTyxFQUFFLG1CQUFtQixFQUFjLE1BQU0sa0NBQWtDLENBQUM7QUFFbkYsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUM7QUFDdkMsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQztBQVkvQyxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsZUFBZTtJQUN2RCxZQUNrQixTQUFzQjtRQUV2QyxLQUFLLEVBQUUsQ0FBQztRQUZTLGNBQVMsR0FBVCxTQUFTLENBQWE7SUFHeEMsQ0FBQztJQUVRLGFBQWEsQ0FBQyxPQUF1QjtRQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxD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