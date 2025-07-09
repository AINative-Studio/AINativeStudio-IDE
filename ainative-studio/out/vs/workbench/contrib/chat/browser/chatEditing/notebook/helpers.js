/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NotebookCellsChangeType } from '../../../../notebook/common/notebookCommon.js';
import { sortCellChanges } from './notebookCellChanges.js';
export function adjustCellDiffForKeepingADeletedCell(originalCellIndex, cellDiffInfo, applyEdits) {
    // Delete this cell from original as well.
    const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: originalCellIndex, };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    const diffs = sortCellChanges(cellDiffInfo)
        .filter(d => !(d.type === 'delete' && d.originalCellIndex === originalCellIndex))
        .map(diff => {
        if (diff.type !== 'insert' && diff.originalCellIndex > originalCellIndex) {
            return {
                ...diff,
                originalCellIndex: diff.originalCellIndex - 1,
            };
        }
        return diff;
    });
    return diffs;
}
export function adjustCellDiffForRevertingADeletedCell(originalCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const indexOfEntry = cellDiffInfo.findIndex(d => d.originalCellIndex === originalCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let modifiedCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            modifiedCellIndex = Math.max(modifiedCellIndex, diff.modifiedCellIndex ?? modifiedCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = { cells: [cellToInsert], count: 0, editType: 1 /* CellEditType.Replace */, index: modifiedCellIndex + 1, };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex + 1, originalCellIndex);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffForRevertingAnInsertedCell(modifiedCellIndex, cellDiffInfo, applyEdits) {
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    cellDiffInfo = sortCellChanges(cellDiffInfo)
        .filter(d => !(d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex))
        .map(d => {
        if (d.type === 'insert' && d.modifiedCellIndex === modifiedCellIndex) {
            return d;
        }
        if (d.type !== 'delete' && d.modifiedCellIndex > modifiedCellIndex) {
            return {
                ...d,
                modifiedCellIndex: d.modifiedCellIndex - 1,
            };
        }
        return d;
    });
    const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: modifiedCellIndex, };
    applyEdits([edit], true, undefined, () => undefined, undefined, true);
    return cellDiffInfo;
}
export function adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, cellDiffInfo, cellToInsert, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    if (modifiedCellIndex === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    const indexOfEntry = cellDiffInfo.findIndex(d => d.modifiedCellIndex === modifiedCellIndex);
    if (indexOfEntry === -1) {
        // Not possible.
        return cellDiffInfo;
    }
    let originalCellIndex = -1;
    for (let i = 0; i < cellDiffInfo.length; i++) {
        const diff = cellDiffInfo[i];
        if (i < indexOfEntry) {
            originalCellIndex = Math.max(originalCellIndex, diff.originalCellIndex ?? originalCellIndex);
            continue;
        }
        if (i === indexOfEntry) {
            const edit = { cells: [cellToInsert], count: 0, editType: 1 /* CellEditType.Replace */, index: originalCellIndex + 1 };
            applyEdits([edit], true, undefined, () => undefined, undefined, true);
            cellDiffInfo[i] = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex + 1);
            continue;
        }
        else {
            // Increase the original index for all entries after this.
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex++;
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    return cellDiffInfo;
}
export function adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffInfo, modifiedModelCellCount, originalModelCellCount, applyEdits, createModifiedCellDiffInfo) {
    cellDiffInfo = sortCellChanges(cellDiffInfo);
    const numberOfCellsInserted = change[2].length;
    const numberOfCellsDeleted = change[1];
    const cells = change[2].map(cell => {
        return {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: undefined,
            internalMetadata: cell.internalMetadata
        };
    });
    let diffEntryIndex = -1;
    let indexToInsertInOriginalModel = undefined;
    if (cells.length) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (typeof diff.modifiedCellIndex === 'number' && diff.modifiedCellIndex === change[0]) {
                diffEntryIndex = i;
                if (typeof diff.originalCellIndex === 'number') {
                    indexToInsertInOriginalModel = diff.originalCellIndex;
                }
                break;
            }
            if (typeof diff.originalCellIndex === 'number') {
                indexToInsertInOriginalModel = diff.originalCellIndex + 1;
            }
        }
        const edit = {
            editType: 1 /* CellEditType.Replace */,
            cells,
            index: indexToInsertInOriginalModel ?? 0,
            count: change[1]
        };
        applyEdits([edit], true, undefined, () => undefined, undefined, true);
    }
    // If cells were deleted we handled that with this.disposeDeletedCellEntries();
    if (numberOfCellsDeleted) {
        // Adjust the indexes.
        let numberOfOriginalCellsRemovedSoFar = 0;
        let numberOfModifiedCellsRemovedSoFar = 0;
        const modifiedIndexesToRemove = new Set();
        for (let i = 0; i < numberOfCellsDeleted; i++) {
            modifiedIndexesToRemove.add(change[0] + i);
        }
        const itemsToRemove = new Set();
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number' && modifiedIndexesToRemove.has(diff.modifiedCellIndex)) {
                // This will be removed.
                numberOfModifiedCellsRemovedSoFar++;
                if (typeof diff.originalCellIndex === 'number') {
                    numberOfOriginalCellsRemovedSoFar++;
                }
                itemsToRemove.add(diff);
                continue;
            }
            if (typeof diff.modifiedCellIndex === 'number' && numberOfModifiedCellsRemovedSoFar) {
                diff.modifiedCellIndex -= numberOfModifiedCellsRemovedSoFar;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number' && numberOfOriginalCellsRemovedSoFar) {
                diff.originalCellIndex -= numberOfOriginalCellsRemovedSoFar;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
        if (itemsToRemove.size) {
            Array.from(itemsToRemove)
                .filter(diff => typeof diff.originalCellIndex === 'number')
                .forEach(diff => {
                const edit = {
                    editType: 1 /* CellEditType.Replace */,
                    cells: [],
                    index: diff.originalCellIndex,
                    count: 1
                };
                applyEdits([edit], true, undefined, () => undefined, undefined, true);
            });
        }
        cellDiffInfo = cellDiffInfo.filter(d => !itemsToRemove.has(d));
    }
    if (numberOfCellsInserted && diffEntryIndex >= 0) {
        for (let i = 0; i < cellDiffInfo.length; i++) {
            const diff = cellDiffInfo[i];
            if (i < diffEntryIndex) {
                continue;
            }
            let changed = false;
            if (typeof diff.modifiedCellIndex === 'number') {
                diff.modifiedCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (typeof diff.originalCellIndex === 'number') {
                diff.originalCellIndex += numberOfCellsInserted;
                changed = true;
            }
            if (changed) {
                cellDiffInfo[i] = { ...diff };
            }
        }
    }
    // For inserted cells, we need to ensure that we create a corresponding CellEntry.
    // So that any edits to the inserted cell is handled and mirrored over to the corresponding cell in original model.
    cells.forEach((_, i) => {
        const originalCellIndex = i + (indexToInsertInOriginalModel ?? 0);
        const modifiedCellIndex = change[0] + i;
        const unchangedCell = createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex);
        cellDiffInfo.splice((diffEntryIndex === -1 ? cellDiffInfo.length : diffEntryIndex) + i, 0, unchangedCell);
    });
    return cellDiffInfo;
}
/**
 * Given the movements of cells in modified notebook, adjust the ICellDiffInfo[] array
 * and generate edits for the old notebook (if required).
 * TODO@DonJayamanne Handle bulk moves (movements of more than 1 cell).
 */
export function adjustCellDiffAndOriginalModelBasedOnCellMovements(event, cellDiffInfo) {
    const minimumIndex = Math.min(event.index, event.newIdx);
    const maximumIndex = Math.max(event.index, event.newIdx);
    const cellDiffs = cellDiffInfo.slice();
    const indexOfEntry = cellDiffs.findIndex(d => d.modifiedCellIndex === event.index);
    const indexOfEntryToPlaceBelow = cellDiffs.findIndex(d => d.modifiedCellIndex === event.newIdx);
    if (indexOfEntry === -1 || indexOfEntryToPlaceBelow === -1) {
        return undefined;
    }
    // Create a new object so that the observable value is triggered.
    // Besides we'll be updating the values of this object in place.
    const entryToBeMoved = { ...cellDiffs[indexOfEntry] };
    const moveDirection = event.newIdx > event.index ? 'down' : 'up';
    const startIndex = cellDiffs.findIndex(d => d.modifiedCellIndex === minimumIndex);
    const endIndex = cellDiffs.findIndex(d => d.modifiedCellIndex === maximumIndex);
    const movingExistingCell = typeof entryToBeMoved.originalCellIndex === 'number';
    let originalCellsWereEffected = false;
    for (let i = 0; i < cellDiffs.length; i++) {
        const diff = cellDiffs[i];
        let changed = false;
        if (moveDirection === 'down') {
            if (i > startIndex && i <= endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex - 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex - 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        else {
            if (i >= startIndex && i < endIndex) {
                if (typeof diff.modifiedCellIndex === 'number') {
                    changed = true;
                    diff.modifiedCellIndex = diff.modifiedCellIndex + 1;
                }
                if (typeof diff.originalCellIndex === 'number' && movingExistingCell) {
                    diff.originalCellIndex = diff.originalCellIndex + 1;
                    originalCellsWereEffected = true;
                    changed = true;
                }
            }
        }
        // Create a new object so that the observable value is triggered.
        // Do only if there's a change.
        if (changed) {
            cellDiffs[i] = { ...diff };
        }
    }
    entryToBeMoved.modifiedCellIndex = event.newIdx;
    const originalCellIndex = entryToBeMoved.originalCellIndex;
    if (moveDirection === 'down') {
        cellDiffs.splice(endIndex + 1, 0, entryToBeMoved);
        cellDiffs.splice(startIndex, 1);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex = cellDiffs.slice(0, endIndex).reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number' ? Math.max(lastOriginalIndex, diff.originalCellIndex) : lastOriginalIndex, -1) + 1;
        }
    }
    else {
        cellDiffs.splice(endIndex, 1);
        cellDiffs.splice(startIndex, 0, entryToBeMoved);
        // If we're moving a new cell up/down, then we need just adjust just the modified indexes of the cells in between.
        // If we're moving an existing up/down, then we need to adjust the original indexes as well.
        if (typeof entryToBeMoved.originalCellIndex === 'number') {
            entryToBeMoved.originalCellIndex = cellDiffs.slice(0, startIndex).reduce((lastOriginalIndex, diff) => typeof diff.originalCellIndex === 'number' ? Math.max(lastOriginalIndex, diff.originalCellIndex) : lastOriginalIndex, -1) + 1;
        }
    }
    // If this is a new cell that we're moving, and there are no existing cells in between, then we can just move the new cell.
    // I.e. no need to update the original notebook model.
    if (typeof entryToBeMoved.originalCellIndex === 'number' && originalCellsWereEffected && typeof originalCellIndex === 'number' && entryToBeMoved.originalCellIndex !== originalCellIndex) {
        const edit = {
            editType: 6 /* CellEditType.Move */,
            index: originalCellIndex,
            length: event.length,
            newIdx: entryToBeMoved.originalCellIndex
        };
        return [cellDiffs, [edit]];
    }
    return [cellDiffs, []];
}
export function getCorrespondingOriginalCellIndex(modifiedCellIndex, cellDiffInfo) {
    const entry = cellDiffInfo.find(d => d.modifiedCellIndex === modifiedCellIndex);
    return entry?.originalCellIndex;
}
/**
 *
 * This isn't great, but necessary.
 * ipynb extension updates metadata when new cells are inserted (to ensure the metadata is correct)
 * Details of why thats required is in ipynb extension, but its necessary.
 * However as a result of this, those edits appear here and are assumed to be user edits.
 * As a result `_allEditsAreFromUs` is set to false.
 */
export function isTransientIPyNbExtensionEvent(notebookKind, e) {
    if (notebookKind !== 'jupyter-notebook') {
        return false;
    }
    if (e.rawEvents.every(event => {
        if (event.kind !== NotebookCellsChangeType.ChangeCellMetadata) {
            return false;
        }
        if (JSON.stringify(event.metadata || {}) === JSON.stringify({ execution_count: null, metadata: {} })) {
            return true;
        }
        return true;
    })) {
        return true;
    }
    return false;
}
export function calculateNotebookRewriteRatio(cellsDiff, originalModel, modifiedModel) {
    const totalNumberOfUpdatedLines = cellsDiff.reduce((totalUpdatedLines, value) => {
        const getUpadtedLineCount = () => {
            if (value.type === 'unchanged') {
                return 0;
            }
            if (value.type === 'delete') {
                return originalModel.cells[value.originalCellIndex].textModel?.getLineCount() ?? 0;
            }
            if (value.type === 'insert') {
                return modifiedModel.cells[value.modifiedCellIndex].textModel?.getLineCount() ?? 0;
            }
            return value.diff.get().changes.reduce((maxLineNumber, change) => {
                return Math.max(maxLineNumber, change.modified.endLineNumberExclusive);
            }, 0);
        };
        return totalUpdatedLines + getUpadtedLineCount();
    }, 0);
    const totalNumberOfLines = modifiedModel.cells.reduce((totalLines, cell) => totalLines + (cell.textModel?.getLineCount() ?? 0), 0);
    return totalNumberOfLines === 0 ? 0 : Math.min(1, totalNumberOfUpdatedLines / totalNumberOfLines);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQXdFLHVCQUF1QixFQUEyRixNQUFNLCtDQUErQyxDQUFDO0FBQ3ZQLE9BQU8sRUFBaUIsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHMUUsTUFBTSxVQUFVLG9DQUFvQyxDQUFDLGlCQUF5QixFQUM3RSxZQUE2QixFQUM3QixVQUF5RDtJQUV6RCwwQ0FBMEM7SUFDMUMsTUFBTSxJQUFJLEdBQXFCLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsOEJBQXNCLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixHQUFHLENBQUM7SUFDbEgsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUM7U0FDekMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2hGLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNYLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixFQUFFLENBQUM7WUFDMUUsT0FBTztnQkFDTixHQUFHLElB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